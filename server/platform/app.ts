import { DealerStores } from './dealerStores';
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
import { FreeModelRouter, clientSafeErrorMessage } from './freeModelRouter';
import { globalDomainTools, getActorCanonicalRole } from './domainTools';
import { createOperationsBriefApp } from './mcp/operationsBrief';
import { LocalHermesTransport } from '../automation/runtimeTransports';
import { sessionCookieClearHeaders } from './sessionCookie';
import { visionInferenceAvailability } from '../../shared/intelligence-availability';
import { isLocalInspectorAllowed, LocalInspector, LocalRunRecorder } from './inspection/inspector';
import { AguiThreadStore } from './aguiThreads';
import { RiskService, createRiskRoutes } from './risk';
import { RecoveryService, createRecoveryRoutes } from './recovery';
import { PaymentCallbackService } from './paymentCallbacks';
import { recordAssetConsent } from './dispatchConsent';
import { createPaymentCallbackRoute, createPaymentReturnRoute } from './paymentCallbackRoutes';
/**
 * Nama event AG-UI sebagai literal. Pelayan TIDAK mengimport `@ag-ui/core`
 * sebagai dependency runtime: ujian launcher boot pelayan dalam checkout
 * sintetik yang hanya ada `server/`, `shared/` dan `scripts/dev.ts` (tiada
 * `node_modules` sebenar). String ini ialah nama event yang sama seperti
 * enum AG-UI, dan `AguiThreadStore` menyimpannya sebagai teks.
 */
const EventType = {
  RUN_STARTED: 'RUN_STARTED',
  RUN_FINISHED: 'RUN_FINISHED',
  RUN_ERROR: 'RUN_ERROR',
  TEXT_MESSAGE_CONTENT: 'TEXT_MESSAGE_CONTENT',
  CUSTOM: 'CUSTOM',
} as const;
import type { AguiThreadEvent, AguiThreadRecord } from '../../shared/founder-intelligence-contracts';

export interface PlatformAppOptions { googleIdentityVerifier?:GoogleIdentityVerifier; persistenceMode?:'local'|'supabase'; evidenceStorage?:EvidenceStorage; databasePath?:string; bootstrapToken?:string; origin?:string; allowedOrigins?:string[];   rateLimits?:{identityGlobal:number;identityAccount:number;actor:number;copilotRun?:number;copilotTool?:number;copilotControl?:number}; automationOptions?:AutomationOptions; whatsappTransport?:WhatsAppTransport; adkAgent?:GoogleAdkAgent; freeModelRouter?:FreeModelRouter; backupScheduler?:BackupSchedulerOptions|boolean; log?:(entry:{requestId:string;code:string;status:number})=>void }

/**
 * Keanggotaan dealer yang sah untuk bacaan terma dealer.
 *
 * `dealerOrgId` sahaja tidak mencukupi: keanggotaan yang dicabut
 * (`status: 'revoked'`) atau dinyahaktifkan tidak boleh memberi akses bacaan.
 * Rujukan: `auth.memberships()` hanya memuatkan baris `status='active'`, tetapi
 * gate ini kekal eksplisit supaya mana-mana Principal (contohnya yang dibina
 * dalam proses lain) tidak melepasi semakan.
 */
export function hasActiveDealerMembership(actor: Principal): boolean {
  return (actor.memberships ?? []).some(
    (membership) => Boolean(membership.dealerOrgId) && membership.status === 'active'
  );
}

/**
 * Adakah actor boleh membaca terma dealer — membutuhkan keanggotaan AKTIF
 * dengan dealerOrgId SEKALI ada dealer_application berstatus 'approved' bagi
 * organisasi yang sama.
 *
 * Keanggotaan sahaja tidak mencukupi: organisasi hanya boleh membaca terma
 * apabila ada dealer_application yang diluluskan untuk organisasi tersebut.
 * Pemohon yang masih 'pending' (atau telah ditolak) tidak boleh membaca terma.
 */
export function hasApprovedDealerAccess(
  actor: Principal,
  applications: readonly { dealerOrgId?: string; status: string }[]
): boolean {
  const activeOrgs = (actor.memberships ?? []).filter(
    (m) => Boolean(m.dealerOrgId) && m.status === 'active'
  ).map((m) => m.dealerOrgId!);
  if (!activeOrgs.length) return false;
  return applications.some(
    (a) => a.status === 'approved' && a.dealerOrgId && activeOrgs.includes(a.dealerOrgId)
  );
}
/**
 * Hasil sebenar satu run copilot.
 *
 * Jenis ini diambil daripada kontrak sebenar `GoogleAdkAgent.processMessage`
 * supaya apa-apa yang persisted ke thread sentiasa mengikut bentuk yang
 *ombrang oleh server — bukan bentuk yang dijangka.
 */
type CopilotRunResult=Awaited<ReturnType<GoogleAdkAgent['processMessage']>>;

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
  const dealerStores=new DealerStores(store),dealers=new Dealers(store,auth,commerce),marketing=new Marketing(store,auth,commerce,work),operations=new Operations(store,auth,commerce,work);
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
  // BL-22 — inspector tempatan (EXT-01). Ia hanya hidup dalam proses ini:
  // penunjuk run disimpan dalam memori sahaja dan tiada apa-apa ditulis ke
  // luar. Snapshot yang dihasilkan sudah disegel (redacted) oleh modul.
  const inspectorRecorder=new LocalRunRecorder();
  const inspector=new LocalInspector(inspectorRecorder,{nodeEnv:process.env.NODE_ENV});
  // BL-15 — storan thread AG-UI (CPK-02 separuh tempatan). Setiap thread
  // dimiliki satu tenant dan satu pemilik; sejarah eventnya disimpan secara
  // kanonikal supaya sambungan semula boleh replay tanpa jurang dan tanpa
  // penduaan. Ia menggunakan store dan pengesahan yang SAMA seperti platform
  // lain supaya sesi serta tenancy tidak pernah diteka daripada pelayar.
  const aguiThreads=new AguiThreadStore({store,auth});
  // PAY-01/PAY-02 (separuh tempatan) — callback pembekal dengan pengesahan
  // HMAC `X-Signature` + idempotency `eventId`, dan laluan pulangan yang
  // hanya MEMBACAK status yang tersimpan. Tiada rahsia lalai: jika
  // `PLATFORM_PAYMENT_WEBHOOK_SECRET` tiada, laluan menjawab 503 dengan
  // reason code — bukan menerima callback tanpa pengesahan.
  const paymentCallbacks=new PaymentCallbackService(store,{secret:process.env.PLATFORM_PAYMENT_WEBHOOK_SECRET,loyalty});
  const paymentCallbackRoute=createPaymentCallbackRoute({store,auth,service:paymentCallbacks});
  const paymentReturnRoute=createPaymentReturnRoute({store,auth,service:paymentCallbacks});
  // REF-01 (risk engine) + DR-01 (pengukuran RTO). Semua keputusan ialah
  // reason code yang boleh dibaca mesin; tiada skor angka, tiada "")
  const risk=new RiskService(store,auth);
  const riskRoutes=createRiskRoutes({service:risk});
  const recovery=new RecoveryService(store,auth,{
    databasePath:dbPath,
    evidenceDirectory:join(dbDir,'evidence'),
    workDirectory:join(dbDir,'recovery-drills'),
    rpo:()=>{const r=backupScheduler.checkRpoStatus();return {compliant:r.compliant,elapsedSeconds:r.elapsedSeconds,lastBackupAt:r.lastBackupAt,reasonCode:r.reasonCode};},
  });
  const recoveryRoutes=createRecoveryRoutes({service:recovery});
  const operationsBrief=createOperationsBriefApp(store);
  // Transport Hermes tempatan hanya boleh mengklaim artifak jika ringkasan
  // benar-benar disimpan dalam store kanonikal platform.
  if(options.automationOptions?.hermes instanceof LocalHermesTransport) options.automationOptions.hermes.attachStore(store);
  const freeModelRouter=options.freeModelRouter??new FreeModelRouter();
  const adkAgent=options.adkAgent??new GoogleAdkAgent(store,auth,commerce,dealers,loyalty,{router:freeModelRouter});
  const origin=options.origin??'http://localhost:3000';
  const allowedOrigins=options.allowedOrigins??[origin];
  /**
   * JSON response dengan header tambahan.
   *
   * Nilai `string[]` ditambah satu per satu dengan `headers.append()` supaya
   * beberapa header `Set-Cookie` kekal sebagai nilai BERASINGAN (sesi +
   * cookie legacy yang dikosongkan), bukan satu nilai bercomma yang dipecah
   * oleh pelayar.
   */
  function json(data:unknown,status=200,extra:Record<string,string|string[]>={}) {
    const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    for(const [name,value] of Object.entries(extra)){
      if(Array.isArray(value)){for(const entry of value)headers.append(name,entry);continue;}
      headers.set(name,value);
    }
    return new Response(JSON.stringify(data),{status,headers});
  }
  /** Menambah atribut `Secure` pada header cookie apabila origin ialah HTTPS. */
  function secureCookie(header:string,secure:boolean){return secure&&!/(^|;\s*)Secure(\s|;|$)/.test(header)?`${header}; Secure`:header;}
  function collection(data:unknown[],url:URL) {
    const limitValue=url.searchParams.get('limit')??'50',offsetValue=url.searchParams.get('offset')??'0';
    if(!/^\d+$/.test(limitValue)||!/^\d+$/.test(offsetValue))fail('INVALID_PAGINATION');
    // §4:96 — "50 records/page" ialah had tetap kontrak. Nilai lebih besar
    // ditolak, bukan dipangkas sahaja, supaya pelanggan tidakSongsong pagination.
    const limit=Math.min(50,Number(limitValue)),offset=Number(offsetValue);
    if(limit<1||!Number.isSafeInteger(offset)||offset<0)fail('INVALID_PAGINATION');
    return json({ok:true,data:data.slice(offset,offset+limit)},200,{'X-Total-Count':String(data.length),'X-Next-Offset':offset+limit<data.length?String(offset+limit):''});
  }
  function overview(actor:Principal):PlatformOverview {auth.founder(actor);const orders=commerce.orders(actor);return {orders:orders.length,orderValueSen:orders.filter(o=>o.fulfilmentStatus!=='cancelled').reduce((sum,o)=>sum+o.amountSen,0),verifiedPaymentSen:orders.reduce((sum,o)=>sum+o.paidAmountSen-o.refundAmountSen,0),fulfilledOrders:orders.filter(o=>o.fulfilmentStatus==='received').length,openCases:work.cases(actor).filter(c=>c.status!=='resolved').length,openTasks:work.tasks(actor).filter(t=>t.status!=='done').length,pendingDealerApplications:store.all<{status:string}>('dealer_applications').filter(a=>a.status==='pending').length,stockAvailable:commerce.catalogue().reduce((sum,p)=>sum+p.availableQuantity,0),generatedAt:now(),source:'local_authoritative',empty:orders.length===0};}
  /* ------------------------------------------------------------------------- *
   * BL-15 — kitaran hidup thread AG-UI (sejarah kanonikal + replay).
   * ------------------------------------------------------------------------- */

  /**
   * Menyelesaikan thread bagi satu run copilot.
   *
   * Thread yang diminta tetapi belum wujud ⇒ thread baharu milik pemohon.
   * Thread yang wujud ⇒ sesi, tenancy DAN pemilikan disahkan semula sebelum
   * satu event pun ditulis; thread tenant atau pemilik lain ditolak dengan
   * ralat bertyped (`THREAD_TENANT_FORBIDDEN` / `THREAD_OWNER_FORBIDDEN`)
   * supaya sejarah sesi lain tidak pernah bocor.
   */
  function resolveChatThread(actor:Principal,body:Record<string,unknown>):AguiThreadRecord {
    const requested=typeof body.threadId==='string'?body.threadId.trim():'';
    if(!requested)return aguiThreads.createThread(actor);
    if(requested.length>120)fail('INVALID_THREAD_ID',400,'ID thread tidak sah.');
    const existing=aguiThreads.getThread(requested);
    if(!existing)return aguiThreads.createThread(actor,requested);
    aguiThreads.requireOwned(actor,requested);
    return existing;
  }

  /**
   * Id resit SEBENAR bagi satu tindakan HITL, jika ada.
   *
   * Tindakan HITL yang masih `pending_approval` tidak membawa resit: ia adalah
   * cadangan kepada pengasas, bukan perubahan keadaan. Hanya tindakan yang
   * sudah dieksekusi (dengan `executionReceipt`) atau yang membawa `receiptId`
   * sebenar di bawah dikira `stateChanging`.
   */
  function hitlReceiptId(hitl:unknown):string|undefined {
    if(!hitl||typeof hitl!=='object')return undefined;
    const record=hitl as {receiptId?:unknown;executionReceipt?:{receiptId?:unknown}|null};
    if(typeof record.receiptId==='string'&&record.receiptId.trim())return record.receiptId;
    const nested=record.executionReceipt;
    if(nested&&typeof nested.receiptId==='string'&&nested.receiptId.trim())return nested.receiptId;
    return undefined;
  }

  /**
   * Menyimpan sejarah thread bagi satu run copilot.
   *
   * Peristiwa disimpan dengan bentuk `{name,data}`: `name` ialah nama bingkai
   * SSE yang dihantar (`start`/`a2ui`/`gen_ui`/`hitl_prompt`/`text_delta`/
   * `done`/`error`) dan `data` ialah muatan bingkai tersebut. Bentuk ini
   * menjadikan replay sebagai tepat semula bait asal, bukan tekaan.
   *
   * Peristiwa `hitl_prompt` hanya bertanda `stateChanging` apabila resitnya
   * benar-benar wujud; `appendEvent` menolak (400 `RECEIPT_ID_REQUIRED`)
   * mana-maka peristiwa yang mengubah keadaan tanpa resit.
   */
  function persistChatEvents(actor:Principal,thread:AguiThreadRecord,startFrame:Record<string,unknown>,result:CopilotRunResult|undefined,failure:{error:unknown}|undefined):AguiThreadEvent[] {
    const persisted:AguiThreadEvent[]=[];
    const append=(type:string,event:Record<string,unknown>,stateChanging=false,receiptId?:string)=>{
      persisted.push(aguiThreads.appendEvent(actor,{threadId:thread.id,type,event,stateChanging,...(receiptId?{receiptId}:{})}));
    };
    append(EventType.RUN_STARTED,{name:'start',data:startFrame});
    if(result?.a2ui)append(EventType.CUSTOM,{name:'a2ui',data:result.a2ui});
    if(result?.generativeUi)append(EventType.CUSTOM,{name:'gen_ui',data:result.generativeUi});
    if(result?.hitlAction){
      const receiptId=hitlReceiptId(result.hitlAction);
      append(EventType.CUSTOM,{name:'hitl_prompt',data:result.hitlAction},Boolean(receiptId),receiptId);
    }
    if(result)append(EventType.TEXT_MESSAGE_CONTENT,{name:'text_delta',data:{content:result.reply}});
    if(failure){
      const code=typeof (failure.error as {code?:unknown})?.code==='string'?(failure.error as {code:string}).code:'COPILOT_RUNTIME_ERROR';
      const message=failure.error instanceof DomainError?failure.error.message:clientSafeErrorMessage(code);
      append(EventType.RUN_ERROR,{name:'error',data:{code,message}});
    }else if(result){
      append(EventType.RUN_FINISHED,{name:'done',data:result});
    }
    return persisted;
  }

  /**
   * Satu bait SSE daripada satu peristiwa thread yang disimpan.
   *
   * Rangka yang digunakan adalah sama seperti bingkai chat: `event: <nama>\ndata:
   * <json>\n\n`.
   */
  function sseFrameFor(event:AguiThreadEvent):string {
    const payload=event.event as {name?:unknown;data?:unknown};
    const name=typeof payload.name==='string'?payload.name:'unknown';
    return `event: ${name}\ndata: ${JSON.stringify(payload.data??{})}\n\n`;
  }

  /**
   * BL-22 — run sebenar dicatat ke inspector tempatan.
   *
   * Recorder tinggal dalam memori sahaja; snapshot dev tidak lagi kosong
   * tanpa jujur, dan ia tidak pernah ditulis ke luar.
   */
  function recordInspectorRun(threadId:string,persisted:AguiThreadEvent[],durationMs:number,result:CopilotRunResult|undefined,failure:{error:unknown}|undefined):void {
    for(const event of persisted)inspectorRecorder.recordEvent(threadId);
    inspectorRecorder.recordToolCall(threadId,{toolName:'copilot.chat',durationMs,outcome:failure?'error':'success'});
    inspectorRecorder.recordState(threadId,'threadId',threadId);
    inspectorRecorder.recordState(threadId,'eventCount',persisted.length);
    if(result){
      inspectorRecorder.recordState(threadId,'providerId',result.providerUsed);
      inspectorRecorder.recordState(threadId,'modelUsed',result.modelUsed);
      inspectorRecorder.recordState(threadId,'providerStatus',result.providerStatus);
    }
    if(result?.hitlAction)inspectorRecorder.recordState(threadId,'hitlActionId',result.hitlAction.id);
  }
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
      // CG-02 — Dealer Workspace: senarai store milik actor (grant dealer sahaja).
      if(path==='/dealer/stores')return dealerStores.forActor(actor);
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
      if(path==='/dealer/terms'){const apps=store.all<{dealerOrgId?:string;status:string}>('dealer_applications');if(!hasApprovedDealerAccess(actor,apps)&&!auth.has(actor,'founder'))fail('FORBIDDEN',403);return operations.settings().approvedPolicies.dealer??null;}
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
      if(path==='/quotas'){runtimeControls.authorized(actor);return [jobs.usage(),...['hermes','nvidia','postiz','agent_reach'].map(providerId=>({providerId,observation:'unavailable' as const,reasonCode:'PROVIDER_USAGE_NOT_OBSERVED',observedUnits:null,limitUnits:null,available:false,observedAt:now()}))];}
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
        // Descriptor ini disahkan dengan auth.operational — sama seperti
        // /copilot/providers — kerana ia mendedahkan konfigurasi model percuma
        // yang sedang digunakan oleh platform.
        auth.operational(actor);
        return {
          version: '2.0.0',
          // Tiada CopilotKitRuntime / @ag-ui/core envelope digunakan oleh
          // server. Laluan ini dilayani oleh router kata kunci tempatan yang
          // memancarkan SSE dengan kontrak event platform sendiri
          // (start | text_delta | a2ui | gen_ui | hitl_prompt | done | error).
          runtime: 'local-keyword-router',
          transport: 'http-json-sse',
          aguiProtocolImplemented: false,
          copilotkitRuntimeImplemented: false,
          aguiEventContract: 'project-local-sse-events',
          aguiEventNames: ['start', 'text_delta', 'a2ui', 'gen_ui', 'hitl_prompt', 'done', 'error'],
          schema: 'a2ui.v1',
          a2uiSchemaImplemented: true,
          activeProvider: freeModelRouter.getActiveProvider().id,
          candidateModels: freeModelRouter.getStrictFreeCandidates(),
          allowlistedComponents: A2UI_ALLOWLISTED_COMPONENTS,
          paidFallbackAllowed: false,
          notes: 'Dilayani oleh server/platform/adkAgent.ts (router kata kunci + penilai margin kanonikal). Runtime CopilotKit rasmi belum dipasang pada laluan ini.',
        };
      }
      if(path==='/copilot/tools'){auth.operational(actor);return globalDomainTools.listTools(getActorCanonicalRole(actor));}
      if(path==='/copilot/mcp/brief/daily'){auth.operational(actor);return operationsBrief.getDailyBrief();}
      if(path==='/copilot/mcp/brief/urgent'){auth.operational(actor);return operationsBrief.getUrgentBrief();}
    }
    if(method==='POST') {
      if(path==='/auth/logout'){auth.logout(actor);return {loggedOut:true};}
      if(path==='/onboarding/validate'){auth.founder(actor);return onboarding.validate(object(input) as any);}
      if(path==='/onboarding/commit')return onboarding.commit(actor,object(input) as any);
      // PD-01 — rekod kebenaran aset BERSTRUKTUR. Tanpa laluan ini, consent
      // tidak boleh diberi dan gate `ASSET_CONSENT_NOT_GRANTED` akan menutup
      // semua penghantaran secara kekal.
      if(path==='/campaigns/consent')return recordAssetConsent(store,auth,actor,input);
      if(path==='/migration/dry-run'){auth.founder(actor);const body=object(input);return migration.dryRun(list(body.records,500));}
      if(path==='/migration/import'){const body=object(input);return migration.executeImport(actor,list(body.records,500));}
      if(segments[0]==='migration'&&segments[1]==='rollback'&&segments[2])return migration.rollback(actor,segments[2]);
      if(path==='/catalogue')return commerce.saveProduct(actor,input);
      if(path==='/flows')return flows.save(actor,input);
      if(path==='/flow-sessions')return flows.start(actor,input);
      if(segments[0]==='flow-sessions'&&recordId){if(command==='advance')return flows.advance(actor,recordId,input);if(command==='back')return flows.advance(actor,recordId,input,true);if(command==='review')return flows.review(actor,recordId,input);if(command==='form')return flows.form(actor,recordId,input);if(command==='submit')return flows.submit(actor,recordId,input,key);}
      if(path==='/quotes')return commerce.quote(actor,input);
      if(path==='/orders')return commerce.submitOrder(actor,input,key);
      if(segments[0]==='orders'&&recordId){if(command==='transition')return commerce.transition(actor,recordId,input);if(command==='revoke-tracking')return commerce.revokeTrackingToken(actor,recordId);if(command==='payment')return commerce.payment(actor,recordId,input,key);}
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
        // §4:91 — "60 canonical tool requests/min/principal".
        store.rate(`copilot-tool:${actor.user.id}`,options.rateLimits?.copilotTool??60);
        return globalDomainTools.executeTool(segments[2], { actor, store, commerce, dealers, loyalty, operations, auth }, input);
      }
    }
    fail('NOT_FOUND',404,'Laluan tidak ditemui.');
  }
  return {
    store, auth, commerce, loyalty, work, jobs, automationDefinitions, legacyPilots, founderIntelligence,
    adkAgent, freeModelRouter, backupScheduler,
    async fetch(request:Request):Promise<Response> {
      const requestId=randomUUID();
      // BL-15 — id thread bagi respons chat, supaya walaupun ralat, pelayar
      // tahu thread mana yang digunakan (dan boleh reconnect).
      let chatThreadId:string|undefined;
      try {
        const url=new URL(request.url),path=url.pathname.replace(/^\/api\/platform/,'');
        if(!url.pathname.startsWith('/api/platform/')&&!url.pathname.startsWith('/v2')&&!url.pathname.startsWith('/copilotkit/v2'))fail('NOT_FOUND',404);
        if(!['GET','POST'].includes(request.method))fail('METHOD_NOT_ALLOWED',405);
        // BL-22 — inspector tempatan hanya dibenarkan pada mesin pembangunan
        // tempatan. Dalam produksi ia TIDAK didedahkan langsung (404), dan
        // semakan ini berlaku SEBELUM sesi atau sesi_authority dikira.
        if(request.method==='GET'&&path==='/dev/inspector'&&!isLocalInspectorAllowed({nodeEnv:process.env.NODE_ENV}))fail('INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION',404,'Inspector tempatan tidak tersedia dalam persekitaran produksi.');
        // Provider callbacks use their signature as authority, never browser cookies or CSRF.
        if(request.method==='POST'&&path==='/whatsapp/webhook'){
          store.rate('whatsapp-webhook',120);
          if(!request.headers.get('content-type')?.includes('application/json'))fail('CONTENT_TYPE',415);
          const bytes=await boundedBody(request,256*1024);
          let rawBody:string;try{rawBody=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('INVALID_JSON',400);}
          return json({ok:true,data:store.atomic(()=>whatsapp.processWebhook(request.headers.get('x-hub-signature-256'),rawBody))});
        }
        // PAY-01/PAY-02 — laluan pembekal pembayaran. Authority ialah tandatangan
        // HMAC dalam badan, bukan cookie pelayar dan bukan token CSRF, jadi
        // ia diletakkan SEBELUM semakan asal/CSRF. Laluan pulangan pula
        // hanya membaca status yang tersimpan.
        if(request.method==='POST'&&path==='/payments/callback')return paymentCallbackRoute(request);
        if(request.method==='GET'&&path==='/payments/return')return paymentReturnRoute(request);
        // CG-02 — public Online Store per Agent/Stokis. Pelawat boleh browse
        // TANPA log masuk; projek yang dikembalikan tidak mengandungi data
        // peribadi owner (lihat DealerStores.publicBySlug).
        const kedaiMatch=request.method==='GET'?/^\/kedai\/([a-z0-9-]+)$/.exec(path):null;
        if(kedaiMatch){
          const projection=dealerStores.publicBySlug(kedaiMatch[1]);
          if(!projection)fail('STORE_NOT_FOUND',404,'Kedai tidak dijumpai.');
          return json({ok:true,data:{store:projection,catalogue:store.all<CatalogueProduct>('catalogue').filter(product=>product.status==='published').map(product=>({...product,availableQuantity:commerce.available(product.id)}))}});
        }
        if(request.method==='POST'&&!allowedOrigins.includes(request.headers.get('origin')??''))fail('ORIGIN_DENIED',403,'Asal permintaan tidak dibenarkan.');
        if(request.method==='POST'&&path==='/evidence/upload'){const actor=auth.resolve(request);store.rate(`upload:${actor.user.id}`,12);auth.csrf(actor,request.headers.get('x-csrf-token'));if(runtimeControls.current().activeRelease==='platform-local-readonly-v1')fail('RELEASE_READ_ONLY',409);if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))fail('CONTENT_TYPE',415);return json({ok:true,data:await evidenceFiles.upload(actor,request)});}
        let input:unknown=undefined;
        if(request.method==='POST') {if(!request.headers.get('content-type')?.includes('application/json'))fail('CONTENT_TYPE',415);
          // §4:92 — "Request/input | body 64 KiB … reject 413 sebelum inference".
          const declaredLength=Number(request.headers.get('content-length')??'0');
          if(Number.isFinite(declaredLength)&&declaredLength>64*1024)fail('PAYLOAD_TOO_LARGE',413,'Badan permintaan melebihi 64 KiB.');
          const body=new TextDecoder().decode(await boundedBody(request,64*1024));
          if(new TextEncoder().encode(body).byteLength>64*1024)fail('PAYLOAD_TOO_LARGE',413,'Badan permintaan melebihi 64 KiB.');
          try{input=JSON.parse(body);}catch{fail('INVALID_JSON',400);}object(input);}
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
                  if(auth.optionalSession(request))fail('AUTHENTICATED_LOGIN_REQUIRES_LOGOUT',409,'Log keluar dahulu sebelum menukar akaun.');
                  store.rate('identity-global',options.rateLimits?.identityGlobal??30);
                  const body=object(input);fields(body,['accessToken']);
                  if(!options.googleIdentityVerifier)fail('GOOGLE_IDENTITY_UNAVAILABLE',503,'Google login belum tersedia. Gunakan email dan password.');
                  let authenticated=false;
                  try{auth.resolve(request);authenticated=true;}catch(error){if(!(error instanceof DomainError&&error.status===401))throw error;}
                  if(authenticated)fail('AUTHENTICATED_LOGIN_REQUIRES_LOGOUT',409,'Log keluar dahulu sebelum menukar akaun.');
          const identity=await options.googleIdentityVerifier(text(body.accessToken,'Token identiti',16000));
          store.rate(`identity:${identity.email.toLowerCase()}`, options.rateLimits?.identityAccount ?? 6);
          const result=await auth.authenticateGoogle(identity);
          // Putaran sesi: mana-mana sesi LAIN yang dikemukakan oleh pelayar
          // yang sama dicabut, supaya cookie legacy yang tertinggal tidak
          // boleh menaungi sesi baharu ini.
          auth.revokePresentedSessions(result.actor,request);
          return json({ok:true,data:result.data},200,{'Set-Cookie':result.cookies.map(header=>secureCookie(header,url.protocol==='https:'))});
        }
        if(request.method==='POST'&&['/auth/signup','/auth/login','/auth/bootstrap'].includes(path)) {
                  if(auth.optionalSession(request))fail('AUTHENTICATED_LOGIN_REQUIRES_LOGOUT',409,'Log keluar dahulu sebelum menukar akaun.');
          store.rate('identity-global',options.rateLimits?.identityGlobal??30);const authInput=object(input);if(typeof authInput.email==='string')store.rate(`identity:${authInput.email.toLowerCase()}`,options.rateLimits?.identityAccount??6);
          const result=await auth.authenticate(path.slice(6) as 'signup'|'login'|'bootstrap',input);
          // Putaran sesi (lihat handler Google di atas): sesi lain yang
          // dikemukakan oleh pelayar yang sama dicabut selepas log masuk.
          auth.revokePresentedSessions(result.actor,request);
          return json({ok:true,data:result.data},200,{'Set-Cookie':result.cookies.map(header=>secureCookie(header,url.protocol==='https:'))});
        }
        const actor=auth.resolve(request);store.rate(`actor:${actor.user.id}`,options.rateLimits?.actor??180);
        // §4:91 — "120 control requests/min/principal" (descriptor, state,
        // session, capabilities). Endpoint control murah tetapi tetap perlu
        // had supaya tidak jadi vektor leitura.
        store.rate(`copilot-control:${actor.user.id}`,options.rateLimits?.copilotControl??120);
        // BL-22 — inspector tempatan memerlukan sesi server yang sah DAN
        // kebenaran pengasas/pembangun. Sesi pelanggan ditolak 403.
        if(request.method==='GET'&&path==='/dev/inspector'){
          if(!auth.has(actor,'founder')&&!auth.has(actor,'developer'))fail('FORBIDDEN',403,'Akses inspector tidak dibenarkan.');
          return json({ok:true,data:inspector.snapshot()});
        }
        // BL-15 — replay sejarah thread AG-UI. `resume()` mengesahkan semula
        // sesi DAN tenancy/kepemilikan thread sebelum satu event pun dihantar,
        // jadi thread tenant atau pemilik lain menerima 403 bertyped
        // (`THREAD_TENANT_FORBIDDEN` / `THREAD_OWNER_FORBIDDEN`) dan sejarahnya
        // tidak pernah bocor. `?after=<eventId>` hanya memutar semula peristiwa
        // selepas kursor tersebut.
        if(request.method==='GET'&&/^\/copilot\/threads\/[^/]+\/events$/.test(path)){
          const threadId=path.split('/')[3];
          const after=url.searchParams.get('after');
          const resumed=aguiThreads.resume(actor,{threadId,afterEventId:after??undefined});
          return new Response(resumed.events.map(sseFrameFor).join(''),{
            status:200,
            headers:{
              'Content-Type':'text/event-stream; charset=utf-8',
              'Cache-Control':'no-cache, no-transform',
              'Connection':'keep-alive',
              'X-Accel-Buffering':'no',
              'X-Thread-Id':resumed.threadId,
              'X-Last-Event-Id':resumed.lastEventId??'',
              'X-Receipt-Count':String(resumed.receiptCount),
            }
          });
        }
        if(request.method==='GET'&&/^\/evidence\/[^/]+\/file$/.test(path))return await evidenceFiles.download(actor,path.split('/')[2],url);
        if(request.method==='GET'&&/^\/exports\/[^/]+\/file$/.test(path))return await evidenceFiles.downloadExport(actor,path.split('/')[2],url);
        if(request.method==='POST')auth.csrf(actor,request.headers.get('x-csrf-token'));
        // Log out mencabut SEMUA sesi yang dikemukakan pelayar yang sama
        // (termasuk sesi di dalam cookie legacy `Path=/api/platform`),
        // supaya tiada sesi hidup tinggal selepas log keluar.
        if(request.method==='POST'&&path==='/auth/logout')auth.revokePresentedSessions(actor,request);
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
        // REF-01 — risk engine (keputusan, cabaran OTP, rayuan). DR-01 —
        // pengukuran RTO (latihan pemulihan). Kedua-duanya di-prefix supaya
        // ia tidak berebut laluan dengan capability yang lain.
        if(path.startsWith('/risk')||path.startsWith('/recovery')){
          const handled=await (path.startsWith('/risk')?riskRoutes:recoveryRoutes).handle(actor,request.method,path,input);
          if(handled!==undefined)return json({ok:true,data:handled});
        }
        if(request.method==='POST'&&(path==='/copilot/chat'||path==='/copilot/v2'||path==='/v2'||path==='/copilotkit/v2')){
          // §4:91 — "10 run creations/min/principal". Had ini mesti datang
          // SEBELUM panggilan provider: tanpa ia, satu principals dengan
          // sesi sah boleh menghabiskan kuota free tier (20 permintaan/hari)
          // dalam beberapa saat sahaja.
          store.rate(`copilot-run:${actor.user.id}`,options.rateLimits?.copilotRun??10);
          auth.operational(actor);
          const b=object(input);
          // BL-21 / EXT-07 — lampiran tidak pernah menjadi bukti vision.
          // Rujukan lampiran diselesaikan dahulu oleh store (dicabut ⇒ 409
          // `ATTACHMENT_REVOKED`, di luar akses ⇒ 403
          // `ATTACHMENT_PERMISSION_DENIED`). Vision pula tiada model layak
          // dikonfigurasi, jadi mana-mana run yang membawa lampiran ditolak
          // secara jujur — tiada kejayaan reka, tiada hash reka.
          const attachmentIds=Array.isArray(b.attachmentIds)?b.attachmentIds.filter((value):value is string=>typeof value==='string'):[];
          const attachments=attachmentIds.length?evidenceFiles.attachmentReferences(actor,attachmentIds):[];
          const vision=visionInferenceAvailability();
          if(attachments.length&&!vision.available){
            return json({ok:false,code:'VISION_INFERENCE_UNAVAILABLE',reasonCode:vision.reasonCode,requestId,message:vision.reason,data:{reasonCode:vision.reasonCode,reason:vision.reason,attachments,vision:{available:false,reasonCode:vision.reasonCode,reason:vision.reason}}},409);
          }
          const rawMessage = typeof b.message === 'string'
            ? b.message
            : (Array.isArray(b.messages) && b.messages.length > 0
                ? (typeof b.messages[b.messages.length - 1]?.content === 'string' ? b.messages[b.messages.length - 1]?.content : '')
                : (typeof b.query === 'string' ? b.query : ''));
          const messageText=text(rawMessage,'Mesej copilot',8192);
          const conversationHistory=(Array.isArray(b.history)
            ? b.history
            : (Array.isArray(b.messages) ? b.messages.slice(0, -1) : [])) as any[];
          // §3:71 + §4:92 — sejarah pelayar BUKAN authority. Had 20 rujukan
          // (§4:92 "maksimum 20 history references yang disahkan server") dan
          // role 'system'/'tool' dibuang: tanpa ini, mesej system daripada
          // browser mendahului prompt pelayan dan model melihat arahan
          // pelanggan sebagai arahan sistem.
          const sanitisedHistory=conversationHistory
            .filter(entry=>!!entry&&typeof entry==='object'&&(entry.role==='user'||entry.role==='assistant'))
            .slice(-20)
            .map(entry=>({role:entry.role as 'user'|'assistant',content:typeof entry.content==='string'?entry.content:''}));
          const streamRequested=request.headers.get('accept')?.includes('text/event-stream')||b.stream===true;

          // BL-15 — kitaran hidup thread AG-UI. Thread milik tenant atau
          // pemilik lain ditolak dengan ralat bertyped SEBELUM satu event
          // pun ditulis ke dalamnya.
          const activeThread=resolveChatThread(actor,b);
          chatThreadId=activeThread.id;

          // Bingkai `start` diambil sebelum panggilan model supaya susunan
          // bait SSE kekal sama seperti sebelum BL-15.
          const startFrame={activeProvider:freeModelRouter.getActiveProvider().id,model:freeModelRouter.getActiveProvider().defaultModel,runtime:'v2',schemaVersion:'a2ui.v1'};

          // Panggilan model DIKELUARKAN daripada badan SSE. Setiap peristiwa
          // mesti disimpan SEBELUM Response dibina: pengendali durable awan
          // mengkomit snapshot sebaik sahaja `app.fetch` kembali, jadi peristiwa
          // yang di-append di dalam `start()` akan hilang. Akibatnya bait
          // pertama kini menunggu latensi model (trade-off yang diterima).
          const startedAt=Date.now();
          let result:CopilotRunResult|undefined;
          let failure:{error:unknown}|undefined;
          try{result=await adkAgent.processMessage(actor,messageText,sanitisedHistory);}
          catch(error){failure={error};}
          const durationMs=Date.now()-startedAt;

          // Sejarah thread disimpan sebelum Response dibina.
          const persisted=persistChatEvents(actor,activeThread,startFrame,result,failure);
          recordInspectorRun(activeThread.id,persisted,durationMs,result,failure);

          if(streamRequested){
            const encoder=new TextEncoder();
            const stream=new ReadableStream({
              start(controller){
                try{
                  controller.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify(startFrame)}\n\n`));
                  if(failure)throw failure.error;
                  if(result!.a2ui){
                    controller.enqueue(encoder.encode(`event: a2ui\ndata: ${JSON.stringify(result!.a2ui)}\n\n`));
                  }
                  if(result!.generativeUi){
                    controller.enqueue(encoder.encode(`event: gen_ui\ndata: ${JSON.stringify(result!.generativeUi)}\n\n`));
                  }
                  if(result!.hitlAction){
                    controller.enqueue(encoder.encode(`event: hitl_prompt\ndata: ${JSON.stringify(result!.hitlAction)}\n\n`));
                  }
                  const words=result!.reply.split(/(\s+)/);
                  for(const word of words){
                    if(word){
                      controller.enqueue(encoder.encode(`event: text_delta\ndata: ${JSON.stringify({content:word})}\n\n`));
                    }
                  }
                  controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(result)}\n\n`));
                  controller.close();
                }catch(err:any){
                  // Ralat upstream TIDAK pernah dipaparkan kepada pelayar sebagai
                  // mesej mentah. Yang dihantar ialah reason code yang stabil dan
                  // mesej tetap dalam Bahasa Melayu.
                  const code=typeof err?.code==='string'?err.code:'COPILOT_RUNTIME_ERROR';
                  const message=err instanceof DomainError?err.message:clientSafeErrorMessage(code);
                  controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({code,message})}\n\n`));
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
                'X-Thread-Id':activeThread.id,
              }
            });
          }

          // Laluan JSON: ralat kekal sebagai ralat JSON (bukan bingkai SSE).
          if(failure)throw failure.error;
          return json({ok:true,data:result},200,{'X-Thread-Id':activeThread.id});
        }
        const data=request.method==='POST'?store.atomic(()=>postRoute(actor,path,input,request.headers.get('idempotency-key'),url)):route(actor,request.method,path,input,null,url);
        if(Array.isArray(data))return collection(data,url);
        // Log out mengosongkan KEDUA-DUA skop cookie (semasa `Path=/` dan lama
        // `Path=/api/platform`) dan mencabut setiap sesi yang dikemukakan.
        return json({ok:true,data},200,path==='/auth/logout'?{'Set-Cookie':sessionCookieClearHeaders()}:{});
      } catch(error) {
        const domain=error instanceof DomainError?error:new DomainError('INTERNAL_ERROR',500,'Perkhidmatan tidak tersedia. Cuba semula.');
        try{options.log?.({requestId,code:domain.code,status:domain.status});}catch{console.warn('Platform redacted audit logging unavailable.');}
        const extra:Record<string,string|string[]>=domain.status===429?{'Retry-After':'60'}:{};
        if(chatThreadId)extra['X-Thread-Id']=chatThreadId;
        return json({ok:false,code:domain.code,requestId,message:domain.message},domain.status,extra);
      }
    },
    close(){backupScheduler.stop();store.close();},
  };
}
