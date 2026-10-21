import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import { BRAND_ASSETS } from '../brand/brand-assets';

/**
 * Butiran hotspot mengikut BAB (bukan satu senarai umum).
 *
 * Sumber: `docs/design/landing-page.md` §Bab 01–06 (baris "Hotspot", "Copy
 * sasaran" dan "Route"). Sebelum ini hanya 4 butiran wujud ⇒ Bab 05 dan Bab 06
 * jatuh balik kepada butiran Bab 01 (audit frontend V-M1), dan pemetaan
 * Bab 02–04 tidak sepadan dengan reka bentuk yang diluluskan.
 */
const details = [
  {
    // Bab 01 — Dunia ABANGCOLEK. Hotspot: (1) packaging Jerux → butiran
    // produk; (2) gerai → story jenama ringkas. Route: `/`.
    title: 'Kenali colek anda.',
    label: 'Terokai produk',
    text: 'Lihat foto asal Sambal Colek dan buka katalog untuk pilihan, harga serta ketersediaan yang disahkan.',
    points: ['Foto daripada TikTok rasmi ABANG COLEK.', 'Harga dan stok mengikut katalog semasa.'],
    action: 'Buka katalog',
    path: '/products',
  },
  {
    // Bab 02 — Pilih Buah Anda. Hotspot: 1 per varian yang dipaparkan
    // (maks 3), mengikut katalog server. Route: `/products`.
    title: 'Pilih buah anda.',
    label: 'Terokai varian',
    text: 'Senarai varian daripada katalog semasa. Setiap varian ada status dan harga yang disahkan server.',
    points: ['Varian mengikut katalog yang semasa.', 'Tiada harga atau stok yang tidak disahkan.'],
    action: 'Buka katalog',
    path: '/products',
  },
  {
    // Bab 03 — Rasa & Reaksi. Hotspot: 1 — skrin media → galeri reaksi.
    // Route: `/products`; galeri media = NOT_IMPLEMENTED (landing-page.md:163).
    title: 'Rasa sekali, jatuh cinta selamanya.',
    label: 'Terokai galeri',
    text: 'Reaksi pelanggan disimpan sebagai media. Galeri penuh belum tersedia, jadi kami tunjukkan katalog dulu.',
    points: ['Kandungan hanya daripada bahan yang dibenarkan.', 'Galeri media penuh belum-hospitaliti.'],
    action: 'Buka katalog',
    path: '/products',
  },
  {
    // Bab 04 — Kenal Founder. Hotspot: 1 — maskot → pengenalan watak.
    // Route: External TikTok (landing-page.md:186).
    title: 'Kenal founder.',
    label: 'Terokai founder',
    text: 'Kenal founder ABANG COLEK dan perjalanan jenama ini — cerita pendek daripada fakta yang diluluskan.',
    points: ['Peranan: Founder | Motivator.', 'Sumber asal: TikTok rasmi ABANG COLEK.'],
    action: 'Buka profil rasmi',
    path: 'https://www.tiktok.com/@styloairpool',
  },
  {
    // Bab 05 — Dapatkan Jerux Anda. Hotspot: 2 — (1) lokasi pickup → senarai
    // lokasi; (2) kenderaan → cara order. Route: `/flows/order`, `/locations`.
    title: 'Dapatkan Jerux anda.',
    label: 'Terokai penghantaran',
    text: 'Sebab cara order mengikut rekod yang disahkan, dan di mana anda boleh ambil pesanan.',
    points: ['Pra-tempahan atau made-to-order mengikut rekod disahkan.', 'Lokasi pickup daripada `/public-info` sahaja.'],
    action: 'Lihat lokasi pickup',
    path: '/locations',
  },
  {
    // Bab 06 — Pilihan & Pesanan. Hotspot: 1 — rak → katalog penuh.
    // Route: `/flows/order`, `/become-dealer`.
    title: 'Pilihan & pesanan.',
    label: 'Terokai lineup',
    text: 'Lineup aktif mengikut katalog semasa, dan terus ke laluan pembelian yang sebenar.',
    points: ['Katalog aktif penuh, mengikut data server.', 'Tiada barangan tanpa status disahkan.'],
    action: 'Buka katalog',
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
