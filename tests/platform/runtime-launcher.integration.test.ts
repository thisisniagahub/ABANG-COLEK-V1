import { expect, test } from 'bun:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const sourceRoot=resolve(import.meta.dir,'../..');

function fixture(uiExit=0){
  const directory=mkdtempSync(join(tmpdir(),'abangcolek-launcher-'));
  const checkout=join(directory,'checkout'),runtime=join(directory,'runtime');
  mkdirSync(join(checkout,'scripts'),{recursive:true});
  cpSync(join(sourceRoot,'scripts/dev.ts'),join(checkout,'scripts/dev.ts'));
  cpSync(join(sourceRoot,'server'),join(checkout,'server'),{recursive:true});
  cpSync(join(sourceRoot,'shared'),join(checkout,'shared'),{recursive:true});
  const ui=join(checkout,'node_modules/vite/bin');mkdirSync(ui,{recursive:true});
  writeFileSync(join(ui,'vite.js'),`const fs=require('node:fs');fs.writeFileSync(${JSON.stringify(join(directory,'ui-started.json'))},JSON.stringify({target:process.env.PLATFORM_API_TARGET}));setTimeout(()=>process.exit(${uiExit}),150);`);
  return {directory,checkout,runtime,marker:join(directory,'ui-started.json')};
}

function sparePort(){const reservation=Bun.serve({hostname:'127.0.0.1',port:0,fetch:()=>new Response('reservation')});const port=reservation.port!;reservation.stop(true);return port;}

async function runLauncher(f:ReturnType<typeof fixture>,port:number,overrides:Record<string,string>={}){
  const child=Bun.spawn([process.execPath,'scripts/dev.ts'],{cwd:f.checkout,env:{...process.env,PLATFORM_HOST:'127.0.0.1',PLATFORM_PORT:String(port),PLATFORM_RUNTIME_ROOT:f.runtime,PLATFORM_ALLOWED_ORIGINS:'http://127.0.0.1:3000',...overrides},stdout:'pipe',stderr:'pipe'});
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const code=await Promise.race([child.exited,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Isolated launcher did not terminate.')),15000);})]);
    return {code,stdout:await new Response(child.stdout).text(),stderr:await new Response(child.stderr).text()};
  }finally{if(timer)clearTimeout(timer);if(child.exitCode===null){child.kill();await child.exited;}}
}

function cleanup(f:ReturnType<typeof fixture>){
  // Only synthetic checkout data can be removed, never the operator's runtime.
  expect(f.directory.startsWith(join(tmpdir(),'abangcolek-launcher-'))).toBe(true);
  rmSync(f.directory,{recursive:true,force:true});
}

test('invalid config creates no runtime directory in server or launcher',async()=>{
  const f=fixture();
  try{
    const server=Bun.spawn([process.execPath,'server/index.ts'],{cwd:f.checkout,env:{...process.env,PLATFORM_PORT:'invalid',PLATFORM_RUNTIME_ROOT:f.runtime},stdout:'ignore',stderr:'ignore'});
    expect(await server.exited).not.toBe(0);expect(existsSync(f.runtime)).toBe(false);
    const result=await runLauncher(f,sparePort(),{PLATFORM_HOST:'0.0.0.0',PLATFORM_ALLOWED_ORIGINS:'https://example.test'});
    expect(result.code).not.toBe(0);expect(existsSync(f.runtime)).toBe(false);expect(existsSync(f.marker)).toBe(false);
  }finally{cleanup(f);}
},20000);

test('reachable missing/malformed/error identity aborts and never stops existing listener',async()=>{
  for(const response of [()=>Response.json({ok:true,data:{localOnly:true}}),()=>new Response('not json'),()=>new Response('unavailable',{status:503})]){
    const f=fixture();let requests=0;
    const listener=Bun.serve({hostname:'127.0.0.1',port:0,fetch:()=>{requests++;return response();}});
    try{
      const result=await runLauncher(f,listener.port!);
      expect(result.code).not.toBe(0);expect(existsSync(f.marker)).toBe(false);expect(existsSync(f.runtime)).toBe(false);
      const before=requests;await fetch(`http://127.0.0.1:${listener.port}/still-owned`);expect(requests).toBe(before+1);
    }finally{listener.stop(true);cleanup(f);}
  }
},30000);

test('source and data mismatch do not spawn UI or mutate selected runtime',async()=>{
  const {createRuntimeIdentity}=await import('../../server/runtime-identity');
  for(const mismatch of ['source','runtime','database'] as const){
    const f=fixture();const identity=createRuntimeIdentity({checkoutRoot:mismatch==='source'?join(f.directory,'other-checkout'):f.checkout,runtimeRoot:mismatch==='runtime'?join(f.directory,'other-runtime'):f.runtime,...(mismatch==='database'?{databasePath:join(f.directory,'other.sqlite')}:{})});
    const listener=Bun.serve({hostname:'127.0.0.1',port:0,fetch:()=>Response.json(identity)});
    try{const result=await runLauncher(f,listener.port!);expect(result.code).not.toBe(0);expect(existsSync(f.marker)).toBe(false);expect(existsSync(f.runtime)).toBe(false);expect((await fetch(`http://127.0.0.1:${listener.port}`)).status).toBe(200);}
    finally{listener.stop(true);cleanup(f);}
  }
},30000);

test('matching listener is reused and retained when owned UI exits',async()=>{
  const {createRuntimeIdentity}=await import('../../server/runtime-identity');const f=fixture();
  const listener=Bun.serve({hostname:'127.0.0.1',port:0,fetch:()=>Response.json(createRuntimeIdentity({checkoutRoot:f.checkout,runtimeRoot:f.runtime}))});
  try{const result=await runLauncher(f,listener.port!);expect(result.code).toBe(0);expect(JSON.parse(readFileSync(f.marker,'utf8')).target).toBe(`http://127.0.0.1:${listener.port}`);expect(existsSync(f.runtime)).toBe(false);expect((await fetch(`http://127.0.0.1:${listener.port}`)).status).toBe(200);}
  finally{listener.stop(true);cleanup(f);}
},20000);

test('new owned API is verified and cleaned after successful or failed UI exit',async()=>{
  for(const uiExit of [0,7]){
    const f=fixture(uiExit),port=sparePort();
    try{
      const result=await runLauncher(f,port);expect(result.code).toBe(uiExit);expect(existsSync(f.marker)).toBe(true);
      expect(existsSync(join(f.runtime,'log/dev-api.log'))).toBe(true);expect(existsSync(join(f.checkout,'var/log/dev-api.log'))).toBe(false);
      let reachable=true;try{await fetch(`http://127.0.0.1:${port}/api/platform/runtime-identity`,{signal:AbortSignal.timeout(500)});}catch{reachable=false;}
      expect(reachable).toBe(false);
      // Renaming/deleting the fixture also proves owned log descriptors were closed.
    }finally{cleanup(f);}
  }
},30000);

test('own API startup failure prevents UI and exits cleanly',async()=>{
  const f=fixture();writeFileSync(join(f.checkout,'server/index.ts'),'process.exit(9);');
  try{const result=await runLauncher(f,sparePort());expect(result.code).not.toBe(0);expect(existsSync(f.marker)).toBe(false);expect(existsSync(join(f.runtime,'log/dev-api.log'))).toBe(true);}
  finally{cleanup(f);}
},20000);

test('slow or redirecting reachable listener fails closed without creating runtime',async()=>{
  for(const slow of [true,false]){
    const f=fixture();
    const listener=Bun.serve({hostname:'127.0.0.1',port:0,fetch:()=>slow?new Promise<Response>(()=>{}):new Response(null,{status:302,headers:{location:'http://127.0.0.1:1'}})});
    try{const result=await runLauncher(f,listener.port!);expect(result.code).not.toBe(0);expect(existsSync(f.runtime)).toBe(false);expect(existsSync(f.marker)).toBe(false);expect(listener.port).toBeGreaterThan(0);}
    finally{listener.stop(true);cleanup(f);}
  }
},15000);

test('IPv6 loopback target is used when matching listener is reused',async()=>{
  const {createRuntimeIdentity}=await import('../../server/runtime-identity');const f=fixture();
  const listener=Bun.serve({hostname:'::1',port:0,fetch:()=>Response.json(createRuntimeIdentity({checkoutRoot:f.checkout,runtimeRoot:f.runtime}))});
  try{const result=await runLauncher(f,listener.port!,{PLATFORM_HOST:'::1'});expect(result.code).toBe(0);expect(JSON.parse(readFileSync(f.marker,'utf8')).target).toBe(`http://[::1]:${listener.port}`);}
  finally{listener.stop(true);cleanup(f);}
},15000);

test('owned API reporting wrong identity is stopped before UI startup',async()=>{
  const f=fixture(),port=sparePort();
  writeFileSync(join(f.checkout,'server/index.ts'),`Bun.serve({hostname:'127.0.0.1',port:Number(process.env.PLATFORM_PORT),fetch:()=>Response.json({ok:true})});`);
  try{const result=await runLauncher(f,port);expect(result.code).not.toBe(0);expect(existsSync(f.marker)).toBe(false);let reachable=true;try{await fetch(`http://127.0.0.1:${port}`);}catch{reachable=false;}expect(reachable).toBe(false);}
  finally{cleanup(f);}
},15000);

test('UI spawn failure still closes the owned API and log',async()=>{
  const f=fixture(),port=sparePort();rmSync(join(f.checkout,'node_modules'),{recursive:true,force:true});
  try{const result=await runLauncher(f,port);expect(result.code).not.toBe(0);let reachable=true;try{await fetch(`http://127.0.0.1:${port}`);}catch{reachable=false;}expect(reachable).toBe(false);expect(existsSync(join(f.runtime,'run/platform.pid'))).toBe(false);}
  finally{cleanup(f);}
},15000);
