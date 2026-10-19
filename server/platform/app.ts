import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { BackupScheduler, type BackupSchedulerOptions } from './backupScheduler';
import type { BusinessSettings, CatalogueProduct, PlatformOverview, CaseRecord, EvidenceRecord, JobRecord } from '../../shared/platform-contracts';
import { Auth, type Principal } from './auth';
import { Commerce } from './commerce';
import { DomainError, fail, now, object, PlatformStore, text, fields, oneOf, strings, list, integer } from './store';
import { Work } from './work';
import { Dealers } from './dealers';
import { Marketing } from './marketing';
import { Operations } from './operations';
import { Flows } from './flows';
import { Jobs } from '../automation/jobs';
import { AutomationDefinitions } from '../automation/definitions';
import { boundedBody, EvidenceFiles, type EvidenceStorage } from './evidenceFiles';
import { assessState } from './jev/assessment';
import type { JevAssessment, JevPackId, JevState } from '../../shared/jev-contracts';
import { generateLegacyContent } from './legacyAi';
import { RuntimeControlCommands } from './runtimeControls';
import { Automation } from '../automation/automation';
import { JevEvaluations } from './jev/evaluations';
import { Reports } from './reports';
import { OperationalAmendments } from './operationalAmendments';
import { BusinessOnboarding } from './onboarding';
import { LegacyMigrationReconciler } from './migration/migrationReconciler';
import { WhatsAppService, type WhatsAppTransport } from './whatsapp';
import { LegacyPilotsService, VERIFIED_BUS_ROUTES, type FounderProposalExecutor } from './legacyPilots';
import { FounderIntelligence } from './founder-intelligence';
import type { GoogleIdentityVerifier } from './googleIdentity';
import { SocialConnections } from './social';

import { HermesAdapter, type AutomationOptions } from '../automation/adapters';

import { Loyalty } from './loyalty';
import { GoogleAdkAgent, A2UI_ALLOWLISTED_COMPONENTS } from './adkAgent';
import { FreeModelRouter } from './freeModelRouter';
import { globalDomainTools, getActorCanonicalRole } from './domainTools';
import { operationsBriefApp } from './mcp/operationsBrief';

export interface PlatformAppOptions { googleIdentityVerifier?:GoogleIdentityVerifier; persistenceMode?:'local'|'supabase'; evidenceStorage?:EvidenceStorage; databasePath?:string; bootstrapToken?:string; origin?:string; allowedOrigins?:string[]; rateLimits?:{identityGlobal:number;identityAccount:number;actor:number}; automationOptions?:AutomationOptions; whatsappTransport?:WhatsAppTransport; adkAgent?:GoogleAdkAgent; freeModelRouter?:FreeModelRouter; backupScheduler?:BackupSchedulerOptions|boolean; log?:(entry:{requestId:string;code:string;status:number})=>void }
const cookieClear='platform_session=; HttpOnly; SameSite=Strict; Path=/api/platform; Max-Age=0';
export function createPlatformApp(options:PlatformAppOptions={}) {
  const store=new PlatformStore(options.databasePath??'var/lib/platform/platform.sqlite');
  const dbPath=options.databasePath??'var/lib/platform/platform.sqlite';
  const dbDir=dbPath===':memory:'?tmpdir():dirname(resolve(dbPath));
  const backupScheduler=new BackupScheduler(store,{
    evidenceDirectory:join(dbDir,'evidence'),
    snapshotsDirectory:join(dbDir,'backups'),
    intervalMs:4*60*60*1000,
    autoStart:options.backupScheduler!==false,
    ...(typeof options.backupScheduler==='object'?options.backupScheduler:{}),
  });
  const auth=new Auth(store,options.bootstrapToken),loyalty=new Loyalty(store,auth),commerce=new Commerce(store,auth,loyalty),work=new Work(store,auth,commerce);
  const dealers=new Dealers(store,auth,commerce),marketing=new Marketing(store,auth,commerce,work),operations=new Operations(store,auth,commerce,work);
  const flows=new Flows(store,auth,commerce,work,dealers),jobs=new Jobs(store,auth,commerce,work),automationDefinitions=new AutomationDefinitions(store,auth),evidenceFiles=new EvidenceFiles(store,work,options.databasePath??'var/lib/platform/platform.sqlite',options.evidenceStorage);
  const runtimeControls=new RuntimeControlCommands(store,auth);
  const automation=new Automation(store,auth,commerce,work,marketing,options.automationOptions),jevEvaluations=new JevEvaluations(store,auth,commerce,work);
  const reports=new Reports(store,auth,commerce,work);
  const amendments=new OperationalAmendments(store,auth,operations,work);
  const onboarding=new BusinessOnboarding(store,auth,commerce);
  const migration=new LegacyMigrationReconciler(store,auth);
  const whatsapp=new WhatsAppService(store,flows,options.whatsappTransport);
  const legacyPilots=new LegacyPilotsService(store);
  const founderIntelligence=new FounderIntelligence(store,auth);
  const social=new SocialConnections(auth);
  const freeModelRouter=options.freeModelRouter??new FreeModelRouter();
  const adkAgent=options.adkAgent??new GoogleAdkAgent(store,auth,commerce,dealers,loyalty,{router:freeModelRouter});
  const origin=options.origin??'http://localhost:3000';
  const allowedOrigins=options.allowedOrigins??[origin];
  function json(data:unknown,status=200,extra:Record<string,string>={}) {return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra}});}
  function collection(data:unknown[],url:URL) {
    const limitValue=url.searchParams.get('limit')??'100',offsetValue=url.searchParams.get('offset')??'0';
    if(!/^\d+$/.test(limitValue)||!/^\d+$/.test(offsetValue))fail('INVALID_PAGINATION');
    const limit=Math.min(100,Number(limitValue)),offset=Number(offsetValue);
    if(limit<1||!Number.isSafeInteger(offset)||offset<0)fail('INVALID_PAGINATION');
    return json({ok:true,data:data.slice(offset,offset+limit)},200,{'X-Total-Count':String(data.length),'X-Next-Offset':offset+limit<data.length?String(offset+limit):''});
  }
  function overview(actor:Principal):PlatformOverview {auth.founder(actor);const orders=commerce.orders(actor);return {orders:orders.length,orderValueSen:orders.filter(o=>o.fulfilmentStatus!=='cancelled').reduce((sum,o)=>sum+o.amountSen,0),verifiedPaymentSen:orders.reduce((sum,o)=>sum+o.paidAmountSen-o.refundAmountSen,0),fulfilledOrders:orders.filter(o=>o.fulfilmentStatus==='received').length,openCases:work.cases(actor).filter(c=>c.status!=='resolved').length,openTasks:work.tasks(actor).filter(t=>t.status!=='done').length,pendingDealerApplications:store.all<{status:string}>('dealer_applications').filter(a=>a.status==='pending').length,stockAvailable:commerce.catalogue().reduce((sum,p)=>sum+p.availableQuantity,0),generatedAt:now(),source:'local_authoritative',empty:orders.length===0};}
  function postRoute(actor:Principal,path:string,input:unknown,key:string|null,url:URL) {
    if(!['/tasks','/documents','/calendar','/campaigns','/cases'].includes(path))return route(actor,'POST',path,input,key,url);
    const body=object(input);
    // Receipt replay must recheck current source authority before reading cached data.
    if(path==='/cases')commerce.order(actor,text(body.orderId));
    else {
      work.staff(actor);
      if(body.entityId&&body.entityId!=='business')work.entity(actor,text(body.entityId));
      if(path==='/tasks'){for(const documentId of strings(body.documentIds??[]))work.document(actor,documentId);if(body.outletId)auth.operational(actor,text(body.outletId));}
      if(path==='/calendar'||path==='/documents')for(const entityId of strings(body.entityIds??[]))if(entityId!=='business')work.entity(actor,entityId);
      if(path==='/documents'&&body.researchBriefIds!==undefined){auth.founder(actor);for(const briefId of strings(body.researchBriefIds)){const brief=store.require<{ownerId:string}>('research_briefs',briefId);if(brief.ownerId!==actor.user.id)fail('FORBIDDEN',403);}}
      if(path==='/campaigns')for(const item of list(body.assets??[],50)){const asset=object(item);if(asset.evidenceId){const evidence=store.require<EvidenceRecord>('evidence',text(asset.evidenceId));work.entity(actor,evidence.entityId);}}
    }
    return commerce.idem(actor,'create:'+path,key,input,()=>route(actor,'POST',path,input,key,url));
  }
  function route(actor:Principal,method:string,path:string,input:unknown,key:string|null,url:URL):unknown {
    const segments=path.split('/').filter(Boolean), recordId=segments[1], command=segments[2];
    if(method==='GET') {
      if(path==='/session')return auth.refreshCsrf(actor);
      if(path==='/catalogue/admin'){auth.founder(actor);return store.all<CatalogueProduct>('catalogue').map(p=>({...p,availableQuantity:commerce.available(p.id)}));}
      if(path==='/orders')return commerce.orders(actor);
      if(path==='/orders/track'){const token=url.searchParams.get('token');if(!token)fail('INVALID_TOKEN',400,'Token penjejakan diperlukan.');return commerce.trackOrder(token);}
      if(segments[0]==='orders'&&recordId&&!command)return commerce.order(actor,recordId);
      if(path==='/cases')return work.cases(actor);
      if(segments[0]==='cases'&&recordId){if(command==='messages')return work.messages(actor,recordId);return work.case(actor,recordId);}
      if(path==='/evidence')return evidenceFiles.list(actor,url.searchParams.get('entityId')??'');
      if(path==='/tasks')return work.tasks(actor);
      if(path==='/tasks/summary')return reports.taskSummary(actor);
      if(path==='/finance/summary')return reports.financeSummary(actor);
      if(segments[0]==='tasks'&&recordId&&command==='collaboration')return work.collaboration(actor,recordId);
      if(segments[0]==='documents'&&recordId&&command==='versions')return work.documentVersions(actor,recordId);
      if(path==='/documents')return work.documents(actor);
      if(segments[0]==='documents'&&recordId&&!command)return work.document(actor,recordId);
      if(segments[0]==='tasks'&&recordId&&!command)return work.task(actor,recordId);
      if(path==='/knowledge')return work.knowledge(actor,url.searchParams.get('q')??'');
      if(path==='/calendar')return work.calendar(actor);
      if(path==='/calendar/derived')return reports.calendar(actor);
      if(path==='/reports/definitions')return reports.definitions(actor);
      if(path==='/reports/build')return reports.build(actor,Object.fromEntries(url.searchParams),oneOf(url.searchParams.get('format')??'csv',['csv','html'] as const));
      if(path==='/campaigns')return marketing.all(actor);
      if(path==='/social/connectors')return social.snapshot(actor);
      if(path==='/founder-intelligence/identities')return founderIntelligence.identities(actor);
      if(path==='/founder-intelligence/content')return founderIntelligence.content(actor);
      if(path==='/founder-intelligence/events')return founderIntelligence.events(actor);
      if(path==='/founder-intelligence/analytics')return founderIntelligence.analytics(actor);
      if(path==='/dealer/applications')return dealers.applications(actor);
      if(path==='/dealer/restocks')return dealers.restocks(actor);
      if(path==='/dealer/terms'){if(!actor.memberships.some(m=>m.dealerOrgId)&&!auth.has(actor,'founder'))fail('FORBIDDEN',403);return operations.settings().approvedPolicies.dealer??null;}
      if(path==='/dealer/benefits')return dealers.benefits(actor);
      if(path==='/dealer/ledger')return dealers.ledger(actor);
      if(path==='/dealer/commission-policies'){auth.founder(actor);return store.all('commission_policies');}
      if(path==='/dealer/commissions')return dealers.commissions(actor,url.searchParams.get('dealerOrgId')??undefined);
      if(path==='/dealer/commissions/summary')return dealers.commissionSummary(actor,url.searchParams.get('dealerOrgId')??undefined);
      if(path==='/loyalty/balance'||path==='/loyalty/summary')return loyalty.getSummary(actor.user.id);
      if(path==='/loyalty/entries')return loyalty.getEntries(actor.user.id);
      if(path==='/loyalty/account'&&url.searchParams.get('userId')){auth.founder(actor);return loyalty.getSummary(url.searchParams.get('userId')!);}
      if(path==='/expenses')return operations.expenses(actor);
      if(path==='/dayclose/amendments')return amendments.dayCloseHistory(actor);
      if(path==='/expense-postings')return amendments.postings(actor);
      if(path==='/expense-postings/summary')return amendments.postingSummary(actor);
      if(path==='/people/invitations')return amendments.invitations(actor);
      if(path==='/availability')return amendments.availability(actor);
      if(path==='/notification-preferences')return amendments.preferences(actor);
      if(path==='/notifications')return amendments.notifications(actor);
      if(segments[0]==='record-context'&&recordId){
        const section=oneOf(url.searchParams.get('section'),['marketing','dealers','business','inventory','qc','shifts','finance'] as const);
        const kinds:Record<string,string[]>={marketing:['campaigns'],dealers:['restocks'],business:['restocks'],inventory:['lots'],qc:['qc'],shifts:['shifts','dayclose'],finance:['expenses','dayclose']};
        work.entity(actor,recordId);const kind=kinds[section].find(value=>store.get(value,recordId));if(!kind)fail('NOT_FOUND',404);
        return {kind,record:store.require<Record<string,unknown>>(kind,recordId)};
      }
      if(path==='/shifts')return operations.scoped(actor,'shifts');
      if(path==='/qc')return operations.scoped(actor,'qc');
      if(path==='/qc/sops'){work.staff(actor);return store.all('qc_sops');}
      if(path==='/dayclose')return operations.scoped(actor,'dayclose');
      if(path==='/reconciliations'){auth.founder(actor);return store.all('reconciliations');}
      if(path==='/payments'){auth.founder(actor);return store.all('payments');}
      if(path==='/jobs')return jobs.all(actor);
      if(path==='/automations')return automationDefinitions.all(actor);
      if(path==='/automation-runs')return automationDefinitions.runs(actor);
      if(path==='/runtime-controls')return runtimeControls.get(actor);
      if(path==='/automation/capabilities')return automation.capabilities(actor);
      if(path==='/automation/exports')return automation.exports(actor);
      if(path==='/research/sources')return automation.sources(actor);
      if(path==='/research/briefs')return automation.briefs(actor);
      if(path==='/research/grants')return automation.grants(actor);
      if(path==='/jev/packs')return jevEvaluations.packs(actor);
      if(path==='/jev/assessments')return jevEvaluations.assessments(actor);
      if(path==='/jev/evaluations')return jevEvaluations.evaluations(actor);
      if(path==='/jev/context')return jevEvaluations.context(actor,url.searchParams.get('packId')??'',url.searchParams.get('entityId')??'');
      if(path==='/quotas'){runtimeControls.authorized(actor);return [jobs.usage(),...['hermes','nvidia','postiz','agent_reach'].map(providerId=>({providerId,observedUnits:null,limitUnits:null,available:false,observedAt:now()}))];}
      if(segments[0]==='jobs'&&recordId&&command==='artifacts'){auth.founder(actor);return store.all<{jobId:string}>('job_artifacts').filter(a=>a.jobId===recordId);}
      if(path==='/flows')return flows.all();
      if(segments[0]==='flow-sessions'&&recordId)return flows.session(actor,recordId);
      if(path==='/decisions'){auth.founder(actor);return {cases:work.cases(actor).filter(c=>c.status!=='resolved'),dealerApplications:dealers.applications(actor).filter(a=>a.status==='pending'),campaigns:marketing.all(actor).filter(c=>c.status==='draft'),expenses:operations.expenses(actor).filter(e=>e.status==='draft'),dayclose:operations.scoped<{outletId:string;status:string}>(actor,'dayclose').filter(d=>d.status==='review')};}
      if(path==='/reports/export'){auth.founder(actor);const kind=oneOf(url.searchParams.get('kind'),['orders','tasks','expenses'] as const);const rows=kind==='orders'?commerce.orders(actor).map(o=>({id:o.id,createdAt:o.createdAt,amountSen:o.amountSen,paymentState:o.paymentState,fulfilmentStatus:o.fulfilmentStatus,revision:o.revision})):kind==='tasks'?work.tasks(actor).map(t=>({id:t.id,title:t.title,status:t.status,outcome:t.outcome??'',revision:t.revision})):operations.expenses(actor).map(e=>({id:e.id,outletId:e.outletId,amountSen:e.amountSen,category:e.category,status:e.status,revision:e.revision}));const columns=kind==='orders'?['id','createdAt','amountSen','paymentState','fulfilmentStatus','revision']:kind==='tasks'?['id','title','status','outcome','revision']:['id','outletId','amountSen','category','status','revision'];const escape=(value:unknown)=>{const safe=String(value??'');return `"${(/^\s*[=+@-]/.test(safe)?"'"+safe:safe).replaceAll('"','""')}"`;};const content=[columns.map(escape).join(','),...rows.map(row=>columns.map(key=>escape((row as Record<string,unknown>)[key])).join(','))].join('\r\n');return {content,filename:`abangcolek-${kind}-${now().slice(0,10)}.csv`,generatedAt:now(),sourceVersions:{catalogue:commerce.version()},recordCount:rows.length};}
      if(path==='/inventory'){if(auth.has(actor,'developer')&&!auth.has(actor,'founder'))fail('FORBIDDEN',403);return commerce.inventory(actor);}
      if(path==='/overview')return overview(actor);
      if(path==='/people'){auth.founder(actor);return store.db.query<{id:string;email:string;name:string},[]>('SELECT id,email,name FROM users ORDER BY created_at').all().map(u=>({...u,memberships:auth.memberships(u.id)}));}
      if(path==='/settings'){if(auth.has(actor,'founder'))return operations.settings();const s=operations.settings();return {...s,approvedPolicies:{paymentInstructions:s.approvedPolicies.paymentInstructions,contact:s.approvedPolicies.contact,locations:s.approvedPolicies.locations,...(actor.memberships.some(m=>m.dealerOrgId)?{dealer:s.approvedPolicies.dealer}:{})}};}
      if(path==='/health'){if(!auth.has(actor,'founder')&&!auth.has(actor,'developer'))fail('FORBIDDEN',403);const rpo=backupScheduler.checkRpoStatus();return [{component:'platform_database',status:'ready',observedAt:now(),reasonCode:options.persistenceMode==='supabase'?'SUPABASE_SNAPSHOT':'LOCAL_SQLITE'},{component:'disaster_recovery_rpo',status:rpo.compliant?'ready':(rpo.status==='no_snapshot'?'ready':'degraded'),observedAt:now(),reasonCode:rpo.reasonCode},{component:'hermes',status:options.automationOptions?.hermes?'ready':'unavailable',observedAt:now(),reasonCode:options.automationOptions?.hermes?'LOCAL_HERMES_TRANSPORT_ACTIVE':'ADAPTER_NOT_VERIFIED'},{component:'native_whatsapp',status:options.whatsappTransport?'ready':'unavailable',observedAt:now(),reasonCode:options.whatsappTransport?'WHATSAPP_TRANSPORT_ACTIVE':'FEATURE_DISABLED'},{component:'postiz',status:options.automationOptions?.postiz?'ready':'unavailable',observedAt:now(),reasonCode:options.automationOptions?.postiz?'LOCAL_POSTIZ_TRANSPORT_ACTIVE':'ADAPTER_NOT_VERIFIED'},{component:'agent_reach',status:options.automationOptions?.agentReach?'ready':'unavailable',observedAt:now(),reasonCode:options.automationOptions?.agentReach?'LOCAL_AGENT_REACH_TRANSPORT_ACTIVE':'ADAPTER_NOT_VERIFIED'}];}
      if(path==='/backup/status'){auth.founder(actor);return backupScheduler.status();}
      if(path==='/backup/snapshots'){auth.founder(actor);return backupScheduler.listSnapshots();}
      if(path==='/backup/rpo'){auth.founder(actor);return backupScheduler.checkRpoStatus();}
      if(path==='/onboarding/template'){auth.founder(actor);return {products:[],locations:[{id:'hq',name:'HQ / Pusat Operasi',address:''}],dealerTerms:{minimumQuantity:50,packMultiple:10,priceBasisPoints:7000,ownership:'owned',returnRules:'Tiada return bagi balang dibuka.',approved:false}};}
      if(path==='/migration/receipts'){auth.founder(actor);return store.all('migration_receipts');}
      if(path==='/pilots/workspace/grants')return store.all('workspace_grants').filter((g:any)=>g.userId===actor.user.id);
      if(path==='/pilots/bus-freight/routes')return VERIFIED_BUS_ROUTES;
      if(path==='/pilots/bus-freight/shipments'){auth.founder(actor);return store.all('bus_shipments');}
      if(path==='/pilots/founder-assistant/proposals'){auth.founder(actor);return store.all('founder_proposals');}
      if(path==='/copilot/providers'){auth.operational(actor);return freeModelRouter.listProviders();}
      if(path==='/copilot/hitl'){auth.founder(actor);return adkAgent.listHitlActions();}
      if(path==='/copilot/v2'||path==='/v2'||path==='/copilotkit/v2'){
        auth.operational(actor);
        return {
          version: '2.0.0',
          runtime: 'copilotkit-v2-agui',
          schema: 'a2ui.v1',
          activeProvider: freeModelRouter.getActiveProvider().id,
          candidateModels: freeModelRouter.getStrictFreeCandidates(),
          allowlistedComponents: A2UI_ALLOWLISTED_COMPONENTS,
          paidFallbackAllowed: false,
        };
      }
      if(path==='/copilot/tools'){auth.operational(actor);return globalDomainTools.listTools(getActorCanonicalRole(actor));}
      if(path==='/copilot/mcp/brief/daily'){auth.operational(actor);return operationsBriefApp.getDailyBrief();}
      if(path==='/copilot/mcp/brief/urgent'){auth.operational(actor);return operationsBriefApp.getUrgentBrief();}
    }
    if(method==='POST') {
      if(path==='/auth/logout'){auth.logout(actor);return {loggedOut:true};}
      if(path==='/onboarding/validate'){auth.founder(actor);return onboarding.validate(object(input) as any);}
      if(path==='/onboarding/commit')return onboarding.commit(actor,object(input) as any);
      if(path==='/migration/dry-run'){auth.founder(actor);const body=object(input);return migration.dryRun(list(body.records,500));}
      if(path==='/migration/import'){const body=object(input);return migration.executeImport(actor,list(body.records,500));}
      if(segments[0]==='migration'&&segments[1]==='rollback'&&segments[2])return migration.rollback(actor,segments[2]);
      if(path==='/catalogue')return commerce.saveProduct(actor,input);
      if(path==='/flows')return flows.save(actor,input);
      if(path==='/flow-sessions')return flows.start(actor,input);
      if(segments[0]==='flow-sessions'&&recordId){if(command==='advance')return flows.advance(actor,recordId,input);if(command==='back')return flows.advance(actor,recordId,input,true);if(command==='review')return flows.review(actor,recordId,input);if(command==='form')return flows.form(actor,recordId,input);if(command==='submit')return flows.submit(actor,recordId,input,key);}
      if(path==='/quotes')return commerce.quote(actor,input);
      if(path==='/orders')return commerce.submitOrder(actor,input,key);
      if(segments[0]==='orders'&&recordId){if(command==='transition')return commerce.transition(actor,recordId,input);if(command==='payment')return commerce.payment(actor,recordId,input,key);}
      if(path==='/inventory/receive')return commerce.receive(actor,input,key);
      if(segments[0]==='inventory'&&recordId&&command==='quarantine')return commerce.quarantine(actor,recordId,input);
      if(segments[0]==='inventory'&&recordId&&command==='adjust')return commerce.adjust(actor,recordId,input,key);
      if(segments[0]==='inventory'&&recordId&&command==='transfer')return commerce.transfer(actor,recordId,input,key);
      if(path==='/cases')return work.createCase(actor,input);
      if(segments[0]==='cases'&&recordId){if(command==='reply')return work.reply(actor,recordId,input);if(command==='assign')return work.assignCase(actor,recordId,input);if(command==='resolve')return work.resolveCase(actor,recordId,input);if(command==='preview')return work.prepareMessage(actor,recordId,input);if(command==='assessment'){fields(object(input),[]);const complaint=work.case(actor,recordId);return jevEvaluations.assess(actor,{packId:'support',entityId:recordId,expectedRevision:complaint.revision});}}
      if(segments[0]==='previews'&&recordId&&command==='confirm')return work.confirmMessage(actor,recordId,input,key);
      if(path==='/evidence')return work.createEvidence(actor,input);
      if(path==='/tasks')return work.createTask(actor,input);
      if(segments[0]==='tasks'&&recordId){if(command==='update')return work.updateTask(actor,recordId,input,key);if(command==='checklist'&&segments[3]&&segments[4]==='check')return work.checkChecklist(actor,recordId,segments[3],input,key);if(command==='checklist')return work.addChecklist(actor,recordId,input,key);if(command==='comments')return work.commentTask(actor,recordId,input,key);if(command==='complete')return work.completeTask(actor,recordId,input,key);}
      if(path==='/documents')return work.saveDocument(actor,input);
      if(segments[0]==='documents'&&recordId){if(command==='update')return work.saveDocument(actor,input,recordId);if(command==='publish')return work.publishDocument(actor,recordId,input);if(command==='research')return work.linkResearch(actor,recordId,input,key);}
      if(segments[0]==='knowledge'&&recordId&&command==='retire')return work.retireKnowledge(actor,recordId,input);
      if(path==='/calendar')return work.saveCalendar(actor,input);
      if(path==='/reports/definitions')return reports.save(actor,input);
      if(segments[0]==='reports'&&segments[1]==='definitions'&&segments[2]&&segments[3]==='update')return reports.save(actor,input,segments[2]);
      if(segments[0]==='calendar'&&recordId&&command==='update')return work.saveCalendar(actor,input,recordId);
      if(path==='/people/grants')return auth.grant(actor,input);
      if(path==='/people/revoke')return auth.revoke(actor,input);
      if(path==='/settings')return operations.saveSettings(actor,input);
      if(path==='/campaigns')return marketing.save(actor,input);
      if(path==='/founder-intelligence/identities')return founderIntelligence.saveIdentity(actor,input);
      if(path==='/founder-intelligence/content')return founderIntelligence.saveContent(actor,input);
      if(path==='/founder-intelligence/events')return founderIntelligence.saveEvent(actor,input);
      if(path==='/founder-intelligence/outcomes')return founderIntelligence.linkOutcome(actor,input);
      if(segments[0]==='campaigns'&&recordId){if(command==='update')return marketing.save(actor,input,recordId);if(command==='approve')return marketing.approve(actor,recordId,input);if(command==='export'){const artifact=marketing.export(actor,recordId,input,key);return evidenceFiles.export(actor,artifact,marketing.get(actor,recordId));}if(command==='publish')fail('PUBLISHER_UNAVAILABLE',409,'Saluran penerbit belum disahkan. Eksport manual tersedia.');}
      if(path==='/dealer/applications')return dealers.apply(actor,input);
      if(path==='/dealer/commission-policies')return dealers.saveCommissionPolicy(actor,input);
      if(path==='/dealer/commissions')return dealers.recordCommission(actor,input);
      if(segments[0]==='dealer'&&segments[1]==='commissions'&&segments[2]){
        if(segments[3]==='transition')return dealers.transitionCommission(actor,segments[2],input);
        if(segments[3]==='contra')return dealers.applyRefundContra(actor,segments[2],input);
      }
      if(segments[0]==='dealer'&&segments[1]==='orders'&&segments[2]&&segments[3]==='commission')return dealers.createCommissionFromOrder(actor,segments[2]);
      if(segments[0]==='dealer'&&segments[1]==='applications'&&segments[2]){if(segments[3]==='approve')return dealers.decide(actor,segments[2],input,true);if(segments[3]==='reject')return dealers.decide(actor,segments[2],input,false);}
      if(path==='/dealer/quotes')return dealers.quote(actor,input);
      if(path==='/dealer/restocks')return dealers.request(actor,input,key);
      if(segments[0]==='dealer'&&segments[1]==='restocks'&&segments[2]){if(segments[3]==='transition')return dealers.transition(actor,segments[2],input);if(segments[3]==='receive')return dealers.receive(actor,segments[2],input,key);}
      if(segments[0]==='dealer'&&segments[1]==='restocks'&&segments[2]){if(segments[3]==='sell-through')return dealers.sellThrough(actor,segments[2],input,key);if(segments[3]==='returns')return dealers.requestReturn(actor,segments[2],input,key);if(segments[3]==='settlements')return dealers.createSettlement(actor,segments[2],input,key);}
      if(segments[0]==='dealer'&&segments[1]==='returns'&&segments[2]&&['receive','reject'].includes(segments[3]))return dealers.decideReturn(actor,segments[2],input,key,segments[3]==='receive');
      if(path==='/loyalty/adjust'){
        const body=object(input);
        fields(body,['userId','pointsDelta','reason']);
        return loyalty.adjustPoints(
          actor,
          text(body.userId,'ID Pengguna',120),
          integer(body.pointsDelta,'Perubahan mata',-10_000_000,10_000_000),
          text(body.reason,'Sebab pelarasan',1000)
        );
      }
      if(path==='/loyalty/expire'){
        auth.founder(actor);
        const body=object(input);
        fields(body,['userId']);
        return loyalty.expirePoints(text(body.userId,'ID Pengguna',120));
      }
      if(path==='/expenses')return operations.createExpense(actor,input,key);
      if(segments[0]==='dayclose'&&recordId&&command==='reopen')return amendments.reopenDayClose(actor,recordId,input);
      if(segments[0]==='expenses'&&recordId&&command==='post')return amendments.postExpense(actor,recordId,input,key);
      if(segments[0]==='expense-postings'&&recordId&&command==='reverse')return amendments.reverseExpense(actor,recordId,input,key);
      if(path==='/people/invitations')return amendments.createInvitation(actor,input);
      if(path==='/people/invitations/accept')return amendments.acceptInvitation(actor,input);
      if(segments[0]==='people'&&segments[1]==='invitations'&&segments[2]&&segments[3]==='revoke')return amendments.revokeInvitation(actor,segments[2],input);
      if(path==='/availability')return amendments.saveAvailability(actor,input);
      if(path==='/notification-preferences')return amendments.savePreferences(actor,input);
      if(segments[0]==='expenses'&&recordId&&command==='approve')return operations.approveExpense(actor,recordId,input);
      if(path==='/reconciliations')return operations.reconcile(actor,input);
      if(segments[0]==='reconciliations'&&recordId&&command==='approve')return operations.approveReconciliation(actor,recordId,input);
      if(path==='/shifts')return operations.createShift(actor,input);
      if(segments[0]==='shifts'&&recordId){if(command==='handoff')return operations.handoff(actor,recordId,input);if(command==='acknowledge')return operations.acknowledgeShift(actor,recordId,input);}
      if(path==='/dayclose')return operations.createDayClose(actor,input);
      if(segments[0]==='dayclose'&&recordId&&command==='review')return operations.reviewDayClose(actor,recordId,input);
      if(segments[0]==='dayclose'&&recordId&&command==='approve')return operations.approveDayClose(actor,recordId,input);
      if(path==='/qc')return operations.createQc(actor,input);
      if(path==='/qc/sops')return operations.saveQcSop(actor,input);
      if(segments[0]==='qc'&&recordId&&command==='release')return operations.releaseQc(actor,recordId,input);
      if(path==='/jobs')return jobs.enqueue(actor,input,key);
      if(path==='/automations')return automationDefinitions.save(actor,input);
      if(segments[0]==='automations'&&recordId){if(command==='update')return automationDefinitions.save(actor,input,recordId);if(command==='toggle')return automationDefinitions.toggle(actor,recordId,input);}
      if(path==='/runtime-controls')return runtimeControls.change(actor,input);
      if(path==='/research/sources')return automation.captureSource(actor,input,key);
      if(path==='/research/briefs')return automation.saveBrief(actor,input,key);
      if(path==='/research/grants')return automation.grant(actor,input);
      if(segments[0]==='research'&&segments[1]==='grants'&&segments[2]&&segments[3]==='revoke')return automation.revoke(actor,segments[2],input);
      if(segments[0]==='campaigns'&&recordId&&command==='postiz-prepare')return automation.preparePostiz(actor,recordId,input,key);
      if(path==='/jev/assessments')return jevEvaluations.assess(actor,input);
      if(path==='/jev/evaluations')return jevEvaluations.evaluate(actor,input);
      if(segments[0]==='jobs'&&recordId&&command==='cancel'){fields(object(input),[]);return jobs.cancel(actor,recordId);}
      if(path==='/pilots/workspace/consent')return legacyPilots.grantWorkspaceConsent(actor.user.id,list(object(input).scopes) as any);
      if(path==='/pilots/workspace/revoke')return legacyPilots.revokeWorkspaceConsent(actor.user.id,text(object(input).grantId));
      if(path==='/pilots/workspace/execute'){const b=object(input);return legacyPilots.executeWorkspaceOperation(actor.user.id,oneOf(b.operation,['draft_doc','sync_calendar','export_sheet'] as const),text(b.entityId),b.payload as any);}
      if(path==='/pilots/bus-freight/shipments'){auth.founder(actor);return legacyPilots.createBusFreightShipment(actor.user.id,object(input) as any);}
      if(segments[0]==='pilots'&&segments[1]==='bus-freight'&&segments[2]==='shipments'&&segments[3]&&segments[4]==='status'){auth.founder(actor);return legacyPilots.updateBusFreightStatus(actor.user.id,segments[3],oneOf(object(input).status,['booked','departed','received'] as const));}
      if(path==='/pilots/founder-assistant/propose'){auth.founder(actor);return legacyPilots.proposeFounderAction(actor.user.id,text(object(input).query));}
      if(path==='/pilots/founder-assistant/review'){auth.founder(actor);const b=object(input);return legacyPilots.reviewFounderProposal(actor.user.id,text(b.proposalId),oneOf(b.decision,['approved','rejected'] as const));}
      if(path==='/pilots/founder-assistant/execute'){
        auth.founder(actor);const b=object(input);const proposalId=text(b.proposalId);
        const executor:FounderProposalExecutor=(p)=>{
          if(p.proposedAction.command==='review_cases'){const openCases=work.cases(actor).filter(c=>c.status!=='resolved');return {resultRef:`cases:open:${openCases.length}`,resultKind:'case_review'};}
          if(p.proposedAction.command==='review_stock'){const lots=store.all('lots');return {resultRef:`lots:tracked:${lots.length}`,resultKind:'stock_review'};}
          if(p.proposedAction.command==='draft_campaign'){const draft=marketing.save(actor,{title:text((p.proposedAction.parameters.title as string)||`Draf Kempen Abang Colek ${now().slice(0,10)}`,'Tajuk kempen',200),objective:'Kempen pemasaran pembantu pengasas',copy:'Promosi Colek Buah Segar & Sambal Box Abang Colek. Segar, pedas, manis dan padu!',catalogueVersion:commerce.version(),assets:[],productIds:[]});return {resultRef:draft.id,resultKind:'campaign_draft'};}
          fail('UNSUPPORTED_PROPOSAL_COMMAND',400,'Perintah tindakan cadangan tidak disokong.');
        };
        return legacyPilots.executeFounderProposal(actor.user.id,proposalId,executor);
      }
      if(path==='/copilot/provider'){
        auth.operational(actor);
        const b=object(input);
        fields(b,['providerId']);
        const ok=freeModelRouter.setActiveProvider(text(b.providerId,'ID Penyedia',64));
        if(!ok)fail('INVALID_PROVIDER',400,'Penyedia model percuma tidak sah.');
        return {activeProvider:freeModelRouter.getActiveProvider()};
      }
      if(segments[0]==='copilot'&&segments[1]==='hitl'&&segments[2]&&segments[3]==='decide'){
        auth.founder(actor);
        const b=object(input);
        const approve=b.approve!==undefined?Boolean(b.approve):b.decision==='approved';
        return adkAgent.decideHitlAction(actor,segments[2],approve);
      }
      if(segments[0]==='copilot'&&segments[1]==='tools'&&segments[2]&&segments[3]==='execute'){
        auth.operational(actor);
        return globalDomainTools.executeTool(segments[2], { actor, store, commerce, dealers, loyalty }, input);
      }
    }
    fail('NOT_FOUND',404,'Laluan tidak ditemui.');
  }
  return {
    store, auth, commerce, loyalty, work, jobs, automationDefinitions, legacyPilots, founderIntelligence,
    adkAgent, freeModelRouter, backupScheduler,
    async fetch(request:Request):Promise<Response> {
      const requestId=randomUUID();
      try {
        const url=new URL(request.url),path=url.pathname.replace(/^\/api\/platform/,'');
        if(!url.pathname.startsWith('/api/platform/')&&!url.pathname.startsWith('/v2')&&!url.pathname.startsWith('/copilotkit/v2'))fail('NOT_FOUND',404);
        if(!['GET','POST'].includes(request.method))fail('METHOD_NOT_ALLOWED',405);
        // Provider callbacks use their signature as authority, never browser cookies or CSRF.
        if(request.method==='POST'&&path==='/whatsapp/webhook'){
          store.rate('whatsapp-webhook',120);
          if(!request.headers.get('content-type')?.includes('application/json'))fail('CONTENT_TYPE',415);
          const bytes=await boundedBody(request,256*1024);
          let rawBody:string;try{rawBody=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('INVALID_JSON',400);}
          return json({ok:true,data:store.atomic(()=>whatsapp.processWebhook(request.headers.get('x-hub-signature-256'),rawBody))});
        }
        if(request.method==='POST'&&!allowedOrigins.includes(request.headers.get('origin')??''))fail('ORIGIN_DENIED',403,'Asal permintaan tidak dibenarkan.');
        if(request.method==='POST'&&path==='/evidence/upload'){const actor=auth.resolve(request);store.rate(`upload:${actor.user.id}`,12);auth.csrf(actor,request.headers.get('x-csrf-token'));if(runtimeControls.current().activeRelease==='platform-local-readonly-v1')fail('RELEASE_READ_ONLY',409);if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))fail('CONTENT_TYPE',415);return json({ok:true,data:await evidenceFiles.upload(actor,request)});}
        let input:unknown=undefined;
        if(request.method==='POST') {if(!request.headers.get('content-type')?.includes('application/json'))fail('CONTENT_TYPE',415);const body=new TextDecoder().decode(await boundedBody(request,256*1024));try{input=JSON.parse(body);}catch{fail('INVALID_JSON',400);}object(input);}
        if(request.method==='GET'&&path==='/catalogue')return collection(commerce.catalogue(),url);
        if(request.method==='GET'&&path==='/catalogue/version')return json({ok:true,data:{version:commerce.version()}});
        if(request.method==='GET'&&/^\/catalogue\/[^/]+$/.test(path)&&path!=='/catalogue/admin')return json({ok:true,data:reports.publishedProduct(path.split('/')[2])});
        if(request.method==='GET'&&path==='/bootstrap-status')return json({ok:true,data:{required:!store.metadata('owner_bootstrapped'),localOnly:options.persistenceMode!=='supabase'}});
        if(request.method==='GET'&&path==='/auth/providers')return json({ok:true,data:{google:!!options.googleIdentityVerifier}});
        if(request.method==='GET'&&path==='/public-info'){const p=operations.settings().approvedPolicies;return json({ok:true,data:{contact:p.contact??null,paymentInstructions:p.paymentInstructions??null,locations:p.locations??[],version:operations.settings().version}});}
        if(request.method==='GET'&&path==='/flows')return json({ok:true,data:flows.all()});
        if(request.method==='GET'&&path.startsWith('/flows/'))return json({ok:true,data:flows.definition(path.slice(7))});
        if(request.method==='GET'&&path==='/orders/track'){
          const token=url.searchParams.get('token');
          if(!token)fail('INVALID_TOKEN',400,'Token penjejakan diperlukan.');
          return json({ok:true,data:commerce.trackOrder(token)});
        }
        if(request.method==='GET'&&path==='/whatsapp/webhook'){
          const mode = url.searchParams.get('hub.mode');
          const token = url.searchParams.get('hub.verify_token');
          const challenge = url.searchParams.get('hub.challenge');
          if(!options.whatsappTransport)fail('WHATSAPP_UNAVAILABLE',409);
          const expectedToken = options.whatsappTransport.webhookSecret;
          const verified = whatsapp.verifyWebhook(mode, token, challenge, expectedToken);
          return new Response(verified, { status: 200, headers: { 'Content-Type': 'text/plain' } });
        }
        if(request.method==='POST'&&path==='/auth/google'){
          store.rate('identity-global',options.rateLimits?.identityGlobal??30);
          const body=object(input);fields(body,['accessToken']);
          if(!options.googleIdentityVerifier)fail('GOOGLE_IDENTITY_UNAVAILABLE',503,'Google login belum tersedia. Gunakan email dan password.');
          let authenticated=false;
          try{auth.resolve(request);authenticated=true;}catch(error){if(!(error instanceof DomainError&&error.status===401))throw error;}
          if(authenticated)fail('AUTHENTICATED_LOGIN_REQUIRES_LOGOUT',409,'Log keluar dahulu sebelum menukar akaun.');
          const identity=await options.googleIdentityVerifier(text(body.accessToken,'Token identiti',16000));
          const result=await auth.authenticateGoogle(identity);
          return json({ok:true,data:result.data},200,{'Set-Cookie':result.cookie+(url.protocol==='https:'?'; Secure':'')});
        }
        if(request.method==='POST'&&['/auth/signup','/auth/login','/auth/bootstrap'].includes(path)) {
          store.rate('identity-global',options.rateLimits?.identityGlobal??30);const authInput=object(input);if(typeof authInput.email==='string')store.rate(`identity:${authInput.email.toLowerCase()}`,options.rateLimits?.identityAccount??6);
          const result=await auth.authenticate(path.slice(6) as 'signup'|'login'|'bootstrap',input);
          return json({ok:true,data:result.data},200,{'Set-Cookie':result.cookie+(url.protocol==='https:'?'; Secure':'')});
        }
        const actor=auth.resolve(request);store.rate(`actor:${actor.user.id}`,options.rateLimits?.actor??180);
        if(request.method==='GET'&&/^\/evidence\/[^/]+\/file$/.test(path))return await evidenceFiles.download(actor,path.split('/')[2],url);
        if(request.method==='GET'&&/^\/exports\/[^/]+\/file$/.test(path))return await evidenceFiles.downloadExport(actor,path.split('/')[2],url);
        if(request.method==='POST')auth.csrf(actor,request.headers.get('x-csrf-token'));
        if(request.method==='POST'&&runtimeControls.current().activeRelease==='platform-local-readonly-v1'&&!['/runtime-controls','/auth/logout'].includes(path))fail('RELEASE_READ_ONLY',409,'Release semasa hanya membenarkan bacaan. Data kekal tersimpan.');
        if(request.method==='POST'&&path.startsWith('/legacy-ai/'))return json(await generateLegacyContent(auth,actor,path,input));
        if(request.method==='POST'&&path==='/research'){
          auth.founder(actor);
          if(!options.automationOptions?.agentReach) fail('RESEARCH_ADAPTER_UNAVAILABLE',409,'Agent-Reach research adapter belum disahkan.');
          const idemKey = request.headers.get('idempotency-key') ?? request.headers.get('x-idempotency-key');
          return json({ok:true,data:await automation.research(actor,input,idemKey)});
        }
        if(request.method==='POST'&&path==='/research/run'){
          auth.founder(actor);
          const idemKey = request.headers.get('idempotency-key') ?? request.headers.get('x-idempotency-key');
          return json({ok:true,data:await automation.research(actor,input,idemKey)});
        }
        if(request.method==='POST'&&path==='/hermes/run'){
          auth.founder(actor);
          if(!options.automationOptions?.hermes) fail('HERMES_UNAVAILABLE',409,'Hermes runtime transport belum disahkan.');
          const hermes=new HermesAdapter(options.automationOptions.hermes, options.automationOptions.timeoutMs);
          const body=object(input); fields(body,['task']); const task=object(body.task);
          const usage=options.automationOptions.externalUsage?.() ?? { providerId: 'hermes', observedUnits: 1, limitUnits: 100, available: true, observedAt: now() };
          return json({ok:true,data:await hermes.run(task as any, usage, new AbortController().signal)});
        }
        if(request.method==='POST'&&/^\/campaigns\/[^/]+\/postiz-publish$/.test(path)){
          auth.founder(actor);
          const campaignId = path.split('/')[2];
          const idemKey = request.headers.get('idempotency-key') ?? request.headers.get('x-idempotency-key');
          return json({ok:true,data:await automation.publishPostiz(actor,campaignId,input,idemKey)});
        }
        if(request.method==='POST'&&path==='/automation/postiz/reconcile'){
          auth.founder(actor);
          return json({ok:true,data:await automation.reconcilePostiz(actor,input)});
        }
        if(request.method==='POST'&&path==='/automation/postiz/cancel'){
          auth.founder(actor);
          return json({ok:true,data:await automation.cancelPostiz(actor,input)});
        }
        if(request.method==='POST'&&path==='/whatsapp/send'){
          auth.founder(actor);
          const idemKey = request.headers.get('idempotency-key') ?? request.headers.get('x-idempotency-key');
          return json({ok:true,data:await whatsapp.sendTemplateMessage(actor,input,idemKey)});
        }
        if(request.method==='POST'&&path==='/backup/trigger'){
          auth.founder(actor);
          return json({ok:true,data:await backupScheduler.runBackup('founder_manual')});
        }
        if(request.method==='POST'&&(path==='/copilot/chat'||path==='/copilot/v2'||path==='/v2'||path==='/copilotkit/v2')){
          auth.operational(actor);
          const b=object(input);
          const rawMessage = typeof b.message === 'string'
            ? b.message
            : (Array.isArray(b.messages) && b.messages.length > 0
                ? (typeof b.messages[b.messages.length - 1]?.content === 'string' ? b.messages[b.messages.length - 1]?.content : '')
                : (typeof b.query === 'string' ? b.query : ''));
          const messageText=text(rawMessage,'Mesej copilot',10000);
          const conversationHistory=(Array.isArray(b.history)
            ? b.history
            : (Array.isArray(b.messages) ? b.messages.slice(0, -1) : [])) as any[];
          const streamRequested=request.headers.get('accept')?.includes('text/event-stream')||b.stream===true;

          if(streamRequested){
            const encoder=new TextEncoder();
            const stream=new ReadableStream({
              async start(controller){
                try{
                  controller.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({activeProvider:freeModelRouter.getActiveProvider().id,model:freeModelRouter.getActiveProvider().defaultModel,runtime:'v2',schemaVersion:'a2ui.v1'})}\n\n`));
                  const result=await adkAgent.processMessage(actor,messageText,conversationHistory);
                  if(result.a2ui){
                    controller.enqueue(encoder.encode(`event: a2ui\ndata: ${JSON.stringify(result.a2ui)}\n\n`));
                  }
                  if(result.generativeUi){
                    controller.enqueue(encoder.encode(`event: gen_ui\ndata: ${JSON.stringify(result.generativeUi)}\n\n`));
                  }
                  if(result.hitlAction){
                    controller.enqueue(encoder.encode(`event: hitl_prompt\ndata: ${JSON.stringify(result.hitlAction)}\n\n`));
                  }
                  const words=result.reply.split(/(\s+)/);
                  for(const word of words){
                    if(word){
                      controller.enqueue(encoder.encode(`event: text_delta\ndata: ${JSON.stringify({content:word})}\n\n`));
                    }
                  }
                  controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(result)}\n\n`));
                  controller.close();
                }catch(err:any){
                  controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({message:err?.message||'Ralat Copilot'})}\n\n`));
                  controller.close();
                }
              }
            });
            return new Response(stream,{
              status:200,
              headers:{
                'Content-Type':'text/event-stream; charset=utf-8',
                'Cache-Control':'no-cache, no-transform',
                'Connection':'keep-alive',
                'X-Accel-Buffering':'no',
              }
            });
          }

          const result=await adkAgent.processMessage(actor,messageText,conversationHistory);
          return json({ok:true,data:result});
        }
        const data=request.method==='POST'?store.atomic(()=>postRoute(actor,path,input,request.headers.get('idempotency-key'),url)):route(actor,request.method,path,input,null,url);
        if(Array.isArray(data))return collection(data,url);
        return json({ok:true,data},200,path==='/auth/logout'?{'Set-Cookie':cookieClear}:{});
      } catch(error) {
        const domain=error instanceof DomainError?error:new DomainError('INTERNAL_ERROR',500,'Perkhidmatan tidak tersedia. Cuba semula.');
        try{options.log?.({requestId,code:domain.code,status:domain.status});}catch{console.warn('Platform redacted audit logging unavailable.');}
        return json({ok:false,code:domain.code,requestId,message:domain.message},domain.status,domain.status===429?{'Retry-After':'60'}:{});
      }
    },
    close(){backupScheduler.stop();store.close();},
  };
}
