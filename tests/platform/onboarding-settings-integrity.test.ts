import {test,expect} from 'bun:test';
import {PlatformStore} from '../../server/platform/store';
import {Auth,type Principal} from '../../server/platform/auth';
import {Commerce} from '../../server/platform/commerce';
import {BusinessOnboarding} from '../../server/platform/onboarding';
import {mapSupabaseOrderToPlatform} from '../../server/platform/migration/legacyMaps';
const owner:Principal={user:{id:'owner',email:'owner@test.local',name:'Owner'},memberships:[{id:'m',userId:'owner',workspaceId:'business',role:'founder',outletIds:['hq'],status:'active',version:1}],sessionHash:'',csrfHash:''};
const product={sku:'fresh',name:'Colek',packSize:1,unitName:'jar',priceSen:100,description:'Colek',lifecycle:'published' as const,ownerApproved:true,unverifiedFields:[]};
const approvedLocation={id:'hq',name:'HQ',address:'Address',hours:'9-5',verifiedAt:'2026-10-18T00:00:00Z',approved:true};

test('settings-only onboarding commits approved policies without requiring or duplicating products',()=>{
 const store=new PlatformStore(':memory:');try{const auth=new Auth(store),onboarding=new BusinessOnboarding(store,auth,new Commerce(store,auth));
 const packet={products:[],locations:[approvedLocation],expectedSettingsVersion:0};
 expect(onboarding.validate(packet).canCommit).toBe(true);
 const result=onboarding.commit(owner,packet);expect(result.committedProductsCount).toBe(0);expect(result.locationsCount).toBe(1);
 expect(store.all('catalogue')).toHaveLength(0);expect(onboarding.commit(owner,packet)).toEqual(result);
 const dealerTerms={minimumQuantity:10,packMultiple:2,priceBasisPoints:7000,ownership:'owned' as const,returnRules:'Sealed only',approved:true};
 expect(onboarding.commit(owner,{products:[],dealerTerms,expectedSettingsVersion:1}).committedProductsCount).toBe(0);
 expect(store.require<any>('settings','business').version).toBe(2);
 expect(()=>onboarding.commit(owner,{products:[]})).toThrow();
 expect(()=>onboarding.commit(owner,{products:[{...product,name:'',lifecycle:'draft'}],dealerTerms,expectedSettingsVersion:2})).toThrow();
 }finally{store.close();}
});

test('opening stock requires an approved packet or canonical location and rejects atomically',()=>{
 const store=new PlatformStore(':memory:');try{const auth=new Auth(store),onboarding=new BusinessOnboarding(store,auth,new Commerce(store,auth));
 for(const approved of [undefined,false]){
  expect(()=>onboarding.commit(owner,{products:[product],locations:[{id:'unknown',name:'Unknown',address:'Address',approved,openingStockQuantity:10}]})).toThrow();
  expect(store.all('catalogue')).toHaveLength(0);expect(store.all('lots')).toHaveLength(0);expect(store.all('onboarding_receipts')).toHaveLength(0);
 }
 onboarding.commit(owner,{products:[],locations:[approvedLocation],expectedSettingsVersion:0});
 expect(onboarding.commit(owner,{products:[product],locations:[{id:'hq',name:'HQ',address:'Address',openingStockQuantity:10}]}).committedProductsCount).toBe(1);
 expect(store.all<{quantity:number}>('lots')[0].quantity).toBe(10);
 expect(onboarding.commit(owner,{products:[{...product,sku:'second'}],locations:[{...approvedLocation,id:'second',openingStockQuantity:5}],expectedSettingsVersion:1}).locationsCount).toBe(1);
 expect(store.all('lots')).toHaveLength(2);
 }finally{store.close();}
});
test('approved onboarding persists versioned canonical settings and retry preserves versions',()=>{
 const store=new PlatformStore(':memory:');try{const auth=new Auth(store),onboarding=new BusinessOnboarding(store,auth,new Commerce(store,auth));
 const packet={products:[product],expectedSettingsVersion:0,locations:[{id:'hq',name:'HQ',address:'Address',hours:'9-5',verifiedAt:'2026-10-18T00:00:00Z',approved:true}],dealerTerms:{minimumQuantity:10,packMultiple:2,priceBasisPoints:7000,ownership:'owned' as const,returnRules:'Sealed only',approved:true}};
 const result=onboarding.commit(owner,packet);expect(result.locationsCount).toBe(1);const settings=store.require<any>('settings','business');expect(settings.version).toBe(1);expect(settings.approvedPolicies.locations[0].hours).toBe('9-5');expect(settings.approvedPolicies.dealer.version).toBe(1);expect(onboarding.commit(owner,packet)).toEqual(result);expect(store.require<any>('settings','business').version).toBe(1);
 expect(()=>onboarding.commit(owner,{...packet,products:[{...product,sku:'next'}]})).toThrow();expect(store.get('catalogue','prod-next')).toBeNull();
 }finally{store.close();}
});
test('unapproved locations and dealer terms never become approved settings',()=>{const store=new PlatformStore(':memory:');try{const auth=new Auth(store),onboarding=new BusinessOnboarding(store,auth,new Commerce(store,auth));const result=onboarding.commit(owner,{products:[product],locations:[{id:'hq',name:'HQ',address:'Address'}],dealerTerms:{minimumQuantity:10,packMultiple:2,priceBasisPoints:7000,ownership:'owned',returnRules:'Sealed only',approved:false}});expect(result.locationsCount).toBe(0);expect(store.get('settings','business')).toBeNull();}finally{store.close();}});
test('historical delivery never verifies payment and imported line accounting conserves sen',()=>{const row={id:'old',order_id:'old-order',items:'Original (3), Pedas (2)',amount:10.03,status:'Delivered',created_at:'2020-01-01T00:00:00Z'};const mapped=mapSupabaseOrderToPlatform(row,new Set());expect(mapped.valid).toBe(true);const order=mapped.order!;expect(order.paymentState).toBe('pending');expect(order.paidAmountSen).toBe(0);expect(order.lines.reduce((sum,line)=>sum+line.priceSen*line.quantity,0)).toBe(1003);expect((order as any).importProvenance.sourceStatus).toBe('Delivered');expect((order as any).importProvenance.paymentVerified).toBe(false);});
test('legacy import rejects malformed provenance and impossible quantities, never infers refunds',()=>{
 const row={id:'source',order_id:'order',items:'Original (2)',amount:10,status:'Refunded',created_at:'2020-01-01T00:00:00Z'};
 expect(mapSupabaseOrderToPlatform({...row,created_at:'bad'},new Set()).valid).toBe(false);
 expect(mapSupabaseOrderToPlatform({...row,items:'Original (0)'},new Set()).valid).toBe(false);
 expect(mapSupabaseOrderToPlatform({...row,order_id:123},new Set()).valid).toBe(false);
 const order=mapSupabaseOrderToPlatform(row,new Set()).order!;expect(order.refundAmountSen).toBe(0);expect(order.paidAmountSen).toBe(0);expect(order.fulfilmentStatus).toBe('cancelled');
});
