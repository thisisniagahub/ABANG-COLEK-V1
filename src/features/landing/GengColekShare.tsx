import { useRef, useState } from 'react';
import { Package, Share2 } from 'lucide-react';
import type { PublicProduct } from '../../../shared/platform-contracts';
import { money } from '../workspaces/experience-model';
import BrandLogo from '../brand/BrandLogo';

type ShareStatus = 'idle' | 'shared' | 'copied' | 'error';
type ShareCapabilities = {
  share?: (payload: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export function resolveShareProduct<T extends { id: string; availableQuantity: number }>(products: T[] | null, selectedId: string | null): T | null {
  const available = (products ?? []).filter(product => product.availableQuantity > 0);
  return available.find(product => product.id === selectedId) ?? available[0] ?? null;
}

export async function shareProductChoice(payload: ShareData, capabilities: ShareCapabilities): Promise<ShareStatus> {
  if (capabilities.share) {
    try {
      await capabilities.share(payload);
      return 'shared';
    } catch (error) {
      // Dismissing the native sheet must not copy content against the user's intent.
      if (error instanceof Error && error.name === 'AbortError') return 'idle';
    }
  }
  try {
    if (!capabilities.clipboard) return 'error';
    await capabilities.clipboard.writeText([payload.text, payload.url].filter(Boolean).join(' '));
    return 'copied';
  } catch {
    return 'error';
  }
}

/** "Geng Jerux Kau" — kad pilihan boleh kongsi. Share hanya atas tindakan pengguna; tiada ganjaran; tidak menyekat pembelian. */
export default function GengColekShare({ products }: { products: PublicProduct[] | null }) {
  const selectable = (products ?? []).filter(product => product.availableQuantity > 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<ShareStatus>('idle');
  const [busy, setBusy] = useState(false);
  const sharing = useRef(false);
  // Catalogue loads async: fall back to the first available product until the user picks one.
  const selected = resolveShareProduct(products, selectedId);
  const shareUrl = selected ? `${window.location.origin}/products/${encodeURIComponent(selected.id)}` : '';
  const share = async () => {
    if (!selected || sharing.current) return;
    sharing.current = true;
    setBusy(true);
    setStatus('idle');
    const payload = { title: 'ABANGCOLEK', text: `Aku geng ${selected.name}. Kau?`, url: shareUrl };
    try {
      setStatus(await shareProductChoice(payload, {
        share: navigator.share ? data => navigator.share(data) : undefined,
        clipboard: navigator.clipboard,
      }));
    } finally {
      sharing.current = false;
      setBusy(false);
    }
  };
  if (!selectable.length) return null;
  return <section className="ac-geng" aria-labelledby="ac-geng-title">
    <div className="ac-section-heading">
      <div>
        <p className="ac-eyebrow">Geng Jerux Kau</p>
        <h2 id="ac-geng-title">Pilih geng colek kau.</h2>
      </div>
      <p>Pilih produk sebenar, jana kad pilihan<br />dan kongsi dengan pautan balik.</p>
    </div>
    <div className="ac-geng-body">
      <div className="ac-geng-picker" role="radiogroup" aria-label="Pilih produk untuk kad perkongsian">
        {selectable.map(product => <label key={product.id} className={`ac-geng-chip${product.id === selected?.id ? ' is-selected' : ''}`}>
          <input type="radio" name="ac-geng-product" value={product.id} disabled={busy} checked={product.id === selected?.id} onChange={() => { setSelectedId(product.id); setStatus('idle'); }} />
          <Package size={16} /><span>{product.name}</span>
        </label>)}
      </div>
      {selected && <div className="ac-geng-card" aria-live="polite">
        <BrandLogo className="ac-geng-logo" loading="lazy" />
        <p className="ac-eyebrow">Geng {selected.name}</p>
        <h3>{selected.name}</h3>
        <p>{selected.description}</p>
        <strong>{money(selected.priceSen)}</strong>
        <small>Pack {selected.packSize}</small>
        <span className="ac-geng-link">{shareUrl.replace(/^https?:\/\//, '')}</span>
      </div>}
    </div>
    <div className="ac-geng-actions">
      <button className="ac-button" disabled={busy || !selected} aria-busy={busy} onClick={() => void share()}><Share2 size={17} />{busy ? 'Membuka perkongsian…' : 'Kongsi pilihan saya'}</button>
      <p role="status">{status === 'shared' ? 'Dikongsi. Terima kasih!' : status === 'copied' ? 'Pautan disalin ke papan klip.' : status === 'error' ? 'Perkongsian tidak selesai. Salin pautan pada kad atau cuba lagi.' : ''}</p>
    </div>
  </section>;
}
