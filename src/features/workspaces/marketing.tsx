import { useState } from 'react';
import { AtSign, CalendarDays, CheckCircle2, Download, Facebook, Globe2, Instagram, KeyRound, Linkedin, Megaphone, MonitorSmartphone, Music2, Plus, ShieldCheck, TriangleAlert, X, Youtube } from 'lucide-react';
import type { CampaignAsset,CampaignRecord,ExportArtifact,PublicProduct,WorkspaceRole } from '../../../shared/platform-contracts';
import type { MarginSimulationInput } from '../../../shared/growth-contracts';
import { evaluateMarginContribution } from '../../../shared/growth-contracts';
import type { SocialConnectionMethod, SocialConnectorSnapshot } from '../../../shared/social-contracts';
import { api,useResource } from '../platform/client';
import { campaignApprovalIssues,dateLabel,downloadText,malaysiaDateTime } from './experience-model';
import { Empty,field,FormPanel,Panel,RecordMeta,Refresh,ResourceState,splitRefs,Status } from './ui';

const methodIcons = { official_oauth: Globe2, browser_session: MonitorSmartphone, custom_api: KeyRound, mcp: ShieldCheck } as const;
function providerIcon(provider: string) { const Icon = provider === 'threads' ? AtSign : provider === 'youtube' ? Youtube : provider === 'instagram' ? Instagram : provider === 'facebook' ? Facebook : provider === 'linkedin' ? Linkedin : provider === 'tiktok' ? Music2 : provider === 'x' ? X : Globe2; return <Icon size={17} aria-hidden="true" />; }

function SocialConnectorPanel({ snapshot }: { snapshot?: SocialConnectorSnapshot }) {
  const [selected, setSelected] = useState<SocialConnectionMethod>('official_oauth');
  const method = snapshot?.methods.find(item => item.method === selected);
  return <section className="xp-social-connectors" aria-labelledby="social-connectors-title">
    <div className="xp-social-heading"><div><p className="xp-eyebrow">CONNECTOR-FIRST SOCIAL OPS</p><h3 id="social-connectors-title">Sambung akaun tanpa kongsi kata laluan</h3><p className="xp-muted">Official OAuth/API ialah laluan utama. Browser session dan Custom API/MCP hanya fallback yang diopt-in.</p></div><span className="xp-social-lock"><ShieldCheck size={16} /> Approval gate aktif</span></div>
    <div className="xp-social-methods" role="tablist" aria-label="Kaedah sambungan social media">{snapshot?.methods.map(item => { const Icon=methodIcons[item.method]; return <button key={item.method} role="tab" aria-selected={selected===item.method} className={selected===item.method?'xp-social-method is-selected':'xp-social-method'} onClick={() => setSelected(item.method)}><Icon size={18}/><span><strong>{item.label}</strong><small>{item.status==='ready'?'Ready':'Belum dikonfigurasi'}</small></span></button>; })}</div>
    {method&&<div className="xp-social-method-detail"><div><strong>{method.label}</strong><p>{method.description}</p><small>{method.securityNote}</small></div><Status value={method.status==='ready'?'ready':'gated'} /></div>}
    <div className="xp-social-provider-grid">{snapshot?.providers.map(provider => <article className="xp-social-provider" key={provider.provider}><div><strong className="xp-social-provider-name"><span className={`xp-provider-mark xp-provider-${provider.provider}`}>{providerIcon(provider.provider)}</span>{provider.label}</strong><span className="xp-social-state"><span />{provider.status==='ready'?'Connected':'Not connected'}</span></div><p>{provider.accountRequirement}</p><button className="xp-button xp-secondary" disabled={provider.status!=='ready'}>{provider.status==='ready'?'Manage connection':'Connector belum aktif'}</button></article>)}</div>
    <div className="xp-social-policy"><CheckCircle2 size={17}/><div><strong>Publish kekal memerlukan kelulusan</strong><p>Setiap platform hanya boleh menerima exact approved campaign revision, account scope dan provider receipt. Tiada auto-publish senyap.</p></div><TriangleAlert size={17}/></div>
  </section>;
}

function CampaignEditor({
  editing,
  role,
  catalogue,
  onCancel,
  onSubmitSuccess,
}: {
  editing: CampaignRecord | 'new';
  role: WorkspaceRole;
  catalogue: PublicProduct[];
  onCancel: () => void;
  onSubmitSuccess: () => void;
}) {
  const isNew = editing === 'new';
  const [title, setTitle] = useState(isNew ? '' : editing.title);
  const [objective, setObjective] = useState(isNew ? '' : editing.objective);
  const [copy, setCopy] = useState(isNew ? '' : editing.copy);
  const [productIds, setProductIds] = useState(isNew ? '' : editing.productIds.join(', '));
  const [scheduledAt, setScheduledAt] = useState(
    !isNew && editing.scheduledAt
      ? new Date(new Date(editing.scheduledAt).getTime() + 8 * 3600000).toISOString().slice(0, 16)
      : ''
  );
  const [assets, setAssets] = useState(
    !isNew
      ? editing.assets.map(a => `${a.id}|${a.name}|${a.rights}|${a.consent}|${a.evidenceId ?? ''}`).join('\n')
      : ''
  );

  const sim = !isNew ? editing.marginSimulation : undefined;
  const [netSales, setNetSales] = useState(sim ? (sim.netSalesExTaxSen / 100).toFixed(2) : '100.00');
  const [cogs, setCogs] = useState(sim ? (sim.cogsSen / 100).toFixed(2) : '40.00');
  const [packaging, setPackaging] = useState(sim ? (sim.packagingSen / 100).toFixed(2) : '5.00');
  const [paymentFees, setPaymentFees] = useState(sim ? (sim.paymentFeesSen / 100).toFixed(2) : '2.00');
  const [fulfilment, setFulfilment] = useState(sim ? (sim.fulfilmentVariableCostSen / 100).toFixed(2) : '3.00');
  const [deliverySubsidy, setDeliverySubsidy] = useState(sim ? (sim.deliverySubsidySen / 100).toFixed(2) : '5.00');
  const [agentCommission, setAgentCommission] = useState(sim ? (sim.agentCommissionSen / 100).toFixed(2) : '10.00');
  const [rewardCost, setRewardCost] = useState(sim ? (sim.rewardCostSen / 100).toFixed(2) : '5.00');
  const [expectedReturnLoss, setExpectedReturnLoss] = useState(sim ? (sim.expectedReturnLossSen / 100).toFixed(2) : '2.00');
  const [minContribution, setMinContribution] = useState(sim ? (sim.minimumContributionSen / 100).toFixed(2) : '20.00');
  const [minMarginPct, setMinMarginPct] = useState(sim ? String(sim.minimumContributionMarginPct) : '20');

  const [overrideApproved, setOverrideApproved] = useState(!isNew ? Boolean(editing.founderOverride?.approved) : false);
  const [overrideReason, setOverrideReason] = useState(!isNew && editing.founderOverride ? editing.founderOverride.reason : '');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toSen = (val: string) => Math.max(0, Math.round((parseFloat(val) || 0) * 100));
  const marginInput: MarginSimulationInput = {
    netSalesExTaxSen: toSen(netSales),
    cogsSen: toSen(cogs),
    packagingSen: toSen(packaging),
    paymentFeesSen: toSen(paymentFees),
    fulfilmentVariableCostSen: toSen(fulfilment),
    deliverySubsidySen: toSen(deliverySubsidy),
    agentCommissionSen: toSen(agentCommission),
    rewardCostSen: toSen(rewardCost),
    expectedReturnLossSen: toSen(expectedReturnLoss),
    minimumContributionSen: toSen(minContribution),
    minimumContributionMarginPct: parseFloat(minMarginPct) || 0,
  };
  const marginResult = evaluateMarginContribution(marginInput);
  const isCashMarginFailed = !marginResult.isContributionPass;
  const isPctMarginFailed = !marginResult.isMarginPctPass;
  const isMarginFailing = isCashMarginFailed || isPctMarginFailed;
  const isFin01Blocked = marginResult.isContributionPass && !marginResult.isMarginPctPass;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const parsedAssets: CampaignAsset[] = assets
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [id, name, rights, consent, evidenceId] = line.split('|').map(part => part.trim());
          if (!id || !name) throw new Error('Aset memerlukan ID dan nama.');
          return { id, name, rights: rights || '', consent: consent || '', ...(evidenceId ? { evidenceId } : {}) };
        });
      const parsedProductIds = splitRefs(productIds);
      if (parsedProductIds.some(id => !catalogue.some(product => product.id === id))) {
        throw new Error('Produk mesti daripada published catalogue.');
      }
      if (isFin01Blocked && overrideApproved && !overrideReason.trim()) {
        throw new Error('Sila masukkan catatan alasan untuk Founder Override.');
      }
      if (isCashMarginFailed && scheduledAt) {
        throw new Error('Penerbitan berjadual automatik disekat kerana sumbangan margin tunai gagal.');
      }
      if (isPctMarginFailed && scheduledAt && (!overrideApproved || role !== 'founder' || !overrideReason.trim())) {
        throw new Error('Penerbitan berjadual automatik disekat bagi senario FIN-01 tanpa kelulusan Founder Override.');
      }

      const payload = {
        title,
        objective,
        copy,
        assets: parsedAssets,
        productIds: parsedProductIds,
        catalogueVersion: Math.max(0, ...(catalogue.map(p => p.publishedVersion) ?? [])),
        scheduledAt: scheduledAt ? malaysiaDateTime(scheduledAt) : undefined,
        marginSimulation: marginInput,
        founderOverride: (role === 'founder' && isFin01Blocked && overrideApproved && overrideReason.trim()) ? {
          approved: true,
          reason: overrideReason.trim(),
        } : undefined,
        ...(!isNew ? { expectedRevision: editing.revision } : {})
      };

      await api(isNew ? '/campaigns' : `/campaigns/${editing.id}/update`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onSubmitSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kempen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="xp-form-panel">
      <div className="xp-panel-head">
        <div>
          <p className="xp-eyebrow">Marketing Studio &amp; Margin Guardian</p>
          <h2>{isNew ? 'Kempen &amp; Promosi Baharu' : `Edit ${editing.title}`}</h2>
        </div>
        <button type="button" className="xp-icon-button" aria-label="Tutup borang" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>
      <p className="xp-form-description">
        Perubahan copy atau aset menghasilkan revision baharu dan memerlukan approval semula. Harga dan sumbangan margin dinilai secara deterministik oleh Margin Guardian.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="xp-form-grid">
          <div className="xp-field">
            <label htmlFor="camp-title">Nama kempen *</label>
            <input id="camp-title" required value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="xp-field">
            <label htmlFor="camp-obj">Objektif kempen *</label>
            <input id="camp-obj" required value={objective} onChange={e => setObjective(e.target.value)} />
          </div>
          <div className="xp-field xp-field-wide">
            <label htmlFor="camp-copy">Caption / approved claims draft *</label>
            <textarea id="camp-copy" required rows={4} maxLength={20000} value={copy} onChange={e => setCopy(e.target.value)} />
          </div>
          <div className="xp-field">
            <label htmlFor="camp-products">Linked published product IDs</label>
            <input id="camp-products" value={productIds} onChange={e => setProductIds(e.target.value)} />
            <small>{catalogue.map(p => `${p.name}: ${p.id}`).join(' · ') || 'Tiada produk diterbitkan.'}</small>
          </div>
          <div className="xp-field">
            <label htmlFor="camp-schedule">Planned calendar time (MYT)</label>
            <input
              id="camp-schedule"
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              disabled={isCashMarginFailed || (isPctMarginFailed && (!overrideApproved || role !== 'founder'))}
            />
            {isCashMarginFailed && (
              <small className="xp-inline-error" style={{ color: '#dc2626', display: 'block', marginTop: '4px' }}>
                Penerbitan berjadual automatik disekat kerana sumbangan margin tunai gagal.
              </small>
            )}
            {!isCashMarginFailed && isPctMarginFailed && (!overrideApproved || role !== 'founder') && (
              <small className="xp-inline-error" style={{ color: '#dc2626', display: 'block', marginTop: '4px' }}>
                Penerbitan berjadual automatik disekat (FIN-01) tanpa Founder Override.
              </small>
            )}
          </div>
          <div className="xp-field xp-field-wide">
            <label htmlFor="camp-assets">Aset: ID | nama | rights | consent | evidence ID</label>
            <textarea id="camp-assets" rows={3} value={assets} onChange={e => setAssets(e.target.value)} />
            <small>Satu aset setiap baris. Gunakan aset milik sendiri atau berizin sah.</small>
          </div>

          <div className="xp-field xp-field-wide" style={{ border: '1px solid var(--ui-border)', borderRadius: '10px', padding: '16px', background: 'var(--ui-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> Margin Guardian Engine (v2.1)
                </strong>
                <p className="xp-muted" style={{ margin: 0, fontSize: '11px' }}>
                  Pemisahan ketat sumbangan tunai (RM) &amp; peratusan margin (%) bagi kelayakan diskaun
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className={marginResult.isContributionPass ? 'xp-status xp-status-verified' : 'xp-status xp-status-failed'}>
                  RM: {marginResult.isContributionPass ? 'Lulus' : 'Gagal'} (RM {(marginResult.contributionSen / 100).toFixed(2)})
                </span>
                <span className={marginResult.isMarginPctPass ? 'xp-status xp-status-verified' : 'xp-status xp-status-failed'}>
                  Margin %: {marginResult.isMarginPctPass ? 'Lulus' : 'Gagal'} ({marginResult.contributionMarginPct}%)
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label htmlFor="net-sales" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Jualan Bersih (RM)</label>
                <input id="net-sales" type="number" step="0.01" min="0" value={netSales} onChange={e => setNetSales(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="min-contribution" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Sasaran Min RM</label>
                <input id="min-contribution" type="number" step="0.01" min="0" value={minContribution} onChange={e => setMinContribution(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="min-margin-pct" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Sasaran Min %</label>
                <input id="min-margin-pct" type="number" step="0.1" min="0" max="100" value={minMarginPct} onChange={e => setMinMarginPct(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="cogs" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>COGS (RM)</label>
                <input id="cogs" type="number" step="0.01" min="0" value={cogs} onChange={e => setCogs(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="packaging" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Pembungkusan (RM)</label>
                <input id="packaging" type="number" step="0.01" min="0" value={packaging} onChange={e => setPackaging(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="payment-fees" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Fi Bayaran (RM)</label>
                <input id="payment-fees" type="number" step="0.01" min="0" value={paymentFees} onChange={e => setPaymentFees(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="fulfilment" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Operasi/Fulfil (RM)</label>
                <input id="fulfilment" type="number" step="0.01" min="0" value={fulfilment} onChange={e => setFulfilment(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="delivery-subsidy" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Subsidi Pos (RM)</label>
                <input id="delivery-subsidy" type="number" step="0.01" min="0" value={deliverySubsidy} onChange={e => setDeliverySubsidy(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="agent-commission" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Komisen Ejen (RM)</label>
                <input id="agent-commission" type="number" step="0.01" min="0" value={agentCommission} onChange={e => setAgentCommission(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="reward-cost" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Kos Diskaun (RM)</label>
                <input id="reward-cost" type="number" step="0.01" min="0" value={rewardCost} onChange={e => setRewardCost(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
              <div>
                <label htmlFor="expected-return-loss" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>Kerugian Return (RM)</label>
                <input id="expected-return-loss" type="number" step="0.01" min="0" value={expectedReturnLoss} onChange={e => setExpectedReturnLoss(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }} />
              </div>
            </div>

            {marginResult.isContributionPass && marginResult.isMarginPctPass && (
              <div className="xp-notice xp-success">
                <CheckCircle2 size={16} />
                <div>
                  <strong>Margin Guardian: LULUS</strong>
                  <p>Sumbangan RM {(marginResult.contributionSen/100).toFixed(2)} dan margin {marginResult.contributionMarginPct}% memenuhi ambang minimum. Layak untuk penerbitan.</p>
                </div>
              </div>
            )}

            {!marginResult.isContributionPass && (
              <div className="xp-notice xp-error" role="alert">
                <TriangleAlert size={16} />
                <div>
                  <strong>Margin Guardian: DITOLAK (Sumbangan Tunai Gagal)</strong>
                  <p>Sumbangan tunai RM {(marginResult.contributionSen/100).toFixed(2)} tidak mencukupi untuk menampung kos operasi sasaran (RM {(marginInput.minimumContributionSen/100).toFixed(2)}). Penerbitan berjadual automatik disekat sepenuhnya. Pengecualian Founder Override tidak terpakai bagi kegagalan margin tunai mutlak.</p>
                </div>
              </div>
            )}

            {isFin01Blocked && (
              <div className="xp-notice xp-error" role="alert">
                <TriangleAlert size={16} />
                <div>
                  <strong>AMARAN FIN-01: Penerbitan Automatik Disekat</strong>
                  <p>Sumbangan tunai lulus (RM {(marginResult.contributionSen/100).toFixed(2)}), tetapi margin peratusan ({marginResult.contributionMarginPct}%) di bawah sasaran ({marginInput.minimumContributionMarginPct}%). Kempen tidak boleh diterbitkan automatik tanpa kelulusan bertulis Pengasas (Founder Override).</p>
                </div>
              </div>
            )}

            {isFin01Blocked && (
              <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', border: '1px solid #f59e0b', background: 'rgba(245, 158, 11, 0.08)' }}>
                {role === 'founder' ? (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={overrideApproved}
                        onChange={e => setOverrideApproved(e.target.checked)}
                      />
                      <span>Sahkan Pengecualian Pengasas (Founder Override)</span>
                      {overrideApproved && <span className="xp-status xp-status-approved">Override Aktif</span>}
                    </label>
                    {overrideApproved && (
                      <div style={{ marginTop: '8px' }}>
                        <label htmlFor="fo-reason" style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                          Justifikasi Pengecualian Pengasas (Wajib diisi &amp; diaudit)*:
                        </label>
                        <textarea
                          id="fo-reason"
                          rows={2}
                          required
                          value={overrideReason}
                          onChange={e => setOverrideReason(e.target.value)}
                          placeholder="Masukkan alasan pengecualian margin FIN-01..."
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--ui-border)' }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} />
                    <p style={{ margin: 0, fontSize: '12px' }}>
                      Hanya akaun dengan peranan <strong>Pengasas (Founder)</strong> dibenarkan memberi kelulusan Founder Override. Penerbitan automatik disekat.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <p className="xp-notice xp-error" role="alert">{error}</p>}

        <div className="xp-form-actions">
          <button className="xp-button" disabled={busy}>
            <CheckCircle2 size={17} /> {busy ? 'Menyimpan…' : 'Simpan draft revision'}
          </button>
          <button type="button" className="xp-button xp-secondary" onClick={onCancel}>
            Batal
          </button>
        </div>
      </form>
    </section>
  );
}

export function Marketing({ role,onChanged }: { role: WorkspaceRole; onChanged?: () => void; }) {
  const resource=useResource<CampaignRecord[]>('/campaigns');
  const social=useResource<SocialConnectorSnapshot>('/social/connectors');
  const catalogue=useResource<PublicProduct[]>('/catalogue');
  const [editing,setEditing]=useState<CampaignRecord|'new'|null>(null);
  const [approving,setApproving]=useState<CampaignRecord|null>(null);
  const [filter,setFilter]=useState('all');
  const [exportError,setExportError]=useState('');
  const [exporting,setExporting]=useState('');
  const refresh=() => { resource.reload(); onChanged?.(); };
  const campaigns=resource.data?.filter(campaign => filter==='all'||campaign.status===filter)??[];
  async function exportCampaign(campaign: CampaignRecord,format: 'text'|'asset_bundle'='text') {
    setExportError(''); setExporting(campaign.id);
    try {
      const artifact=await api<ExportArtifact&{ downloadUrl?: string; }>(`/campaigns/${campaign.id}/export`,{ method: 'POST',body: JSON.stringify({ expectedRevision: campaign.revision,format }) }); if(format==='asset_bundle') {
        if(!artifact.downloadUrl?.startsWith('/api/platform/exports/')) throw new Error('Download grant tidak sah.');
        const anchor=document.createElement('a'); anchor.href=artifact.downloadUrl; anchor.download=''; anchor.click();
      } else { if(!artifact.content) throw new Error('Server tidak memulangkan export content.'); downloadText(`${campaign.title.replace(/[^\w\- ]/g,'').slice(0,50)||'campaign'}-v${campaign.revision}.txt`,artifact.content); } refresh();
    }
    catch(failure) { setExportError(failure instanceof Error? failure.message:'Export gagal.'); }
    finally { setExporting(''); }
  }
  return <>
    <Panel title="Marketing studio" eyebrow="Plan · review rights · approve · export" action={<div className="xp-actions">
      <Refresh onClick={refresh} />
      <button className="xp-button" onClick={() => setEditing('new')}>
        <Plus size={17} /> Kempen baharu</button>
    </div>}>
      <ResourceState {...resource} />
      <ResourceState {...social} />
      {social.data&&<SocialConnectorPanel snapshot={social.data} />}
      <div className="xp-channel-status">
        <Megaphone size={22} />
        <div>
          <strong>Manual export available</strong>
          <p>Auto-publish memerlukan verified channel grant dan provider receipt. Tiada akaun social connected yang disahkan di workspace ini.</p>
        </div>
        <Status value="gated" />
      </div>
      <div className="xp-tablist" aria-label="Campaign filter">{['all','draft','approved','planned','exported'].map(value => <button key={value} className={filter===value? 'xp-tab-active':''} onClick={() => setFilter(value)}>{value}</button>)}</div>{exportError&&<p className="xp-notice xp-error" role="alert">{exportError}</p>}<div className="xp-campaign-grid">{campaigns.map(campaign => {
        const marginResult = campaign.marginSimulation
          ? evaluateMarginContribution(campaign.marginSimulation)
          : campaign.marginResult;
        const currentCampaign = marginResult ? { ...campaign, marginResult } : campaign;
        const issues = campaignApprovalIssues(currentCampaign);
        return <article className="xp-campaign" key={campaign.id}>
          <div className="xp-campaign-top">
            <span className="xp-campaign-icon">
              <Megaphone size={24} />
            </span>
            <Status value={campaign.status} />
          </div>
          <p className="xp-eyebrow">{campaign.objective}</p>
          <h3>{campaign.title}</h3>
          <p className="xp-campaign-copy">{campaign.copy}</p>
          <RecordMeta id={campaign.id} revision={campaign.revision} />
          <p className="xp-muted">Catalogue v{campaign.catalogueVersion} · {campaign.productIds.length} linked products</p>{campaign.scheduledAt&&<p className="xp-campaign-schedule">
            <CalendarDays size={16} />{dateLabel(campaign.scheduledAt)} MYT</p>}
          {marginResult && <div className="xp-margin-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
            <span className={marginResult.isContributionPass ? 'xp-status xp-status-verified' : 'xp-status xp-status-failed'}>
              RM: {marginResult.isContributionPass ? 'Lulus' : 'Gagal'} (RM {(marginResult.contributionSen/100).toFixed(2)})
            </span>
            <span className={marginResult.isMarginPctPass ? 'xp-status xp-status-verified' : 'xp-status xp-status-failed'}>
              Margin %: {marginResult.isMarginPctPass ? 'Lulus' : 'Gagal'} ({marginResult.contributionMarginPct}%)
            </span>
            {!marginResult.isContributionPass ? (
              <span className="xp-status xp-status-blocked">Penerbitan Disekat (Margin Tunai Gagal)</span>
            ) : currentCampaign.founderOverride?.approved ? (
              <span className="xp-status xp-status-approved">Override Pengasas Sah</span>
            ) : (!marginResult.isMarginPctPass) ? (
              <span className="xp-status xp-status-blocked">Penerbitan Disekat (FIN-01)</span>
            ) : null}
          </div>}
          {campaign.founderOverride?.approved && (
            <p className="xp-muted" style={{ fontSize: '11px', fontStyle: 'italic', margin: '4px 0' }}>
              Override oleh {campaign.founderOverride.approvedBy}: &ldquo;{campaign.founderOverride.reason}&rdquo;
            </p>
          )}
          <details className="xp-details">
            <summary>Assets & rights ({campaign.assets.length})</summary>{campaign.assets.map(asset => <div className="xp-asset" key={asset.id}>
              <strong>{asset.name}</strong>
              <p>Rights: {asset.rights||'Unknown'} · Consent: {asset.consent||'Unknown'}</p>{asset.evidenceId&&<code>{asset.evidenceId}</code>}</div>)}</details>{campaign.approvedBy&&<p className="xp-muted">Approved by {campaign.approvedBy}{campaign.approvalExpiresAt? ` · Expires ${dateLabel(campaign.approvalExpiresAt)}`:''}</p>}{issues.map(issue => <p className="xp-inline-error" key={issue}>{issue}</p>)}<div className="xp-actions">
            <button className="xp-button xp-secondary" onClick={() => setEditing(campaign)}>Edit revision</button>{role==='founder'&&campaign.status==='draft'&&<button className="xp-button xp-secondary" disabled={issues.some(issue => !issue.includes('FIN-01'))} onClick={() => setApproving(currentCampaign)}>Review & approve</button>}{campaign.status!=='draft'&&<button className="xp-button" onClick={() => exportCampaign(campaign)} disabled={Boolean(exporting)}>
              <Download size={16} />{exporting===campaign.id? 'Exporting…':'Export caption'}</button>}{campaign.status!=='draft'&&campaign.assets.length>0&&<button className="xp-button xp-secondary" onClick={() => exportCampaign(campaign,'asset_bundle')} disabled={Boolean(exporting)}>Download asset bundle</button>}</div>
        </article>;
      })}</div>{!resource.loading&&!resource.error&&!campaigns.length&&<Empty title="Idea anda bermula sebagai draft" description="Tulis campaign, semak product claims, asset rights dan consent sebelum approval. Export tidak dilabel published." />}</Panel>
    {editing && (
      <CampaignEditor
        key={editing === 'new' ? 'new' : `${editing.id}:${editing.revision}`}
        editing={editing}
        role={role}
        catalogue={catalogue.data ?? []}
        onCancel={() => setEditing(null)}
        onSubmitSuccess={() => {
          setEditing(null);
          refresh();
        }}
      />
    )}
    {approving && (() => {
      const marginEval = approving.marginSimulation
        ? evaluateMarginContribution(approving.marginSimulation)
        : approving.marginResult;
      const isCashFailed = Boolean(marginEval && !marginEval.isContributionPass);
      const isPctFailed = Boolean(marginEval && !marginEval.isMarginPctPass);
      const needsOverride = !isCashFailed && isPctFailed && !approving.founderOverride?.approved;

      if (isCashFailed) {
        return (
          <FormPanel
            key={approving.id}
            title={`Kelulusan Disekat (Revision ${approving.revision})`}
            description={`Review: ${approving.copy} · PERHATIAN: Kelulusan disekat sepenuhnya kerana sumbangan margin tunai gagal (RM ${(marginEval!.contributionSen / 100).toFixed(2)}). Sila edit draf untuk melaraskan kos atau harga sebelum kelulusan dibenarkan.`}
            fields={[]}
            submitLabel="Tutup"
            onCancel={() => setApproving(null)}
            onSubmit={async () => {
              setApproving(null);
            }}
          />
        );
      }

      return (
        <FormPanel
          key={approving.id}
          title={`Approve exact revision ${approving.revision}`}
          description={`Review: ${approving.copy}${
            marginEval
              ? ` · Margin: RM ${(marginEval.contributionSen / 100).toFixed(2)} (${marginEval.isContributionPass ? 'Lulus' : 'Gagal'}), ${marginEval.contributionMarginPct}% (${marginEval.isMarginPctPass ? 'Lulus' : 'Gagal'})`
              : ''
          }`}
          fields={[
            field('approvalExpiresAt', 'Approval expiry (MYT)', { type: 'datetime-local' }),
            ...(needsOverride
              ? [field('founderOverrideReason', 'Justifikasi Founder Override (Wajib kerana margin % gagal - FIN-01)', { type: 'textarea' })]
              : [])
          ]}
          submitLabel={needsOverride ? "Sahkan dengan Founder Override" : (approving.scheduledAt ? "Luluskan jadual automatik" : "Sahkan copy, assets & revision")}
          onCancel={() => setApproving(null)}
          onSubmit={async values => {
            const approvalExpiresAt = malaysiaDateTime(values.approvalExpiresAt);
            if (new Date(approvalExpiresAt).getTime() <= Date.now()) throw new Error('Expiry mesti pada masa akan datang.');
            if (needsOverride && !values.founderOverrideReason?.trim()) {
              throw new Error('Kelulusan automatik disekat: Justifikasi Founder Override diperlukan kerana margin % gagal (FIN-01).');
            }
            const founderOverride = values.founderOverrideReason?.trim()
              ? { approved: true, reason: values.founderOverrideReason.trim() }
              : undefined;
            const result = await api(`/campaigns/${approving.id}/approve`, {
              method: 'POST',
              body: JSON.stringify({
                expectedRevision: approving.revision,
                approvalExpiresAt,
                ...(founderOverride ? { founderOverride } : {})
              })
            });
            setApproving(null);
            refresh();
            return result;
          }}
        />
      );
    })()}
  </>;
}
