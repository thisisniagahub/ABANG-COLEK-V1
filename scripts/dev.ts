import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runtimeConfig } from '../server/runtime-config';
import { createRuntimeIdentity, isLocalBinding, probeRuntimeIdentity } from '../server/runtime-identity';

const root=resolve(import.meta.dir,'..'),config=runtimeConfig(process.env);
if(!isLocalBinding(config.hostname))throw new Error('Development launcher menggunakan local binding sahaja.');
const runtimeRoot=resolve(root,config.runtimeRoot),target=config.target;
const expected=createRuntimeIdentity({checkoutRoot:root,runtimeRoot});
let log:number|null=null,apiProcess:ReturnType<typeof Bun.spawn>|null=null,uiProcess:ReturnType<typeof Bun.spawn>|null=null;
let cleanupPromise:Promise<void>|undefined;

function cleanup():Promise<void>{
  return cleanupPromise??=(async()=>{
    // Only children started by this launcher are owned; reused listeners remain alive.
    const children=[uiProcess,apiProcess].filter((child):child is NonNullable<typeof child>=>child!==null);
    for(const child of children){
      try{if(child.exitCode===null)child.kill();}catch{}
    }
    await Promise.all(children.map(child=>child.exited.catch(()=>0)));
    if(log!==null){try{closeSync(log);}catch{}log=null;}
    if(apiProcess){
      const pidPath=join(runtimeRoot,'run/platform.pid');
      try{if(existsSync(pidPath)&&readFileSync(pidPath,'utf8')===String(apiProcess.pid))unlinkSync(pidPath);}catch{}
    }
  })();
}
const onSignal=()=>{void cleanup().then(()=>process.exit(0),()=>process.exit(1));};
process.once('SIGINT',onSignal);process.once('SIGTERM',onSignal);

async function run():Promise<number>{
  const initial=await probeRuntimeIdentity(target,expected);
  if(initial==='occupied_invalid')throw new Error('API listener tidak sepadan atau tidak boleh disahkan. Tiada proses sedia ada dihentikan.');
  if(initial==='unreachable'){
    mkdirSync(join(runtimeRoot,'log'),{recursive:true});
    log=openSync(join(runtimeRoot,'log/dev-api.log'),'a');
    apiProcess=Bun.spawn([process.execPath,'server/index.ts'],{cwd:root,env:{...process.env,PLATFORM_RUNTIME_ROOT:runtimeRoot},stdout:log,stderr:log});
    let ready=false;
    for(let attempt=0;attempt<40;attempt++){
      if(apiProcess.exitCode!==null)throw new Error('API gagal bermula. Semak runtime log yang dipilih.');
      const result=await probeRuntimeIdentity(target,expected);
      if(result==='reusable'){ready=true;break;}
      if(result==='occupied_invalid')throw new Error('API identiti tidak sah. Listener luar tidak dihentikan.');
      await Bun.sleep(250);
    }
    if(!ready)throw new Error('API belum ready dalam had masa. Semak runtime log yang dipilih.');
  }else console.info(`Menggunakan API lokal yang sepadan di ${target}.`);
  uiProcess=Bun.spawn([process.execPath,'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','3000','--strictPort'],{cwd:root,env:{...process.env,PLATFORM_API_TARGET:target},stdout:'inherit',stderr:'inherit'});
  console.info('ABANGCOLEK workspace: http://127.0.0.1:3000');
  if(!apiProcess)return await uiProcess.exited;
  const result=await Promise.race([uiProcess.exited.then(code=>({kind:'ui' as const,code})),apiProcess.exited.then(code=>({kind:'api' as const,code}))]);
  if(result.kind==='api')throw new Error(`API milik launcher berhenti (${result.code}). UI akan dihentikan.`);
  return result.code;
}

let exitCode=1;
try{
  exitCode=await run();
}catch(error){
  console.error(error instanceof Error?error.stack||error.message:'Launcher gagal bermula.');
}finally{
  try{
    await cleanup();
  }catch(err){
    console.error('Pembersihan runtime milik launcher gagal:', err);
    exitCode=1;
  }
}
process.exit(exitCode);
