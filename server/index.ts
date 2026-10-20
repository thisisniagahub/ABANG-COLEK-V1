import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createPlatformApp } from './platform/app';
import { opaque } from './platform/auth';
import { PaymentCallbackService } from './platform/paymentCallbacks';
import { createPaymentRoutes } from './platform/paymentCallbackRoutes';
import { PAYMENT_CALLBACK_PATH, PAYMENT_RETURN_PATH } from '../shared/payment-contracts';
import { runtimeConfig } from './runtime-config';
import { createRuntimeIdentity, createRuntimeIdentityHandler } from './runtime-identity';

export interface LocalRouteHandlers {
  /** Platform app (`createPlatformApp(...).fetch`). */
  platform: (request: Request) => Response | Promise<Response>;
  /** Runtime identity route of the local listener. */
  runtimeIdentity: (request: Request) => Response | Promise<Response>;
  /** CopilotKit runtime route (`api/copilotkit.ts`). */
  copilotKit: (request: Request) => Response | Promise<Response>;
  /** First-party MCP entry (`api/mcp.ts`). */
  mcp: (request: Request) => Response | Promise<Response>;
  /**
   * Payment callback + post-payment return routes (PAY-01/PAY-02).
   *
   * Authority of the callback is the HMAC signature, never a browser
   * session, so these routes are served BEFORE the platform app and are
   * never subject to the origin allow-list or CSRF token.
   */
  payments?: (request: Request) => Response | Promise<Response>;
}

/**
 * Routing dev/prod yang SAMA untuk pelayan tempatan.
 *
 * Setiap laluan dilayan oleh SATU implementasi sahaja:
 *
 *  - `/api/platform/runtime-identity` → identiti operator tempatan.
 *  - `/api/copilotkit/*` → pengendali CopilotKit rasmi daripada `api/copilotkit.ts`.
 *  - `/api/mcp*` → pengendali MCP rasmi daripada `api/mcp.ts`.
 *  - `/api/platform/payments/*` → pengendali bayaran daripada
 *    `server/platform/paymentCallbackRoutes.ts` (authority: tandatangan HMAC).
 *  - everything else → aplikasi platform (`createPlatformApp`).
 *
 * Tiada laluan platform, pengendalian token bootstrap, had saiz badan atau
 * selang worker yang dilumpuhkan oleh routing ini.
 */
export function createLocalRouter(handlers: LocalRouteHandlers): (
  request: Request,
) => Response | Promise<Response> {
  return (request: Request): Response | Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/platform/runtime-identity') return handlers.runtimeIdentity(request);
    if (pathname === '/api/copilotkit' || pathname.startsWith('/api/copilotkit/')) {
      return handlers.copilotKit(request);
    }
    if (pathname === '/api/mcp' || pathname.startsWith('/api/mcp/')) {
      return handlers.mcp(request);
    }
    if (
      handlers.payments &&
      (pathname === PAYMENT_CALLBACK_PATH || pathname === PAYMENT_RETURN_PATH)
    ) {
      return handlers.payments(request);
    }
    return handlers.platform(request);
  };
}

if (import.meta.main) {
  // Configuration and canonical identity are validated before any runtime writes.
  const config=runtimeConfig(process.env);
  const checkoutRoot=resolve(import.meta.dir,'..');
  const runtimeRoot=resolve(checkoutRoot,config.runtimeRoot);
  const identity=createRuntimeIdentity({checkoutRoot,runtimeRoot});
  const operatorIdentity=createRuntimeIdentityHandler(config.hostname,identity);
  for(const directory of ['run','log','lib/platform'])mkdirSync(join(runtimeRoot,directory),{recursive:true});
  const tokenPath=join(runtimeRoot,'run','owner-bootstrap.token');
  if(!existsSync(tokenPath))writeFileSync(tokenPath,opaque(),{flag:'wx',mode:0o600});
  const bootstrapToken=readFileSync(tokenPath,'utf8').trim();
  const databasePath=join(runtimeRoot,'lib','platform','platform.sqlite');
  const app=createPlatformApp({databasePath,bootstrapToken,allowedOrigins:config.allowedOrigins,log:entry=>appendFileSync(join(runtimeRoot,'log','platform-api.jsonl'),JSON.stringify({...entry,createdAt:new Date().toISOString()})+'\n')});
  if(app.store.metadata('owner_bootstrapped')&&existsSync(tokenPath))unlinkSync(tokenPath);

  /**
   * Laluan bayaran (PAY-01/PAY-02).
   *
   * Rahsia HMAC dipegang server dan datang daripada environment
   * (`PLATFORM_PAYMENT_WEBHOOK_SECRET`). Tiada rahsia lalai: tanpa rahsia,
   * callback ditolak secara jujur dengan `PAYMENT_SIGNATURE_SECRET_UNAVAILABLE`.
   */
  const paymentCallbacks=new PaymentCallbackService(app.store,{secret:process.env.PLATFORM_PAYMENT_WEBHOOK_SECRET,loyalty:app.loyalty});
  const paymentRoutes=createPaymentRoutes({store:app.store,auth:app.auth,service:paymentCallbacks});

  // Pangkalan data kanonikal platform ditetapkan SEBELUM modul MCP
  // diselesaikan, supaya laluan MCP mengesahkan sesi terhadap pangkalan data
  // platform yang SAMA (jadual `sessions` yang sama) — tiada pangkalan data
  // kedua.
  process.env.PLATFORM_DATABASE_PATH=databasePath;

  /**
   * Pemuat MALAS untuk kedua-dua entry awam.
   *
   * Modul yang diimport ialah fail yang SAMA seperti yang dilayani oleh entry
   * Vercel — `api/copilotkit.ts` (kilang `createCopilotKitRoute()`) dan
   * `api/mcp.ts` (pengendali MCP). Tiada implementasi kedua: hanya satu
   * salinan kod, diimport oleh kedua-dua entry.
   *
   * Import ditangguhkan sehingga laluan pertama benar-benar-hit, jadi pelayan
   * tempatan tetap boleh hidup di checkout yang tidak membawa runtime
   * CopilotKit (contohnya harness pelayan terasing) dan laluan yang gagal
   * dimuat melaporkan 503 yang jujur — bukan 404 yang mengelirukan.
   */
  let copilotKitHandler: ((request:Request)=>Promise<Response>)|undefined;
  let mcpHandler: {fetch:(request:Request)=>Promise<Response>}|undefined;

  const unavailable=(code:string,message:string)=>new Response(JSON.stringify({ok:false,code,message}),{status:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

  async function handleCopilotKit(request:Request):Promise<Response>{
    try{
      if(!copilotKitHandler){
        const module=await import('../api/copilotkit');
        copilotKitHandler=module.createCopilotKitRoute();
      }
      return await copilotKitHandler(request);
    }catch(error){
      return unavailable('COPILOTKIT_RUNTIME_UNAVAILABLE',`Runtime CopilotKit tidak dapat dimuatkan: ${error instanceof Error?error.message:String(error)}`);
    }
  }

  async function handleMcp(request:Request):Promise<Response>{
    try{
      if(!mcpHandler){
        const module=await import('../api/mcp');
        mcpHandler=module.default;
      }
      return await mcpHandler.fetch(request);
    }catch(error){
      return unavailable('MCP_RUNTIME_UNAVAILABLE',`Pelayan MCP tidak dapat dimuatkan: ${error instanceof Error?error.message:String(error)}`);
    }
  }

  const route=createLocalRouter({
    platform:request=>app.fetch(request),
    runtimeIdentity:request=>operatorIdentity(request),
    copilotKit:handleCopilotKit,
    mcp:handleMcp,
    payments:request=>paymentRoutes.handle(request),
  });

  let server:ReturnType<typeof Bun.serve>;
  try{
    server=Bun.serve({hostname:config.hostname,port:config.port,idleTimeout:15,maxRequestBodySize:11*1024*1024,fetch:route});
  }catch(error){app.close();throw error;}
  writeFileSync(join(runtimeRoot,'run','platform.pid'),String(process.pid));
  const workerId=`local-${process.pid}`;
  const interval=setInterval(()=>{try{const job=app.jobs.claimJob(workerId);if(job)app.jobs.executeLocal(job.id,workerId);}catch{appendFileSync(join(runtimeRoot,'log','platform-worker.jsonl'),JSON.stringify({code:'LOCAL_WORKER_FAILED',createdAt:new Date().toISOString()})+'\n');}if(app.store.metadata('owner_bootstrapped')&&existsSync(tokenPath))unlinkSync(tokenPath);},1000);
  function shutdown(){clearInterval(interval);server.stop();app.close();const pidPath=join(runtimeRoot,'run','platform.pid');if(existsSync(pidPath)&&readFileSync(pidPath,'utf8')===String(process.pid))unlinkSync(pidPath);process.exit(0);}
  process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
  console.info(`ABANGCOLEK API listening on http://${config.hostname}:${config.port}`);
  console.info('CopilotKit runtime: /api/copilotkit/* | MCP: /api/mcp');
  console.info('First founder setup uses the one-time token in var/run/owner-bootstrap.token. No account is created automatically.');
}
