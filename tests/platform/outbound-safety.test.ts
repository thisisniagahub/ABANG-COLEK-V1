import { afterEach, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth } from '../../server/platform/auth';
import { WhatsAppService, type WhatsAppTransport } from '../../server/platform/whatsapp';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const cleanup: (()=>void)[]=[];
afterEach(()=>cleanup.splice(0).forEach(fn=>fn()));
async function fixture(send: WhatsAppTransport['sendTemplate']) {
 const dir=mkdtempSync(join(tmpdir(),'outbound-')); const store=new PlatformStore(join(dir,'db.sqlite')); const auth=new Auth(store,'bootstrap');
 const login=await auth.authenticate('bootstrap',{email:'owner@example.test',password:'secure password 123',name:'Owner',token:'bootstrap'});
 const actor=auth.resolve(new Request('http://localhost',{headers:{cookie:login.cookie}}));
 const service=new WhatsAppService(store, {} as never,{zeroNewSpend:true,phoneNumberId:'test',webhookSecret:'test',sendTemplate:send,verifyWebhookSignature:()=>false});
 cleanup.push(()=>{store.close();rmSync(dir,{recursive:true,force:true});}); return {store,auth,actor,service};
}
const input={to:'+60123456789',templateName:'order_confirmation',parameters:{order:'one'}};
test('durable WhatsApp intent prevents concurrent duplicate and mismatched replay',async()=>{
 let release!: (v:{messageId:string;status:'accepted'})=>void;let calls=0;
 const {service,actor,store}=await fixture(()=>{calls++;return new Promise(resolve=>{release=resolve;});});
 const pending=service.sendTemplateMessage(actor,input,'send-key-001');
 expect(store.all('whatsapp_receipts')).toHaveLength(1);
 const duplicate=await service.sendTemplateMessage(actor,input,'send-key-001');
 expect(calls).toBe(1);expect(duplicate.status).toBe('requested');
 await expect(service.sendTemplateMessage(actor,{...input,parameters:{order:'two'}},'send-key-001')).rejects.toThrow();
 release({messageId:'remote-one',status:'accepted'});expect((await pending).status).toBe('accepted');
});
test('ambiguous WhatsApp exception remains unknown and cannot retry',async()=>{
 let calls=0;const {service,actor}=await fixture(async()=>{calls++;throw new Error('remote accepted then connection lost');});
 expect((await service.sendTemplateMessage(actor,input,'send-key-002')).status).toBe('unknown');
 expect((await service.sendTemplateMessage(actor,input,'send-key-002')).status).toBe('unknown');expect(calls).toBe(1);
});
test('revoked session cannot send and late provider success cannot assert authorised success',async()=>{
 let release!: (v:{messageId:string;status:'accepted'})=>void;let calls=0;
 const {service,actor,store}=await fixture(()=>{calls++;return new Promise(resolve=>{release=resolve;});});
 const pending=service.sendTemplateMessage(actor,input,'send-key-003');
 store.db.run('UPDATE sessions SET revoked=1');release({messageId:'remote-one',status:'accepted'});
 expect((await pending).status).toBe('unknown');
 await expect(service.sendTemplateMessage(actor,input,'send-key-004')).rejects.toThrow();expect(calls).toBe(1);
});

import { Automation } from '../../server/automation/automation';
import { Commerce } from '../../server/platform/commerce';
import { Work } from '../../server/platform/work';
import { Marketing } from '../../server/platform/marketing';
import type { PostizPublisherTransport } from '../../server/automation/adapters';
async function publishing(send: PostizPublisherTransport['publish']) {
 const base=await fixture(async()=>({messageId:'unused',status:'accepted'}));
 const commerce=new Commerce(base.store,base.auth),work=new Work(base.store,base.auth,commerce),marketing=new Marketing(base.store,base.auth,commerce,work);
 const automation=new Automation(base.store,base.auth,commerce,work,marketing,{postiz:{zeroNewSpend:true,channel:'test',publish:send,reconcile:async()=>({providerRef:'test-ref',status:'published'}),cancel:async(ref)=>({providerRef:ref,status:'cancelled',evidenceIds:[]})}});
 const draft=marketing.save(base.actor,{title:'Campaign',objective:'Test',copy:'Approved copy',assets:[],productIds:[],catalogueVersion:commerce.version()});
 const campaign=marketing.approve(base.actor,draft.id,{expectedRevision:draft.revision,approvalExpiresAt:new Date(Date.now()+60_000).toISOString()});
 return {...base,automation,campaign,marketing};
}
test('Postiz reserves before send and rejects concurrent duplicate and mismatched account',async()=>{
 let release!: (v:{providerRef:string;status:'published'})=>void;let calls=0;
 const {automation,campaign,actor,store}=await publishing(()=>{calls++;return new Promise(resolve=>{release=resolve;});});
 const raw={expectedRevision:campaign.revision,channel:'test',accountId:'account-one'};
 const pending=automation.publishPostiz(actor,campaign.id,raw,'postiz-key-001');
 expect(store.all('postiz_publish_intents')).toHaveLength(1);
 await expect(automation.publishPostiz(actor,campaign.id,raw,'postiz-key-001')).rejects.toThrow();
 await expect(automation.publishPostiz(actor,campaign.id,{...raw,accountId:'account-two'},'postiz-key-001')).rejects.toThrow();
 release({providerRef:'remote-one',status:'published'});expect((await pending).status).toBe('published');expect(calls).toBe(1);
});
test('Postiz late success after approval changed is unknown and has no replay',async()=>{
 let release!: (v:{providerRef:string;status:'published'})=>void;
 const {automation,campaign,actor,store}=await publishing(()=>new Promise(resolve=>{release=resolve;}));
 const raw={expectedRevision:campaign.revision,channel:'test'};
 const pending=automation.publishPostiz(actor,campaign.id,raw,'postiz-key-002');
 store.save('campaigns',{...campaign,revision:campaign.revision+1,status:'draft'});
 release({providerRef:'remote-one',status:'published'});expect((await pending).status).toBe('unknown');
});
test('Postiz cancellation only accepts owned provider reference and claims before remote call',async()=>{
 const {automation,campaign,actor,store}=await publishing(async()=>({providerRef:'remote-cancel',status:'published'}));
 await automation.publishPostiz(actor,campaign.id,{expectedRevision:campaign.revision,channel:'test'},'publish-for-cancel');
 let calls=0,release!: (v:{providerRef:string;status:'cancelled';evidenceIds:string[]})=>void;
 automation.options.postiz!.cancel=()=>{calls++;return new Promise(resolve=>{release=resolve;});};
 await expect(automation.cancelPostiz(actor,{providerRef:'unowned-reference'})).rejects.toThrow();
 const pending=automation.cancelPostiz(actor,{providerRef:'remote-cancel'});
 expect(store.all('postiz_cancel_intents')).toHaveLength(1);
 expect((await automation.cancelPostiz(actor,{providerRef:'remote-cancel'})).status).toBe('unknown');
 release({providerRef:'remote-cancel',status:'cancelled',evidenceIds:[]});
 expect((await pending).status).toBe('cancelled');expect(calls).toBe(1);
});
