import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, 
  Truck, 
  Package, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  Minus, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Clock,
  Sparkles,
  QrCode,
  Send
} from 'lucide-react';
import { appStore } from '@/services/store';
import { formatWhatsAppUrl } from '../../shared/growth-contracts';

interface WholesalePackage {
  id: string;
  title: string;
  bottlesPerBox: number;
  retailValue: number;
  wholesalePrice: number;
  profitPerBox: number;
  weightKg: number;
  imageEmoji: string;
}

const WHOLESALE_PACKAGES: WholesalePackage[] = [
  {
    id: 'wp-1',
    title: 'Karton Kuah Colek Asli (24 Botol x 350ml)',
    bottlesPerBox: 24,
    retailValue: 288.0,
    wholesalePrice: 187.2,
    profitPerBox: 100.8,
    weightKg: 10.5,
    imageEmoji: '🍶'
  },
  {
    id: 'wp-2',
    title: 'Karton Kuah Colek Extra Pedas (24 Botol x 350ml)',
    bottlesPerBox: 24,
    retailValue: 312.0,
    wholesalePrice: 202.8,
    profitPerBox: 109.2,
    weightKg: 10.5,
    imageEmoji: '🌶️'
  },
  {
    id: 'wp-3',
    title: 'Karton Balang Kuah Colek Buah Khas (12 Balang x 500g)',
    bottlesPerBox: 12,
    retailValue: 216.0,
    wholesalePrice: 140.4,
    profitPerBox: 75.6,
    weightKg: 7.2,
    imageEmoji: '🍯'
  },
  {
    id: 'wp-4',
    title: 'Pakej Khas Buka Gerai Krew (10 Karton + Bunting + 5x Apron)',
    bottlesPerBox: 240,
    retailValue: 3000.0,
    wholesalePrice: 1750.0,
    profitPerBox: 1250.0,
    weightKg: 105.0,
    imageEmoji: '🎪'
  }
];

export function AgentRestockPortalView({ onAction }: { onAction?: (msg: string) => void }) {
  const [sponsorCode] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referralCode') || '';
    const clean = ref.trim();
    return /^[a-zA-Z0-9_-]{3,32}$/.test(clean) ? clean : '';
  });
  const [sponsorPhone] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone') || params.get('sponsorPhone') || params.get('agentPhone') || params.get('refPhone') || '';
    return phone.trim();
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({
    'wp-1': 2,
    'wp-2': 1
  });
  const [selectedFreight, setSelectedFreight] = useState<'bus' | 'courier'>('bus');
  const [selectedDepot, setSelectedDepot] = useState('TBS Kuala Lumpur (Kaunter Kargo Platform 4)');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState('');

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const totalBoxes = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const totalBottles = WHOLESALE_PACKAGES.reduce((sum, p) => sum + (p.bottlesPerBox * (quantities[p.id] || 0)), 0);
  const subtotalWholesale = WHOLESALE_PACKAGES.reduce((sum, p) => sum + (p.wholesalePrice * (quantities[p.id] || 0)), 0);
  const potentialProfit = WHOLESALE_PACKAGES.reduce((sum, p) => sum + (p.profitPerBox * (quantities[p.id] || 0)), 0);
  
  const freightCostPerBox = selectedFreight === 'bus' ? 15.0 : 25.0;
  const freightTotal = totalBoxes * freightCostPerBox;
  const grandTotal = subtotalWholesale + freightTotal;

  const handlePlaceRestockOrder = () => {
    if (totalBoxes === 0) return;

    const itemsSummary = WHOLESALE_PACKAGES
      .filter(p => (quantities[p.id] || 0) > 0)
      .map(p => `${quantities[p.id]}x ${p.title}`)
      .join(', ');

    const newOrder = appStore.addOrder({
      customer_id: `Kak Salmah (Stokis Emas Gombak)${sponsorCode ? ` [Penaja: ${sponsorCode}]` : ''}`,
      status: 'Processing',
      amount: grandTotal,
      city: selectedFreight === 'bus' ? `Kargo Bas: ${selectedDepot}` : 'Kurier Darat',
      items: `RESTOCK: ${itemsSummary} | Freight: RM ${freightTotal.toFixed(2)}${sponsorCode ? ` | Penaja: ${sponsorCode}` : ''}`,
      tracking_number: `FREIGHT-AC-${Date.now().toString().slice(-6)}`
    });

    setSubmittedOrderId(newOrder.order_id);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto bg-zinc-50 text-zinc-900 p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Sponsor / Referral Attribution Banner */}
        {sponsorCode && (
          <div className="bg-emerald-600 text-white p-4 rounded-3xl border-2 border-emerald-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="bg-[#FFC107] text-[#1A1A1A] font-black text-xs px-2.5 py-1 rounded-xl shrink-0">
                🤝 PENAJA / EJEN INDUK
              </span>
              <div>
                <p className="text-xs md:text-sm font-extrabold leading-tight">
                  Rujukan Rangkaian Ejen: <span className="bg-white/20 px-2 py-0.5 rounded font-mono">{sponsorCode}</span>
                </p>
                <p className="text-[11px] text-emerald-100 font-medium">Pesanan kargo borong ini dikaitkan dengan rangkaian pengedaran ejen {sponsorCode}.</p>
              </div>
            </div>
            <a
              href={formatWhatsAppUrl(sponsorPhone, `Salam Ejen/Stokis ${sponsorCode}, saya sedang menyediakan pesanan restok kargo borong di Abang Colek.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-zinc-100 text-[#1A1A1A] text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all no-underline shrink-0"
            >
              <Send size={13} className="text-emerald-700" />
              <span>WhatsApp Penaja ({sponsorCode})</span>
            </a>
          </div>
        )}

        {/* Agent Profile & Quota Card */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white font-black text-2xl flex items-center justify-center border-2 border-amber-600 shadow-sm shrink-0">
              KS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-zinc-900">Kak Salmah</h1>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-300">
                  ⭐ STOKIS EMAS (35% Margin)
                </span>
              </div>
              <p className="text-zinc-500 text-xs mt-1 font-medium">
                Kawasan: Gombak, Danau Kota & Selayang · ID Ejen: <strong className="text-zinc-800">AC-STK-088</strong>
              </p>
            </div>
          </div>

          {/* Quota Progress */}
          <div className="w-full md:w-64 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-zinc-600">Sasaran Bulanan:</span>
              <span className="text-amber-700">420 / 500 Botol</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '84%' }} />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">Lagi 80 botol untuk naik taraf ke Master Stokis!</p>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Wholesale Packages (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                <Package size={20} className="text-amber-600" />
                Pilihan Karton Borong (Master Carton)
              </h2>
              <span className="text-xs text-zinc-500 font-medium">Kuantiti minimum: 1 Karton</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WHOLESALE_PACKAGES.map(pkg => {
                const qty = quantities[pkg.id] || 0;
                return (
                  <div 
                    key={pkg.id}
                    className={`bg-white rounded-3xl p-5 border-2 transition-all ${
                      qty > 0 ? 'border-amber-500 shadow-md ring-1 ring-amber-400' : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-3xl">{pkg.imageEmoji}</div>
                      <span className="bg-zinc-100 text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {pkg.bottlesPerBox} Unit / Kotak
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-zinc-900 leading-snug mb-3">{pkg.title}</h3>

                    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 space-y-1 mb-4 text-xs">
                      <div className="flex justify-between text-zinc-500">
                        <span>Nilai Runcit:</span>
                        <span className="line-through">RM {pkg.retailValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-zinc-900">
                        <span>Harga Ejen Borong:</span>
                        <span className="text-amber-600 text-sm">RM {pkg.wholesalePrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-zinc-200">
                        <span>Untung Bersih Anda:</span>
                        <span>+RM {pkg.profitPerBox.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Quantity Adjuster */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-500">Bilangan Kotak:</span>
                      <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200">
                        <button 
                          onClick={() => updateQuantity(pkg.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-zinc-200 flex items-center justify-center font-bold text-zinc-800 cursor-pointer shadow-xs"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-black text-sm w-6 text-center">{qty}</span>
                        <button 
                          onClick={() => updateQuantity(pkg.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-zinc-200 flex items-center justify-center font-bold text-zinc-800 cursor-pointer shadow-xs"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Malaysian Express Bus Freight Selector */}
            <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <Truck size={18} className="text-emerald-600" />
                  Kaedah Pengangkutan Kargo (Logistik Malaysia)
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Sampai Hari Yang Sama (Kargo Bas)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFreight('bus')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedFreight === 'bus'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-zinc-900">🚌 Kargo Bas Ekspres (Sani/Adik Beradik)</span>
                    <span className="font-black text-emerald-700 text-xs">RM 15 / kotak</span>
                  </div>
                  <p className="text-zinc-600 text-[11px]">Terus dari Dapur Kemaman/KB ke Terminal Bas. Jimat kos & botol kurang risiko terhempas.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFreight('courier')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedFreight === 'courier'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-zinc-900">📦 Kurier Standard (J&T Cargo)</span>
                    <span className="font-black text-zinc-700 text-xs">RM 25 / kotak</span>
                  </div>
                  <p className="text-zinc-600 text-[11px]">Hantar terus ke pintu kedai/rumah (Doorstep delivery). Tempoh: 2-3 hari bekerja.</p>
                </button>
              </div>

              {selectedFreight === 'bus' && (
                <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 block">Pilih Terminal & Kaunter Ambilan:</label>
                  <select 
                    value={selectedDepot} 
                    onChange={e => setSelectedDepot(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-medium text-zinc-800 outline-none focus:border-black"
                  >
                    <option value="TBS Kuala Lumpur (Kaunter Kargo Platform 4)">Terminal Bersepadu Selatan (TBS KL) - Kaunter 4</option>
                    <option value="Terminal Bas Shah Alam Seksyen 17">Terminal Bas Shah Alam Seksyen 17</option>
                    <option value="Larkin Sentral Johor Bahru">Larkin Sentral Johor Bahru (Platform Kargo)</option>
                    <option value="Penang Sentral Butterworth">Penang Sentral Butterworth</option>
                    <option value="Terminal Sentral Kuantan (TSK)">Terminal Sentral Kuantan (TSK)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sticky Invoice & Checkout Panel (1 Col) */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border-2 border-zinc-900 shadow-lg space-y-5 sticky top-6">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <h3 className="font-black text-base text-zinc-900 flex items-center gap-2">
                  <FileText size={18} className="text-amber-600" />
                  Ringkasan Invois Restok
                </h3>
                <span className="text-[10px] font-bold bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">DRAF</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Jumlah Karton:</span>
                  <strong className="text-zinc-900">{totalBoxes} Kotak</strong>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Jumlah Botol Diterima:</span>
                  <strong className="text-zinc-900">{totalBottles} Botol</strong>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal Borong:</span>
                  <span className="font-bold text-zinc-900">RM {subtotalWholesale.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Kos Kargo ({selectedFreight === 'bus' ? 'Bas' : 'Kurier'}):</span>
                  <span className="font-bold text-zinc-900">RM {freightTotal.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-zinc-700">Jumlah Perlu Dibayar:</span>
                  <span className="text-2xl font-black text-amber-600">RM {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Profit Indicator Card */}
              {potentialProfit > 0 && (
                <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1">
                    <TrendingUp size={14} />
                    <span>Anggaran Keuntungan Bersih Anda:</span>
                  </div>
                  <div className="text-xl font-black text-emerald-700">
                    +RM {potentialProfit.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Berdasarkan jualan runcit disyorkan HQ.</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                disabled={totalBoxes === 0}
                onClick={handlePlaceRestockOrder}
                className="w-full bg-zinc-900 hover:bg-black disabled:bg-zinc-300 text-amber-400 font-black text-sm py-3.5 rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>Hantar Pesanan Restok</span>
                <span>→</span>
              </button>

              {/* WhatsApp Cargo Order Button */}
              {totalBoxes > 0 && (
                <a
                  href={formatWhatsAppUrl(
                    sponsorPhone,
                    `*PESANAN RESTOK KARGO BORONG ABANG COLEK*\n` +
                    (sponsorCode ? `*Ejen Penaja/Perujuk:* ${sponsorCode}\n` : '') +
                    `Ejen: Kak Salmah (AC-STK-088)\n` +
                    `Kaedah Kargo: ${selectedFreight === 'bus' ? `🚌 Kargo Bas Ekspres (${selectedDepot})` : '📦 Kurier Standard (J&T Cargo)'}\n` +
                    `Jumlah Karton: ${totalBoxes} Kotak (${totalBottles} Botol)\n\n` +
                    `*Pakej:*\n` +
                    WHOLESALE_PACKAGES.filter(p => (quantities[p.id] || 0) > 0)
                      .map(p => `• ${quantities[p.id]}x ${p.title} (RM ${(p.wholesalePrice * (quantities[p.id] || 0)).toFixed(2)})`)
                      .join('\n') +
                    `\n\nSubtotal: RM ${subtotalWholesale.toFixed(2)}\n` +
                    `Kos Kargo: RM ${freightTotal.toFixed(2)}\n` +
                    `*Jumlah Bersih: RM ${grandTotal.toFixed(2)}*\n\n` +
                    `Sila sahkan konsainan kargo ini dari Dapur Kemaman.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-zinc-950 font-black text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 no-underline"
                >
                  <Send size={15} />
                  <span>Hantar Pesanan Kargo ke WhatsApp</span>
                </a>
              )}

              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400">
                <ShieldCheck size={12} />
                <span>Invois rasmi Liurleleh House Malaysia Sdn Bhd</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full border-2 border-zinc-900 shadow-2xl text-center space-y-4"
          >
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="font-black text-xl text-zinc-900">Pesanan Restok Didaftarkan!</h3>
            <p className="text-xs text-zinc-600">
              No Rujukan Pesanan Ejen: <strong className="text-zinc-900">{submittedOrderId}</strong>
            </p>

            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs text-zinc-600 text-left space-y-1">
              <div>📦 <strong>{totalBoxes} Kotak ({totalBottles} Botol)</strong></div>
              <div>🚌 Destinasi: <strong>{selectedFreight === 'bus' ? selectedDepot : 'Alamat Ejen'}</strong></div>
              <div>💰 Jumlah: <strong>RM {grandTotal.toFixed(2)}</strong></div>
            </div>

            {sponsorCode && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs text-emerald-900 font-bold space-y-0.5 text-center">
                <span>Rujukan Penaja: <span className="font-mono bg-emerald-200 px-1.5 py-0.5 rounded">{sponsorCode}</span></span>
                <p className="text-[10px] font-normal text-emerald-700">Konsainan direkodkan di bawah rangkaian ejen.</p>
              </div>
            )}

            <a
              href={formatWhatsAppUrl(
                sponsorPhone,
                `Salam HQ / Ejen ${sponsorCode || 'Utama'}, pesanan restok kargo ${submittedOrderId} telah didaftarkan dalam sistem.\n` +
                `Jumlah: RM ${grandTotal.toFixed(2)} (${totalBoxes} Kotak).\n` +
                `Destinasi: ${selectedFreight === 'bus' ? selectedDepot : 'Kurier Darat'}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl no-underline shadow-xs"
            >
              <Send size={13} />
              <span>Maklumkan Salinan ke WhatsApp</span>
            </a>

            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full bg-zinc-900 hover:bg-black text-white font-black text-xs py-3 rounded-xl cursor-pointer"
            >
              Tutup & Kembali
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
