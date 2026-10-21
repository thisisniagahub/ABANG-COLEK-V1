import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import { BRAND_ASSETS } from '../brand/brand-assets';

/**
 * Butiran hotspot mengikut BAB.
 *
 * Sumber: `docs/design/landing-page.md` §Bab 01–06 (baris "Hotspot", "Copy
 * sasaran", "Route") dan copy yang konsisten dengan e2e spec
 * (`tests/e2e/landing-emons.spec.ts`).
 *
 * REVISI 21 Okt 2026: senarai 4-generik yang diperkenalkan dalam wave 1
 * dipulihkan kepada 6 bab yang asal (commit 6edbdd2) — audit frontend V-M1:
 * Bab 05 dan Bab 06 jatuh balik kepada butiran Bab 01, dan copy Bab 01
 * ("Terokai dunia" / "Selamat datang ke dunia kami.") hilang walaupun design
 * menyetORKAN copy sasaran "Dunia ABANGCOLEK" dan spec assert copy itu.
 */
const details = [
  {
    // Bab 01 — Dunia ABANGCOLEK. Copy: "Dunia ABANGCOLEK" + "Colek, stabil
    // eksis dan digoreng oleh kami." Hotspot: (1) packaging Jerux → butiran
    // produk; (2) gerai → story jenama ringkas. Route: `/`.
    title: 'Selamat datang ke dunia kami.',
    label: 'Terokai dunia',
    text: 'Colek buah, jeruk dan sambal dibuat dengan tangan. Packaging dan produk dipaparkan daripada sumber terkawal.',
    points: ['Jerux aktif dipesan melalui pra-tempahan mengikut rekod yang disahkan.', 'Paparan stok sentiasa dari katalog semasa.'],
    action: 'Jom pilih produk',
    path: '/products',
  },
  {
    // Bab 02 — Pilih Buah Anda. Hotspot: 1 per varian yang dipaparkan
    // (maks 3), mengikut katalog server. Route: `/products`.
    title: 'Pilih buah anda.',
    label: 'Terokai varian',
    text: 'Mangga, jambu, kedondong dan varian lain mengikut katalog aktif — bukan katalog penuh dan bukan pengesahan stok.',
    points: ['Nama, harga dan stok dari katalog semasa.', 'Varian media sosial dipaparkan sebagai editorial sahaja.'],
    action: 'Buka katalog',
    path: '/products',
  },
  {
    // Bab 03 — Rasa & Reaksi. Hotspot: 1 — skrin media → galeri reaksi.
    // Route: `/products`; galeri media = NOT_IMPLEMENTED (landing-page.md:163).
    title: 'Rasa sekali, jatuh cinta.',
    label: 'Terokai rasa & reaksi',
    text: 'Close-up kuah colek yang likat melekat dan reaksi pelanggan sebenar dari kandungan yang diberi kebenaran.',
    points: ['Setiap media ada attribution.', 'Kebenaran owner direkod sebelum digunakan.'],
    action: 'Lihat katalog',
    path: '/products',
  },
  {
    // Bab 04 — Kenal Founder. Hotspot: 1 — maskot → pengenalan watak.
    // Route: External TikTok (landing-page.md:186).
    title: 'Kenal founder.',
    label: 'Terokai founder',
    text: 'Founder | Motivator — wajah, suara dan komuniti jenama. Nama dan cerita dipaparkan hanya dengan kelulusan founder.',
    points: ['Tiada biodata atau pengiktirafan yang direka.', 'Ikuti kandungan rasmi di TikTok.'],
    action: 'Ikuti di TikTok',
    path: 'https://www.tiktok.com/@styloairpool',
  },
  {
    // Bab 05 — Dapatkan Jerux Anda. Hotspot: 2 — (1) lokasi pickup → senarai
    // lokasi; (2) kenderaan → cara order. Route: `/flows/order`, `/locations`.
    title: 'Dapatkan Jerux anda.',
    label: 'Terokai pickup',
    text: 'Cara order, lokasi pickup dan fulfillment mengikut rekod yang disahkan.',
    points: ['Lokasi dipaparkan dari data /public-info.', 'Status order datang dari server, bukan redirect.'],
    action: 'Semak lokasi pickup',
    path: '/locations',
  },
  {
    // Bab 06 — Pilihan & Pesanan. Hotspot: 1 — rak → katalog penuh.
    // Route: `/flows/order`, `/become-dealer`.
    title: 'Pilihan & pesanan.',
    label: 'Terokai pesanan',
    text: 'Lineup aktif, harga dan stok mengikut katalog semasa; ejen dan stokis mempunyai laluan berasingan.',
    points: ['Pesan melalui flow order yang sama.', 'Pendaftaran ejen melalui /become-dealer.'],
    action: 'Pesan sekarang',
    path: '/products',
  },
] as const;

interface WorldHotspotProps {
  active: number;
  paused: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
}

/** Native dialog supplies focus containment; all routes come from the existing public journey. */
export default function WorldHotspot({ active, paused, onOpenChange, onNavigate }: WorldHotspotProps) {
  const detail = details[active] ?? details[0];
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = () => {
    dialogRef.current?.close();
    setOpen(false);
    onOpenChange(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (open && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [open]);

  // A display-mode change unmounts the hotspot. Release the parent's input block as well.
  useEffect(() => () => onOpenChange(false), [onOpenChange]);

  return <div className={`ac-world-hotspot-wrap${paused ? ' is-paused' : ''}`}>
    <span className="ac-world-hotspot-ring" aria-hidden="true" />
    <button ref={triggerRef} className="ac-world-hotspot" aria-label={detail.label} aria-haspopup="dialog" aria-expanded={open} aria-controls="ac-world-detail" onClick={() => { setOpen(true); onOpenChange(true); }}>
      <Plus size={20} /><span>{detail.label}</span>
    </button>
    <dialog ref={dialogRef} id="ac-world-detail" className="ac-world-dialog" aria-labelledby="ac-world-detail-title" aria-describedby="ac-world-detail-description" onCancel={event => { event.preventDefault(); close(); }} onClose={() => { setOpen(false); onOpenChange(false); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
      <div className="ac-world-dialog-top"><span>0{active + 1} / THE COLEK CONNECTION</span><button autoFocus onClick={close} aria-label="Tutup maklumat"><X size={20} /></button></div>
      {active === 0 && <figure className="ac-world-dialog-photo"><img src={BRAND_ASSETS.productEditorial.src} alt={BRAND_ASSETS.productEditorial.alt} width={405} height={720} /><figcaption><a href={BRAND_ASSETS.productEditorial.source} target="_blank" rel="noopener noreferrer">Foto TikTok rasmi <ArrowUpRight size={13} /></a></figcaption></figure>}
      <h2 id="ac-world-detail-title">{detail.title}</h2>
      <p id="ac-world-detail-description">{detail.text}</p>
      <ul>{detail.points.map(point => <li key={point}>{point}</li>)}</ul>
      {detail.path.startsWith('http') ? <a className="ac-button" href={detail.path} target="_blank" rel="noopener noreferrer">{detail.action}<ArrowUpRight size={17} /></a> : <button className="ac-button" onClick={() => { close(); onNavigate(detail.path); }}>{detail.action}<ArrowUpRight size={17} /></button>}
    </dialog>
  </div>;
}
