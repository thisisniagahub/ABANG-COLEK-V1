# Workspaces — Spesifikasi Reka Bentuk Operasi (v0)

> **Mandat pengguna, 21 Oktober 2026:** setiap Agent/Stokis aktif wajib mendapat **Dealer Workspace private dan Online Store public sendiri yang ABANGCOLEK sediakan**. Empat workspace/role yang diperhatikan dalam source di bawah ialah baseline implementasi, bukan had sasaran produk. Perincian wajib mengikut [blueprint §8.1](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md#81-mandat-online-store-setiap-agentstokis--21-oktober-2026) dan [workflow Agent/Stokis](user-workflows.md#5-agentstokis--workspace-sendiri-dan-online-store-sendiri). Pendaftaran rakan niaga tidak memerlukan pembelian terdahulu. Ini requirement belum dibuktikan siap; banner referral sedia ada tidak menggantikan provisioning kedai individu, public checkout dan workspace berscope.

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Autoriti dokumen**: Spesifikasi reka bentuk sasaran (TARGET_DESIGN) untuk empat workspace berperanan ABANGCOLEK. Dokumen ini **bukan laporan status implementasi** dan tidak boleh dibaca sebagai bukti bahawa sesuatu ciri sudah siap. Setiap dakwaan dilabel dengan label bukti:
>
> - **OBSERVED_SOURCE** — diperhatikan terus daripada kod sumber semasa (baca read-only).
> - **TARGET_DESIGN** — keputusan reka bentuk sasaran yang perlu dipatuhi oleh implementasi hadapan.
> - **HISTORICAL** — rekod sejarah sahaja; bukan status semasa yang disahkan.
> - **NOT_IMPLEMENTED** — jurang yang diketahui wujud dalam sumber semasa; belum dibina.

Rujukan induk:

- [DESIGN.md](../../DESIGN.md) — panduan reka bentuk bersama (root).
- [../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) — blueprint pertumbuhan.
- [../ABANGCOLEK-SOURCE-OF-TRUTH.md](../ABANGCOLEK-SOURCE-OF-TRUTH.md) — sumber kebenaran data/bisnes.
- [../design-qa.md](../design-qa.md) — acceptance QA, bukti wajib (commit/viewport/trace/limitations).

Dokumen adik-beradik: `docs/design/landing-page.md` (landing public), `docs/design/brand-spec.md` (aset & identiti).

---

## 1. Tujuan, Skop, Autoriti

**Tujuan (TARGET_DESIGN)**: Mentakrifkan pengalaman operasi harian workspace ABANGCOLEK — empat auth roles source (Founder, Staff, Developer, Customer) dan dedicated Dealer Workspace melalui membership/grants canonical, menjalankan tugas nyata atas rekod sebenar (orders, cases, tasks, inventory, approvals).

**Skop**:

- Navigasi workspace, route inventory, matriks peranan×tugas, komponen state (list/form/detail/approval), copilot & Pet, responsive + accessibility, dan checklist penerimaan.
- **Termasuk**: semua laluan `/{role}/{section}` dan aliran persetujuan (approvals) yang dipisahkan daripada execution.
- **Tidak termasuk**: landing public (lihat `landing-page.md`), aset jenama (lihat `brand-spec.md`), dan sebarang implementasi kod (dokumen ini hanya spesifikasi).

**Autoriti**: DESIGN.md (bersama), blueprint pertumbuhan (arah bisnes), SoT (data bisnes), design-qa.md (penerimaan). Jika berlanggar, SoT mengatasi dakwaan data; design-qa.md mengatasi definisi "siap". Semua dakwaan bisnes tanpa bukti adalah **BUSINESS_UNVERIFIED** dan dilarang masuk UI.

---

## 2. Pembezaan Peranan (OBSERVED_SOURCE)

Sumber: `shared/platform-contracts.ts` (`WorkspaceRole`), `src/features/platform/routes.ts` (`menus`, `sectionCapabilities`).

| Peranan | Definisi operasi (OBSERVED_SOURCE) | Skop data asas |
|---|---|---|
| **Customer** | Pembeli / ejen-pelanggan; beli produk, jejak pesanan, buat aduan, mohon jadi ejen/stokis | `own.read` |
| **Staff** | Operasi yang diberi tugas; pesanan assigned, QC, shift, dokumen, panduan kerja | `assigned.read` |
| **Founder** | Pemilik bisnes; kelulusan, stok, kewangan, marketing, automations, pasukan & akses | `business.read` / `business.write` / `people.grant` |
| **Developer** | Runtime & integrasi; health, automation jobs, JEV evaluation, diagnostics | `runtime.read` |

### 2.1 Baseline role dan pengalaman dealer wajib

- **OBSERVED_SOURCE**: `WorkspaceRole` hanya `customer | staff | founder | developer`. Token `'dealer'` sebagai `CanonicalRole` wujud **hanya di lapisan server** (`server/platform/domainTools.ts` L30) untuk domain tools/API — **bukan** route URL dan **bukan** peranan UI.
- **Pengalaman B2B masuk MELALUI membership**, bukan role URL:
  - `Membership.dealerOrgId` (opsyen pada membership customer) menandakan pelanggan tergolong dalam organisasi ejen.
  - `DealerApplication` (`pending | approved | rejected`) ialah laluan permohonan; kelulusan founder menambah `dealerOrgId` pada membership.
  - Route `/customer/business` (sisi customer) dan `/founder/dealers` (sisi founder) **kedua-duanya** merender pengalaman Dealers — dari sudut masing-masing.
- **TARGET_DESIGN**: Reuse customer/business membership dan grant organisasi tanpa mengada auth role kelima. Setiap Agent/Stokis aktif tetap wajib mendapat dedicated Dealer Workspace dengan identiti/navigasi dealer serta public Online Store sendiri. Empat roles source bukan had pengalaman produk; nama route bukan authority tambahan. Direct signup atau jemputan founder tidak memerlukan pembelian dahulu.

#### Dua surface dealer — TARGET_DESIGN

Ikut [Commerce & Growth](commerce-growth.md): public store sasaran `/kedai/:slug` menyokong anonymous published browse, cart dan checkout canonical; private workspace mengurus kedai sendiri, link/QR, order berizin, stok/restock mengikut mod, statements/settlement dan bantuan. Pending/rejected tidak menerbitkan store aktif; suspend/revoke menghalang jualan baharu serta akses private yang tidak sah tanpa memadam receipt lama. Dealer A tidak boleh membaca atau mengubah private data B, sementara published store B kekal public.

Store owner/dealer, customer referrer dan fulfiller diselesaikan server secara berasingan. Katalog/stock/checkout/tracking/reorder mengikut sumber fulfilment sebenar; reorder membina unsent cart baharu untuk reprice/revalidation. Wholesale margin, komisen dealer, referral pelanggan satu peringkat dua hala dan points dipaparkan berasingan mengikut polisi approved. Share sahaja bukan earning. MadConomy lima tingkat tidak diadopt; top-up/cash withdrawal/native wajib deferred. Ordering P0 → rewards P1 → retention P2 berada dalam domain phase sedia ada, selepas prerequisite integriti/runtime; tiada tick daripada spesifikasi ini.

### 2.2 Capability model (OBSERVED_SOURCE)

- `SessionData.capabilities: string[]` — kuasa resolvi oleh **server** untuk setiap permintaan ("Authority is resolved by the server for every request").
- `canAccessSection(role, section, capabilities)` menerima jika capabilities mengandungi capability seksyen **atau** `workspace.{role}` (super-scope per role).
- `Membership.status: 'active' | 'revoked'`, `version` naik setiap perubahan (`membershipVersion` pada `Actor`).

---

## 3. Route Inventory (OBSERVED_SOURCE)

Sumber: `src/features/platform/routes.ts`.

### 3.1 Laluan public

`publicPaths`: `/`, `/products`, `/locations`, `/become-dealer`, `/help`, `/login`, `/setup`; tambahan corak `/products/:id` (public) dan `/flows/:slug` (guided flow).

**TARGET_DESIGN berasingan:** `/kedai/:slug` ialah public store dealer dalam [kontrak commerce](commerce-growth.md), belum dibuktikan oleh inventory source di atas. Login/checkout mengikut sesi canonical; private dealer workspace kekal membership/org-scoped.

### 3.2 Workspace `/{role}/{section}` (≤3 segmen; segmen ke-3 = entity id, hanya untuk entity sections)

| Role | Sections | Capability per section |
|---|---|---|
| **customer** | overview, shop, orders, cases, business | semua `own.read` |
| **staff** | overview, tasks, orders, cases, qc, shifts, documents, knowledge | semua `assigned.read` |
| **developer** | overview, health, jobs, jev, reports, settings | semua `runtime.read` |
| **founder** (21 sections) | overview, orders, inventory, cases, jev, dealers, copilot (`business.read`), marketing (`business.read`), automations (`business.write`), plugins (`business.write`), tasks, documents, knowledge, calendar, finance, qc, shifts, reports, people (`people.grant`), settings (`business.write`), legacy (`business.read`) | lihat kurungan |

Nota pembetulan bukti: `marketing` founder ialah `business.read` di `routes.ts` (bukan `business.write`); `business.write` hanya pada **automations, plugins, settings**.

### 3.3 Gate & denial

- `canAccessSection()` ialah gate route-level: seksyen tanpa kemasukan capability ditolak.
- Denial UI (OBSERVED_SOURCE): mesej **"Akses bahagian ini tidak dibenarkan"** pada tahap route.
- Route tidak sah → `not_found`. Segmen ke-3 dibenarkan hanya untuk `entitySections` = orders, cases, tasks, documents, business, marketing, dealers, inventory, qc, shifts, finance.

---

## 4. Matriks Peranan × Tugas (TARGET_DESIGN)

Jadual ini mentakrifkan **tugas utama yang mesti disokong oleh UI** per peranan, dengan capability penjaga. Ia bukan audit siap.

| Role | Tugas utama | Contoh seksyen | Capability |
|---|---|---|---|
| Customer | Beli produk, jejak pesanan sendiri, buka/jejak kes, mohon ejen/stokis | shop, orders, cases, business | `own.read` |
| Staff | Buat tugasan assigned, kendalikan pesanan assigned, QC bacaan, shift & handoff, rujuk SOP | tasks, orders, qc, shifts, knowledge | `assigned.read` |
| Founder | Lulus/menolak (dealers, expenses, day-close, campaigns, reconciliation), pantau stok & kewangan, kendali marketing/automations, urus pasukan & akses, tetapan bisnes | dealers, finance, inventory, marketing, automations, people, settings | `business.read` / `business.write` / `people.grant` |
| Developer | Pantau runtime & integrasi, automation jobs, JEV evaluation, diagnostics, readiness | health, jobs, jev, reports, settings | `runtime.read` |

Prinsip (TARGET_DESIGN): setiap tugas mesti berakhir pada **rekod sebenar** (lihat §6) — tiada tugas yang berhenti pada paparan tanpa tindakan boleh disimpan.

---

## 5. Navigasi Berdasarkan Tugas & Capability (TARGET_DESIGN, dengan asas OBSERVED_SOURCE)

### 5.1 Capability-gated navigation

- **OBSERVED_SOURCE**: `NavigationItem` mempunyai `requiredCapability`; `getNavigation()` menghasilkan item per role; sidebar dikumpulkan (`navigationGroups`: Hari ini / Jualan & rangkaian / Operasi & kewangan / dll.).
- **TARGET_DESIGN**:
  - Item nav yang capability-nya tiada pada sessi **mesti disembunyikan atau dilumpuhkan dengan sebab** — jangan papar item yang semestinya ditolak.
  - Nav mengikut tugas: kumpulan mencerminkan aliran kerja (hari ini → operasi → pertumbuhan → ilmu → pentadbiran), bukan susunan teknikal API.

### 5.2 Aksesibiliti navigasi (TARGET_DESIGN, dibina atas asas OBSERVED_SOURCE)

- **Mobile sidebar**: `role="dialog"` + focus-trap + `inert` pada kandungan belakang (asas sudah ada dalam `WorkspaceNavigation.tsx`; wajib dikekalkan).
- **Focus return**: selepas sidebar mobile ditutup, fokus kembali ke pemanggil (hamburger).
- **Breadcrumb**: top bar memaparkan **Role › Section** (OBSERVED_SOURCE: AppRouter) — kekal sebagai identiti lokasi primer, bukan nesting artifisial.
- **Role switcher**: `<select>` di top bar menuju `/{role}/overview`; **hanya memaparkan roles dengan membership `active`** (`canOpenWorkspace`). Tiada pilihan untuk role tanpa membership.
- **Offline banner** (OBSERVED_SOURCE): dipaparkan apabila sambungan hilang; tidak menghalang bacaan cache, tetapi menanda status sambungan.
- **Sidebar footer**: theme toggle + logout (OBSERVED_SOURCE; wajib kekal).
- **Keyboard**: semua item nav boleh dicapai dengan Tab; `aria-current="page"` pada item aktif (OBSERVED_SOURCE).

---

## 6. Overview / Dashboard (TARGET_DESIGN)

Overview setiap peranan mesti **bermula dengan tindakan tertunda (pending work) dan rekod sebenar**:

1. **Tindakan tertunda dahulu** — senarai pendek tugas yang menunggu pengguna itu: pending approvals (founder), restock yang diminta (ejen/founder), cases terbuka (staff/founder), tugasan hari ini (staff).
2. **Rekod sebenar** — angka ditarik daripada entiti (contoh kontrak: `PlatformOverview` — orders, verifiedPaymentSen, fulfilledOrders, openCases, openTasks, pendingDealerApplications, stockAvailable, `generatedAt`, `source: 'local_authoritative'`).
3. **Setiap widget taut ke senarai sebenar** — klik angka "cases terbuka" mesti membawa ke senarai kes sebenar, bukan paparan ringkasan statik.

**Dilarang (TARGET_DESIGN)**:

- **Vanity metrics** — angka yang tidak boleh ditindaklanjuti atau tidak berpunca dari rekod (contoh: "views", "impressions" tanpa sumber). Reach ≠ conversion; pembelian diukur dari receipt sebenar (HISTORICAL evidence).
- Dashboard yang hanya memaparkan sambutan tanpa data (empty state mesti jujur — `PlatformOverview.empty`).

---

## 7. Jadual & Senarai (OBSERVED_SOURCE → TARGET_DESIGN)

### 7.1 Keadaan semasa (OBSERVED_SOURCE)

- Source **tiada `<table>`** — semua senarai adalah card/row dengan kelas: `.xp-record-list`, `.xp-stock-card`, `.xp-task`, `.xp-dealer-card`, `.xp-qc`, `.xp-shift`, `.xp-expense`, `.xp-job`, `.xp-list-row`, dan `.xp-detail-grid` untuk butiran.
- Filter: `.xp-tablist` (tab) dan `.xp-month-filter`. Butiran rekod: `<details>` expansion + `LinkedRecordContext`.

### 7.2 Reka bentuk sasaran (TARGET_DESIGN)

- **Carian**: `SearchBox` pada setiap senarai yang boleh panjang (orders, cases, inventory, dealers).
- **Filter**: tab `.xp-tablist` mengikut status semula jadi entiti (contoh: requested / approved / dispatched / received untuk restock).
- **Sort**: wajib apabila senarai panjang — secara lalai terbaru-dahulu (`createdAt`/`updatedAt`); sort pilihan pengguna dikekalkan semasa pindah tab.
- **Pagination**: gunakan `useResource` — `hasMore` + `loadMore` (dan `loadingMore` state) apabila perlu; jangan muat semua rekod serentak.
- **Responsive table↔card**: jika sesuatu paparan memerlukan kepadatan tabular (laporan kewangan, QC readings), tetapkan tingkah laku: desktop = table kepadatan penuh; mobile = card/row menegak dengan pasangan label–nilai; keputusan ini mesti **ditulis dan diuji** per seksyen, bukan dibiarkan reflow rawak.
- **Penjajaran angka (TARGET_DESIGN, dirujuk dari DESIGN.md §D)**: nilai kewangan/kuantiti (harga, baki, kuantiti stok, sen) dipaparkan dengan `font-variant-numeric: tabular-nums` pada font sedia ada — tiada font/token baharu.

---

## 8. Keadaan Empty / Loading / Error / Denied / Stale (OBSERVED_SOURCE → TARGET_DESIGN)

Asas komponen (OBSERVED_SOURCE, `ui.tsx` + `client.ts`):

- **ResourceState**: loading **"Memuatkan rekod…"**; error + butang **"Cuba semula"** (`reload`); load-more (`hasMore`/`loadMore`).
- **Empty** component untuk kekosongan jujur.
- **Error** dipaparkan dengan `role="alert"`.
- **Denial** route-level: "Akses bahagian ini tidak dibenarkan" (§3.3).
- **PENDING_RECONCILIATION**: hasil operasi yang tidak dapat dipastikan oleh client mendarat pada guard ini — **bukan** dianggap gagal atau berjaya.
- **Offline banner** apabila sambungan putus.

**TARGET_DESIGN tambahan**:

- Setiap paparan mesti boleh menceritakan kelima-lima keadaan (loading, empty, error, denied, stale/unknown) — komponen tidak boleh direka yang hanya mempunyai laluan success.
- **Status unknown kekal unknown**: rekod/resit yang tidak disahkan oleh server kekal berlabel unknown sehingga server memberi keputusan; jangan teka, jangan auto-naiktaraf, jangan auto-turuntaraf. Paparan unknown mesti berbeza visual daripada pending (lihat §12).

---

## 9. Detail Rekod: Provenance, Timestamp, Revision (TARGET_DESIGN, asas OBSERVED_SOURCE)

- **OBSERVED_SOURCE**: `RecordMeta` memaparkan `id` dan `revision`; `<details>` expansion untuk butiran; `LinkedRecordContext` menghubungkan seksyen entity-linked (kalendar → order/case/task/campaign/restock/lot/qc/shift/expense/dayclose/business — lihat `CalendarEventRecord.entityLinks`).
- **TARGET_DESIGN**: **setiap rekod transaksi** (order, restock, expense, day-close, payment, refund) mesti memaparkan:
  1. **Provenance** — dari mana rekod datang (pengguna/sistem, flow session, agent job) dan sumbernya.
  2. **Timestamp** — `createdAt`/`updatedAt` (timezone `Asia/Kuala_Lumpur` mengikut kontrak).
  3. **Revision** — nombor revisi (`revision`) supaya konflik expected-revision (contoh `ReceiptInput.expectedRevision`) boleh dijelaskan kepada pengguna.
- Rekod agent/job mesti menunjukkan `unknownReasons` apabila hasil tidak lengkap (`AgentResult`).

---

## 10. Borang (OBSERVED_SOURCE → TARGET_DESIGN)

### 10.1 Keadaan semasa (OBSERVED_SOURCE, `ui.tsx` FormPanel)

- `FormPanel` dengan `FieldDefinition` grid (`select | textarea | number | text`), validation per field, field errors.
- Busy state **"Menyimpan…"** — proteksi duplicate-submit melalui busy state **+ header `Idempotency-Key` (SHA-256)** pada setiap POST (client `api()`).
- Error field dengan `role="alert"`.
- Success: resit sebenar **"Disimpan oleh server · {id}"** — hanya selepas server membalas.
- CSRF: header `X-CSRF-Token`; abort 15s.

### 10.2 Prinsip sasaran (TARGET_DESIGN)

- **Tiada dakwaan berjaya sebelum server receipt.** Optimistic "berjaya" adalah dilarang. Petunjuk UI (redirect, animasi) bukan resit (lihat §11).
- Kesalahan input disahkan segera di client **dan** disahkan semula oleh server; mesej client tidak boleh menggantikan keputusan server.
- Borang panjang (flow) menyimpan draf selamat (`SafeDraft` dengan `expiresAt`) — kehilangan fokus/sambungan tidak membuang data pengguna tanpa amaran.

---

## 11. Status Transaksi (OBSERVED_SOURCE → TARGET_DESIGN)

Kontrak (OBSERVED_SOURCE, `shared/platform-contracts.ts`):

- **FulfilmentStatus**: `requested → review → accepted → packing → packed → dispatched → received` (+ `cancelled`).
- **PaymentState**: `pending | verified | refund_requested | part_refunded | refunded | rejected`.
- `ExecutionReceipt.status`: `confirmed | failed | unknown` — dengan `requestId`, `evidenceIds`.
- `OrderRecord` membawa `revision`, `trackingTokenHash` (token-based public tracking, tanpa PII).

**TARGET_DESIGN**:

1. **Receipt sebenar sahaja** ialah bukti tamat: paparkan id resit server dan statusnya.
2. **Browser success redirect = petunjuk UI sahaja** — pulangan dari payment gateway/redirect **bukan** bukti pembayaran; UI mesti kekal memaparkan `paymentState` dari server sehingga `verified`.
3. **Manual payment ≠ gateway-verified label**: pembayaran manual (transfer/tunai) tidak boleh memaparkan label "verified" yang sama dengan pengesahan gateway; label mesti bezakan asal pengesahan.
4. **Status server sahaja dipaparkan** — client tidak mengira/menganggar status; setiap badge status membaca medan kontrak.

---

## 12. Approvals Berasingan daripada Execution (OBSERVED_SOURCE → TARGET_DESIGN)

Prinsip induk: **approve bukan success**. Kelulusan ialah keputusan manusia (HITL) pada satu entiti; execution ialah langkah berasingan yang perlu resit sendiri. Paparan mesti bezakan: **pending** vs **committed (receipt)** vs **rejected** vs **stale/unknown**.

### 12.1 Status enums (OBSERVED_SOURCE)

| Entiti | Status |
|---|---|
| `RestockRecord` | `requested \| approved \| dispatched \| received \| rejected` |
| `DealerApplication` | `pending \| approved \| rejected` |
| `CampaignRecord` | `draft \| approved \| planned \| exported` + `approvedBy`, `approvalExpiresAt`, `founderOverride {approved, reason, approvedBy, approvedAt}` |
| `ExpenseRecord` | `draft \| approved \| rejected` |
| `DayCloseRecord` | `draft \| review \| approved` |
| `QcRecord` | `draft \| review \| released` |
| `KnowledgeEntry` | `draft \| review \| approved \| retired` |
| `ReconciliationRecord` | `review \| approved` |

### 12.2 Aliran kelulusan (OBSERVED_SOURCE)

- Butang transition **muncul mengikut status semasa** sahaja.
- Approve = `MutationButton` `POST /dealer/applications/{id}/approve` (dua-langkah confirm).
- **Dispatch** (restock) hanya boleh dibuka melalui `FormPanel` **bila status sudah `approved`**.
- **Campaign margin hard-block**: kelulusan disekat bila margin tunai gagal — UI **"Kelulusan Disekat"**; kegagalan margin-% memerlukan **founder override + reason** (direkam dalam `founderOverride`).
- **HITL Copilot**: `HitlActionRequest` (`pending_approval | approved | rejected`; `actionType`: refund | stock_quarantine | founder_override | commission_contra). `GET /copilot/hitl` founder-only; keputusan melalui `POST /copilot/hitl/:id/decide`.
- **Server publish sentiasa gagal** `PUBLISHER_UNAVAILABLE` (409): *"Saluran penerbit belum disahkan. Eksport manual tersedia."* — sehingga saluran disahkan, jalan keluar ialah eksport manual (`ExportArtifact`).

### 12.3 Paparan keadaan (TARGET_DESIGN)

- **Pending**: jelas menunggu siapa dan sehingga bila (`approvalExpiresAt` mesti dipapar bila wujud — kelulusan luput).
- **Committed**: hanya dengan resit server (`ExecutionReceipt` / id rekod).
- **Rejected**: dengan sebab yang direkam.
- **Stale/unknown**: berbeza secara visual daripada pending; jangan kitar semula badge pending untuk unknown.
- Kelulusan **tidak boleh** menaikkan status execution; execution mesti bermula selepas kelulusan dan menghasilkan resitnya sendiri.

---

## 13. Tindakan Gagal / Unknown Tidak Dipaparkan Berjaya (OBSERVED_SOURCE → TARGET_DESIGN)

- **OBSERVED_SOURCE**: maklum balas kegagalan adalah **inline** (`xp-inline-error`); **tiada sistem dialog/toast umum** dalam source. Confirm ialah **two-step confirm buttons** (MutationButton); satu-satunya `role="dialog"` semula jadi ialah mobile sidebar.
- **OBSERVED_SOURCE**: keputusan `unknown` (`ExecutionReceipt.status='unknown'`, `JobRecord.status='unknown'`, `PENDING_RECONCILIATION`) kekal sebagai unknown.

**TARGET_DESIGN (keperluan sasaran)**:

1. Kegagalan tindakan mesti dipaparkan **inline pada tempat tindakan** (button context), dengan `role="alert"`, dan butang cuba-semula — bukan sebagai "berjaya" senyap.
2. Jika satu lapisan feedback global (toast) diperkenalkan kelak, ia mesti **tidak boleh** menjadi satu-satunya saluran kegagalan, dan mesti menghormati `role="alert"`/`role="status"` dengan betul. Sehingga itu, two-step confirm + inline error kekal pola rasmi.
3. Unknown tidak boleh dirender dengan gaya success; tiada auto-retry yang menukar unknown kepada confirmed tanpa resit server.
4. Dialog modal (jika diperlukan kelak) mesti memenuhi `role="dialog"`, focus-trap, dan focus return seperti mobile sidebar.

---

## 14. Responsive & Accessibility

### 14.1 Mekanisme tema (OBSERVED_SOURCE, `workspace-theme.css` + `useWorkspaceTheme`)

- Token penuh `--ui-*` pada `.app-shell`; gelap melalui **`.app-shell[data-theme="dark"]`** (data attribute).
- Default **dark**; kegigihan melalui `localStorage 'abangcolek-workspace-theme'`; `documentElement.style.colorScheme` diselaraskan.
- **Tiada `prefers-color-scheme` detection** dalam source — keputusan pengguna (toggle) sahaja yang menentukan.

**Light values (OBSERVED_SOURCE)**:

| Token | Nilai |
|---|---|
| `--ui-bg` | `#f1f0f5` |
| `--ui-surface` | `#ffffff` |
| `--ui-soft` | `#eae8f0` |
| `--ui-text` | `#202025` |
| `--ui-muted` | `#62606f` |
| `--ui-border` | `#dcd9e4` |
| `--ui-input-border` | `#817b8f` |
| `--ui-primary` | `#f6bd1b` / ink `#171719` |
| `--ui-accent` | `#e31e3d` / ink `#ffffff` |
| `--ui-success-text` | `#157351` |
| `--ui-warning-text` | `#8a5b0b` |
| `--ui-danger-text` | `#b42c42` |
| `--ui-inverse` / text | `#171719` / `#f5f4f8` |

**Dark values (OBSERVED_SOURCE, override)**:

| Token | Nilai |
|---|---|
| `--ui-bg` | `#171719` |
| `--ui-surface` | `#222225` |
| `--ui-soft` | `#2b2b30` |
| `--ui-text` | `#f5f4f8` |
| `--ui-muted` | `#b5b2c1` |
| `--ui-border` | `#37363e` |
| `--ui-accent` | `#f0445e` |
| `--ui-success-text` | `#83dfb5` |
| `--ui-warning-text` | `#f4cb75` |
| `--ui-danger-text` | `#ff98a7` |

### 14.2 Peraturan aksesibiliti (TARGET_DESIGN)

- Sasaran **WCAG 2.2 AA**; sentuh ≥ **44×44 CSS px** untuk semua kawalan interaktif.
- **Status bukan warna sahaja**: status menggunakan kelas `xp-status-*` **+ teks label** (verified/done/approved = success; pending/review/unknown/blocked = warning; rejected/failed = danger) — makna mesti kekal apabila warna dikeluarkan.
- Mobile sidebar = dialog penuh dengan focus-trap, `inert` belakang, dan focus return (§5.2).
- Keyboard lengkap: `<select>` role switcher, tablist, `<details>` boleh dioperasi papan kekunci.
- `prefers-reduced-motion` dihormati untuk sebarang animasi paparan (landing sudah; workspace wajib ikut).
- Sasaran Core Web Vitals (bukan keputusan): LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 (p75).

---

## 15. Copilot / Pet (OBSERVED_SOURCE → TARGET_DESIGN)

### 15.1 Kontrak sasaran bersama (OBSERVED_SOURCE, `shared/copilot-contracts.ts`)

Workspace Copilot dan Pet menyasarkan **agent/thread/run contract yang sama**:

- Runtime descriptor: `'copilotkit-v2-agui'`; schema tetap **`a2ui.v1`** (`A2UIFixedSchema`).
- **A2UI_ALLOWLISTED_COMPONENTS** (6 komponen sahaja): `OperationsBriefCard`, `RefundImpactPanel`, `JevAssessmentCard`, `MarginSimulator`, `OrderTrackingBadge`, `CommissionCard`.
- **`paidFallbackAllowed: false`**; urutan model percuma sahaja (`STRICT_FREE_CANDIDATE_SEQUENCE`): `gemini-3.6-flash → gemini-3.5-flash-lite → nvidia/nemotron-3-super-120b-a12b:free` (ID tepat mengikut `copilot-contracts.ts`).

### 15.2 Keadaan runtime berdasarkan pemeriksaan source (OBSERVED_SOURCE)

- **CopilotWorkspace** (`src/features/workspaces/CopilotWorkspace.tsx`): **placeholder disabled penuh** — badge `role="status"` **"Runtime unavailable · Belum tersedia"**, teks "CopilotKit /v2 runtime belum tersedia", textarea + send **disabled**, tiada panggilan API, tiada provider.
- **Server `/v2` routes implemented**: `GET /copilot/v2` → descriptor (freeModelRouter); `POST /copilot/chat | /copilot/v2 | /v2` (`auth.operational`) dengan **SSE** events: `start / a2ui / gen_ui / hitl_prompt / text_delta / done / error`.
- **Pet** (`PetCompanion.tsx`): **live** — `POST /api/platform/copilot/chat {message, history, stream:true}`, SSE `text_delta`/`done`, TTS/STT, maskot draggable + orbit menu + drawer, chip "Buka Penuh" → `/founder/copilot`.
- **Split-brain nyata**: Pet hidup, CopilotWorkspace mati. Ini keadaan **semasa**, bukan reka bentuk akhir.

### 15.3 Larangan tafsiran (wajib)

- **JANGAN** anggap kewujudan route bernama `/v2` = integrasi CopilotKit rasmi sudah siap di client.
- **JANGAN** cipta provider aktif / model percuma aktif / confidence score / rekod transaksi dalam UI copilot.
- **Display-only**: output agent (A2UI cards) **tiada kuasa interaktif** — tiada butang yang melaksanakan transaksi daripada kad agent; tindakan risiko mesti melalui HITL (§12.2).
- **Tiada TODO kosong**: keputusan reka bentuk yang belum selesai mesti direkam sebagai keputusan terbuka berlabel, bukan komen `TODO` tanpa isi.
- **JANGAN ubah `CopilotWorkspace.tsx`** semasa kerja reka bentuk ini; ia adalah bukti, bukan sasaran.

**TARGET_DESIGN**: apabila runtime `/v2` diintegrasikan, CopilotWorkspace dan Pet mesti berkonvergen ke contract yang sama (descriptor, a2ui.v1, allowlist 6 komponen, free-only sequence), dengan keadaan runtime yang **jujur** (unavailable kekal unavailable sehingga descriptor & SSE disahkan berfungsi).

---

## 16. Component-State Matrix (TARGET_DESIGN)

Setiap komponen mesti menyokong kesemua lajur keadaan yang ditanda ●. Kekosongan lajur bermakna keadaan itu tidak berkenaan.

| Komponen | loading | empty | error | denied | busy | success | unknown |
|---|---|---|---|---|---|---|---|
| NavigationItem (sidebar/topbar) | — | ● (tiada item → papar empty role) | — | ● (capability tidak ada → sembunyi/disable + sebab) | — | — | — |
| ResourceState (wrapper senarai) | ● "Memuatkan rekod…" | ● Empty | ● + "Cuba semula" | ● (denial route-level) | ● (loadingMore) | — | — |
| SearchBox | — | ● (tiada padanan → empty result) | ● (kegagalan carian inline) | — | ● (debounce/menatal) | — | — |
| FormPanel (FieldDefinition) | — | — | ● field error `role="alert"` | — | ● "Menyimpan…" + idempotency | ● resit "Disimpan oleh server · {id}" | ● PENDING_RECONCILIATION |
| MutationButton (two-step confirm) | — | — | ● inline error + retry | — | ● disabled semasa POST | ● resit/status terkini | ● unknown kekal unknown |
| Status badge (`xp-status-*`) | — | — | — | — | — | ● success (teks + warna) | ● warning "unknown" ≠ pending |
| Record list (card/row) | ● skeleton/ResourceState | ● Empty per tab/filter | ● error banner inline | ● denied | ● load-more spinner | — | ● entiti unknown dilabel |
| Detail expansion (`<details>`/LinkedRecordContext) | ● lazy load butiran | ● tiada butiran | ● gagal muat butiran | ● butiran dilindungi | — | — | ● provenance separa → unknownReasons |

Peraturan silang (TARGET_DESIGN):

- Setiap keadaan ● mesti mempunyai **teks** (bukan warna sahaja) dan boleh dicapai keyboard/screen reader.
- Unknown sentiasa boleh dibezakan daripada pending pada peringkat DOM (label berbeza), bukan hanya CSS.

---

## 17. Acceptance Checklist (boleh diuji; padankan `../design-qa.md`)

Setiap item mesti dibuktikan dengan commit + viewport + trace + limitations (design-qa.md). Screenshot root 200 **bukan** acceptance.

- [ ] **Phone / tablet / desktop** — semua seksyen dirender tanpa horizontal scroll; kontrol ≥44×44 CSS px; table↔card behavior mengikut §7.2.
- [ ] **Light / dark** — toggle sidebar footer berkesan; nilai token §14 kekal; tiada warna hard-coded yang memecah kontras AA (kecuali yang direkam: `.xp-dark-secondary`, warna provider brand).
- [ ] **Keyboard / screen reader** — semua interaksi boleh dicapai papan kekunci; `aria-current="page"` pada nav aktif; `role="alert"` pada error; `role="status"` pada badge runtime; status ada teks.
- [ ] **Focus return** — menutup mobile sidebar (dialog) memulangkan fokus ke pemanggil; modal (jika ada) mengikut pola sama.
- [ ] **Reduced motion** — `prefers-reduced-motion` melumpuhkan animasi paparan tanpa memecahkan fungsi.
- [ ] **Connection loss** — offline banner muncul; bacaan cache tidak dilabel sebagai data segar; operasi tulis gagal dengan inline error; hasil tidak pasti mendarat sebagai PENDING_RECONCILIATION/unknown, **bukan** gagal atau berjaya.
- [ ] **Denial** — akses seksyen tanpa capability memaparkan "Akses bahagian ini tidak dibenarkan" dan tiada data bocor.
- [ ] **Approval ≠ execution** — kelulusan tidak menghasilkan resit execution; dispatch hanya selepas `approved`; campaign margin block + founder override berfungsi seperti §12.
- [ ] **Tiada dakwaan copilot siap** — CopilotWorkspace kekal disabled/jujur; tiada dakwaan integrasi CopilotKit; tiada provider/model/confidence/rekod transaksi direka.
- [ ] **Tiada PII/secrets dalam DOM** — public tracking token-based; tiada secrets di-render.
- [ ] **Provenance/revision** — rekod transaksi memaparkan provenance + timestamp + revision (§9).
- [ ] **Success = server receipt** — tiada paparan "berjaya" tanpa id resit server (§10–11).

---

## Lampiran A: Nota Bukti & Jurang Diketahui (NOT_IMPLEMENTED / Open Decisions)

1. **NOT_IMPLEMENTED — dialog/toast layer umum**: tiada dalam source; pola rasmi kekal two-step confirm + inline error (§13).
2. **NOT_IMPLEMENTED — CopilotWorkspace runtime**: placeholder disabled; server `/v2` wujud tetapi client belum berintegrasi (§15).
3. **NOT_IMPLEMENTED — table component & responsive table↔card spec per seksyen**: keputusan per seksyen diperlukan (§7.2).
4. **OBSERVED_SOURCE — `legacy` section**: intercepted oleh IntegrationWorkspace (`WorkspaceContent` case `'legacy'` = dead code); kekalkan dalam route inventory tetapi jangan bina pengalaman baharu di atasnya sehingga diputuskan.
5. **Open decision — default theme**: source default dark tanpa `prefers-color-scheme`; penghormatan OS preference ialah pertimbangan sasaran, perlu keputusan sebelum implementasi (§14.1).
6. **BUSINESS_UNVERIFIED**: sebarang dakwaan stok/katalog/harga tidak boleh muncul dalam workspace tanpa sumber disahkan (rujuk SoT dan `landing-page.md`).
