import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Flame, 
  Sparkles, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  QrCode, 
  PhoneCall, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Send,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { appStore } from '@/services/store';
import { formatWhatsAppUrl } from '../../shared/growth-contracts';

interface MenuItem {
  id: string;
  name: string;
  category: 'fruits' | 'sauces' | 'combos' | 'snacks';
  description: string;
  portion: string;
  price: number;
  image: string;
  isCustomizableSpicy: boolean;
  popular?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: 'Set Platter Mangga Siam + Jambu Rangup',
    category: 'fruits',
    description: 'Mangga susu muda segar dihiris nipis bersama jambu batu rangup tanpa biji, dihidang bersama mangkuk kuah colek pekat.',
    portion: '500g Buah + 100ml Kuah Colek',
    price: 14.0,
    image: '/assets/brand/Screenshot 2026-01-16 193536.png',
    isCustomizableSpicy: true,
    popular: true
  },
  {
    id: 'm2',
    name: 'Set Kombo 4 Musim (Mangga, Jambu, Kedondong, Nenas)',
    category: 'combos',
    description: 'Pilihan lengkap 4 aneka buah potong segar ranum, ditabur bijan sangai dan cili padi potong.',
    portion: '650g Buah Campur + 150ml Kuah Colek',
    price: 18.0,
    image: '/assets/brand/Screenshot 2026-01-16 193536.png',
    isCustomizableSpicy: true,
    popular: true
  },
  {
    id: 'm3',
    name: 'Platter Kedondong Rangup Asli',
    category: 'fruits',
    description: 'Kedondong rangup manis masam, dicolek dengan kuah manis legam resepi istimewa Liurleleh.',
    portion: '450g Kedondong + 90ml Kuah Colek',
    price: 13.0,
    image: '🍏',
    isCustomizableSpicy: true
  },
  {
    id: 'm4',
    name: 'Botol Khas Kuah Colek Asli (350ml)',
    category: 'sauces',
    description: 'Kuah colek botol sedia dimakan. Penutup kedap induksi keselamatan (Anti-Bocor) resepi asli warisan Pantai Timur.',
    portion: 'Botol 350ml (Tahan 6 Bulan)',
    price: 12.0,
    image: '/assets/brand/tiktok-sambal-colek-launch.webp',
    isCustomizableSpicy: false,
    popular: true
  },
  {
    id: 'm5',
    name: 'Botol Khas Kuah Colek Extra Pedas (350ml)',
    category: 'sauces',
    description: 'Ekstra cili padi merah & belacan bakar Terengganu. Khusus buat penggemar pedas meletop.',
    portion: 'Botol 350ml (Tahap Pedas: Berapi)',
    price: 13.0,
    image: '🌶️',
    isCustomizableSpicy: false
  },
  {
    id: 'm6',
    name: 'Family Pack: 3 Botol Kuah Colek + Asam Boi',
    category: 'combos',
    description: 'Jimat RM 4! 2x Botol Asli + 1x Botol Extra Pedas + Percuma 1 paket serbuk asam boi premium.',
    portion: '3x Botol 350ml + 50g Asam Boi',
    price: 32.0,
    image: '🎁',
    isCustomizableSpicy: false,
    popular: true
  },
  {
    id: 'm7',
    name: 'Keropok Lekor Terengganu Goreng Panas',
    category: 'snacks',
    description: 'Isi ikan tamban tebal rangup di luar lembut di dalam, dicicah bersama sos colek istimewa.',
    portion: '10 Keping + 50ml Kuah Colek',
    price: 10.0,
    image: '🥢',
    isCustomizableSpicy: true
  }
];

type SpicyLevel = 'Pedas Manis' | 'Pedas Padu' | 'Berapi Liur Leleh';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  spicyLevel?: SpicyLevel;
}

export function KioskStorefrontView({ onAction }: { onAction?: (msg: string) => void }) {
  const [referralCode] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referralCode') || '';
    const clean = ref.trim();
    return /^[a-zA-Z0-9_-]{3,32}$/.test(clean) ? clean : '';
  });
  const [agentPhone] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone') || params.get('agentPhone') || params.get('refPhone') || '';
    return phone.trim();
  });
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'fruits' | 'sauces' | 'combos' | 'snacks'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedSpicy, setSelectedSpicy] = useState<Record<string, SpicyLevel>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('pickup');
  const [checkoutModal, setCheckoutModal] = useState<'none' | 'duitnow' | 'success'>('none');
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState('');

  const getSpicySelection = (id: string): SpicyLevel => {
    return selectedSpicy[id] || 'Pedas Padu';
  };

  const handleSpicyChange = (id: string, level: SpicyLevel) => {
    setSelectedSpicy(prev => ({ ...prev, [id]: level }));
  };

  const addToCart = (item: MenuItem) => {
    const spicy = item.isCustomizableSpicy ? getSpicySelection(item.id) : undefined;
    setCart(prev => {
      const existingIndex = prev.findIndex(ci => ci.menuItem.id === item.id && ci.spicyLevel === spicy);
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += 1;
        return copy;
      }
      return [...prev, { menuItem: item, quantity: 1, spicyLevel: spicy }];
    });
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index].quantity = newQty;
      return copy;
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredItems = selectedCategory === 'all' 
    ? MENU_ITEMS 
    : MENU_ITEMS.filter(m => m.category === selectedCategory);

  const handleCompleteOrder = (method: 'duitnow' | 'whatsapp') => {
    if (cart.length === 0) return;
    const name = customerName.trim() || 'Pelanggan Kios';
    const itemsDescription = cart.map(c => 
      `${c.quantity}x ${c.menuItem.name}${c.spicyLevel ? ` (${c.spicyLevel})` : ''}`
    ).join(', ');

    const newOrder = appStore.addOrder({
      customer_id: `${name}${referralCode ? ` [Ref: ${referralCode}]` : ''}`,
      status: 'Processing',
      amount: cartTotal,
      city: fulfillmentType === 'pickup' ? 'Ambil di Gerai (Self-Pickup)' : 'Penghantaran Segera',
      items: `${itemsDescription}${referralCode ? ` | Ejen: ${referralCode}` : ''}`,
      tracking_number: `DUITNOW-AC-${Date.now().toString().slice(-6)}`
    });

    setLastPlacedOrderId(newOrder.order_id);

    if (method === 'whatsapp') {
      const text = encodeURIComponent(
        `*PESANAN BAHARU ABANG COLEK OS*\n` +
        `No Pesanan: ${newOrder.order_id}\n` +
        (referralCode ? `*Ejen Perujuk:* ${referralCode} (Kedai Mini Ejen)\n` : '') +
        `Pelanggan: ${name} (${customerPhone || 'Tiada No'})\n` +
        `Jenis: ${fulfillmentType === 'pickup' ? 'Ambil di Gerai' : 'Penghantaran Pantas'}\n\n` +
        `*Pesanan:*\n${itemsDescription.split(', ').map(i => `• ${i}`).join('\n')}\n\n` +
        `*Jumlah Bayaran:* RM ${cartTotal.toFixed(2)}\n\n` +
        (referralCode ? `Pesanan ini dirujuk melalui pautan referral ejen ${referralCode}.\n` : '') +
        `Sila sahkan pesanan dan sediakan dalam masa 15 minit. Terima kasih!`
      );
      window.open(formatWhatsAppUrl(agentPhone, text), '_blank');
      setCart([]);
      setIsCartOpen(false);
      setCheckoutModal('success');
    } else {
      setCheckoutModal('duitnow');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#FFFDF7] text-[#1A1A1A] p-3 md:p-6 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Referral Agent Storefront Banner */}
        {referralCode && (
          <div className="bg-emerald-600 text-white p-3.5 md:p-4 rounded-3xl border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="bg-[#FFC107] text-[#1A1A1A] font-black text-xs px-2.5 py-1 rounded-xl border border-[#1A1A1A] shrink-0">
                🏪 KEDAI MINI EJEN
              </span>
              <div>
                <p className="text-xs md:text-sm font-extrabold leading-tight">
                  Dirujuk oleh Ejen Rasmi: <span className="bg-white/20 px-2 py-0.5 rounded font-mono">{referralCode}</span>
                </p>
                <p className="text-[11px] text-emerald-100 font-medium">Pembelian anda direkodkan terus bersama komisen sah ejen perujuk.</p>
              </div>
            </div>
            <a
              href={formatWhatsAppUrl(agentPhone, `Salam Ejen ${referralCode}, saya sedang melayari kedai mini anda di Abang Colek.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-zinc-100 text-[#1A1A1A] text-xs font-black px-3.5 py-2 rounded-xl border border-[#1A1A1A] flex items-center gap-1.5 transition-all no-underline shrink-0"
            >
              <Send size={13} className="text-emerald-600" />
              <span>WhatsApp Ejen ({referralCode})</span>
            </a>
          </div>
        )}

        {/* Top Kiosk Header */}
        <div className="bg-[#1A1A1A] text-white p-5 md:p-6 rounded-3xl border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#FFC107] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#FFC107] text-[#1A1A1A] rounded-2xl flex items-center justify-center font-black text-2xl border-2 border-white shadow-sm shrink-0">
              AC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#FFC107]">ABANG COLEK</h1>
                <span className="bg-[#E53935] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-white">
                  Kios Rasmi
                </span>
                {referralCode && (
                  <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-white">
                    Ejen: {referralCode}
                  </span>
                )}
              </div>
              <p className="text-zinc-300 text-xs md:text-sm mt-0.5 flex items-center gap-1.5 font-medium">
                <MapPin size={14} className="text-[#FFC107]" />
                Gerai Utama Uptown Danau Kota & Depot Kemaman
                <span className="text-emerald-400 font-bold ml-2">● DIBUKA SEKARANG</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-[#E53935] hover:bg-red-600 active:scale-95 text-white font-black text-sm px-5 py-3 rounded-2xl border-2 border-white shadow-[2px_2px_0px_#FFC107] flex items-center gap-2 cursor-pointer transition-all"
            >
              <ShoppingBag size={18} />
              <span>Troli Pesanan ({cartItemCount})</span>
              {cartTotal > 0 && <span className="bg-[#FFC107] text-[#1A1A1A] px-2 py-0.5 rounded-lg text-xs ml-1 font-bold">RM {cartTotal.toFixed(2)}</span>}
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'all', label: 'Semua Menu', icon: Sparkles },
            { id: 'fruits', label: 'Set Buah Potong', icon: Sparkles },
            { id: 'sauces', label: 'Botol Kuah Colek', icon: Flame },
            { id: 'combos', label: 'Kombo Jimat', icon: ShoppingBag },
            { id: 'snacks', label: 'Snek & Lekor', icon: Sparkles },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center gap-1.5 shrink-0 border-2 ${
                selectedCategory === cat.id
                  ? 'bg-[#FFC107] text-[#1A1A1A] border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <cat.icon size={15} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(item => (
            <div 
              key={item.id}
              className="bg-white rounded-3xl p-5 border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 relative group"
            >
              {item.popular && (
                <div className="absolute -top-3 -right-2 bg-[#E53935] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full border-2 border-[#1A1A1A] shadow-xs">
                  🔥 Viral Pilihan Ramai
                </div>
              )}

              <div>
                <div className="w-full h-36 bg-[#FFF8E1] rounded-2xl border-2 border-[#1A1A1A] flex items-center justify-center text-5xl mb-4 shadow-inner overflow-hidden">
                  {item.image.startsWith('/') ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    item.image
                  )}
                </div>

                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <h3 className="font-extrabold text-lg text-[#1A1A1A] leading-snug">{item.name}</h3>
                </div>

                <p className="text-zinc-600 text-xs leading-relaxed mb-3 line-clamp-2">
                  {item.description}
                </p>

                <div className="inline-block bg-zinc-100 text-zinc-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-zinc-300 mb-3">
                  📦 {item.portion}
                </div>

                {/* Spiciness Level Pill Selector */}
                {item.isCustomizableSpicy && (
                  <div className="bg-[#FFFDF7] p-2.5 rounded-xl border border-amber-200 mb-4">
                    <div className="text-[10px] font-black text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Flame size={12} className="text-[#E53935]" /> Tahap Pedas Pilihan:
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['Pedas Manis', 'Pedas Padu', 'Berapi Liur Leleh'] as SpicyLevel[]).map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => handleSpicyChange(item.id, lvl)}
                          className={`text-[9px] font-black py-1.5 px-1 rounded-lg border text-center transition-all ${
                            getSpicySelection(item.id) === lvl
                              ? 'bg-[#E53935] text-white border-[#1A1A1A] shadow-xs'
                              : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-100'
                          }`}
                        >
                          {lvl.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Price & Add Button */}
              <div className="pt-3 border-t-2 border-zinc-100 flex items-center justify-between mt-2">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Harga</span>
                  <span className="text-xl font-black text-[#1A1A1A]">RM {item.price.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => addToCart(item)}
                  className="bg-[#FFC107] hover:bg-amber-400 active:scale-95 text-[#1A1A1A] font-black text-xs px-4 py-2.5 rounded-xl border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus size={15} strokeWidth={3} />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quality Commitment Banner */}
        <div className="bg-[#FFF8E1] border-2 border-[#1A1A1A] rounded-3xl p-5 shadow-[3px_3px_0px_#1A1A1A] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4CAF50] text-white flex items-center justify-center font-black">
              ✓
            </div>
            <div>
              <h4 className="font-extrabold text-[#1A1A1A] text-sm">Jaminan Kualiti Penutup Kedap Induksi</h4>
              <p className="text-zinc-600 text-xs">Semua botol kuah ditutup dengan pemanas induksi automasi anti-bocor semasa penghantaran kurier & bas.</p>
            </div>
          </div>
          <button 
            onClick={() => onAction && onAction("Siasat status pensijilan kualiti penutup botol kuah colek di JEV")}
            className="text-xs font-black text-[#E53935] hover:underline"
          >
            Lihat Laporan QC JEV →
          </button>
        </div>

      </div>

      {/* Slide-over Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white border-l-4 border-[#1A1A1A] shadow-2xl flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b-2 border-zinc-200 flex items-center justify-between bg-[#FFFDF7]">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[#E53935]" />
                  <h3 className="font-black text-lg text-[#1A1A1A]">Troli Pesanan Anda ({cartItemCount})</h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-zinc-700"
                >
                  <X size={16} />
                </button>
              </div>

              {referralCode && (
                <div className="mx-5 mt-3 px-3.5 py-2.5 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏪</span>
                    <div>
                      <span className="font-extrabold text-emerald-900 block leading-tight">Kedai Mini Ejen: <strong>{referralCode}</strong></span>
                      <span className="text-[10px] text-emerald-700">Komisen pesanan dikreditkan terus ke lejar ejen perujuk.</span>
                    </div>
                  </div>
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                    Sah
                  </span>
                </div>
              )}

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-zinc-400">
                    <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">Troli anda masih kosong.</p>
                    <p className="text-xs mt-1">Pilih buah atau botol colek kegemaran anda sekarang!</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div 
                      key={`${item.menuItem.id}-${item.spicyLevel}-${idx}`}
                      className="bg-[#FFFDF7] p-3.5 rounded-2xl border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex justify-between items-center"
                    >
                      <div className="flex-1 pr-2">
                        <h4 className="font-bold text-sm text-[#1A1A1A] leading-tight">{item.menuItem.name}</h4>
                        {item.spicyLevel && (
                          <span className="inline-block bg-[#E53935] text-white text-[9px] font-black px-1.5 py-0.5 rounded mt-1">
                            {item.spicyLevel}
                          </span>
                        )}
                        <div className="text-xs font-black text-[#1A1A1A] mt-1">
                          RM {(item.menuItem.price * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      {/* Quantity Control */}
                      <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-zinc-300">
                        <button 
                          onClick={() => updateCartQty(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-bold"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQty(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-bold"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* Customer Details Input */}
                {cart.length > 0 && (
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-3 mt-4">
                    <h5 className="font-extrabold text-xs text-zinc-700 uppercase">Maklumat Pengambilan</h5>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfillmentType('pickup')}
                        className={`py-2 text-xs font-black rounded-xl border-2 ${
                          fulfillmentType === 'pickup' 
                            ? 'bg-[#FFC107] border-[#1A1A1A] text-[#1A1A1A]' 
                            : 'bg-white border-zinc-200 text-zinc-600'
                        }`}
                      >
                        Ambil di Gerai
                      </button>
                      <button
                        type="button"
                        onClick={() => setFulfillmentType('delivery')}
                        className={`py-2 text-xs font-black rounded-xl border-2 ${
                          fulfillmentType === 'delivery' 
                            ? 'bg-[#FFC107] border-[#1A1A1A] text-[#1A1A1A]' 
                            : 'bg-white border-zinc-200 text-zinc-600'
                        }`}
                      >
                        Hantar Segera
                      </button>
                    </div>

                    <input 
                      type="text"
                      placeholder="Nama Anda (cth: Cikgu Aina)"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-black"
                    />
                    <input 
                      type="tel"
                      placeholder="No. Telefon (cth: 012-3456789)"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-black"
                    />
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              {cart.length > 0 && (
                <div className="p-5 border-t-2 border-zinc-200 bg-[#FFFDF7] space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-zinc-600">
                    <span>Jumlah Bersih:</span>
                    <span className="text-xl font-black text-[#1A1A1A]">RM {cartTotal.toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleCompleteOrder('duitnow')}
                      className="bg-[#1A1A1A] hover:bg-black text-[#FFC107] font-black text-xs py-3 rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <QrCode size={16} />
                      <span>DuitNow QR</span>
                    </button>

                    <button
                      onClick={() => handleCompleteOrder('whatsapp')}
                      className="bg-[#4CAF50] hover:bg-green-600 text-white font-black text-xs py-3 rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send size={15} />
                      <span>Pesan WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DuitNow QR Modal */}
      {checkoutModal === 'duitnow' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full border-4 border-[#1A1A1A] shadow-[6px_6px_0px_#FFC107] text-center space-y-4"
          >
            <div className="w-12 h-12 bg-[#FFC107] text-[#1A1A1A] rounded-2xl mx-auto flex items-center justify-center font-black border-2 border-[#1A1A1A]">
              QR
            </div>

            <h3 className="font-black text-xl text-[#1A1A1A]">Imbas & Bayar DuitNow</h3>
            <p className="text-xs text-zinc-500 font-medium">Imbas menggunakan mana-mana aplikasi perbankan atau e-Wallet di Malaysia.</p>

            {/* QR Box Visual */}
            <div className="bg-[#FFFDF7] border-2 border-dashed border-[#1A1A1A] rounded-2xl p-6 mx-auto w-48 h-48 flex flex-col items-center justify-center">
              <QrCode size={120} className="text-[#1A1A1A]" />
              <span className="text-[9px] font-bold text-zinc-600 mt-2">LIURLELEH HOUSE MALAYSIA</span>
            </div>

            <div className="text-sm font-black text-zinc-700">
              Jumlah: <span className="text-xl text-[#E53935]">RM {cartTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={() => {
                setCart([]);
                setIsCartOpen(false);
                setCheckoutModal('success');
              }}
              className="w-full bg-[#E53935] hover:bg-red-600 text-white font-black text-sm py-3 rounded-xl border-2 border-[#1A1A1A] shadow-xs cursor-pointer"
            >
              Saya Dah Selesai Bayar
            </button>
          </motion.div>
        </div>
      )}

      {/* Order Success Modal */}
      {checkoutModal === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full border-4 border-[#1A1A1A] shadow-[6px_6px_0px_#4CAF50] text-center space-y-4"
          >
            <div className="w-16 h-16 bg-[#4CAF50] text-white rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="font-black text-2xl text-[#1A1A1A]">Pesanan Diterima!</h3>
            <p className="text-xs text-zinc-600 font-medium">
              Pesanan anda dengan no rujukan <strong className="text-[#1A1A1A]">{lastPlacedOrderId}</strong> telah dihantar ke sistem krew gerai.
            </p>

            <div className="bg-[#FFF8E1] p-3 rounded-xl border border-amber-300 text-xs font-bold text-amber-900">
              ⏱️ Anggaran siap: 10 - 15 minit. Sila tunjukkan nombor pesanan ini semasa mengambil buah.
            </div>

            {referralCode && (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-3 text-xs text-emerald-900 font-bold space-y-1.5 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span>🏪</span>
                  <span>Dirujuk oleh Ejen Rasmi: <span className="font-mono bg-emerald-200 px-1.5 py-0.5 rounded">{referralCode}</span></span>
                </div>
                <p className="text-[10px] font-medium text-emerald-700">Komisen pesanan ini telah direkodkan dalam lejar operasi ejen.</p>
                <a
                  href={formatWhatsAppUrl(agentPhone, `Salam Ejen ${referralCode}, saya telah membuat pesanan di kedai mini anda. No Pesanan: ${lastPlacedOrderId}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl no-underline shadow-xs"
                >
                  <Send size={13} />
                  <span>Maklumkan Ejen via WhatsApp</span>
                </a>
              </div>
            )}

            <button
              onClick={() => setCheckoutModal('none')}
              className="w-full bg-[#1A1A1A] hover:bg-black text-white font-black text-sm py-3 rounded-xl border-2 border-[#1A1A1A] cursor-pointer"
            >
              Kembali ke Menu
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
