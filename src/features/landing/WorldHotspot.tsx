import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import { BRAND_ASSETS } from '../brand/brand-assets';

const details = [
  { title: 'Colek buah segar, setiap hari.', label: 'Terokai dapur', text: 'Mangga, jambu, kedondong — dihiris segar dan dicampur sambal colek. Pedas, manis, likat melekat.', points: ['Buah segar dihiris setiap hari.', 'Sambal colek resepi asal ABANGCOLEK.'], action: 'Buka katalog', path: '/products' },
  { title: 'Disahkan sebelum dijual.', label: 'Terokai semakan kualiti', text: 'Setiap cawan disemak sebelum masuk katalog. Semakan direkodkan sebagai evidence dalam platform.', points: ['Tutup dan kuantiti disemak sebelum published.', 'Cawan yang tidak lulus tidak dijual.'], action: 'Lihat katalog', path: '/products' },
  { title: 'Rangkaian ejen & stokis.', label: 'Terokai ejen & stokis', text: 'Stokis menyimpan dan mengagihkan stok dalam ruang B2B tersendiri, terikat kepada commercial terms yang diluluskan.', points: ['MOQ, pack size dan harga tertakluk kepada terma yang diluluskan.', 'Tiada pendapatan atau komisen dijamin.'], action: 'Mohon ejen / stokis', path: '/become-dealer' },
  { title: 'Dari sini, ke anda.', label: 'Terokai penghantaran', text: 'Penghantaran tempatan dan bas ekspres ke luar Pantai Timur. Ikuti update dispatch melalui pesanan anda.', points: ['Pilihan fulfilment mengikut pesanan dan lokasi.', 'Rujuk timeline pesanan untuk status sebenar.'], action: 'Semak lokasi pickup', path: '/locations' },
  { title: 'Rasa sekali, jatuh cinta.', label: 'Terokai booth & komuniti', text: 'Dari booth festival sampai ke pelanggan tetap. Bantuan dan aduan berkongsi context order yang sama.', points: ['Booth dan lokasi operasi yang disahkan.', 'Sokongan dalam context pesanan yang sama.'], action: 'Lihat lokasi pickup', path: '/locations' },
  { title: 'Pilih colek anda.', label: 'Terokai produk', text: 'Asam boi klasik, Sambal Kicx, Awesome Shacx — pilihan, harga dan ketersediaan mengikut katalog semasa.', points: ['Harga dan stok mengikut katalog semasa.', 'Pilihan buah dan sambal mengikut kepelbagaian SKU.'], action: 'Pesan sekarang', path: '/products' },
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
      {active === details.length - 1 && <figure className="ac-world-dialog-photo"><img src={BRAND_ASSETS.productEditorial.src} alt={BRAND_ASSETS.productEditorial.alt} width={405} height={720} /><figcaption><a href={BRAND_ASSETS.productEditorial.source} target="_blank" rel="noopener noreferrer">Foto TikTok rasmi <ArrowUpRight size={13} /></a></figcaption></figure>}
      <h2 id="ac-world-detail-title">{detail.title}</h2>
      <p id="ac-world-detail-description">{detail.text}</p>
      <ul>{detail.points.map(point => <li key={point}>{point}</li>)}</ul>
      <button className="ac-button" onClick={() => { close(); onNavigate(detail.path); }}>{detail.action}<ArrowUpRight size={17} /></button>
    </dialog>
  </div>;
}
