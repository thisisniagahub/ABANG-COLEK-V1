import { useState, useEffect, useCallback } from 'react';
import { Copy,Download,ExternalLink,Plus,Shield,Store,Wallet } from 'lucide-react';
import type { BusinessSettings,CatalogueProduct,ExpenseRecord,ExportArtifact,Membership,OrderRecord,ReconciliationRecord,SessionData,WorkspaceRole } from '../../../shared/platform-contracts';
import type { DealerBenefit,DealerCommissionSummary } from '../../../shared/dealer-contracts';
import type { DealerStoreRecord,PublicDealerStore } from '../../../shared/dealer-store-contracts';
import type { FinanceSummary } from '../../../shared/report-contracts';
import { api,apiPage,useResource } from '../platform/client';
import { amountToSen,dateLabel,downloadText,escapeCsvCell,money,positiveQuantity } from './experience-model';
import { Empty,field,FormPanel,MutationButton,Panel,RecordMeta,Refresh,ResourceState,splitRefs,Status } from './ui';

export function Finance({ onChanged }: { onChanged?: () => void; }) {
  const payments=useResource<{ id: string; orderId: string; amountSen: number; method: string; reference: string; state: string; createdAt: string; }[]>('/payments');
  const expenses=useResource<ExpenseRecord[]>('/expenses');
  const reconciliations=useResource<ReconciliationRecord[]>('/reconciliations');
  const summary=useResource<FinanceSummary>('/finance/summary');
  const [create,setCreate]=useState(false);
  const [reconcile,setReconcile]=useState(false);
  const refresh=() => { expenses.reload(); reconciliations.reload(); payments.reload(); summary.reload(); onChanged?.(); };
  const verified=summary.data?.netConfirmedReceiptsSen;
  const receivables=summary.data?.receivablesSen;
  return <>
    <ResourceState {...summary} />
    <div className="xp-metrics">
      <div className="xp-metric">
        <span className="xp-eyebrow">Verified receipts minus refunds</span>
        <strong>{verified==null? '—':money(verified)}</strong>
        <small>All confirmed payment records · belum profit</small>
      </div>
      <div className="xp-metric">
        <span className="xp-eyebrow">Receivables</span>
        <strong>{receivables==null? '—':money(receivables)}</strong>
        <small>Active order value minus paid amounts</small>
      </div>
      <div className="xp-metric">
        <span className="xp-eyebrow">Approved expenses</span>
        <strong>{summary.data? money(summary.data.approvedExpensesSen):'—'}</strong>
        <small>Draft expenses excluded</small>
      </div>
    </div>
    {summary.data&&<p className="xp-notice">All authorized records · {summary.data.sourceCounts.orders} orders · {summary.data.sourceCounts.paymentRecords} payment rows · {summary.data.sourceCounts.approvedExpenses} approved expenses · {dateLabel(summary.data.generatedAt)}. Manual dealer receipts {money(summary.data.manualDealerReceiptsSen)} direkod oleh pengguna dan dipaparkan berasingan daripada confirmed order receipts. Angka ini belum profit.</p>}
    <Panel title="Expenses & evidence" eyebrow="Integer sen · approval audit" action={<div className="xp-actions">
      <Refresh onClick={refresh} />
      <button className="xp-button" onClick={() => setCreate(!create)}>
        <Plus size={17} /> Rekod expense</button>
    </div>}>
      <ResourceState {...expenses} />{expenses.data?.map(expense => <article className="xp-expense" key={expense.id}>
        <div>
          <h3>{expense.category}</h3>
          <p>{expense.outletId} · {dateLabel(expense.createdAt)}</p>
          <RecordMeta id={expense.id} revision={expense.revision} />
          <p className="xp-muted">{expense.evidenceIds.length} evidence references</p>
        </div>
        <strong>{money(expense.amountSen)}</strong>
        <Status value={expense.status} />{expense.status==='draft'&&<MutationButton path={`/expenses/${expense.id}/approve`} input={{ expectedRevision: expense.revision }} onChanged={refresh} confirmLabel="Sahkan expense & evidence">Approve</MutationButton>}</article>)}{!expenses.loading&&!expenses.error&&!expenses.data?.length&&<Empty description="Expense draft memerlukan source evidence dan approval sebelum masuk angka approved." />}</Panel>{create&&<FormPanel title="Expense draft" fields={[field('outletId','Outlet ID'),field('category','Kategori / tujuan expense'),field('amount','Amaun (RM)',{ type: 'number',min: .01,step: '.01' }),field('evidenceIds','Evidence IDs',{ help: 'Bukti sebenar yang telah disimpan dalam record berkaitan.',required: false })]} onCancel={() => setCreate(false)} onSubmit={async values => { const result=await api('/expenses',{ method: 'POST',body: JSON.stringify({ outletId: values.outletId,category: values.category,amountSen: amountToSen(values.amount),evidenceIds: splitRefs(values.evidenceIds) }) }); refresh(); return result; }} />}<Panel title="Payment ledger references" eyebrow="Verified source IDs for reconciliation">
      <ResourceState {...payments} />{payments.data?.map(payment => <article className="xp-list-row" key={payment.id}>
        <div>
          <strong>{money(payment.amountSen)} · {payment.method}</strong>
          <p>{payment.reference} · Order {payment.orderId}</p>
          <RecordMeta id={payment.id} />
        </div>
        <Status value={payment.state} />
      </article>)}{!payments.loading&&!payments.error&&!payments.data?.length&&<Empty description="Payment references muncul selepas authorized verification." />}</Panel>
    <Panel title="Period reconciliation" eyebrow="No unexplained balanced labels" action={<button className="xp-button xp-secondary" onClick={() => setReconcile(!reconcile)}>Bina reconciliation</button>}>
      <ResourceState {...reconciliations} />{reconciliations.data?.map(record => <article className="xp-reconciliation" key={record.id}>
        <h3>{record.period}</h3>
        <RecordMeta id={record.id} revision={record.revision} />
        <div className="xp-actions">
          <Status value={record.status} />
          <span>{record.paymentRefs.length} payment refs · {record.expenseRefs.length} expense refs</span>
        </div>{record.discrepancies.length? <ul className="xp-discrepancy-list">{record.discrepancies.map((message,index) => <li key={index}>{message}</li>)}</ul>:<p className="xp-notice">Tiada discrepancy yang dilaporkan oleh server. Semak sumber sebelum approval.</p>}{record.status!=='approved'&&<FormPanel title="Review reconciliation" fields={[field('reason','Review decision / discrepancy resolution',{ type: 'textarea' })]} submitLabel="Approve reconciliation" onSubmit={async values => { const result=await api(`/reconciliations/${record.id}/approve`,{ method: 'POST',body: JSON.stringify({ expectedRevision: record.revision,reason: values.reason }) }); refresh(); return result; }} />}</article>)}{!reconciliations.loading&&!reconciliations.error&&!reconciliations.data?.length&&<Empty description="Link verified payment dan approved expense IDs untuk semakan period." />}</Panel>{reconcile&&<FormPanel title="Sediakan period reconciliation" fields={[field('period','Period',{ type: 'month' }),field('paymentRefs','Verified payment IDs',{ help: 'Gunakan payment ledger IDs di atas; pisahkan dengan koma.' }),field('expenseRefs','Expense references',{ required: false })]} onCancel={() => setReconcile(false)} onSubmit={async values => { const result=await api('/reconciliations',{ method: 'POST',body: JSON.stringify({ period: values.period,paymentRefs: splitRefs(values.paymentRefs),expenseRefs: splitRefs(values.expenseRefs) }) }); refresh(); return result; }} />}</>;
}
interface PersonRecord { id: string; email: string; name: string; memberships: Membership[]; }
export function People({ onChanged }: { onChanged?: () => void; }) {
  const resource=useResource<PersonRecord[]>('/people');
  const sessionResource=useResource<SessionData>('/session');
  const [grant,setGrant]=useState<PersonRecord|null>(null);
  const [recovery,setRecovery]=useState<{ requests: any[]; loading: boolean; error: string }>({ requests: [], loading: false, error: '' });
  const refresh=() => { resource.reload(); onChanged?.(); };

  // Semak sama ada pengguna adalah founder
  const isFounder = sessionResource.data?.memberships.some((m: any) => m.role === 'founder' && m.status === 'active') ?? false;

  // Memuat permintaan pemulihan kata laluan (hanya founder)
  useEffect(() => {
    if (!isFounder) return;
    apiPage<any[]>('/auth/password-recovery/requests')
      .then(page => {
        if (sessionResource.data) {
          setRecovery({ requests: page.data || [], loading: false, error: '' });
        }
      })
      .catch(() => setRecovery({ requests: [], loading: false, error: 'Rekod pemulihan tidak tersedia.' }));
  }, [isFounder, sessionResource.data]);

  function handleRefresh() {
    if (isFounder) {
      apiPage<any[]>('/auth/password-recovery/requests')
        .then(page => setRecovery({ requests: page.data || [], loading: false, error: '' }))
        .catch(() => setRecovery({ requests: [], loading: false, error: 'Rekod pemulihan tidak tersedia.' }));
    }
  }

  const refreshRecovery = useCallback(() => {
    handleRefresh();
  }, [isFounder]);

  return <>
    <Panel title="People & access" eyebrow="Membership · role · outlet scope" action={<Refresh onClick={refresh} />}>
      <ResourceState {...resource} />
      <p className="xp-notice">
        <Shield size={18} /> Access disahkan server pada setiap request. Grant dan revoke menyimpan membership version.</p>{resource.data?.map(person => <article className="xp-person" key={person.id}>
          <div className="xp-avatar" aria-hidden="true">{person.name.slice(0,2).toUpperCase()}</div>
          <div className="xp-person-main">
            <h3>{person.name}</h3>
            <p>{person.email}</p>
            <RecordMeta id={person.id} />{person.memberships.map(member => <div className="xp-membership" key={member.id}>
              <Status value={member.role} />
              <Status value={member.status} />
              <span>v{member.version} · {member.outletIds.join(', ')||'Business scope'}</span>{member.status==='active'&&<MutationButton path="/people/revoke" input={{ membershipId: member.id,expectedVersion: member.version }} onChanged={refresh} confirmLabel="Sahkan revoke access">Revoke</MutationButton>}</div>)}</div>
            <button className="xp-button xp-secondary" onClick={() => setGrant(person)}>Assign role</button>
          </article>)}{!resource.loading&&!resource.error&&!resource.data?.length&&<Empty description="Pengguna berdaftar muncul daripada authoritative identity store." />}

          {/* Panel pemulihan kata laluan founder — dipapar mengikut founder saja */}
          {isFounder && recovery.requests.length > 0 && (
            <Panel title="Pemulihan kata laluan" eyebrow="Permintaan berdaftar · kod sukar">
              <ul>
                {recovery.requests.map((req: any, idx: number) => (
                  <li key={req.requestId ?? req.id ?? idx} className="xp-person">
                    <div className="xp-avatar">{req.maskedEmail?.slice(0,2).toUpperCase() || '?'}</div>
                    <div className="xp-person-main">
                      <h3>{req.userDisplayName || 'Pengguna tidak diketahui'}</h3>
                      <p>{req.maskedEmail || '—'}</p>
                      <RecordMeta id={req.requestId ?? req.id} revision={req.revision} />
                      <p className="xp-muted">
                        Status: {req.status}
                        {req.emailDeliveryStatus && <span> • Hantar emel: {req.emailDeliveryStatus}</span>}
                        {req.expiresAt && <span> • Kadaluarsa: {new Date(req.expiresAt).toLocaleDateString('ms-MY')}</span>}
                      </p>
                      {req.status === 'pending' && (
                        <MutationButton
                          path={`/auth/password-recovery/requests/${req.requestId ?? req.id}/issue-code`}
                          input={{ expectedRevision: req.revision }}
                          onChanged={refreshRecovery}
                          confirmLabel="Hasilkan kod sukar"
                        >
                          {req.issuedCode ? (
                            <span>Kod sudah dikeluarkan</span>
                          ) : (
                            'Hasilkan kod'
                          )}
                        </MutationButton>
                      )}
                      {req.issuedCode && (
                        <p className="xp-notice">
                          <strong>Kod sukar:</strong> {req.issuedCode}
                          <button className="xp-button xp-small" onClick={() => navigator.clipboard.writeText(req.issuedCode)}>
                            Copy
                          </button>
                        </p>
                      )}
                      {req.status !== 'pending' && <p className="xp-muted">Permintaan ini tidak lagi boleh diterbitkan kod.</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {grant&&<FormPanel key={grant.id} title={`Access: ${grant.name}`} description="Semak scope sebelum grant. Last founder dan self-escalation dilindungi server." fields={[field('role','Role',{ options: (['customer','staff','founder','developer'] as WorkspaceRole[]).map(value => ({ value,label: value })) }),field('outletIds','Assigned outlet IDs',{ required: false,help: 'Staff mesti assigned kepada outlet. Pisahkan dengan koma.' })]} onCancel={() => setGrant(null)} submitLabel="Preview & confirm role grant" onSubmit={async values => {
            const current=grant.memberships.find(member => member.role===values.role);
            const result=await api('/people/grants',{ method: 'POST',body: JSON.stringify({ userId: grant.id,role: values.role,outletIds: splitRefs(values.outletIds),expectedVersion: current?.version??0 }) }); refresh(); return result;
          }} />}<Panel title="Tambah ahli pasukan" eyebrow="Identity onboarding">
          <p>Ahli pasukan mendaftar menggunakan akaun mereka, kemudian founder menetapkan role dan outlet di atas.</p>
          <p className="xp-muted">Logged in as {sessionResource.data?.user.email??'…'}. Jangan kongsi password pasukan.</p>
        </Panel>
      </Panel>
  </>;
}
export function Settings({ onChanged }: { onChanged?: () => void; }) {
  const resource=useResource<BusinessSettings>('/settings');
  const [tab,setTab]=useState('business');
  const [editing,setEditing]=useState(false);
  const refresh=() => { resource.reload(); onChanged?.(); };
  const settings=resource.data;
  const terms=settings?.approvedPolicies.dealer;
  return <>
    <Panel title="Operating settings" eyebrow="Approved policies · explicit revision" action={<div className="xp-actions">
      <Refresh onClick={refresh} />
      <button className="xp-button" onClick={() => setEditing(!editing)} disabled={!settings}>Edit policy</button>
    </div>}>
      <ResourceState {...resource} />
      <div className="xp-tablist">{['business','dealer','locations'].map(value => <button key={value} className={tab===value? 'xp-tab-active':''} onClick={() => { setTab(value); setEditing(false); }}>{value==='business'? 'Business':value==='dealer'? 'Dealer terms':'Pickup locations'}</button>)}</div>{settings&&<>
        <RecordMeta id={settings.id} revision={settings.version} />{tab==='business'&&<div className="xp-detail-grid">
          <div>
            <span className="xp-muted">Locale / time zone</span>
            <p>{settings.locale} · {settings.timezone}</p>
          </div>
          <div>
            <span className="xp-muted">Contact</span>
            <p>{settings.approvedPolicies.contact||'Belum disahkan'}</p>
          </div>
          <div>
            <span className="xp-muted">Payment instructions</span>
            <p>{settings.approvedPolicies.paymentInstructions||'Belum disahkan'}</p>
          </div>
        </div>}{tab==='dealer'&&(terms? <div className="xp-detail-grid">
          <p>MOQ <strong>{terms.minimumQuantity}</strong>
          </p>
          <p>Pack multiple <strong>{terms.packMultiple}</strong>
          </p>
          <p>Retail price basis <strong>{terms.priceBasisPoints/100}%</strong>
          </p>
          <p>Ownership <strong>{terms.ownership}</strong>
          </p>
          <p>Return rules <strong>{terms.returnRules}</strong>
          </p>
          <p>Policy v{terms.version} · {dateLabel(terms.approvedAt)}</p>
        </div>:<Empty title="Commercial policy belum diluluskan" description="Dealer ordering akan dibuka selepas founder mengesahkan terma." />)}{tab==='locations'&&(settings.approvedPolicies.locations?.length? settings.approvedPolicies.locations.map(location => <article className="xp-list-row" key={location.id}>
          <div>
            <h3>{location.name}</h3>
            <p>{location.address}</p>
            <p>{location.hours}</p>
            <small>Verified {dateLabel(location.verifiedAt)} · {location.id}</small>
          </div>
        </article>):<Empty title="Tiada pickup location disahkan" description="Public page tidak memaparkan waktu atau lokasi yang belum approved." />)}</>}</Panel>{editing&&settings&&(tab==='business'? <FormPanel key={`${settings.version}:business`} title="Edit business policy" fields={[field('contact','Contact awam',{ defaultValue: settings.approvedPolicies.contact,required: false }),field('paymentInstructions','Arahan pembayaran disahkan',{ type: 'textarea',defaultValue: settings.approvedPolicies.paymentInstructions,required: false })]} submitLabel="Sahkan & simpan policy" onCancel={() => setEditing(false)} onSubmit={async values => { const result=await api('/settings',{ method: 'POST',body: JSON.stringify({ ...values,expectedVersion: settings.version }) }); refresh(); return result; }} />:tab==='dealer'? <FormPanel key={`${settings.version}:dealer`} title="Approved commercial terms" fields={[field('minimumQuantity','Minimum order quantity',{ type: 'number',min: 1,step: '1',defaultValue: terms? String(terms.minimumQuantity):'' }),field('packMultiple','Pack multiple',{ type: 'number',min: 1,step: '1',defaultValue: terms? String(terms.packMultiple):'' }),field('priceBasisPoints','Retail price basis (basis points)',{ type: 'number',min: 1,max: 10000,step: '1',defaultValue: terms? String(terms.priceBasisPoints):'',help: '10000 = 100% daripada published retail; disahkan founder.' }),field('ownership','Model ownership',{ defaultValue: terms?.ownership,options: [{ value: 'owned',label: 'Owned by dealer after receipt' },{ value: 'consigned',label: 'Consigned · business retains ownership' }] }),field('returnRules','Return rules',{ type: 'textarea',defaultValue: terms?.returnRules })]} onCancel={() => setEditing(false)} submitLabel="Sahkan terma dealer" onSubmit={async values => { const result=await api('/settings',{ method: 'POST',body: JSON.stringify({ expectedVersion: settings.version,dealerTerms: { minimumQuantity: positiveQuantity(values.minimumQuantity),packMultiple: positiveQuantity(values.packMultiple),priceBasisPoints: positiveQuantity(values.priceBasisPoints),ownership: values.ownership,returnRules: values.returnRules } }) }); refresh(); return result; }} />:<FormPanel key={`${settings.version}:locations`} title="Simpan verified pickup locations" description="Satu lokasi setiap baris: ID|nama|alamat|waktu operasi. Semak butiran sebenar; timestamp verification disimpan sekarang." fields={[field('locations','Lokasi yang disahkan',{ type: 'textarea',defaultValue: settings.approvedPolicies.locations?.map(location => `${location.id}|${location.name}|${location.address}|${location.hours}`).join('\n'),required: false })]} onCancel={() => setEditing(false)} onSubmit={async values => {
          const locations=values.locations.split('\n').filter(Boolean).map(line => { const [id,name,address,hours]=line.split('|').map(value => value.trim()); if(!id||!name||!address||!hours) throw new Error('Setiap lokasi memerlukan ID|nama|alamat|waktu.'); return { id,name,address,hours,verifiedAt: new Date().toISOString() }; });
          const result=await api('/settings',{ method: 'POST',body: JSON.stringify({ expectedVersion: settings.version,locations }) }); refresh(); return result;
        }} />)}</>;
}
export function Reports() {
  const [kind,setKind]=useState('orders');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [generated,setGenerated]=useState('');
  const orders=useResource<OrderRecord[]>('/orders');
  async function exportReport() {
    setBusy(true); setError('');
    try { const result=await api<{ content: string; filename?: string; generatedAt?: string; }>(`/reports/export?kind=${kind}`); downloadText(result.filename??`abangcolek-${kind}.csv`,result.content,'text/csv;charset=utf-8'); setGenerated(result.generatedAt??new Date().toISOString()); }
    catch(failure) { setError(failure instanceof Error? failure.message:'Export gagal.'); }
    finally { setBusy(false); }
  }
  return <>
    <Panel title="Reports & export" eyebrow="Source records · no invented profit">
      <p className="xp-form-description">Export daripada rekod authoritative yang dibenarkan. Order value, verified payments, refunds dan expenses dilaporkan secara berasingan.</p>
      <div className="xp-report-options">{[{ id: 'orders',title: 'Order ledger',text: 'Order value, status, verified amounts dan refund.' },{ id: 'tasks',title: 'Work outcomes',text: 'Assignment, due dates dan completion outcomes.' },{ id: 'expenses',title: 'Expense register',text: 'Integer sen, approval status dan source evidence.' }].map(report => <label key={report.id} className={`xp-report-option ${kind===report.id? 'xp-selected':''}`}>
        <input type="radio" name="report" value={report.id} checked={kind===report.id} onChange={() => setKind(report.id)} />
        <strong>{report.title}</strong>
        <span>{report.text}</span>
      </label>)}</div>
      <button className="xp-button" disabled={busy} onClick={exportReport}>
        <Download size={18} />{busy? 'Generating…':'Generate & download CSV'}</button>{error&&<p role="alert" className="xp-notice xp-error">{error}</p>}{generated&&<p role="status" className="xp-notice xp-success">Export generated {dateLabel(generated)}. Formula-like text dinyahaktifkan dalam CSV.</p>}</Panel>
    <Panel title="Order metric lineage" eyebrow="Eligible source rows">
      <ResourceState {...orders} />
      <div className="xp-detail-grid">
        <div>
          <span className="xp-muted">Order value</span>
          <h3>{orders.data? money(orders.data.filter(order => order.fulfilmentStatus!=='cancelled').reduce((sum,order) => sum+order.amountSen,0)):'—'}</h3>
          <p>Active orders; bukan cash receipt.</p>
        </div>
        <div>
          <span className="xp-muted">Verified receipts</span>
          <h3>{orders.data? money(orders.data.reduce((sum,order) => sum+order.paidAmountSen,0)):'—'}</h3>
          <p>Authorized verification records.</p>
        </div>
        <div>
          <span className="xp-muted">Recorded refunds</span>
          <h3>{orders.data? money(orders.data.reduce((sum,order) => sum+order.refundAmountSen,0)):'—'}</h3>
          <p>Refund amounts berasingan daripada order value.</p>
        </div>
      </div>
      <p className="xp-notice">Profit memerlukan COGS dan kos lain yang verified. Angka profit tidak dikira daripada incomplete inputs.</p>
    </Panel>
  </>;
}

export function DealerStoreOverview({
  role,
  onNavigate,
  onChanged,
}: {
  role: WorkspaceRole;
  onNavigate?: (path: string) => void;
  onChanged?: () => void;
}) {
  type WorkspaceDealerStore = Partial<DealerStoreRecord> & PublicDealerStore;
  const stores = useResource<WorkspaceDealerStore[]>('/dealer/stores');
  const [copiedSlug, setCopiedSlug] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [commSummary, setCommSummary] = useState<DealerCommissionSummary | null>(null);
  const [benefits, setBenefits] = useState<DealerBenefit[]>([]);

  const primaryStore = stores.data?.find(s => s.status === 'active') ?? stores.data?.[0];

  const loadCommissionData = useCallback(() => {
    if (!primaryStore) {
      setCommSummary(null);
      setBenefits([]);
      return;
    }
    const lookupCode = primaryStore.dealerOrgId ?? primaryStore.slug;
    api<DealerCommissionSummary>(`/dealer/commissions/summary?dealerOrgId=${encodeURIComponent(lookupCode)}`)
      .then(data => setCommSummary(data))
      .catch(() => setCommSummary(null));
    api<DealerBenefit[]>('/dealer/benefits')
      .then(rows =>
        setBenefits(
          rows.filter(
            b =>
              b.dealerOrgId === primaryStore.dealerOrgId ||
              b.dealerOrgId === primaryStore.slug ||
              b.dealerOrgId === primaryStore.displayName
          )
        )
      )
      .catch(() => setBenefits([]));
  }, [primaryStore]);

  useEffect(() => {
    loadCommissionData();
  }, [loadCommissionData]);

  const refreshAll = () => {
    stores.reload();
    loadCommissionData();
    onChanged?.();
  };

  function copyStoreLink(slug: string) {
    const path = `/kedai/${slug}`;
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl).catch(() => {});
    }
    setCopiedSlug(slug);
  }

  return (
    <Panel
      title="Kedai Ejen & Komisen Rujukan"
      eyebrow="Pautan kedai awam (/kedai/:slug) · komisen automatik"
      action={
        <div className="xp-actions">
          <Refresh onClick={refreshAll} />
          {role === 'customer' && (
            <button className="xp-button xp-secondary" onClick={() => setApplyOpen(!applyOpen)}>
              <Plus size={16} /> Daftar kedai ejen
            </button>
          )}
        </div>
      }
    >
      <ResourceState {...stores} />
      {stores.data && stores.data.length > 0 ? (
        <div className="xp-stack">
          {stores.data.map(store => {
            const storePath = `/kedai/${store.slug}`;
            const recordId = store.id ?? store.storeId;
            return (
              <article className="xp-dealer-card" key={recordId} data-testid={`dealer-store-card-${store.slug}`}>
                <div>
                  <h3>
                    <Store size={16} /> {store.displayName}
                  </h3>
                  <p>
                    Pautan Kedai Awam: <code data-testid="dealer-public-store-link">{storePath}</code> · Kod Rujukan:{' '}
                    <strong>{store.slug}</strong>
                  </p>
                  <RecordMeta id={recordId} revision={store.revision} />
                  <small className="xp-muted">
                    Organisasi: {store.dealerOrgId ?? store.displayName}
                    {store.createdAt ? ` · Disediakan ${dateLabel(store.createdAt)}` : ''}
                  </small>
                </div>
                <div className="xp-actions">
                  <Status value={store.status} />
                  <button
                    type="button"
                    className="xp-button xp-secondary"
                    onClick={() => copyStoreLink(store.slug)}
                  >
                    <Copy size={15} /> {copiedSlug === store.slug ? 'Pautan disalin' : 'Salin pautan'}
                  </button>
                  {onNavigate && (
                    <button
                      type="button"
                      className="xp-button"
                      onClick={() => onNavigate(storePath)}
                    >
                      Buka kedai <ExternalLink size={15} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        !stores.loading &&
        !stores.error && (
          <Empty
            title="Kedai ejen belum aktif"
            description="Kedai dalam talian (/kedai/:slug) akan diaktifkan secara automatik sebaik sahaja permohonan ejen/stokis anda diluluskan oleh pengasas."
          />
        )
      )}

      {commSummary && (
        <div className="xp-metrics" data-testid="dealer-commission-overview">
          <div className="xp-metric">
            <span className="xp-eyebrow">Jumlah Komisen Diperoleh</span>
            <strong>{money(commSummary.totalEarnedSen)}</strong>
            <small>Pesanan kedai ejen yang disahkan & diterima</small>
          </div>
          <div className="xp-metric">
            <span className="xp-eyebrow">Menunggu Penerimaan</span>
            <strong>{money(commSummary.pendingSen)}</strong>
            <small>Bayaran disahkan · menunggu serahan pelanggan</small>
          </div>
          <div className="xp-metric">
            <span className="xp-eyebrow">Layak / Diluluskan</span>
            <strong>{money(commSummary.eligibleSen + commSummary.approvedSen)}</strong>
            <small>Baki bersih sedia dibayar: {money(commSummary.netPayableSen)}</small>
          </div>
          <div className="xp-metric">
            <span className="xp-eyebrow">Telah Dibayar</span>
            <strong>{money(commSummary.paidSen)}</strong>
            <small>{benefits.length} pesanan dirujuk direkodkan</small>
          </div>
        </div>
      )}

      {applyOpen && (
        <FormPanel
          title="Permohonan Pendaftaran Ejen / Stokis & Kedai Awam"
          description="Pilih nama organisasi dan slug pautan kedai (/kedai/slug-anda). Kedai akan dibuka secara automatik selepas kelulusan."
          fields={[
            field('organization', 'Nama Kedai / Organisasi Ejen'),
            field('slug', 'Slug Kedai Pilihan (pilihan, cth: kedai-bangi)', { required: false }),
            field('description', 'Kawasan liputan & pelan edaran', { type: 'textarea' }),
          ]}
          submitLabel="Hantar permohonan ejen"
          onCancel={() => setApplyOpen(false)}
          onSubmit={async values => {
            const payload: Record<string, unknown> = {
              organization: values.organization,
              description: values.description,
              ...(values.slug?.trim() ? { slug: values.slug.trim() } : {}),
            };
            const result = await api('/dealer/applications', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            setApplyOpen(false);
            refreshAll();
            return result;
          }}
        />
      )}
    </Panel>
  );
}
