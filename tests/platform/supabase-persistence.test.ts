import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createDurableHandler, SupabaseSnapshotRepository, SupabaseEvidenceStorage, type SnapshotRepository } from '../../server/platform/supabasePersistence';

describe('durable request boundary', () => {
  test('parallel GET conflicts rehydrate while mutation conflicts never replay',async()=>{
    let revision=0,bytes:Uint8Array|null=null,runs=0;
    const repository:SnapshotRepository={load:async()=>({revision,bytes}),commit:async(expected,value)=>{if(expected!==revision)throw new (await import('../../server/platform/store')).DomainError('SNAPSHOT_CONFLICT',409);bytes=value;revision++;}};
    const handler=createDurableHandler(repository,path=>{const db=new Database(path,{create:true});db.run('CREATE TABLE IF NOT EXISTS reads(id INTEGER)');return {store:{db},close:()=>db.close(),fetch:async()=>{runs++;db.run('INSERT INTO reads VALUES(1)');await Bun.sleep(2);return new Response('ok');}};});
    const responses=await Promise.all(Array.from({length:4},()=>handler(new Request('https://example.test'))));expect(responses.map(value=>value.status)).toEqual([200,200,200,200]);expect(revision).toBe(4);
    const before=runs;const mutations=await Promise.all(Array.from({length:2},()=>handler(new Request('https://example.test',{method:'POST'}))));expect(mutations.map(value=>value.status).sort()).toEqual([200,409]);expect(runs-before).toBe(2);
  });
  test('holds successful cookies until commit and hydrates the next request', async () => {
    let bytes:Uint8Array|null=null,revision=0,release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const repository:SnapshotRepository={load:async()=>({bytes,revision}),commit:async(expected,value)=>{await gate;expect(expected).toBe(revision);bytes=value;revision++;}};
    const handler=createDurableHandler(repository,path=>{
      const db=new Database(path,{create:true});db.run('CREATE TABLE IF NOT EXISTS test(value INTEGER)');
      return {store:{db},close:()=>db.close(),fetch:async()=>{db.run('INSERT INTO test VALUES(1)');return new Response(String(db.query<{n:number},[]>('SELECT count(*) AS n FROM test').get()?.n),{headers:{'Set-Cookie':'session=secret'}});}};
    });
    let settled=false;const pending=handler(new Request('https://example.test')).then(result=>{settled=true;return result;});
    await Bun.sleep(10);expect(settled).toBe(false);release();
    expect((await pending).headers.get('set-cookie')).toBe('session=secret');
    expect(await (await handler(new Request('https://example.test'))).text()).toBe('2');
  });
  test('never runs the application if durable load fails',async()=>{
    let ran=false;const handler=createDurableHandler({load:async()=>{throw Error('private details');},commit:async()=>{}},()=>{ran=true;throw Error('unexpected');});
    const response=await handler(new Request('https://example.test'));expect(response.status).toBe(503);expect(ran).toBe(false);expect(await response.text()).not.toContain('private details');
  });
  test('discards cookies when commit fails',async()=>{
    const handler=createDurableHandler({load:async()=>({revision:0,bytes:null}),commit:async()=>{throw Error('offline');}},()=>({store:{db:{serialize:()=>new Uint8Array([1])}},close(){},fetch:async()=>new Response('ok',{headers:{'Set-Cookie':'secret=1'}})}));
    const response=await handler(new Request('https://example.test'));expect(response.status).toBe(503);expect(response.headers.get('set-cookie')).toBeNull();
  });
});

describe('snapshot repository',()=>{
  test('loads only a missing row as empty and verifies existing bytes',async()=>{
    const db=new Database(':memory:');db.run('CREATE TABLE test(id INTEGER)');const bytes=db.serialize();db.close();
    let result:unknown={revision:0,payload:null};
    const repository=new SupabaseSnapshotRepository('https://example.supabase.co','server-only','business',{fetch:async()=>Response.json(result)});
    expect(await repository.load()).toEqual({revision:0,bytes:null});
    result={revision:2,payload:Buffer.from(bytes).toString('hex'),sha256:new Bun.CryptoHasher('sha256').update(bytes).digest('hex')};
    expect((await repository.load()).bytes).toEqual(new Uint8Array(bytes));
    result={...(result as object),sha256:'0'.repeat(64)};await expect(repository.load()).rejects.toThrow();
  });
  test('returns a conflict without reconciliation or command retry',async()=>{
    let calls=0;const repository=new SupabaseSnapshotRepository('https://example.supabase.co','server-only','business',{fetch:async()=>{calls++;return Response.json({committed:false});}});
    try{await repository.commit(1,new Uint8Array([1]),crypto.randomUUID());throw Error('expected conflict');}catch(error){expect((error as {code:string}).code).toBe('SNAPSHOT_CONFLICT');}
    expect(calls).toBe(1);
  });
  test('cannot confirm a timeout using a receipt for different bytes',async()=>{
    const repository=new SupabaseSnapshotRepository('https://example.supabase.co','server-only','business',{fetch:async(input)=>{if(String(input).endsWith('/platform_runtime_commit'))throw Error('timeout');return Response.json({committed:true,sha256:'wrong'});}});
    await expect(repository.commit(0,new Uint8Array([1]),crypto.randomUUID())).rejects.toThrow();
  });
  test('reconciles an ambiguous committed RPC without replay',async()=>{
    const calls:string[]=[];
    const repository=new SupabaseSnapshotRepository('https://example.supabase.co','server-only','business',{fetch:async(input)=>{const url=String(input);calls.push(url);if(url.endsWith('/platform_runtime_commit'))throw Error('lost acknowledgement');return Response.json({committed:true,sha256:new Bun.CryptoHasher('sha256').update(new Uint8Array([1,2])).digest('hex')});}});
    await repository.commit(0,new Uint8Array([1,2]),crypto.randomUUID());expect(calls.length).toBe(2);
  });
  test('rejects oversized snapshots before network',async()=>{
    let calls=0;const repository=new SupabaseSnapshotRepository('https://example.supabase.co','server-only','business',{maximumBytes:1,fetch:async()=>{calls++;return Response.json({});}});
    await expect(repository.commit(0,new Uint8Array([1,2]),crypto.randomUUID())).rejects.toThrow();expect(calls).toBe(0);
  });
});

describe('private evidence storage',()=>{
  test('uses immutable scoped upload and authorized download',async()=>{
    const calls:{url:string;method:string;upsert:string|null}[]=[];
    const storage=new SupabaseEvidenceStorage('https://example.supabase.co','server-only','business',{fetch:async(input,init)=>{calls.push({url:String(input),method:init?.method??'GET',upsert:new Headers(init?.headers).get('x-upsert')});return new Response(new Uint8Array([1,2]));}});
    await storage.write('file-id',new Uint8Array([1,2]),'text/plain');expect(await storage.read('file-id')).toEqual(new Uint8Array([1,2]));
    expect(calls[0]).toEqual({url:'https://example.supabase.co/storage/v1/object/platform-evidence/business/file-id',method:'POST',upsert:'false'});
    await expect(storage.read('../other')).rejects.toThrow();
  });
  test('rejects unavailable and oversized downloads',async()=>{
    const missing=new SupabaseEvidenceStorage('https://example.supabase.co','server-only','business',{fetch:async()=>new Response('',{status:404})});await expect(missing.read('file-id')).rejects.toThrow();
    const huge=new SupabaseEvidenceStorage('https://example.supabase.co','server-only','business',{fetch:async()=>new Response('',{headers:{'Content-Length':String(11*1024*1024)}})});await expect(huge.read('file-id')).rejects.toThrow();
  });
});
