import { useState, useEffect } from 'react';
import { Package, ShieldAlert, CheckCircle2, AlertTriangle, UserCheck, Image, ArrowRight } from 'lucide-react';
import { BRAND_ASSETS } from '../brand/brand-assets';
import { api, useResource } from '../platform/client';
import type {
  ProductOnboardingDraft,
  LocationOnboardingDraft,
  DealerTermsDraft,
  OnboardingValidationResult,
  OnboardingCommitResult,
} from '../../../shared/onboarding-contracts';
import type { BusinessSettings, CatalogueProduct } from '../../../shared/platform-contracts';
import { Panel, Refresh, ResourceState, Status } from './ui';

export function ProductOnboarding({ onNavigate, onChanged }: { onNavigate?: (path: string) => void; onChanged?: () => void }) {
  const catalogue = useResource<CatalogueProduct[]>('/catalogue/admin');
  const settings = useResource<BusinessSettings>('/settings');
  const [includeProducts, setIncludeProducts] = useState(true);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [includeTerms, setIncludeTerms] = useState(false);
  const [location, setLocation] = useState<LocationOnboardingDraft>({ id: '', name: '', address: '', hours: '', verifiedAt: '', approved: false });
  const [terms, setTerms] = useState<DealerTermsDraft>({ minimumQuantity: 1, packMultiple: 1, priceBasisPoints: 10000, ownership: 'owned', returnRules: '', approved: false });
  const [settingsConflict, setSettingsConflict] = useState(false);
  const [draftProducts, setDraftProducts] = useState<ProductOnboardingDraft[]>([
    {
      sku: 'COLEK-500G-ORI',
      name: 'Sambal Colek Asal (Balang)',
      packSize: 1,
      unitName: 'balang',
      priceSen: 2800,
      description: 'Sambal Colek resipi warisan rasa manis pedas seimbang.',
      lifecycle: 'draft',
      provenanceRights: BRAND_ASSETS.productEditorial.source,
      ownerApproved: false,
      unverifiedFields: ['Harga RM28 (Historical TikTok claim)'],
    },
  ]);

  const [validation, setValidation] = useState<OnboardingValidationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [error, setError] = useState('');
  const packet = () => ({ products: includeProducts ? draftProducts : [], ...(includeLocation ? { locations: [location] } : {}), ...(includeTerms ? { dealerTerms: terms } : {}), expectedSettingsVersion: settings.data?.version });

  // Run validation on draftProducts change
  useEffect(() => {
    let active = true;
    setValidation(null);
    async function runValidation() {
      try {
        const result = await api<OnboardingValidationResult>('/onboarding/validate', {
          method: 'POST',
          body: JSON.stringify(packet()),
        });
        if (active) { setValidation(result); setError(''); }
      } catch (err) {
        if (active) { setValidation(null); setError(err instanceof Error ? err.message : 'Ralat validasi'); }
      }
    }
    runValidation();
    return () => {
      active = false;
    };
  }, [draftProducts, includeProducts, includeLocation, includeTerms, location, terms, settings.data?.version]);

  const toggleOwnerApproval = (index: number) => {
    setDraftProducts(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newApproved = !item.ownerApproved;
        return {
          ...item,
          ownerApproved: newApproved,
          lifecycle: newApproved ? 'published' : 'draft',
          unverifiedFields: newApproved ? [] : ['Belum disahkan oleh founder'],
        };
      })
    );
  };

  const updatePrice = (index: number, newPriceSen: number) => {
    setDraftProducts(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          priceSen: newPriceSen,
        };
      })
    );
  };

  const addMascotErrorSample = () => {
    setDraftProducts(prev => [
      ...prev,
      {
        sku: 'MASKOT-ART-01',
        name: 'Maskot Logo Abang Colek',
        packSize: 1,
        unitName: 'unit',
        priceSen: 1500,
        description: 'Artwork maskot',
        lifecycle: 'draft',
        ownerApproved: false,
        unverifiedFields: ['Artwork bukan produk jualan'],
        isArtworkOrMascot: true,
      },
    ]);
  };

  const handleCommit = async () => {
    if ((includeLocation || includeTerms) && (!settings.data || settingsConflict)) return;
    setBusy(true);
    setCommitMessage('');
    setError('');
    try {
      const result = await api<OnboardingCommitResult>('/onboarding/commit', {
        method: 'POST',
        body: JSON.stringify(packet()),
      });
      setCommitMessage(
        `Onboarding Berjaya: ${result.committedProductsCount} produk disimpan, ${result.publishedProductsCount} diterbitkan, ${result.locationsCount} lokasi diluluskan (Katalog v${result.catalogueVersion}).`
      );
      catalogue.reload();
      settings.reload();
      onChanged?.();
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'REVISION_CONFLICT') setSettingsConflict(true);
      setError(err instanceof Error ? err.message : 'Commit onboarding gagal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="xp-onboarding-flow">
      {/* Brand & Founder Identity Verification Card */}
      <Panel title="Identiti Founder & Aset Jenama" eyebrow="Verifikasi Integriti Asal">
        <div className="xp-brand-identity-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="xp-asset-card" style={{ padding: '1rem', border: '1px solid var(--border, #333)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <UserCheck size={18} className="xp-text-success" />
              <strong>Pengasas Sah</strong>
            </div>
            <p className="xp-muted" style={{ fontSize: '0.85rem' }}>Foto disahkan daripada arkib asal pemilik:</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <img src={BRAND_ASSETS.founder.primary.src} alt={BRAND_ASSETS.founder.primary.alt} style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
              <img src={BRAND_ASSETS.founder.secondary.src} alt={BRAND_ASSETS.founder.secondary.alt} style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
            </div>
          </div>

          <div className="xp-asset-card" style={{ padding: '1rem', border: '1px solid var(--border, #333)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Image size={18} />
              <strong>Aset Maskot Jenama</strong>
            </div>
            <p className="xp-muted" style={{ fontSize: '0.85rem' }}>
              {BRAND_ASSETS.mascots.series.length} siri maskot. <span style={{ color: 'var(--amber, #f59e0b)' }}>Kekal sebagai artwork, bukan SKU produk jualan.</span>
            </p>
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', overflowX: 'auto' }}>
              {BRAND_ASSETS.mascots.series.map(m => (
                <img key={m.id} src={m.src} alt={m.alt} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'contain' }} />
              ))}
            </div>
          </div>

          <div className="xp-asset-card" style={{ padding: '1rem', border: '1px solid var(--border, #333)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Package size={18} />
              <strong>Foto Pelancaran Editorial</strong>
            </div>
            <p className="xp-muted" style={{ fontSize: '0.85rem' }}>
              {BRAND_ASSETS.productEditorial.provenance}. <br />
              <span style={{ fontSize: '0.75rem' }}>Peringatan: Harga TikTok historical belum sah sehingga diluluskan.</span>
            </p>
          </div>
        </div>
      </Panel>

      {/* Product Onboarding & Approval Review */}
      <Panel title="Lokasi & Terma Pengedar" eyebrow="Kelulusan polisi pemilik">
        <ResourceState {...settings} />
        {settings.data && <p>Versi tetapan semasa: {settings.data.version}. {settings.data.approvedPolicies.locations?.length ?? 0} lokasi diluluskan.</p>}
        <p>Isi maklumat sebenar dan semak sebelum meluluskan. Produk dan polisi disimpan bersama. Nyahpilih draf produk untuk menyimpan polisi sahaja.</p>
        {onNavigate && <button className="xp-button xp-secondary" onClick={() => onNavigate('/founder/settings')}>Semak tetapan perniagaan</button>}
        <label><input type="checkbox" checked={includeProducts} onChange={e => setIncludeProducts(e.target.checked)} /> Sertakan draf produk dalam simpanan ini</label>
        <label><input type="checkbox" checked={includeLocation} onChange={e => setIncludeLocation(e.target.checked)} /> Sertakan lokasi</label>
        <fieldset disabled={busy || !includeLocation}>
          <legend>Lokasi perniagaan</legend>
          <label>ID lokasi<input value={location.id} maxLength={120} onChange={e => setLocation({ ...location, id: e.target.value, approved: false })} /></label>
          <label>Nama lokasi<input value={location.name} maxLength={200} onChange={e => setLocation({ ...location, name: e.target.value, approved: false })} /></label>
          <label>Alamat lokasi<textarea value={location.address} maxLength={2000} onChange={e => setLocation({ ...location, address: e.target.value, approved: false })} /></label>
          <label>Waktu operasi lokasi<input value={location.hours} maxLength={1000} onChange={e => setLocation({ ...location, hours: e.target.value, approved: false })} /></label>
          <label>Tarikh pengesahan lokasi<input type="date" value={location.verifiedAt} onChange={e => setLocation({ ...location, verifiedAt: e.target.value, approved: false })} /></label>
          <label><input type="checkbox" checked={location.approved === true} onChange={e => setLocation({ ...location, approved: e.target.checked })} /> Luluskan lokasi ini</label>
        </fieldset>
        <label><input type="checkbox" checked={includeTerms} onChange={e => setIncludeTerms(e.target.checked)} /> Sertakan terma pengedar</label>
        <fieldset disabled={busy || !includeTerms}>
          <legend>Terma pengedar</legend>
          <p>Nilai angka awal ialah draf. 10000 basis points bermaksud harga penuh (100%).</p>
          <label>Kuantiti minimum pengedar<input type="number" min="1" max="1000000" value={terms.minimumQuantity} onChange={e => setTerms({ ...terms, minimumQuantity: Number(e.target.value), approved: false })} /></label>
          <label>Gandaan pek pengedar<input type="number" min="1" max="10000" value={terms.packMultiple} onChange={e => setTerms({ ...terms, packMultiple: Number(e.target.value), approved: false })} /></label>
          <label>Harga pengedar (basis points)<input type="number" min="1" max="10000" value={terms.priceBasisPoints} onChange={e => setTerms({ ...terms, priceBasisPoints: Number(e.target.value), approved: false })} /></label>
          <label>Pemilikan stok pengedar<select value={terms.ownership} onChange={e => setTerms({ ...terms, ownership: e.target.value as DealerTermsDraft['ownership'], approved: false })}><option value="owned">Milik pengedar</option><option value="consigned">Konsainan</option></select></label>
          <label>Peraturan pemulangan pengedar<textarea value={terms.returnRules} maxLength={6000} onChange={e => setTerms({ ...terms, returnRules: e.target.value, approved: false })} /></label>
          <label><input type="checkbox" checked={terms.approved} onChange={e => setTerms({ ...terms, approved: e.target.checked })} /> Luluskan terma pengedar ini</label>
        </fieldset>
        {settingsConflict && <p role="alert">Tetapan berubah. Muat semula dan semak polisi sebelum meluluskan semula.</p>}
        <button className="xp-button xp-secondary" disabled={busy || settings.loading} onClick={() => { settings.reload(); setSettingsConflict(false); setLocation({ ...location, approved: false }); setTerms({ ...terms, approved: false }); }}>Muat semula tetapan & semak kelulusan</button>
      </Panel>

      <Panel
        title="Draf Produk & Semakan Kelulusan Pemilik"
        eyebrow="B05 + D07 Onboarding Engine"
        action={
          <div className="xp-actions">
            <button className="xp-button xp-secondary" onClick={addMascotErrorSample}>
              Uji Tolakan Maskot (Negative Test)
            </button>
          </div>
        }
      >
        <p className="xp-form-description">
          Produk tidak akan dipaparkan dalam katalog awam sehingga disahkan harganya oleh founder (ownerApproved: true).
        </p>

        <div className="xp-draft-list" style={{ marginTop: '1rem' }}>
          {draftProducts.map((p, idx) => (
            <article
              key={idx}
              className="xp-draft-card"
              style={{
                border: '1px solid var(--border, #444)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                background: p.ownerApproved ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {p.name}
                    {p.ownerApproved ? (
                      <span style={{ fontSize: '0.75rem', background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                        APPROVED BY OWNER
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', background: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: '4px' }}>
                        PENDING OWNER APPROVAL
                      </span>
                    )}
                  </h4>
                  <p className="xp-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    SKU: {p.sku ?? 'Auto-ID'} · Saiz Pek: {p.packSize} {p.unitName} · Status: {p.lifecycle}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Harga (Sen):</label>
                  <input
                    type="number"
                    value={p.priceSen ?? 0}
                    onChange={e => updatePrice(idx, Number(e.target.value))}
                    style={{ width: '100px', padding: '4px 8px', borderRadius: '4px', textAlign: 'right' }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>= RM {((p.priceSen ?? 0) / 100).toFixed(2)}</div>
                </div>
              </div>

              {p.unverifiedFields.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {p.unverifiedFields.map((f, fi) => (
                    <span key={fi} style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={14} /> {f}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  className={`xp-button ${p.ownerApproved ? 'xp-secondary' : ''}`}
                  onClick={() => toggleOwnerApproval(idx)}
                >
                  {p.ownerApproved ? 'Tarik Balik Kelulusan' : 'Luluskan Produk Ini (Owner Sign-off)'}
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Validation Engine Feedback */}
        {validation && (
          <div
            className="xp-validation-feedback"
            style={{
              padding: '1rem',
              borderRadius: '8px',
              marginTop: '1rem',
              background: validation.canCommit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${validation.canCommit ? '#10b981' : '#ef4444'}`,
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {validation.canCommit ? <CheckCircle2 size={18} color="#10b981" /> : <ShieldAlert size={18} color="#ef4444" />}
              Status Validasi: {validation.canCommit ? 'Sedia Untuk Disimpan' : 'Perlu Tindakan'}
            </h4>

            {validation.rejectedItems.length > 0 && (
              <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <strong>Item Ditolak:</strong>
                <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
                  {validation.rejectedItems.map((rej, ri) => (
                    <li key={ri}>
                      <strong>{rej.name}</strong>: {rej.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div style={{ color: '#f59e0b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <strong>Peringatan:</strong>
                <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
                  {validation.warnings.map((w, wi) => (
                    <li key={wi}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                className="xp-button"
                disabled={!validation.canCommit || busy || ((includeLocation || includeTerms) && (!settings.data || settingsConflict))}
                onClick={handleCommit}
              >
                {busy ? 'Menyimpan...' : 'Sahkan & Simpan Ke Pangkalan Data'}
              </button>
            </div>
          </div>
        )}

        {commitMessage && (
          <p className="xp-notice xp-text-success" style={{ marginTop: '1rem' }} role="status">
            {commitMessage}
          </p>
        )}
        {error && (
          <p className="platform-alert" style={{ marginTop: '1rem' }} role="alert">
            {error}
          </p>
        )}
      </Panel>

      {/* Live Catalogue Snapshot */}
      <Panel title="Katalog Pengeluaran Semasa" eyebrow="Katalog rasmi semasa" action={<Refresh onClick={catalogue.reload} />}>
        <ResourceState {...catalogue} />
        {catalogue.data && catalogue.data.length > 0 ? (
          <div className="xp-record-list">
            {catalogue.data.map(p => (
              <div key={p.id} className="xp-list-row">
                <div>
                  <strong>{p.name}</strong>
                  <p>
                    RM {(p.priceSen / 100).toFixed(2)} · Saiz Pek {p.packSize} · Versi {p.publishedVersion}
                  </p>
                </div>
                <Status value={p.status ?? 'published'} />
              </div>
            ))}
          </div>
        ) : (
          <p className="xp-muted" style={{ padding: '1rem 0' }}>
            {catalogue.loading ? 'Memuatkan katalog rasmi...' : catalogue.error ? 'Katalog belum dapat disahkan. Semak ralat sambungan di atas.' : 'Tiada rekod katalog dimuatkan. Gunakan draf di atas untuk onboarding.'}
          </p>
        )}
      </Panel>
    </div>
  );
}
