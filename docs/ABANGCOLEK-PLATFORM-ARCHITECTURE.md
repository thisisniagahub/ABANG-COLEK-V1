# ABANGCOLEK — Platform Architecture

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](CURRENT-STATUS.md) · [Checklist](../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Diselaraskan: **19 Oktober 2026**, mengikut [Master Blueprint v2.4](ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md). Ini kontrak architecture dan source mapping, bukan pengesahan deploy. [Struktur repo](design/repository-structure.md) menentukan destinasi modular monolith; path semasa kekal sehingga migration dilaksanakan dan diuji.

## Domain dan dependency

React/Vite shell -> typed HTTP contracts -> application workflows -> deterministic domain services -> infrastructure interfaces. Frontend tidak import backend; shared contracts tidak import SDK/storage/UI; modules tidak bergantung pada HTTP handlers; provider/persistence dipasang pada composition root. Transactions rentas order/payment/inventory/commission/loyalty kekal atomic.

Domain: Operations Core; Commerce & Dealer Network; Orbit loyalty/referral; Operations Copilot. Folder sasaran `src/app`, `src/features`, `server/bootstrap`, `server/http`, `server/application`, `server/modules`, `server/agents`, `server/infrastructure` tidak boleh dianggap semua sudah wujud. Jangan migrasi kepada monorepo/Next.js tanpa requirement.

ADR semasa: [ADR-0003](decisions/0003-blueprint-v23-execution-contract.md) menetapkan execution contract dan supersession local-only topology.

## Commerce & Growth — kontrak sasaran 21 Oktober 2026

[Spesifikasi Commerce & Growth](design/commerce-growth.md) mewajibkan satu public store `/kedai/:slug` dan satu private Dealer Workspace bagi setiap Agent/Stokis aktif pada aplikasi canonical yang sama. Reuse customer/business membership serta grant organisasi untuk dedicated dealer experience; tiada auth role kelima, database per dealer atau SaaS baharu diperlukan. Direct signup tidak memerlukan prior purchase. Anonymous browse membaca published projection sahaja; private management/order/statement disahkan server bagi setiap request.

Server menyelesaikan stable store/dealer owner, pembeli, customer referrer serta mod/lokasi/pihak fulfilment secara berasingan dan menyimpan attribution/policy snapshot order. HQ stock tidak dipersembahkan sebagai local dealer stock. Cart berlainan store memerlukan conflict handling dan pengesahan baharu; checkout, tracking, refund dan reorder menggunakan authority canonical. Reorder membina unsent cart baharu dengan harga/stock/eligibility semasa, tanpa automatic payment. Existing order/payment/inventory/commission/loyalty atomic/CAS boundary kekal.

Wholesale margin, dealer commission, referral pelanggan satu peringkat dua hala dan loyalty points mempunyai entri/eligibility tersendiri. Share biasa tidak memberi reward; kadar/stacking memerlukan polisi approved dan contribution yang sah. MadConomy lima tingkat ialah research, bukan compensation plan ABANGCOLEK. Top-up, cash withdrawal dan native app wajib deferred. P0 ordering → P1 rewards → P2 retention berada dalam domain phase sedia ada; ia tidak melangkau runtime atau release gates. Semua ini TARGET_DESIGN, bukan receipt route/provisioning/release.

## Runtime authority

| Environment | Data authority dan lifecycle |
|---|---|
| Local Bun | Satu writer SQLite WAL + private evidence pada root yang disahkan; local worker |
| Hosted Vercel | `api/platform.ts` -> durable handler -> fresh temporary SQLite snapshot -> authoritative Supabase CAS commit sebelum response/cookie |
| Agent service sasaran | Google ADK Python + AG-UI bridge; authenticated tools ke Bun; session/run store berasingan daripada ledger |

CAS whole-snapshot ialah bounded compatibility, bukan normalized Postgres domain migration atau backup history. Mutations tidak autoreplay; safe reads sahaja bounded retry. Jangan buka local timer pada setiap cloud request. External effect memerlukan durable intent/idempotency/reconciliation merentas instances. Receipt unknown tidak ditukar kepada failed atau success tanpa bukti.

Production configuration, snapshot/payload limits dan exact topology berada dalam [release runbook](production-release.md); [recovery](runbooks/platform-recovery.md) membezakan local backup dan cloud restore. Jangan jadikan SQLite temp Vercel sebagai durable database atau bergantung pada localhost pengguna dari cloud.

## Founder intelligence vertical slice

```text
Founder identity -> Content registry <-> Event/location context
                           |
                           v
                 Explicit outcomes -> order/fulfilment ledger
                           |
                           v
             Derived reach/trust/conversion/retention read models
```

| Layer | Source semasa | Boundary |
|---|---|---|
| Contract | `shared/founder-intelligence-contracts.ts` | Identity/content/event/outcome/summary types |
| Domain | `server/platform/founder-intelligence.ts` | Validation, founder scope, revision/audit, derived analytics |
| HTTP | `/api/platform/founder-intelligence/*` | First-party capture; bukan external social sync |
| Storage | `PlatformStore` records | Local SQLite atau cloud snapshot durability mengikut environment |

Social related/unverified identity tidak automerge; content mempunyai rights/source/capturedAt; order mesti wujud sebelum outcome order dipautkan. Views tidak membuktikan revenue attribution. Founder mutation, revision, audit dan exact-revision approval diperlukan. External publish/read-metrics memerlukan activated provider, quota, consent dan actual outcome receipt. Manual export ialah fallback berlabel.

## Copilot dan security

[AI architecture](AI-AGENT-ARCHITECTURE.md) memetakan 10 ciri/10 modul/32 logical tools/7 rendering approaches. UI React -> TypeScript CopilotRuntime -> ADK Python -> scoped Bun tools. Founder pilot; read-only first-party MCP App dan fixed-schema A2UI. Model free-only di semua inference; Intelligence optional gated. JEV LOCAL_RULES tidak memberi permission atau calibrated model confidence.

Server sentiasa mengesahkan principal, ownership, capability, schema, revision, policy dan idempotency. Approval bukan execution; success hanya selepas durable commit. Redact records sebelum model export. Shared state, SOP, external pages dan model output tidak trusted untuk authority.

## Acceptance

Setiap migration batch merekod file map/hash, import/link checks, lint, relevant domain tests dan browser/runtime evidence. Release menguji negative RBAC, CAS conflict, payment/refund/reversal, cross-request evidence, worker recovery, no-paid-route dan rollback. Source, tests present, verified local, verified production dan business acceptance direkod berasingan. Tiada test suite atau deploy dijalankan untuk kemas kini ini.
