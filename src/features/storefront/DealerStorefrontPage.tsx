import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, Copy, Minus, Moon, Package, Plus, ShoppingBag, ShoppingCart, Store, Sun, Users } from 'lucide-react';
import type { PublicDealerStore } from '../../../shared/dealer-store-contracts';
import type { OrderRecord, PublicProduct } from '../../../shared/platform-contracts';
import { formatWhatsAppUrl } from '../../../shared/growth-contracts';
import { api, jsonMutation, useResource } from '../platform/client';
import {
  decodeCustomerCart,
  decrementCustomerCartQuantity,
  encodeCustomerCart,
  MAX_CUSTOMER_CART_LINES,
  validateCustomerCart,
  type CustomerCartLine,
} from '../flows/customer-cart';
import { money } from '../workspaces/experience-model';
import BrandLogo from '../brand/BrandLogo';
import '../landing/landing.css';

export interface DealerStorefrontPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface DealerStorefrontResponse {
  store: PublicDealerStore;
  catalogue: PublicProduct[];
}

interface PublicInfo {
  contact?: string | null;
}

export default function DealerStorefrontPage({
  slug,
  onNavigate,
  theme = 'dark',
  onToggleTheme,
}: DealerStorefrontPageProps) {
  const normalizedSlug = slug.trim().toLowerCase();
  const storefront = useResource<DealerStorefrontResponse>(`/kedai/${encodeURIComponent(normalizedSlug)}`);
  const info = useResource<PublicInfo>('/public-info');

  const [cart, setCart] = useState<CustomerCartLine[]>(() =>
    typeof window !== 'undefined'
      ? decodeCustomerCart(new URLSearchParams(window.location.search).get('cart')) ?? []
      : []
  );
  const [cartNotice, setCartNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [fulfilment, setFulfilment] = useState<'pickup' | 'delivery'>('pickup');
  const [contactRef, setContactRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<(OrderRecord & { trackingToken?: string }) | null>(null);

  const store = storefront.data?.store;
  const catalogue = storefront.data?.catalogue ?? [];

  useEffect(() => {
    if (store) {
      document.title = `${store.displayName} (/kedai/${store.slug}) | ABANGCOLEK`;
    } else if (storefront.error) {
      document.title = 'Kedai Tidak Dijumpai | ABANGCOLEK';
    }
    return () => {
      document.title = 'ABANGCOLEK — Workspace';
    };
  }, [store, storefront.error]);

  const cartRows = cart.map((line) => ({
    line,
    product: catalogue.find((product) => product.id === line.productId),
  }));
  const cartTotal = cartRows.reduce(
    (sum, row) => sum + (row.product?.priceSen ?? 0) * row.line.quantity,
    0
  );
  const cartReady =
    cart.length > 0 &&
    cartRows.every(
      (row) =>
        row.product &&
        row.line.quantity <= row.product.availableQuantity &&
        row.line.quantity % row.product.packSize === 0
    );
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  function changeQuantity(product: PublicProduct, next: number) {
    if (next <= 0) {
      setCart((current) => current.filter((line) => line.productId !== product.id));
      setCartNotice('');
      return;
    }
    if (
      !Number.isSafeInteger(next) ||
      next > 10_000 ||
      next > product.availableQuantity ||
      next % product.packSize !== 0
    ) {
      setCartNotice(
        `Kuantiti ${product.name} mesti gandaan pek ${product.packSize} dan tidak melebihi stok tersedia.`
      );
      return;
    }
    setCartNotice('');
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      return existing
        ? current.map((line) => (line.productId === product.id ? { ...line, quantity: next } : line))
        : [...current, { productId: product.id, quantity: next }];
    });
  }

  function startGuidedCheckout() {
    if (!store) return;
    try {
      const lines = validateCustomerCart(cart, catalogue);
      const query = new URLSearchParams({
        cart: encodeCustomerCart(lines),
        ref: store.slug,
      });
      onNavigate(`/flows/order?${query.toString()}`);
    } catch (reason) {
      setCartNotice(reason instanceof Error ? reason.message : 'Troli perlu disemak semula.');
    }
  }

  async function submitDirectOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!store || !cartReady || submitting) return;
    setSubmitting(true);
    setCartNotice('');
    try {
      const lines = validateCustomerCart(cart, catalogue);
      const catalogueVersion = catalogue[0]?.publishedVersion ?? 1;
      const order = await api<OrderRecord & { trackingToken?: string }>(
        '/orders',
        jsonMutation({
          lines,
          catalogueVersion,
          fulfilment,
          contactRef: contactRef.trim(),
          outletId: 'hq',
          referralCode: store.slug,
        })
      );
      setSubmittedOrder(order);
      setCart([]);
    } catch (reason) {
      setCartNotice(
        reason instanceof Error
          ? reason.message
          : 'Pesanan terus memerlukan sesi pelanggan aktif. Gunakan aliran checkout berpandu atau WhatsApp.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function copyStoreUrl() {
    if (!store || typeof window === 'undefined') return;
    const url = `${window.location.origin}/kedai/${store.slug}`;
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  const whatsAppOrderMessage = store
    ? `*PESANAN KEDAI RASMI EJEN ABANGCOLEK*\n` +
      `*Kedai Ejen:* ${store.displayName} (/kedai/${store.slug})\n` +
      `*Kod Rujukan Ejen:* ${store.slug}\n\n` +
      `*Senarai Produk:*\n` +
      cartRows
        .map(
          (row) =>
            `• ${row.product?.name ?? row.line.productId} × ${row.line.quantity} (${money((row.product?.priceSen ?? 0) * row.line.quantity)})`
        )
        .join('\n') +
      `\n\n*Jumlah Produk:* ${money(cartTotal)}\n` +
      `Pesanan ini dibuat melalui kedai rasmi ejen /kedai/${store.slug}.`
    : '';

  return (
    <div className="ac-landing">
      <nav className="ac-nav" aria-label="Storefront navigation">
        <button className="ac-wordmark" onClick={() => onNavigate('/')} aria-label="ABANGCOLEK home">
          <BrandLogo />
        </button>
        <div className="ac-nav-links">
          <a
            href="/products"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('/products');
            }}
          >
            Semua Produk
          </a>
          <a
            href="/become-dealer"
            onClick={(event) => {
              event.preventDefault();
              onNavigate(store ? `/become-dealer?ref=${encodeURIComponent(store.slug)}` : '/become-dealer');
            }}
          >
            Jadi Ejen & Stokis
          </a>
        </div>
        {onToggleTheme && (
          <button className="ac-theme-toggle" onClick={onToggleTheme} aria-label="Tukar tema">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
        <button className="ac-button ac-button-dark" onClick={() => onNavigate('/login')}>
          Masuk <ArrowUpRight size={17} />
        </button>
      </nav>

      <main className="ac-main" id="platform-main">
        {storefront.loading && (
          <section className="ac-public-section" role="status" aria-busy="true">
            <p className="ac-eyebrow">Kedai Rasmi Ejen</p>
            <h1>Memuatkan kedai ejen…</h1>
          </section>
        )}

        {!storefront.loading && (storefront.error || !store || store.status !== 'active') && (
          <section className="ac-public-section" role="alert">
            <p className="ac-eyebrow">STORE_NOT_FOUND · 404</p>
            <h1>Kedai ejen tidak dijumpai</h1>
            <p>
              Pautan <code>/kedai/{normalizedSlug}</code> tidak wujud atau belum diaktifkan. Semak semula pautan
              kedai daripada ejen rasmi ABANGCOLEK anda.
            </p>
            <div className="ac-hero-actions">
              <button className="ac-button ac-button-dark" onClick={() => onNavigate('/')}>
                <ArrowLeft size={17} /> Kembali ke halaman utama
              </button>
              <button className="ac-button ac-button-outline" onClick={() => onNavigate('/products')}>
                Lihat katalog utama
              </button>
            </div>
          </section>
        )}

        {store && store.status === 'active' && (
          <>
            <section className="ac-catalogue" aria-labelledby="dealer-store-heading">
              <div className="ac-section-heading">
                <div>
                  <p className="ac-eyebrow">
                    <Store size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                    Kedai Rasmi Ejen / Stokis · /kedai/{store.slug}
                  </p>
                  <h1 id="dealer-store-heading">{store.displayName}</h1>
                  <p>
                    Kod rujukan komisen automatik: <strong>{store.slug}</strong> · Store ID:{' '}
                    <code>{store.storeId}</code>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" className="ac-button ac-button-outline" onClick={copyStoreUrl}>
                    <Copy size={16} /> {copied ? 'Pautan disalin' : `Salin /kedai/${store.slug}`}
                  </button>
                  <a
                    href={formatWhatsAppUrl(
                      info.data?.contact,
                      `Salam ${store.displayName} (${store.slug}), saya sedang melayari kedai rasmi anda di /kedai/${store.slug}.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ac-button ac-button-outline"
                  >
                    WhatsApp Ejen
                  </a>
                  <button
                    type="button"
                    className="ac-button ac-button-dark"
                    onClick={() => onNavigate(`/flows/dealer-application?ref=${encodeURIComponent(store.slug)}`)}
                  >
                    <Users size={16} /> Daftar Ejen Bersama Kami
                  </button>
                </div>
              </div>

              {submittedOrder && (
                <div className="ac-notice" role="status" style={{ marginBottom: '20px' }}>
                  <h2>
                    <CheckCircle2 size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Pesanan diterima & dikreditkan kepada {store.displayName}
                  </h2>
                  <p>
                    ID Pesanan: <strong>{submittedOrder.id}</strong> · Rujukan Ejen:{' '}
                    <strong>{submittedOrder.referralCode ?? store.slug}</strong> · Jumlah:{' '}
                    <strong>{money(submittedOrder.amountSen)}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="ac-button ac-button-dark"
                      onClick={() => onNavigate('/customer/orders')}
                    >
                      Lihat Pesanan Saya <ArrowRight size={16} />
                    </button>
                    <a
                      href={formatWhatsAppUrl(
                        info.data?.contact,
                        `Salam ${store.displayName}, saya telah membuat pesanan #${submittedOrder.id} (${money(submittedOrder.amountSen)}) di /kedai/${store.slug}.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ac-button ac-button-outline"
                    >
                      Maklumkan di WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {!catalogue.length ? (
                <div className="ac-catalogue-empty">
                  <Package size={36} />
                  <h3>Tiada produk diterbitkan buat masa ini.</h3>
                  <p>Katalog produk akan dipaparkan sebaik sahaja disahkan oleh HQ ABANGCOLEK.</p>
                </div>
              ) : (
                <div className="ac-product-grid">
                  {catalogue.map((product, index) => {
                    const quantity = cart.find((line) => line.productId === product.id)?.quantity ?? 0;
                    const atLimit = cart.length >= MAX_CUSTOMER_CART_LINES && !quantity;
                    return (
                      <article className="ac-product" key={product.id}>
                        <div className={`ac-product-visual ac-product-color-${index % 3}`}>
                          <Package size={74} strokeWidth={1} />
                          <span>
                            ABANG
                            <br />
                            COLEK
                          </span>
                          <small>Pek {product.packSize}</small>
                        </div>
                        <div className="ac-product-content">
                          <p className="ac-eyebrow">Katalog v{product.publishedVersion}</p>
                          <h3>{product.name}</h3>
                          <p>{product.description}</p>
                          <div>
                            <strong>{money(product.priceSen)}</strong>
                            <span>
                              {product.availableQuantity > 0
                                ? `${product.availableQuantity} unit tersedia`
                                : 'Stok habis'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                            <button
                              type="button"
                              className="ac-button ac-button-dark"
                              disabled={
                                product.availableQuantity < 1 ||
                                atLimit ||
                                quantity + product.packSize > product.availableQuantity
                              }
                              onClick={() => changeQuantity(product, quantity + product.packSize)}
                            >
                              <ShoppingCart size={16} />{' '}
                              {quantity > 0 ? `Tambah lagi (${quantity} dalam troli)` : 'Tambah ke troli'}
                            </button>
                            <button
                              type="button"
                              className="ac-button ac-button-outline"
                              disabled={product.availableQuantity < 1}
                              onClick={() =>
                                onNavigate(
                                  `/flows/order?product=${encodeURIComponent(product.id)}&ref=${encodeURIComponent(store.slug)}`
                                )
                              }
                            >
                              Beli terus <ArrowUpRight size={16} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="ac-public-section" aria-label="Troli dan checkout kedai ejen">
              <p className="ac-eyebrow">
                <ShoppingBag size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Troli Kedai {store.displayName} · {itemCount} unit
              </p>
              <h2>Semak troli & buat pesanan</h2>
              <p>
                Setiap pembelian melalui halaman ini dikaitkan secara automatik dengan kedai ejen{' '}
                <strong>{store.displayName}</strong> (<code>{store.slug}</code>).
              </p>

              {cart.length === 0 ? (
                <div className="ac-notice">
                  <p>Troli anda masih kosong. Pilih produk di atas untuk memulakan pesanan.</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gap: '12px', margin: '16px 0' }}>
                    {cartRows.map(({ line, product }) => (
                      <article
                        key={line.productId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                          padding: '12px 16px',
                          border: '1px solid rgba(128,128,128,0.25)',
                          borderRadius: '12px',
                        }}
                      >
                        <div>
                          <strong>{product?.name ?? line.productId}</strong>
                          <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>
                            {product ? `${money(product.priceSen)} seunit · Pek ${product.packSize}` : line.productId}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {product && (
                            <>
                              <button
                                type="button"
                                className="ac-button ac-button-outline"
                                aria-label={`Kurangkan ${product.name}`}
                                onClick={() =>
                                  changeQuantity(product, decrementCustomerCartQuantity(line.quantity, product))
                                }
                              >
                                <Minus size={15} />
                              </button>
                              <strong>{line.quantity}</strong>
                              <button
                                type="button"
                                className="ac-button ac-button-outline"
                                aria-label={`Tambah ${product.name}`}
                                disabled={line.quantity + product.packSize > product.availableQuantity}
                                onClick={() => changeQuantity(product, line.quantity + product.packSize)}
                              >
                                <Plus size={15} />
                              </button>
                              <strong>{money(product.priceSen * line.quantity)}</strong>
                            </>
                          )}
                          <button
                            type="button"
                            className="ac-button ac-button-outline"
                            onClick={() =>
                              setCart((current) => current.filter((item) => item.productId !== line.productId))
                            }
                          >
                            Buang
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  {cartNotice && (
                    <p className="ac-notice" role="alert">
                      {cartNotice}
                    </p>
                  )}

                  <div style={{ margin: '16px 0' }}>
                    <h3>Jumlah Produk: {money(cartTotal)}</h3>
                    <p>
                      Ejen Perujuk: <strong>{store.displayName}</strong> (<code>{store.slug}</code>)
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <button
                      type="button"
                      className="ac-button ac-button-dark"
                      disabled={!cartReady}
                      onClick={startGuidedCheckout}
                    >
                      Checkout Berpandu <ArrowRight size={17} />
                    </button>
                    <a
                      href={formatWhatsAppUrl(info.data?.contact, whatsAppOrderMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ac-button ac-button-outline"
                    >
                      Pesan via WhatsApp Ejen
                    </a>
                  </div>

                  <form
                    onSubmit={submitDirectOrder}
                    style={{
                      padding: '16px',
                      border: '1px solid rgba(128,128,128,0.25)',
                      borderRadius: '12px',
                      display: 'grid',
                      gap: '12px',
                    }}
                  >
                    <h4>Hantar Pesanan Terus (Pelanggan Berdaftar)</h4>
                    <label style={{ display: 'grid', gap: '4px' }}>
                      <span>Cara penerimaan</span>
                      <select
                        value={fulfilment}
                        onChange={(event) => setFulfilment(event.target.value as 'pickup' | 'delivery')}
                      >
                        <option value="pickup">Pickup di lokasi disahkan</option>
                        <option value="delivery">Penghantaran (Delivery)</option>
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: '4px' }}>
                      <span>Maklumat penerimaan (Nama, No. Telefon & Alamat)</span>
                      <input
                        type="text"
                        required
                        maxLength={500}
                        placeholder="Contoh: Ahmad, 012-3456789, Shah Alam"
                        value={contactRef}
                        onChange={(event) => setContactRef(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="ac-button ac-button-dark"
                      disabled={!cartReady || !contactRef.trim() || submitting}
                    >
                      {submitting ? 'Menghantar pesanan…' : `Sahkan Pesanan (${money(cartTotal)})`}
                    </button>
                  </form>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
