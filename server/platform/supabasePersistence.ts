import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { DomainError } from './store';

export interface SnapshotRepository {
  load():Promise<{revision:number;bytes:Uint8Array|null}>;
  commit(expectedRevision:number,bytes:Uint8Array,commitId:string):Promise<void>;
}
interface TransportOptions { fetch?:(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>; timeoutMs?:number; maximumBytes?:number }
const MAXIMUM_BYTES=16*1024*1024;
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const unavailable=()=>new DomainError('PERSISTENCE_UNAVAILABLE',503,'Simpanan kekal tidak tersedia. Cuba semula.');
function identifier(value:string){if(!/^[a-zA-Z0-9_-]{1,120}$/.test(value))throw new Error('Invalid persistence identifier.');return value;}

class SupabaseTransport {
  readonly url:string;
  constructor(url:string,readonly key:string,readonly options:TransportOptions={}){
    const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error('A valid HTTPS Supabase URL is required.');
    if(!key.trim())throw new Error('A server-side Supabase credential is required.');this.url=parsed.origin;
  }
  async request(path:string,init:RequestInit={}):Promise<Response>{
    try{return await (this.options.fetch??globalThis.fetch)(this.url+path,{...init,headers:{apikey:this.key,Authorization:`Bearer ${this.key}`,...init.headers},signal:AbortSignal.timeout(this.options.timeoutMs??15000)});}catch{throw unavailable();}
  }
  async rpc(name:string,body:unknown):Promise<unknown>{
    const response=await this.request('/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!response.ok)throw unavailable();try{return await response.json();}catch{throw unavailable();}
  }
}

/** Whole-snapshot compatibility backend. PostgreSQL CAS is the authoritative commit. */
export class SupabaseSnapshotRepository implements SnapshotRepository {
  private readonly transport:SupabaseTransport;
  private readonly maximum:number;
  constructor(url:string,key:string,readonly workspace='business',options:TransportOptions={}){
    identifier(workspace);this.transport=new SupabaseTransport(url,key,options);this.maximum=options.maximumBytes??MAXIMUM_BYTES;
    if(!Number.isSafeInteger(this.maximum)||this.maximum<1||this.maximum>MAXIMUM_BYTES)throw new Error('Invalid snapshot size limit.');
  }
  async load(){
    const result=await this.transport.rpc('platform_runtime_load',{p_workspace:this.workspace}) as {revision?:unknown;payload?:unknown;sha256?:unknown};
    if(result?.revision===0&&result.payload===null)return {revision:0,bytes:null};
    if(!Number.isSafeInteger(result?.revision)||Number(result.revision)<1||typeof result.payload!=='string'||result.payload.length>this.maximum*2||!/^([a-f0-9]{2})+$/.test(result.payload))throw unavailable();
    const bytes=new Uint8Array(Buffer.from(result.payload,'hex'));
    if(digest(bytes)!==result.sha256||Buffer.from(bytes.slice(0,16)).toString()!=='SQLite format 3\0')throw unavailable();
    return {revision:Number(result.revision),bytes};
  }
  async commit(expectedRevision:number,bytes:Uint8Array,commitId:string){
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!/^[0-9a-f-]{36}$/i.test(commitId))throw unavailable();
    if(bytes.length<1||bytes.length>this.maximum)throw new DomainError('SNAPSHOT_CAPACITY',503,'Simpanan mencapai had kapasiti. Hubungi pentadbir.');
    const sha256=digest(bytes);
    try{
      const result=await this.transport.rpc('platform_runtime_commit',{p_workspace:this.workspace,p_expected_revision:expectedRevision,p_payload:Buffer.from(bytes).toString('hex'),p_sha256:sha256,p_commit_id:commitId}) as {committed?:unknown};
      if(result?.committed===true)return;
      if(result?.committed===false)throw new DomainError('SNAPSHOT_CONFLICT',409,'Data telah berubah. Muat semula sebelum mencuba lagi.');
      throw unavailable();
    }catch(error){
      if(error instanceof DomainError&&error.code==='SNAPSHOT_CONFLICT')throw error;
      // A lost acknowledgement may follow a successful transaction. Never replay the command.
      try{const receipt=await this.transport.rpc('platform_runtime_receipt',{p_workspace:this.workspace,p_commit_id:commitId}) as {committed?:unknown;sha256?:unknown};if(receipt?.committed===true&&receipt.sha256===sha256)return;}catch{/* Preserve the indeterminate outcome as unavailable. */}
      throw unavailable();
    }
  }
}

interface DurableApp {fetch(request:Request):Promise<Response>;store:{db:{serialize():Uint8Array}};close():void}
export function createDurableHandler(repository:SnapshotRepository,factory:(databasePath:string)=>DurableApp){
  const attempt=async(request:Request):Promise<Response>=>{
    let directory:string|undefined,app:DurableApp|undefined;
    try{
      const snapshot=await repository.load();directory=mkdtempSync(join(tmpdir(),'abangcolek-'));const path=join(directory,'platform.sqlite');
      if(snapshot.bytes)writeFileSync(path,snapshot.bytes,{mode:0o600,flag:'wx'});
      app=factory(path);const response=await app.fetch(request);
      await repository.commit(snapshot.revision,app.store.db.serialize(),randomUUID());
      return response;
    }catch(error){
      const domain=error instanceof DomainError?error:unavailable();
      return Response.json({ok:false,code:domain.code,message:domain.message},{status:domain.status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }finally{
      // Cleanup failures cannot replace an already committed response with an exception.
      try{app?.close();}catch{console.warn('Temporary platform database close failed.');}
      if(directory)try{rmSync(directory,{recursive:true,force:true});}catch{console.warn('Temporary platform database cleanup failed.');}
    }
  };
  return async(request:Request):Promise<Response>=>{
    // Cloud GET handlers perform reads, CSRF refresh and throttling only. A conflict
    // must rerun authorization on fresh state; POST commands are never replayed.
    const attempts=['GET','HEAD'].includes(request.method)?4:1;
    for(let index=0;index<attempts;index++){
      const response=await attempt(request);
      if(response.status!==409||index===attempts-1)return response;
      let code:unknown;try{code=(await response.clone().json()).code;}catch{return response;}
      if(code!=='SNAPSHOT_CONFLICT')return response;
      await new Promise(resolve=>setTimeout(resolve,10+Math.floor(Math.random()*30)));
    }
    throw unavailable();
  };
}

export class SupabaseEvidenceStorage {
  private readonly transport:SupabaseTransport;
  constructor(url:string,key:string,readonly workspace='business',options:TransportOptions={}){identifier(workspace);this.transport=new SupabaseTransport(url,key,options);}
  private path(id:string){return '/storage/v1/object/platform-evidence/'+this.workspace+'/'+identifier(id);}
  async write(id:string,bytes:Uint8Array,mimeType:string){
    if(!bytes.length||bytes.length>10*1024*1024||!['image/jpeg','image/png','image/webp','application/pdf','text/plain'].includes(mimeType))throw unavailable();
    const response=await this.transport.request(this.path(id),{method:'POST',headers:{'Content-Type':mimeType,'x-upsert':'false'},body:bytes as BodyInit});if(!response.ok)throw unavailable();
  }
  async read(id:string){
    const response=await this.transport.request(this.path(id));if(!response.ok)throw unavailable();
    const claimed=Number(response.headers.get('content-length')??0);if(!Number.isFinite(claimed)||claimed>10*1024*1024)throw unavailable();
    const reader=response.body?.getReader();if(!reader)throw unavailable();const chunks:Uint8Array[]=[];let size=0;
    try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>10*1024*1024)throw unavailable();chunks.push(part.value);}}catch{void reader.cancel();throw unavailable();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
  }
}
