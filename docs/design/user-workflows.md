# ABANGCOLEK — atlas workflow pengguna dan operasi

Tarikh: 21 Oktober 2026. **TARGET_DESIGN**, berdasarkan blueprint v2.4 dan taxonomy source semasa. Diagram ini menerangkan aliran yang dikehendaki; ia bukan bukti semua laluan sudah diimplementasikan atau production-ready. Lihat ledger acceptance untuk status sebenar.

Buka [atlas visual dalam browser](workflow-atlas.html) untuk navigasi dan diagram yang boleh dikembangkan.

Empat role source semasa dalam `WorkspaceRole`: **Customer, Staff, Founder, Developer**. **Mandat pengguna 21 Oktober: setiap Agent/Stokis wajib mendapat Dealer Workspace private dan Online Store public sendiri yang disediakan ABANGCOLEK.** Dua surface dealer ini sasaran wajib, belum dibuktikan siap oleh empat role/menu sedia ada. Online Store ialah kedai untuk pelanggan membeli; workspace ialah tempat Agent/Stokis mengurus bisnes. **Copilot ialah lapisan bantuan**, bukan role yang memberi kuasa tambahan. Developer tidak mendapat hak transaksi founder hanya kerana boleh melihat diagnostics.

## 1. Peta ekosistem

```mermaid
flowchart TD
    V[Pelawat / bakal pelanggan] --> L[Landing, cerita jenama dan katalog published]
    L --> C[Customer workspace]
    C --> O[Pesanan sendiri, tracking dan bantuan]
    E[Agent/Stokis daftar terus atau dijemput] --> Z[ABANGCOLEK sahkan dan aktifkan]
    Z --> DW[Dealer Workspace private]
    Z --> DS[Online Store public milik Agent/Stokis]
    DS --> C
    DW --> A
    S[Staff workspace] --> W[Tugasan assigned, packing, QC dan shift]
    F[Founder workspace] --> B[Kelulusan, stok, kewangan, pasukan dan growth]
    D[Developer workspace] --> T[Health, jobs, diagnostics dan readiness]
    C --> A[Session dan capability checks pada server]
    S --> A
    F --> A
    D --> A
    A --> P[Canonical platform dan rekod berizin]
    AI[Workspace Copilot / Pet mengikut akses] -. Bantuan dan cadangan .-> A
    P --> R[Audit, revision, idempotency dan durable receipt]
```

## 2. Customer — jumpa produk hingga pembelian dan bantuan

```mermaid
flowchart TD
    A[Masuk landing HQ / store dealer / pautan sosial] --> B[Teroka store dan produk published]
    B --> C[Pilih SKU dan kuantiti]
    C --> D[Daftar / login apabila sesi diperlukan]
    D --> E[Server resolve store, seller, referrer dan fulfiller berasingan]
    E --> F[Semak cart, fulfilment, harga dan syarat ganjaran]
    F --> G{Server sahkan harga, stok dan kelayakan?}
    G -->|Berubah / konflik| H[Semak perubahan dan sahkan semula]
    H --> F
    G -->|Sah| I[Hantar order dengan idempotency key]
    I --> J[Pembayaran pending]
    J --> K{Pembayaran disahkan server?}
    K -->|Belum / gagal| M[Lihat pending / cuba langkah yang selamat]
    K -->|Ya| N[Order diterima, packing dan fulfilment]
    N --> O[Tracking / pickup / penerimaan]
    O --> P[Ganjaran jika layak menurut polisi]
    O --> Q{Ada masalah?}
    Q -->|Ya| R[Buka kes dengan evidence]
    R --> S[Semakan staff / founder dan penyelesaian berjejak]
    Q -->|Tidak| T{Beli semula atau share?}
    T -->|Reorder| U[Cart baharu: reprice dan recheck store, stok, referral, fulfilment]
    U --> D
    T -->|Share| V[Pautan dikongsi tanpa reward automatik]
```

Redirect payment bukan bukti paid. Public tracking menggunakan token sah dan projection minimum; order ID sahaja tidak memberi akses. Produk/harga/ganjaran tidak boleh direka untuk mengisi diagram atau demo.

[Commerce & Growth](commerce-growth.md) ialah kontrak sasaran bagi flow ini: cross-store cart memerlukan pengesahan baharu, anonymous browse hanya membaca published projection dan reorder tidak replay harga/payment lama. Store owner/dealer, customer referrer dan fulfiller boleh berbeza; server memiliki authority dan polisi snapshot. Referral pelanggan satu peringkat dua hala memerlukan kelayakan approved bagi setiap pihak, berasingan daripada wholesale margin, komisen dealer dan points. Share/signup sahaja tidak memberi reward. MadConomy lima tingkat ialah research; top-up, cash withdrawal dan native wajib deferred. Ordering P0 → rewards P1 → retention P2 berada dalam domain phase selepas integriti/runtime prerequisites; diagram tidak menutup acceptance.

## 3. Founder — pantau, putuskan dan rekonsiliasi

```mermaid
flowchart TD
    A[Login dengan founder membership aktif] --> B[Overview: pending work dan rekod sebenar]
    B --> C{Jenis kerja?}
    C --> D[Orders / stok / restock / dealer]
    C --> E[Aduan, QC dan cadangan refund]
    C --> F[Kewangan, shift dan day-close]
    C --> G[Marketing, automations dan pasukan]
    D --> H[Semak source, scope, polisi dan revision]
    E --> H
    F --> H
    G --> H
    H --> I{Tindakan berisiko perlukan keputusan?}
    I -->|Ya| J{Keputusan manusia berkuasa}
    I -->|Tidak| K[Read / draf yang grants benarkan]
    J -->|Tolak / luput / stale| X[Cadangan ditutup; tiada execution]
    J -->|Lulus| L[Server revalidate dan command canonical]
    K --> Y[Hasil bacaan / draf; tiada effect transaksi]
    L --> M{Outcome diketahui?}
    M -->|Committed| N[Receipt, audit dan refresh rekod]
    M -->|Tidak pasti| O[Reconciliation sebelum retry]
    N --> P[Semak laporan dan tindakan seterusnya]
```

Jenis kerja menunjukkan cabang tugas, bukan semua perkara memerlukan butang approval yang sama. Read/draft tidak dianggap transaksi berjaya; setiap command mengikut polisi domain sendiri.

## 4. Staff — kerja assigned, fulfilment dan shift

```mermaid
flowchart TD
    A[Login staff dengan scope assigned / outlet] --> B[Semak shift dan tugasan hari ini]
    B --> C[Buka pesanan / kes / tugas yang dibenarkan]
    C --> D[Rujuk SOP dan semak keadaan sebenar]
    D --> E{Ada isu stok / QC / polisi?}
    E -->|Ya| F[Catat evidence dan escalate kepada founder]
    F --> G[Tunggu keputusan / tindakan yang dibenarkan]
    E -->|Tidak| H[Pick, pack dan kemas kini tahap kerja berizin]
    G --> H
    H --> I[Handover / dispatch dengan rekod]
    I --> J[Catat expense / variance / tugasan tertunda]
    J --> K[Serahan shift dan semakan day-close]
```

Staff hanya melakukan command yang capability dan assigned scope benarkan. Diagram bukan pemberian hak untuk meluluskan refund, adjustment atau akses semua outlet.

## 5. Agent/Stokis — workspace sendiri DAN Online Store sendiri

```mermaid
flowchart TD
    A[Daftar terus sebagai Agent/Stokis atau dijemput ABANGCOLEK] --> B[ABANGCOLEK semak dan aktifkan mengikut polisi]
    B --> C{Diluluskan?}
    C -->|Tidak| D[Maklum status dan sebab yang sesuai]
    C -->|Ya| E[Sistem menyediakan kedai unik dan akses pengurusan]
    E --> DW[Dealer Workspace private: urus bisnes sendiri]
    E --> DS[Online Store public: pelanggan membeli]
    DS --> CU[Pelawat -> produk -> cart -> checkout canonical]
    CU --> AT[Server resolve store/dealer, customer referrer dan fulfiller berasingan]
    AT --> FM{Mod fulfilment yang diaktifkan?}
    FM -->|HQ| HQ[HQ stock, reservation dan packing canonical]
    FM -->|Dealer| DL[Dealer-owned stock dan local fulfilment]
    FM -->|Konsainan| CS[Ownership HQ dan custody dealer berasingan]
    HQ --> J
    DL --> J
    CS --> J
    DW --> F{Aktiviti bisnes}
    F --> G[Permintaan restock / konsainan]
    G --> H[Semakan -> allocation -> dispatch -> penerimaan]
    F --> I[Jualan / attribution mengikut polisi]
    H --> J[Stok dan ledger organisasi sendiri]
    I --> J
    J --> K[Margin / komisen / due / settlement mengikut mod dan polisi]
    K --> L[Bayaran direkod dan rekonsiliasi]
    L --> M[Statement organisasi, return / dispute jika perlu]
```

**Maksud ringkas:** ABANGCOLEK memberikan setiap Agent/Stokis sebuah kedai online dan ruang pengurusan. Pendaftaran tidak memerlukan pembelian dahulu. Online Store public mempunyai nama/link kedai unik, katalog, cart dan checkout; Dealer Workspace private mengurus profil kedai, link/QR, order, restock/stok, komisen, settlement dan bantuan mengikut polisi. Contoh laluan sasaran `/kedai/ali-jerux` ialah ilustrasi, bukan URL yang sudah aktif.

Asas `Shop` semasa mempunyai banner Kedai Mini Ejen dan pautan referral. Itu belum membuktikan provisioning kedai setiap dealer, public access, attribution server dan private workspace selesai. Ikut [mandat blueprint §8.1](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md#81-mandat-online-store-setiap-agentstokis--21-oktober-2026) dan prompt Kilo; status acceptance perlu dinilai semula dengan two-dealer browser evidence. Stok dealer, jualan attribution dan konsainan boleh mempunyai polisi berbeza; tidak semua jualan menghasilkan komisen serta-merta. Due/earned tidak sama dengan payout atau bank payment disahkan.

## 6. Developer — pemerhatian dan penyelenggaraan runtime

```mermaid
flowchart TD
    A[Login developer dengan runtime.read] --> B[Semak health dan integrasi yang dibenarkan]
    B --> C[Semak job, error bertapis dan JEV evaluation]
    C --> D{Ada incident?}
    D -->|Tidak| E[Semak readiness dan laporan diagnostics]
    D -->|Ya| F[Trace source / runtime tanpa mendedahkan secrets]
    F --> G[Reproduce dalam environment terasing]
    G --> H[Fix melalui proses pembangunan, test dan review]
    H --> I[Release mengikut authority dan gates]
    I --> J[Verify runtime dan rekod outcome]
    E --> J
```

Developer workspace memberi diagnostics yang dibenarkan; ia tidak secara automatik membenarkan shell, deploy, refund, role escalation atau membaca kewangan founder. Pembaikan/release melalui authority pembangunan berasingan.

## 7. AI Copilot / Pet — tanya, semak dan cadangkan

```mermaid
flowchart TD
    A[Pengguna bertanya pada surface yang dibenarkan] --> B[Server sahkan sesi, scope dan owned thread]
    B --> C[Operations Copilot memilih tool yang layak]
    C --> D{Perlu specialist?}
    D -->|Ya| E[Commerce Reader / QC-JEV Reviewer / Marketing Drafter]
    D -->|Tidak| F[Query / simulation / draf yang dibenarkan]
    E --> F
    F --> G[Canonical records / deterministic evaluator]
    G --> H[Jawapan, kad, tool status dan state yang sah]
    H --> I{Cadangan mengubah bisnes?}
    I -->|Tidak| J[Paparkan hasil bersumber]
    I -->|Ya| K[Preview dan proposal immutable]
    K --> L[Keputusan manusia yang berkuasa]
    L --> O{Diluluskan dan masih sah?}
    O -->|Tidak| P[Tolak / expired / stale; tiada execution]
    O -->|Ya| M[Server revalidate -> command -> receipt]
    M --> N[Paparkan outcome sebenar / reconciliation jika unknown]
```

Ini sasaran penyatuan Pet/workspace. Audit mendapati laluan runtime, shared history, tools/state/card delivery dan callback approval masih mempunyai jurang. Specialist tidak mendapat grants atau budget tambahan; output model bukan payment proof.

## 8. Pembayaran dan refund — jejak wang

```mermaid
flowchart TD
    A[Order dan amount canonical] --> B[Payment pending]
    B --> C[Callback / verification provider yang sah]
    C --> D[Signature, account, amount, currency dan dedupe]
    D --> E{Sah dan status paid?}
    E -->|Tidak| F[Pending / rejected / mismatch yang jelas]
    E -->|Ya| G[Atomic paid record, ledger dan receipt]
    G --> H{Permintaan refund?}
    H -->|Ya| I[Preview allocation, komisen dan loyalty]
    I --> J{Approval, expiry, revision dan payload binding sah?}
    J -->|Tidak| O[Tolak / expired / stale; tiada refund]
    J -->|Ya| K[Canonical refund dengan operation ID stabil]
    K --> L{Outcome diketahui?}
    L -->|Ya| M[Receipt dan updated ledger sekali sahaja]
    L -->|Tidak| N[Unknown outcome -> reconcile -> tiada retry buta]
```

Gateway merchant/config dan live callback proof ialah gates luar. Pembetulan pending->paid serta refund receipt-failure recovery wajib dibuktikan sebelum workflow wang dianggap lengkap.

## 9. Inventory, QC dan aduan — trace lot hingga penyelesaian

```mermaid
flowchart TD
    A[Terima stok, lot dan expiry] --> B[Available / reserved / quarantined berasingan]
    B --> C[Order / restock menggunakan lot layak dan FEFO]
    C --> D[Packing dan pemeriksaan]
    D --> E{Defect / aduan?}
    E -->|Tidak| F[Handover / dispatch dan movements direkod]
    E -->|Ya| G[Buka kes, evidence dan trace batch]
    G --> H[JEV LOCAL_RULES dan SOP; data hilang dinyatakan]
    H --> I[Cadangan quarantine / refund / tindakan susulan]
    I --> J[Founder semak dan command canonical berizin]
    J --> K[Stock / money receipts dan pelanggan dimaklumkan jika berizin]
    K --> L[Kes ditutup dengan evidence penyelesaian]
```

Quarantine bukan saleable stock. JEV LOCAL_RULES tidak membuktikan native AI vision atau confidence terkalibrasi. Makluman pelanggan memerlukan channel serta consent yang sah.

## 10. Marketing, learning dan automations — pertumbuhan terkawal

```mermaid
flowchart TD
    A[Founder tetapkan objective kempen] --> B[Published facts, asset rights dan consent]
    B --> C[Simulasi margin amount DAN ratio]
    C --> D{Lulus polisi?}
    D -->|Tidak| E[Ubah cadangan dan nilai semula]
    E --> C
    D -->|Ya| F[Draf copy / kempen / automation]
    F --> G[Semakan manusia dan grants semasa]
    G --> H[Dispatch-time opt-out dan integration gate]
    H --> I{Dibenarkan dan provider tersedia?}
    I -->|Tidak| J[Kekal draf / unavailable dengan sebab]
    I -->|Ya| K[Authorized publish / send / job dan receipt]
    K --> L[Ukur conversion / outcome daripada rekod sebenar]
    L -. Data eligible dan offering diaktifkan .-> M[Cadangan learned skill]
    M --> N[Evaluation -> human publish -> version pin / rollback]
```

Automatic Learning, Memories, Analytics, Channels, WebMCP, Voice dan Attachments mempunyai acceptance/gates berasingan. Diagram tidak mengaktifkan servis itu, tidak menyimpan credential dan tidak memberi kelulusan penghantaran luaran.

## Rujukan dan batas

- Taxonomy: `shared/platform-contracts.ts`, `src/features/platform/routes.ts`.
- Dealer scope: `server/platform/dealers.ts`.
- Target: [master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md), [workspaces](workspaces.md), [Copilot features](copilotkit-ten-features.md), [advanced tools](copilot-advanced-tools.md).
- Implementasi dan gates: [prompt Kilo](../prompts/KILO-COMPLETE-PROJECT-20261021.md), [85 requirement](../prompts/KILO-TASK-MATRIX-20261021.md), `reports/implementation/acceptance-status.json`.

Tiada source aplikasi, transaksi, credential, ledger acceptance atau deployment diubah oleh penulisan diagram ini.
