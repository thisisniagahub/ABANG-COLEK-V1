import {expect,test} from 'bun:test';
import {createPlatformApp} from '../../server/platform/app';
import {call,user} from './backend-security.test';

test('remote evidence validates integrity and revalidates authority after storage awaits',async()=>{
  const objects=new Map<string,Uint8Array>();let afterRead:(()=>void)|undefined,afterWrite:(()=>void)|undefined;
  const app=createPlatformApp({databasePath:':memory:',bootstrapToken:'test-bootstrap-token-long-enough',origin:'http://localhost:3000',evidenceStorage:{async write(id,bytes){objects.set(id,bytes);afterWrite?.();},async read(id){afterRead?.();return objects.get(id)!;}}});
  try{
    const founder=await user(app,'remote-founder',true);
    const product=(await call(app,'/catalogue',{name:'Remote',description:'Test',priceSen:100,packSize:1,publish:true},founder)).json.data;
    await call(app,'/inventory/receive',{productId:product.id,ownerId:'business',locationId:'hq',quantity:2,status:'available',reason:'Test'},founder);
    const order=(await call(app,'/orders',{lines:[{productId:product.id,quantity:1}],catalogueVersion:1,fulfilment:'pickup',contactRef:'Test'},founder)).json.data;
    const upload=()=>{const body=new FormData();body.set('entityId',order.id);body.set('file',new File(['proof'],'proof.txt',{type:'text/plain'}));return app.fetch(new Request('http://localhost:3010/api/platform/evidence/upload',{method:'POST',headers:{Origin:'http://localhost:3000',Cookie:founder.cookie,'X-CSRF-Token':founder.csrf},body}));};
    expect((await upload()).status).toBe(200);
    const listing=(await call(app,`/evidence?entityId=${order.id}`,undefined,founder)).json.data;
    const download=()=>app.fetch(new Request('http://localhost:3010'+listing[0].downloadUrl,{headers:{Cookie:founder.cookie}}));
    expect(await (await download()).text()).toBe('proof');
    const id=listing[0].id;objects.set(id,new TextEncoder().encode('tampered'));
    expect((await download()).status).toBe(409);objects.set(id,new TextEncoder().encode('proof'));
    afterRead=()=>{app.store.db.run('UPDATE sessions SET revoked=1');};expect((await download()).status).toBe(401);
    afterRead=undefined;
    const login=await call(app,'/auth/login',{email:'remote-founder@example.test',password:'a strong local password 123'});founder.cookie=login.response.headers.get('set-cookie')!.split(';')[0];founder.csrf=login.json.data.csrfToken;
    afterWrite=()=>{app.store.db.run('UPDATE sessions SET revoked=1');};expect((await upload()).status).toBe(401);expect(app.store.all('evidence')).toHaveLength(1);expect(objects.size).toBe(2);
  }finally{app.close();}
});
