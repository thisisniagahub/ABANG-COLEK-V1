
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../docs/CURRENT-STATUS.md) · [Checklist](../PROJECT-CHECKLIST.md). Rekod historical/research/proposal; dapatan, copy, angka, approvals dan kebolehsediaan dalam badan asal bukan pengesahan status semasa. Keputusan blueprint v2.4 dan receipt semasa mengatasi cadangan lama; tiada kelulusan founder atau penghantaran proposal dianggap berlaku.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** REKOD SEJARAH / RUJUKAN — pemerhatian, metrik ujian, status deployment, harga/model dan cadangan di bawah terikat kepada tarikh serta skop asal. Ia bukan checklist execution semasa atau pengesahan bahawa dapatan masih benar. Kekalkan bukti asal; revalidate sebelum mendakwa fixed, connected atau production-ready.
>
> Rujukan semasa: [Master Growth Blueprint](../docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../docs/prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Research & Cadangan Seni Bina E-Commerce ABANGCOLEK

## Keputusan utama

Cadangan paling selamat ialah menjadikan **ABANGCOLEK sebagai lapisan pusat katalog, SKU, harga, inventori, identiti agent, attribution, komisen dan penyelarasan**, manakala setiap platform menjadi **channel jualan dengan checkout serta rekod operasi sendiri**.

- **Shopify**: storefront, catalog, cart, checkout, pembayaran dan order ABANGCOLEK sendiri.
- **GrabFood, foodpanda, ShopeeFood dan TikTok Shop**: marketplace luaran yang mengurus checkout, payment, fulfilment, refund dan settlement masing-masing.
- **Agent/reseller**: satu online store utama dengan akaun/price list/referral attribution untuk setiap agent. Store berasingan hanya apabila ada sebab operasi yang kuat.

Jangan bina sistem dengan andaian semua platform menyokong embedded checkout, cart carry-over atau automatic synchronization. Beberapa channel memang mempunyai API merchant/POS, tetapi aksesnya bergantung pada kelulusan partner dan konfigurasi akaun.

## Seni bina yang disyorkan

```text
Pelanggan / Agent / Reseller
             |
             v
ABANGCOLEK Commerce Core
- Product/SKU master
- Harga & price list
- Inventory reservation
- Order ledger
- Agent & commission ledger
- Channel mapping
- Webhook/reconciliation
             |
       +-----+-----+-----+-----+
       v           v           v
   Shopify      GrabFood    foodpanda
       |           |           |
    checkout    marketplace  marketplace
             |
       +-----+-----+
       v           v
  TikTok Shop  ShopeeFood
```

### Komponen pusat ABANGCOLEK

1. **Product/SKU master** — ID dalaman, SKU, variant, nama, gambar, unit, harga asas dan status aktif.
2. **Channel mapping** — padanan SKU ABANGCOLEK dengan Shopify variant ID, Grab item/modifier ID, foodpanda item ID dan TikTok product/SKU ID.
3. **Pricing service** — harga asas, price list agent, harga channel dan promosi. Harga marketplace yang sudah dipublish perlu disimpan sebagai harga channel yang diperhatikan, bukan dianggap sama dengan harga pusat.
4. **Inventory ledger** — stok fizikal, available-to-sell, reservation, safety stock dan allocation setiap channel.
5. **Normalized order ledger** — `external_order_id`, channel, status history, payment state, fulfilment state, refund dan settlement evidence.
6. **Agent/reseller ledger** — status kelulusan, price list, referral code, komisen, tempoh hold selepas refund dan status payout.
7. **Integration control plane** — OAuth/token vault, webhook, idempotency, retry, rate-limit handling, audit log dan scheduled reconciliation.

## Peranan setiap platform

### Shopify

Shopify Storefront API menyokong katalog, collection, carian, cart read/write, discount dan `checkoutUrl` yang membawa pelanggan ke Shopify web checkout. Order biasa wujud selepas pelanggan melengkapkan checkout. Admin GraphQL, fulfillment-order API dan webhooks boleh digunakan untuk penyelarasan katalog, inventori, order dan fulfilment.

Shopify sesuai dijadikan **first-party commerce layer** ABANGCOLEK. Shopify patut menjadi autoriti untuk order ID, checkout/payment result dan Shopify fulfilment lifecycle. ABANGCOLEK pula kekal autoriti untuk SKU, price policy, inventory reservation, agent attribution dan cross-channel reporting.

Malaysia tidak tersenarai dalam senarai negara Shopify Payments yang disemak. Oleh itu, Shopify perlu direka dengan **third-party payment provider** yang tersedia untuk akaun Malaysia. Provider sebenar, fee, settlement, refund dan chargeback perlu disahkan dalam Shopify Admin sebelum pembangunan checkout.

Rujukan: [Shopify Storefront API](https://shopify.dev/docs/api/storefront/latest), [Cart API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage), [FulfillmentOrder](https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentOrder), [Shopify Payments supported countries](https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries).

### GrabFood

GrabFood mempunyai Food POS API untuk merchant/POS. API ini boleh menghantar order ke POS, menerima order-state webhook, menyokong penyelarasan menu/availability dan beberapa model fulfilment seperti delivery oleh Grab, pickup serta delivery oleh restoran/partner bergantung pada outlet.

Namun, aksesnya bukan anonymous self-service API. Partner perlu melalui onboarding, approval, staging, testing, security review dan rollout. Dokumentasi yang disemak tidak membuktikan bahawa ABANGCOLEK boleh mencipta consumer order, menjadi host checkout Grab atau membawa cart pelanggan ke Grab secara arbitrary.

**MVP:** gunakan official Grab Order Now/app-web handoff sebagai CTA yang boleh diganti. **Fasa seterusnya:** mohon Food POS API dan bina adapter selepas Grab mengesahkan outlet, order types, menu scope, webhook dan fulfilment model.

Rujukan: [GrabFood API](https://developer.grab.com/docs/grabfood/api/v1-1-3), [Grab Food POS model](https://developer.grab.com/products/food-pos-model), [Grab Malaysia merchant](https://www.grab.com/my/merchant/food/).

### foodpanda

foodpanda Malaysia menyediakan Partner API untuk order webhook/retrieval, katalog, outlet status dan operasi fulfilment tertentu. Catalog update adalah asynchronous dan boleh mengambil masa sehingga sekitar 15 minit. Akses bergantung kepada Partner Portal, Account Manager dan jenis integrasi yang diaktifkan.

foodpanda kekal autoriti untuk checkout, payment/refund, voucher, rider status, customer support dan marketplace order state. ABANGCOLEK menyimpan canonical product, mapping, inventory allocation, normalized order dan settlement evidence.

**MVP:** CTA yang jelas seperti “Lengkapkan pesanan di foodpanda” menggunakan merchant URL yang disahkan. Jangan anggap ada customer checkout API, stable deep link, cart carry-over atau payment-token handoff.

Rujukan: [foodpanda Partner MY](https://partner.foodpanda.my/en), [Partner API overview](https://developer.foodpanda.com/en/documentation/api-partner-api-overview), [Catalog API](https://developer.foodpanda.com/en/documentation/catalog-api-use-cases).

### ShopeeFood

ShopeeFood Malaysia menggunakan Shopee App dan Shopee Partner App/Web Portal untuk menu, harga, out-of-stock, jam operasi, order, promosi dan dashboard transaksi.

Dalam dokumentasi rasmi yang disemak, tiada public ShopeeFood-specific merchant API, webhook, catalog sync contract, order-status API, payment API atau restaurant deep-link specification ditemui. Shopee Open Platform API pula bukan bukti bahawa ShopeeFood mempunyai API restoran yang sama.

**MVP:** gunakan CTA “Buka ShopeeFood dalam Shopee” atau laman rasmi. Operasi melalui Partner App/Web Portal dan report/export yang disediakan. Jangan scrape, reverse-engineer atau cuba mengubah order secara programatik tanpa partner contract bertulis.

Rujukan: [ShopeeFood Malaysia](https://www.shopeefood.com.my/), [ShopeeFood merchant materials](https://www.shopeefood.com.my/merchants/about-merchants), [ShopeeFood customer ordering](https://help.shopee.com.my/4/article/78697-%5BShopeeFood%5D-How-do-I-place-an-order-on-ShopeeFood), [Shopee merchant terms](https://help.shopee.com.my/4/article/77237-ShopeeFood-Merchant-General-Terms-and-Conditions).

### TikTok Shop

TikTok Shop Malaysia menyediakan seller-authorized API untuk product, order, fulfilment, return/refund, logistics, finance, promotion, authorization dan events/webhooks. Produk, harga dan inventory boleh diselaraskan daripada sistem luar selepas seller memberi authorization.

TikTok Shop kekal autoriti untuk checkout/payment, marketplace listing review, TikTok order state, shipping, return/refund dan settlement. ABANGCOLEK kekal autoriti untuk canonical SKU, inventory policy, pricing governance dan consolidated analytics.

Affiliate link sesuai untuk acquisition dan attribution, tetapi bukan generic cart/checkout handoff ke website ABANGCOLEK. API memerlukan app registration, seller authorization dan scope yang betul.

Rujukan: [TikTok Shop API concepts](https://partner.tiktokshop.com/docv2/page/tts-api-concepts-overview), [Products API](https://partner.tiktokshop.com/docv2/page/products-api-overview), [TikTok Shop authorization/events](https://partner.tiktokshop.com/docv2/page/650b1b4bbace3e02b76d1011).

## Model online store Agent/Reseller

### Model yang dicadangkan: satu store utama

Mulakan dengan satu Shopify store dan bina konsep agent/reseller di dalam ABANGCOLEK Commerce Core. Setiap agent mempunyai:

- `agent_id` dan status approval;
- assigned price list/catalog;
- territory dan channel rights;
- referral code atau referral link;
- komisen dan rule payout;
- status `pending`, `payable` atau `reversed` selepas cancellation/refund;
- rekod pelanggan dan consent tertakluk kepada polisi data.

Shopify menyokong B2B/company accounts, catalog/price yang disesuaikan, payment/shipping terms dan self-serve ordering bergantung pada plan. Ia tidak semestinya menyediakan native reseller commission ledger, jadi komisen patut disimpan di ABANGCOLEK.

Flow attribution:

1. Agent log masuk atau menjana referral link.
2. ABANGCOLEK mencipta attribution session secara server-side.
3. Pelanggan masuk ke Shopify dan membuat cart/checkout.
4. Shopify order webhook dipadankan dengan attribution session.
5. Komisen menjadi `pending` selepas order berjaya.
6. Selepas fulfilment dan tempoh return/refund disahkan, komisen menjadi `payable` atau `reversed`.

Shopify cart permalink boleh membawa parameter yang didokumenkan seperti variant, quantity, discount, note/attribute dan referral data. Jangan masukkan full cart ID secret dalam public URL.

### Bila perlu store berasingan

Bina online store berasingan hanya jika reseller memerlukan brand, legal entity, locale, assortment, price governance atau pasukan operasi yang berbeza. Shopify Plus expansion stores tidak berkongsi atau auto-sync produk, collection, setting dan inventory. Penyelarasan perlu dibuat melalui ABANGCOLEK/ERP/connector.

Jangan cipta satu Shopify store untuk setiap reseller sebagai default. Model itu akan meningkatkan kos, credential, webhook, catalog sync, inventory conflict dan maintenance.

## Roadmap

### Fasa 0 — readiness

- Tentukan merchant of record, outlet dan jenis SKU/menu.
- Buka/semak semua akaun platform.
- Sahkan Shopify payment provider Malaysia.
- Tetapkan canonical SKU, modifier, bundle, unit dan outlet mapping.
- Dapatkan pengesahan API access, webhook, order type dan test credential.

### Fasa 1 — MVP

- Satu Shopify store dengan catalog, cart, checkout dan payment provider.
- Product/SKU master dan mapping asas.
- Inventory projection dan order webhook untuk Shopify.
- Agent account, referral attribution dan commission ledger asas.
- CTA rasmi ke GrabFood, foodpanda, ShopeeFood dan TikTok Shop.
- ShopeeFood kekal manual melalui Partner App/Web Portal.

### Fasa 2 — Integrasi rasmi

- Grab Food POS API selepas approval.
- foodpanda Partner API/Catalog/Outlet/Picking selepas enabled.
- TikTok Shop OAuth, Product/Order/Fulfilment/Return/Finance API.
- Queue, retry, idempotency, rate-limit backoff dan reconciliation.
- Settlement matching dan exception dashboard.

### Fasa 3 — Scale

- Shopify Plus expansion store jika benar-benar diperlukan.
- Multi-outlet/warehouse routing.
- WMS/ERP integration.
- Automated commission payout.
- Advanced analytics, forecast dan safety-stock optimization.

## Risiko utama

- **Overselling:** satu pihak mesti memiliki inventory reservation; gunakan safety stock untuk channel manual/asynchronous.
- **Webhook duplicate/lambat:** gunakan idempotency key, raw event log, retry queue, dead-letter queue dan reconciliation.
- **API belum diluluskan:** MVP perlu berfungsi menggunakan link-out dan portal, bukan dependency API yang belum pasti.
- **Harga berbeza:** simpan desired price dan observed channel price secara berasingan kerana voucher, fee dan promo platform.
- **Fulfilment berbeza:** modelkan state machine per channel; jangan samakan semua status kepada `completed` secara automatik.
- **Komisen dispute:** commission ledger mesti menyokong pending, payable, reversed dan manual adjustment.
- **Payment Malaysia:** uji provider sebenar dan settlement sebelum launch.

## Keputusan yang perlu dibuat sebelum pembangunan

1. Shopify akan menjual semua SKU atau hanya produk/package tertentu?
2. Berapa outlet dan adakah stok dikongsi?
3. Siapa merchant of record untuk Shopify dan setiap marketplace?
4. Apakah payment provider Shopify Malaysia yang akan digunakan?
5. Adakah MVP menggunakan Shopify + link-out dahulu?
6. Apakah formula komisen dan tempoh hold untuk agent/reseller?
7. Apakah syarat untuk seorang reseller mendapat store berasingan?
8. Siapa mengurus out-of-stock, cancellation, refund dan customer support setiap channel?
9. Apakah API credentials dan approval yang sudah tersedia?

## Kesimpulan

Bina ABANGCOLEK sebagai **commerce orchestration dan data layer**, Shopify sebagai **storefront/checkout utama**, dan marketplace sebagai **channel luaran dengan sempadan checkout yang jelas**. Mulakan dengan satu store dan sistem agent/reseller berpusat. Tambah API marketplace hanya selepas merchant account, permission, webhook dan fulfilment contract disahkan secara rasmi.
