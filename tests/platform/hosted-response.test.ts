import {expect,test} from 'bun:test';
import {boundHostedResponse} from '../../server/platform/hostedResponse';

test('hosted downloads preserve signed response bytes and private headers within the limit',async()=>{
 const response=await boundHostedResponse(new Response('proof',{headers:{'Content-Type':'text/plain','Cache-Control':'no-store','Content-Disposition':'attachment; filename="proof.txt"'}}),5);
 expect(response.status).toBe(200);expect(await response.text()).toBe('proof');expect(response.headers.get('content-disposition')).toContain('proof.txt');
});
test('oversized streamed or declared downloads return bounded failure without success cookies',async()=>{
 const cases:Record<string,string>[]=[{'Set-Cookie':'private=success'},{'Content-Length':'6','Set-Cookie':'private=success'}];
 for(const headers of cases){
  const response=await boundHostedResponse(new Response('123456',{headers}),5);
  expect(response.status).toBe(413);expect(response.headers.get('set-cookie')).toBeNull();expect((await response.json()).code).toBe('HOSTED_DOWNLOAD_TOO_LARGE');
 }
});
test('hosted download deadline cancels a stalled response and preserves empty-body status',async()=>{
 let cancelled=false;const body=new ReadableStream<Uint8Array>({cancel(){cancelled=true;}});
 expect((await boundHostedResponse(new Response(body),5,10)).status).toBe(504);expect(cancelled).toBe(true);
 expect((await boundHostedResponse(new Response(null,{status:204}),5)).status).toBe(204);
});
