import {test,expect} from 'bun:test';
import {createPlatformApp} from '../../server/platform/app';
import {DomainError} from '../../server/platform/store';

test('verified Google identity creates only a canonical customer session and refuses implicit account switch',async()=>{
 let calls=0;const app=createPlatformApp({databasePath:':memory:',googleIdentityVerifier:async()=>{calls++;return {issuer:'https://project.supabase.co/auth/v1',subject:crypto.randomUUID(),email:'google-new@example.test',name:'Customer'};}});
 try{
  const providers=await app.fetch(new Request('https://shop.test/api/platform/auth/providers'));expect((await providers.json()).data.google).toBe(true);
  const login=(cookie='')=>app.fetch(new Request('https://shop.test/api/platform/auth/google',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({accessToken:'verified-token'})}));
  const response=await login();expect(response.status).toBe(200);const body=await response.json();expect(body.data.memberships.map((m:{role:string})=>m.role)).toEqual(['customer']);expect(response.headers.get('set-cookie')).toContain('; Secure');
  const cookie=response.headers.get('set-cookie')!.split(';')[0];expect((await login(cookie)).status).toBe(409);expect(calls).toBe(1);
 }finally{app.close();}
});
test('Google exchange rejects wrong Origin, unknown fields and unavailable or invalid identity',async()=>{
 const app=createPlatformApp({databasePath:':memory:',googleIdentityVerifier:async()=>{throw new DomainError('GOOGLE_IDENTITY_INVALID',401);}});
 try{
  const request=(origin:string,body:unknown)=>app.fetch(new Request('https://shop.test/api/platform/auth/google',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  expect((await request('https://untrusted.test',{accessToken:'x'})).status).toBe(403);
  expect((await request('http://localhost:3000',{accessToken:'x',role:'founder'})).status).toBe(400);
  expect((await request('http://localhost:3000',{accessToken:'x'})).status).toBe(401);expect(app.store.db.query<{n:number},[]>('SELECT count(*) AS n FROM users').get()?.n).toBe(0);
 }finally{app.close();}
 const unavailable=createPlatformApp({databasePath:':memory:'});try{expect((await unavailable.fetch(new Request('http://localhost:3000/api/platform/auth/google',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({accessToken:'x'})}))).status).toBe(503);}finally{unavailable.close();}
});
