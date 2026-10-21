# ABANGCOLEK — Advanced Tool Registry dan Workflow

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh semakan: 20 Oktober 2026. Status: Kontrak sasaran registry; tiada tool baharu dilaksanakan melalui dokumen ini. Komponen UI tempatan dan domain functions tidak membuktikan registered tool SDK/protocol.

Authority semasa: [master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md). [Prompt utama](../prompts/IMPLEMENT-ABANGCOLEK.md) menetapkan pilihan stack, model dan urutan; pelaksana tidak memilih architecture alternatif. [Tujuh pendekatan UI](copilot-generative-ui-seven-approaches.md) ialah dimensi acceptance tambahan.

## 1. Tujuan dan hubungan

Mengembangkan [10 kemampuan CopilotKit](copilotkit-ten-features.md) menjadi workflow operasi berkesan mengikut [master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md). [Polisi model percuma](../research/2026-10-19-free-model-policy.md) terpakai kepada semua inference, subagent, evaluator berasaskan model dan proses latar belakang. Kiraan margin, reconciliation dan authorization kekal kod deterministik tanpa memerlukan LLM.

Rujukan integrasi: [CopilotKit frontend tools](https://docs.copilotkit.ai/google-adk/frontend-tools), [ADK custom tools](https://adk.dev/tools-custom/), [sub-agents](https://docs.copilotkit.ai/google-adk/multi-agent/subagents). Registry/kontrak domain berikut ialah reka bentuk ABANGCOLEK; ia bukan nama API SDK rasmi atau kemampuan yang sudah dipasang.

### 1.1 Liputan wajib kesemua 10 modul aplikasi

Semua modul berikut termasuk dalam skop Copilot sasaran. MOD IDs tetap dan berasingan daripada CPK/GUI/ADV IDs. Specializations berikut sudah diputuskan dalam kontrak ini; implementer tidak memilih tool/architecture baharu untuk menutup jurang. Tiada row bermaksud integrasi aktif atau verified.

### Konteks Commerce & Growth — TARGET_DESIGN 21 Oktober

[Kontrak commerce](commerce-growth.md) menambah acceptance berscope pada MOD-01/02/03/05/06 tanpa ID tool baharu. Setiap Agent/Stokis aktif mempunyai public store dan dedicated private Dealer Workspace melalui customer/business membership canonical. Tool menerima store/dealer owner, customer referrer dan fulfilment source yang diselesaikan server secara berasingan; client slug/ref/phone, shared state dan prompt bukan authority. Anonymous published browse tidak memberikan akses private order, statement atau referral account lain.

`search_catalogue`/comparison/checkout diagnosis mesti menggunakan harga, availability dan revision bagi store serta sumber fulfilment sebenar. Cart/reorder frontend tool menghasilkan **unsent draft** dengan reprice/revalidation; tiada reservation/order/payment automatik. Tracking mengikut projection private atau token public yang sah. Settlement/reward explanation membezakan wholesale margin, komisen dealer, referral pelanggan satu peringkat dua hala dan points; eligibility/stacking/rates datang daripada polisi approved. Share sahaja tidak memberikan reward. Model tidak memilih payee, meluluskan komisen/referral, mengesahkan pembayaran atau mengaktifkan store.

Ujian tambahan: store/referrer/fulfiller berbeza, cross-store cart, harga/stok stale, A/B private-scope denial, revoke/logout/shared-state clearing, unknown eligibility dan refund reversal dengan sumber canonical. Ordering P0 → rewards P1 → retention P2 berada dalam domain phase selepas prerequisite runtime/integriti, bukan shortcut untuk CPK/GUI/release gates. MadConomy lima tingkat ialah research sahaja; top-up/cash withdrawal/native wajib deferred.

| ID / modul | Bantuan wajib dan canonical inputs/outputs | Tool mapping / acceptance khusus modul |
|---|---|---|
| MOD-01 Storefront & katalog | Search/compare produk published menggunakan atribut/product-facts version; sediakan unsent cart draft dengan SKU, quantity dan price revision | ADV-02 `search_catalogue` Q, ADV-03 `compare_products` Q, ADV-05 diagnosis dan `prepare_cart_draft` frontend-only. Unpublished/disabled product tersembunyi; allergy facts tiada -> unknown; stale price disegarkan; tiada order/reservation/payment |
| MOD-02 Orders & tracking | Order list/detail/status/timeline berizin, dispatch/tracking projection dan refund preview | ADV-02/04/05/07/08/19; ADV-04 `get_order_tracking` Q. Customer IDOR ditolak; public token projection/expiry/revocation berasingan daripada private order. Order ID sahaja tidak memberi public access |
| MOD-03 Inventory | Physical/reserved/quarantined/available, lot/expiry, FEFO dan restock assumptions | ADV-03/09/10/11/12. Location scope, expired/quarantine exclusion, missing lead-time, negative/zero stock dan stale lot revision diuji; forecast tidak membuat PO/transfer |
| MOD-04 QC & JEV | Scoped case/evidence/batch context, LOCAL_RULES reasons dan SOP, bounded refund/quarantine proposals | ADV-11/12/21/23/24/29. Evidence absent/unsupported jelas; tiada native/vision/confidence claim; cross-case access dan unsafe refund/quarantine ditolak |
| MOD-05 Dealer & komisen | Order/commission/contra/settlement explanation dengan allocation dan manual payment provenance | ADV-04/14/19; ADV-14 `explain_dealer_settlement` Q. Dealer silang organisasi ditolak; amount due berbeza daripada confirmed payment; partial settlement/dispute tidak dikira dua kali |
| MOD-06 Loyalty & referral | Balance ledger, earned/redeemed/expired/reversed/held, policy reasons dan attribution review | ADV-04/15/16. Expiry boundary, reversal after refund, duplicate referral/self-referral dan account scope diuji; unknown signals tidak menjadi fabricated risk score |
| MOD-07 Marketing | Published products, verified facts/rights, campaign objective/discount dan versioned deterministic contribution | ADV-13/24/32. Minimum amount DAN ratio, shipping/cost/reward double-count, zero sales dan expired/quarantine product diuji; draft tidak publish/send |
| MOD-08 Finance & day-close | Scoped outlet/shift/timezone, payment facts/variance/transaction trace dan private report | ADV-06/17/18/19/20. Founder finance grant, partial period/exclusions, unpaid vs recorded receipt, reconciliation invariants dan artifact download revoke diuji; tiada auto-adjust ledger |
| MOD-09 Tasks, documents & SOP | Source/version/permissions untuk cited search/summary, draft assignee/due/task dari workflow | ADV-02/23/24/29/30; ADV-29 `summarize_document` Q. Untrusted text tidak memberi authority, revoked/versioned document tidak dipetik semula, unsupported statement ditanda; task assignment bukan draft-only success |
| MOD-10 Automations & integrations | Redacted job/attempt/provider health, retry safety dan automation proposal dengan dry-run | ADV-24/26/27/31; ADV-24 `propose_automation` D. Trigger/scope/budget/disable policy mandatory; blocked provider/unknown effect menolak retry; propose tidak enable/schedule/send |

### 1.1.1 Specializations yang menutup jurang modul

Kiraan kekal **32 logical capabilities**. Registered functions boleh melebihi 32 kerana specialization/risk mesti explicit; tiada alias menyembunyikan extra effect. Semua specialization mewarisi envelope/policy/tests logical parent dan mempunyai registration/version/grant tersendiri. Base dispatcher tidak menerima arbitrary operation name daripada model.

| Registration tetap | Parent / kelas | Input schema minimum | Result / boundary wajib |
|---|---|---|---|
| `search_catalogue` | ADV-02 Q | `query`, published category/attribute filters, cursor/pageSize | Published product refs, verified descriptions/facts, prices+revisions; tiada private supplier/cost data. Server mengehadkan visibility, bukan filter client |
| `compare_products` | ADV-03 Q | `productRefs` bounded, approved comparison fields | Side-by-side same-version facts dan missing fields; tiada inference allergy/safety atau ranking rekaan |
| `prepare_cart_draft` | ADV-05 frontend-only | Published SKU refs, positive integer quantities, observed price versions | Unsent UI draft + `requires_reprice`; tiada persisted order/reserve. Bukan S yang menulis ledger atau D berizin baharu; browser action dan server diagnose dua kontrak berasingan |
| `get_order_tracking` | ADV-04 Q | Authenticated order ref; tiada token/raw public URL dalam model args | Owner-authorized private status projection; public tracking route kekal boundary berasingan dengan hashed token, expiry/revocation/rate limit dan minimum fields |
| `explain_dealer_settlement` | ADV-14 Q | Dealer-scoped settlement/order refs, asOf | Due/allocation/recorded-paid/remaining/dispute refs dan payment provenance; tiada automatic bank verification |
| `summarize_document` | ADV-29 Q | Approved document/version ref, bounded section refs, requested locale | Permission-filtered excerpt/summary dengan citations+versions+missing context. Extractive deterministic baseline sah; model summary mematuhi model budget/data gates dan diukur factuality |
| `propose_automation` | ADV-24 D | Allowlisted trigger/action refs, resource scope, schedule/timezone, budget, dry-run evidence ref, disable policy, reason | Immutable proposal; capability-specific write grant/idempotency/revision. Tiada enable/worker/external action; execution berasingan jika domain command tersedia |
| `get_operations_brief` | ADV-03 Q | Authorized outlet/period, approved fields dan source revisions | Minimum Operations Brief projection, resource metadata untuk GUI-05; tidak menambah standalone unrestricted read proxy |

Jika domain prerequisite sesuatu specialization belum wujud, registration kekal disabled/blocked dengan sebab dan test; jangan menggantikannya dengan arbitrary search/write tool. Jangan minta pelaksana memilih sama ada menjadikannya capability baharu. Dokumen ini sudah menetapkan parent/risk di atas.

### 1.2 Aturan liputan merentas modul

- Setiap modul mempunyai query yang scoped, output/provenance schema, error/missing-data state dan acceptance test sendiri.
- Frontend actions hanya menyediakan UI/draf; submission mengikut command domain dan persetujuan yang diperlukan.
- Role/resource matrix diuji bagi founder, staff, dealer dan customer sebelum sesuatu modul dibuka. Developer diagnostics tidak memberikan business-data grants secara automatik.
- Satu workflow rentas modul tidak boleh memperluas scope daripada rekod asal atau mengekalkan cache selepas akses ditarik balik.
- Liputan modul direkod berasingan daripada 10 kemampuan CopilotKit. Menyiapkan Chat atau tool discovery tidak bermaksud semua modul berintegrasi.

## 2. Satu registry, kuasa berbeza

Setiap definisi menyimpan nama/versi, input/output schema, owner domain, kategori risiko, role/capability, resource scope, approval policy, idempotency, expected revisions, deadline, quota, data classification dan status availability dengan sebab. Availability ialah disabled, ready, degraded atau blocked_external berdasarkan dependency sebenar; definisi wujud tidak bermaksud ready.

Registry entry ialah kontrak projek, bukan CopilotKit API. Sediakan adapter Python ADK bagi server tools, adapter React/AGUIToolset bagi frontend tools, dan adapter HTTP MCP bagi GUI-05. Ketiga-tiganya menggunakan canonical grants dan result schema yang sama; jangan menjalankan command dengan SDK-provided role/model args tanpa revalidation. Tool listing hanya mendedahkan registrations yang principal layak tahu. Tidak tersedia tidak menjadi fallback tool generik.

Setiap registration mempunyai: `logicalCapabilityId`, `registrationName`, `schemaVersion`, `owner`, fixed `riskClass`, principal-derived authorization, exact allowed resource/field enums, strict input schema (unknown keys ditolak), strict output schema, data classification, `timeoutMs` dalam baki deadline, retry policy, budgets, approval/idempotency/revision requirements dan availability reason. Bagi nama base berbilang use case, pindahkan effect berisiko kepada registration fixed lain. Debug metadata redacted sahaja; model tidak menerima grant token atau internal policy object.

| Kelas | Kesan | Kawalan |
|---|---|---|
| Q — query | Baca rekod berizin | Ownership, field projection, pagination dan data freshness |
| S — simulation | Pengiraan tanpa mutasi bisnes | Input provenance, policy version, assumptions dan expiry |
| D — draft/proposal | Simpan draf atau permintaan | Hak menulis jenis rekod itu, revision/idempotency dan audit; tiada execution tersirat |
| C — command | Mutasi domain sebenar | Tool grant, fresh principal, guard, approval jika diwajibkan, durable commit dan receipt |
| X — external effect | Mesej, publish atau gateway effect | C semua + provider activation, consent/explicit intent, durable intent dan reconciliation |

Founder-only bukan alternatif kepada resource checks. Customer hanya rekod sendiri, dealer organisasi sendiri, staff tugasan/cawangan dibenarkan. Developer diagnostics tidak memberikan akses kewangan. Subagent menerima subset grant parent. Role sahaja tidak memberi semua tool; setiap row di bawah masih memerlukan capability-specific grant.

## 3. Katalog 32 tool calon

Semua nama ialah kontrak registration sasaran yang tetap, tertakluk kepada risk split/specializations yang diperincikan di bawah. Source owner menunjukkan tempat adapter canonical disambung, bukan dakwaan algoritma lanjutan sudah tersedia. Model tidak mendapat SQL, filesystem, arbitrary HTTP, shell atau eval generik.

| ID | Tool / kelas | Input dan output utama | Owner / dependency |
|---|---|---|---|
| ADV-01 | `discover_capabilities` Q | Intent/domain -> tool yang layak dan availability reason | Registry baharu; boleh tanpa model |
| ADV-02 | `search_records` Q | Query, allowed entity types, cursor -> scoped hits dan provenance | Adapter domain queries; tiada search global tanpa filter scope |
| ADV-03 | `build_context_bundle` Q | Entity IDs, fields, revision -> snapshot minimum dan missing data | Query composition baharu; snapshot mesti konsisten atau nyatakan per-source revision |
| ADV-04 | `explain_record` Q | Record ref -> event timeline, policy dan related receipts | Read adapters/audit; data difilter dahulu |
| ADV-05 | `diagnose_checkout` S | Cart, catalogue version, fulfilment -> price/stock/loyalty conflicts dan next steps | `commerce.ts`, cart; tidak reserve stok |
| ADV-06 | `reconcile_payments` Q | Order refs, recorded provider facts -> mismatch report | Canonical payment records; fetch provider sebagai tool effect berasingan yang diaktifkan |
| ADV-07 | `preview_refund` S | Order/lines/amount -> refund, commission dan loyalty impact | Domain policies; missing allocation menghasilkan insufficient_data |
| ADV-08 | `propose_refund` D | Valid preview ref + reason -> immutable proposal | Approval service; founder execution berasingan |
| ADV-09 | `assess_expiry_risk` S | Approved location/time window -> FEFO risk dan stock facts | Inventory/lot records; missing expiry jelas |
| ADV-10 | `plan_restock` S | Location/SKU/horizon -> quantity recommendation dengan assumptions | Stock, observed sales dan lead-time; tiada PO/stock transfer automatik |
| ADV-11 | `trace_batch` Q | Lot ref -> scoped receipts/movements/consignments/cases | Inventory/QC joins; redacted affected-order views |
| ADV-12 | `propose_quarantine` D | Lot/revision/evidence -> bounded proposal dan affected available units | Inventory/QC canonical; stale stock direvalidate ketika execute |
| ADV-13 | `simulate_campaign` S | Products/cost version/discount -> amount, ratio, limits dan assumptions | `marginGuardian.ts`, marketing; server mengira |
| ADV-14 | `explain_commission` Q | Commission/order -> earning, payout, contra/dispute timeline | `dealers.ts`; dealer scope |
| ADV-15 | `audit_loyalty` Q | Scoped account/order -> earned/redeemed/expired/reversed balance checks | `loyalty.ts`; read-only, tidak repair senyap |
| ADV-16 | `assess_referral` S | Attribution/allowed signals -> policy result dan review reasons | Dealer attribution + customer-risk dependency; tiada rekaan OTP/model score |
| ADV-17 | `reconcile_dayclose` S | Outlet/shift/revisions -> float/sales/expense/cash variance | `operations.ts`, reports; tidak menutup shift |
| ADV-18 | `build_finance_digest` Q | Timezone-aware period -> reconciled aggregates, exclusions dan provenance | `reports.ts`; founder finance grant |
| ADV-19 | `trace_transaction` Q | Transaction ref -> related stock/payment/commission/loyalty effects | Domain receipt linking baharu; jangan dedahkan data silang scope |
| ADV-20 | `export_report` C | Approved report/filter/format -> private artifact ref/hash/expiry | Reports/export service; quota, CSV injection handling dan authorization ketika download |
| ADV-21 | `triage_case` S | Case/evidence refs -> LOCAL_RULES reasons, missing evidence dan SOP | JEV `assessment.ts`/`policyEngine.ts`; tiada vision/confidence rekaan |
| ADV-22 | `plan_consignment` S | Orders/approved route/capacity -> handover checklist dan conflicts | Verified routes/operations; jadual/kapasiti tidak diketahui kekal unknown |
| ADV-23 | `draft_customer_reply` D | Case/order/tone -> private draft dengan sources | Customer-care grant; tiada send atau opt-in tersirat |
| ADV-24 | `build_action_plan` S | Objective + bounded context -> steps, prerequisites, impacts dan approval refs | Workflow planner; cadangan tidak execute |
| ADV-25 | `execute_approved_action` C/X | Proposal ref/hash/revisions + key -> committed receipt/outcome | Dispatcher allowlist kepada command canonical; external effect gated |
| ADV-26 | `reconcile_action` Q/C/X | Action receipt -> observed outcome atau status update berjejak | Jenis mesti dipisah pada registration; provider query dependency dan reconciliation berizin |
| ADV-27 | `inspect_runtime` Q | Allowed component IDs -> redacted health/quota/job/backup diagnostics | Runtime controls/jobs; developer atau founder diagnostic grant; tiada raw env/log |
| ADV-28 | `review_skill_candidate` S | Published/candidate revision + eval refs -> policy/eval review | Intelligence dependency bagi learned candidate; tidak auto-publish |
| ADV-29 | `search_sop` Q | Topic + approved documents -> cited snippets/version/expiry | Knowledge/docs; baseline lexical search dahulu, tiada vector service wajib |
| ADV-30 | `propose_task` D | Source/action plan, assignee/scope/due -> task draft/proposal | `work.ts`; assignment memerlukan scope dan command policy |
| ADV-31 | `evaluate_job_retry` S | Job/attempt/idempotency -> safe/unsafe/unknown + reasons | `automation/jobs.ts`; external unknown outcome menghalang blind retry |
| ADV-32 | `draft_campaign` D | Objective/products + valid simulation -> campaign draft | `marketing.ts`; approval dan publish berasingan |

Pilot founder mempunyai query/evaluation yang diperlukan sahaja. Tool laporan kewangan tidak diberikan kepada semua operational users. Semua materialized plan/export/draft memerlukan authorization menulis; simulator yang menyimpan hasil diclassify D, bukan S tanpa kesan.

`reconcile_action` ialah logical capability; registration sebenar mesti mempunyai nama/skema berasingan bagi read-only inspection dan state-changing reconciliation supaya risk tidak ditentukan oleh input model. `execute_approved_action` hanya menerima proposal ID dan bounded args yang disimpan server, bukan command code/arbitrary action name.

Nama registration sasaran untuk ADV-26: `inspect_action_receipt` (Q), `refresh_external_action_status` (X, hanya provider query yang dibenarkan) dan `apply_verified_action_outcome` (C, bukti provider divalidasi). Setiap registration mempunyai risk class tetap dan acceptance test sendiri; 32 ialah jumlah logical capabilities, bukan had jumlah registered functions.

### 3.1 Registration dan domain contracts wajib

Nama base ADV-01..32 dalam katalog ialah registrations sasaran kecuali pemisahan fixed berikut: ADV-25 `execute_approved_action` hanya C canonical; external execution ialah `execute_approved_external_action` X. ADV-26 hanya tiga nama di atas; **jangan register `reconcile_action` generik**. ADV-24 `build_action_plan` kekal S; specialization `propose_automation` ialah D. ADV-05 `diagnose_checkout` kekal S; `prepare_cart_draft` ialah frontend-only. Ini mengelakkan risk class berubah berdasarkan argument model. ADV-06 kekal Q terhadap facts sedia direkod; jangan hubungi provider tersembunyi di dalamnya. Semua query yang materialize artifact/proposal menggunakan D/C registration yang explicit.

Common input: opaque canonical refs, bukan SQL/path/URL, ISO instants dengan timezone yang jelas, exact allowed fields dan bounded page/ref counts. Common output mengikut seksyen 6. Semua S melaporkan `assumptions`, `missingData`, `policyVersion`, input revisions dan `validUntil` jika dipakai untuk proposal; ia tidak menulis business records. D/C/X mempunyai server-generated operation ID dan idempotency key terikat principal+registration+payload hash; key sama/payload berbeza ialah conflict, key sama/payload sama memulangkan receipt asal. Actor/user/workspace/grants berasal session server, bukan model args.

| ADV | Kontrak khusus yang wajib dipenuhi | Acceptance positif + kegagalan/boundary |
|---|---|---|
| ADV-01 | Input intent/domain enum dan UI module; output eligible registration names/schema refs, risk, availability/reason. Filter permission sebelum ranking; maksimum 8 ditawarkan per langkah | Relevant 8 atau kurang; denied tool tidak bocor melalui descriptions/count; disabled dependency jelas; expired grant tidak boleh enumerate registry penuh |
| ADV-02 | Query scoped entity enums, typed filters, cursor; output minimum hits+per-hit source/revision+nextCursor. Catalogue specialization published-only; tiada free-form joins/global search | Query positive/empty; invalid entity/cursor, injection/oversize dan mixed ownership ditolak/redact tanpa existence leak; page50/51 gate; stable pagination |
| ADV-03 | Refs maksimum20 dan approved fields, expected revisions; per-source snapshots dengan freshness. Bundle tidak mendakwa atomic apabila domains dibaca berasingan | Scope setiap ref/field; mixed revision dilabel atau stale; satu forbidden ref tidak membocorkan kewujudan; max20/21; Operations Brief dan compare output valid |
| ADV-04 | Record+approved timeline projection; policy/version dan receipt links yang principal boleh baca. Tracking projection tidak mengeluarkan raw public token/PII | Own order timeline+tracking; other owner/invalid ref denied seragam; missing event jadi unknown; revoked receipt link tidak expose payload |
| ADV-05 | Published cart line SKU/qty, observed catalogue/promotions/fulfilment refs; canonical reprice memberi line totals, stock/loyalty conflicts dan next step | Stale price, no stock, ineligible loyalty, fractional/negative quantity, duplicate line rules dan invalid fulfilment; no reservation/order/loyalty mutation; frontend cart hanya unsent draft |
| ADV-06 | Approved orders+recorded payment/refund/provider facts per revision; report expected/recorded/matched/missing/uncertain, amount integer sen | Paid/unpaid/partial/duplicate receipt dan refund mismatch; missing provider fact bukan success; read-only DB diff; provider calls count0; finance grant+scope enforced |
| ADV-07 | Order lines, quantities dan refund reason; refundable balance selepas prior committed refunds, commission/loyalty/stock impact; preview ref/hash/revisions/expiry | Full/partial refund; over-refund, stale prior refund, missing cost/allocation dan nonrefundable state; zero-sales ratio null; no payout/stock return sebelum command/QC |
| ADV-08 | Fresh preview ref/hash+reason; immutable server-bound proposal dan status proposed. Write grant distinct daripada read/simulate; founder approve bukan tool output | Same key same proposal; altered hash/key conflict; expired preview ditolak; pending proposal tidak debit ledger; agent self-approval ditolak |
| ADV-09 | Location/SKU/time window, canonical lot expiry and available units; deterministic FEFO risk tiers with policy reasons dan unknown dates | Expiry at timezone boundary, equal expiry stable order, quarantined/expired stock excluded dan missing date unknown; scope branch dan no stock adjustment |
| ADV-10 | SKU/location/horizon+sales window+verified lead-time; recommendation derived from observed available/committed demand dengan assumptions | No sales/lead-time -> insufficient_data; seasonal/noisy data dilabel; quantity bounds/no negatives; no purchase order/transfer/job scheduling; missing domain dependency disabled |
| ADV-11 | Lot ref dan bounded traversal/page; linked movements/receipts/consignments/cases, redacted affected entities dan provenance | Own branch/batch; cross-dealer orders redacted; missing linkage/duplicate movements/large batch paginate; no assumed recall or quarantine execution |
| ADV-12 | Lot+revision, bounded quantity/evidence/reason; quarantine proposal dengan affected currently available units dan impact | Stale stock/CAS conflict, already quarantined, excess quantity, unavailable evidence dan scope denial; one idempotent proposal; zero actual stock change until command |
| ADV-13 | Published products/qty, sale/discount, cost/reward/fee/shipping/return versions; deterministic estimated/actual contribution amount+ratio+thresholds+missing cost | Minimum amount AND ratio; integer rounding, net sales0/negative ratio handling; shipping/reward/refund/expected-loss release no double-count; missing cost blocks eligibility; no fixed margin constant |
| ADV-14 | Commission/order/dealer settlement refs+asOf; earning/held/paid/contra/dispute/allocation timeline dan due/paid/remaining distinct | Dealer scope, partial payout/settlement, refund reversal, dispute hold dan duplicate receipt; manual bank evidence labelled manual; no release/payment verification inferred |
| ADV-15 | Account/order+asOf; reconcile earned/redeemed/expired/reversed/held balance from canonical events, policy reason/exclusions | Refund reversal, expiry boundary, duplicate ledger event, negative/held balance dan other customer denied; no silent repair/write; balances reconcile to source totals |
| ADV-16 | Approved attribution+signal refs only; deterministic policy eligibility/reasons/review-required dan missing signals | Self-referral/duplicate/reversal; absent OTP/device/risk engine -> unknown or disabled dependency; no model score/confidence; no customer surveillance/external lookup |
| ADV-17 | Outlet/shift+expected revisions dan declared cash inputs; deterministic float/sales/expense/receipts/variance with exclusions | Cross-shift receipts, timezone midnight, unpaid sale, cash vs noncash, partial shift dan stale revision; explain variance without closing shift/creating adjustment |
| ADV-18 | Authorized timezone-aware start/end/outlet/report definition; reconciled aggregates+source cutoff/exclusions/freshness | Invalid/oversized period, partial data, refund allocation and double-count checks; founder finance grant; staff/dealer cannot bypass by aggregate query |
| ADV-19 | Transaction ref+bounded related-effect traversal; link payment, inventory, commission, loyalty, proposal/receipt per permissions | Full and incomplete causal chain; missing link unknown; cross-scope child redacted; repeated reference/cycle bounded; no claim audit is replayable journal |
| ADV-20 | Approved report ref/version/filter/CSV or HTML format; private artifact hash, createdAt/expiry/download ref, quota usage | CSV formula injection, HTML escaping, large export limit, download after revoke/expiry and actor scope; partial/failed generation no success artifact; public bucket/link prohibited |
| ADV-21 | Case/authorized evidence refs+policy/SOP revision; deterministic LOCAL_RULES result/reasons/missing evidence and review recommendation | Missing/corrupt/unsupported attachment, suspicious SOP instruction, unrelated case/lot; result states LOCAL_RULES and no invented vision/confidence; no automatic compensation |
| ADV-22 | Authorized orders/verified route/capacity/dispatch window; checklist/allocation suggestions and conflict refs | Missing capacity/route -> unknown; overlapping/oversize/ineligible orders rejected; no fabricated ETA and no booking, route optimization service or handover mutation |
| ADV-23 | Scoped case/order+approved tone/locale and verified product/SOP refs; private customer-reply draft with claims cited | Unsupported claim/guarantee removed/flagged; PII not needed omitted; malicious message cannot trigger tools; same key one draft; no outbound send/consent inferred |
| ADV-24 | Bounded objective/context; action plan steps with tool refs, prerequisites, impacts and approval requirements. Automation D specialization stores immutable trigger/scope/budget/dry-run/disable proposal | Plan respects available grants and six-call budget; unavailable action blocked; plan alone no effect; automation duplicate proposal/unsupported trigger/no dry-run denied; no schedule enabled |
| ADV-25 | Canonical execution accepts proposal ref/hash/expected revisions/key only; command name/args loaded server from immutable proposal. X registration requires provider gates+durable intent+explicit outbound intent | Fresh approve success -> one durable receipt; reject/expire/revoke/stale/hash tamper/duplicate/CAS conflict denied; timeout after effect unknown; no arbitrary action/SQL/URL, no automatic paid route |
| ADV-26 | Q receipt inspection; X allowlisted external status read; C apply verified outcome with provider evidence+expected revision. Each fixed registration reauthorizes actor | Read-only inspection causes zero writes/provider calls; external status cannot send/refund; forged provider proof rejected; reconcile repeated evidence idempotent; CAS failure after provider success retained unknown/pending, never blind retry |
| ADV-27 | Allowed component/job/quota/backup IDs and diagnostic grant; redacted health/admission/version/age/status | Diagnostic user has no finance grant; raw env/log/file/command requests denied; unreachable component degraded not fabricated healthy; response contains no tokens/PII/provider raw bodies |
| ADV-28 | Intelligence candidate/published skill revision+evidence/eval refs; review report with approval recommendation, failing checks and source links | No Intelligence -> blocked_external; failed/poisoned/uncited candidate rejected; review does not publish; skill cannot modify grants/refund/pricing; holdout/regression and rollback linked |
| ADV-29 | Approved document/topic/version/section refs; lexical search first, cited snippets/summary with retention/expiry/missing context | ACL/revoked/deleted/version-stale docs excluded; prompt injection treated as text; unsupported summary statement flagged; bounded query/window; model summary consumes shared budget; no vector service purchase |
| ADV-30 | Source/workflow ref, allowed assignee/resource scope/due timezone, reason; task draft/proposal with source/revision | Missing assignee access, invalid due, other outlet/user, duplicate submission and source stale; no assignment/notification claimed until canonical command receipt; one draft per idempotent request |
| ADV-31 | Job/attempt/lease/receipt/idempotency refs; safe/unsafe/unknown recommendation+evidence, prerequisite and next allowed action | Lease active, already completed, known retryable pre-effect failure, unknown external outcome, exhausted attempts and disabled worker; evaluate performs no retry, scheduler checks again before dispatch |
| ADV-32 | Marketing objective, published product refs+fresh simulation and rights/locale; private campaign draft with simulation hash/versions and approval requirements | Expired/failed simulation, missing rights/facts, unsafe margin, quarantined/expired products and duplicate draft; no publish/send/schedule; facts/cost change invalidates downstream approval |

Setiap row memerlukan sekurang-kurangnya positive fixture, malformed input, insufficient-data/dependency, permission/scope dan applicable duplicate/stale/error cases. C/X memerlukan durable receipt, restart/CAS/idempotency/unknown-outcome suite; Q/S memerlukan no-mutation assertion; D memerlukan draft-only assertion. Semua live tool claims mesti menunjukkan registration discovery/call/result melalui ADK atau frontend AG-UI yang benar, bukan direct unit invocation sahaja.

### 3.2 Authorization dan availability

Grants ialah per-registration+resource, bukan role wildcard. Default pilot: founder dengan grants read/draft yang diaktifkan; finance/diagnostics/commands kekal explicit. Staff hanya assigned outlet/tasks; dealer hanya organisasi/deal sendiri; customer hanya published catalogue dan rekod sendiri. Developer diagnostics tidak memberi read finance. Parent/subagent hanya menerima subset effective grants, dan tool boundary mengesahkan semula revoke/expiry untuk setiap call.

Availability per registration: disabled sebelum dependency/schema/auth ready; ready hanya selepas acceptance scope tertentu; degraded apabila read masih sah tetapi dependency sebahagian unavailable; blocked_external untuk Intelligence/provider/hosting yang tiada. Data missing ialah result status, bukan alasan mengaktifkan mock. Model/provider order tetap ADR; eval boleh disable calon yang tidak selamat/tidak sesuai, bukan memilih offering baharu, paid fallback atau menukar primary sendiri.

## 4. Efficiency layer yang ditetapkan

1. **Contextual discovery:** tawarkan maksimum 8 tool relevan setiap langkah pilot. Filter oleh grant dahulu, kemudian intent. Tiada semua schema 32 tool dalam setiap prompt; routing mudah menggunakan rules sebelum inference.
2. **Batch reads:** context bundle dengan field projection, pagination dan aggregate server mengelakkan N+1 calls. Setiap resource masih disemak; satu input batch yang terlarang tidak membocorkan kewujudannya.
3. **Cache berizin:** key mengandungi workspace/user/grants revision/entity revision/policy version. Tiada cache global PII. Reauthorize sebelum serve; data kewangan/stock mesti fresh pada command.
4. **Deterministic first:** margin, totals, FEFO, variance dan eligibility dikira kod. Model hanya menerangkan atau mengatur cadangan dengan sumber.
5. **Plan -> preview -> approve -> execute -> reconcile:** setiap fasa mempunyai artifact/revision. Preview bukan reservation; approval lama dibatalkan jika keadaan material berubah.
6. **Run budget tunggal:** token, calls dan deadline dikongsi parent/subagents. Kekalkan depth 1, specialist concurrency 2 dan maksimum 3 specialist calls bagi pilot sedia dirancang; tambah specialist hanya selepas eval.
7. **Bounded retry:** read yang selamat boleh retry mengikut policy; command memerlukan receipt lookup. Quota 429 menyebabkan cooldown dan failover percuma layak, bukan retry storm.
8. **Async secara jujur:** pekerjaan lama hanya diterima apabila durable worker tersedia; status accepted/job ID berbeza daripada succeeded. Tanpa worker, pulangkan batas kemampuan.

Budgets awal yang tetap: maksimum 50 item per query page, 20 refs per context bundle, 6 total tool invocations per interactive run dan 30 saat deadline interactive. Maksimum 3 model/provider attempts keseluruhan parent+children+retry+failover; setiap request maksimum input 8,192 token/output 1,024 token dan jumlah run maksimum input 24,576/output 3,072 token. Had token sebenar provider yang lebih rendah menang; semak size sebelum dispatch dan jangan menjanjikan count tepat tanpa tokenizer/usage evidence. Pagination/discovery turut dikira; run baharu memerlukan semakan pengguna apabila budget tamat. Operator boleh merendahkan had; menaikkan had memerlukan benchmark/review direkod. External calls kekal mempunyai timeout dalam baki deadline; max retries tidak menambah budget.

Accounting eksplisit: setiap dispatch tool, termasuk discovery, pagination, delegation dan tool child, menggunakan satu unit daripada had enam; setiap retry dispatch juga satu unit. Provider retry/failover tanpa tool dispatch menggunakan baki model-call/token/deadline budget yang berasingan, dengan maksimum tiga provider attempts per run pilot. Ia tidak mendapat budget baharu melalui subagent. Depth 1/concurrency 2/max 3 specialist calls ialah ceilings, bukan jaminan parent dan tiga model specialists semuanya boleh berjalan dalam satu run; shared model cap tetap tiga. Workflow boleh merentasi beberapa interactive run dengan artifact/approval durable, tanpa memulakan run tambahan secara senyap. Jika budget tamat selepas effect didispatch, hentikan effect baharu dan kekalkan receipt/status unknown; reconciliation wajib diteruskan melalui job berizin dengan budget recovery berasingan, atau dinyatakan pending manual jika worker tiada. Budget expiry tidak membuktikan effect dibatalkan dan tidak membenarkan blind retry.

Rate limiting berasingan daripada run budget: setiap runtime/MCP/canonical endpoint memakai server policy scope principal+workspace+route/risk serta admission/concurrency gates daripada execution contract. Anonymous/public tracking memakai bucket berasingan; jangan mencampurkannya dengan founder tools. 429 memberikan reason/retry-after tanpa PII, memotong retry storm dan tidak menggunakan identity/provider baharu untuk bypass quota. Tiada nilai request-per-minute direka dalam dokumen ini; exact configured values dan limit/limit+1 evidence mesti direkod sebelum activation. Jika tiada limiter canonical, tool terjejas tidak ready.

## 5. Empat workflow rujukan

### A. Morning operations brief

Founder meminta keutamaan hari ini -> capability discovery -> context bundle order/stock/QC/day-close -> rules menyusun isu mengikut impak dan urgency -> digest dengan record links -> draf task bagi isu dipilih. Tiada order/stock berubah hanya kerana brief dijana.

### B. Aduan botol bocor

Case context + batch trace -> JEV LOCAL_RULES + SOP citations -> missing evidence -> refund/quarantine preview -> founder review -> command canonical -> receipt. Multi-order affected-batch views difilter mengikut role; gambar bukan vision diagnosis secara automatik.

### C. Promosi stok hampir luput

FEFO risk -> semak QC/sale eligibility -> campaign simulation dengan cost version -> draft -> approval -> publish hanya jika integration, consent, expiry dan outbound intent tersedia. Produk quarantine/expired kekal disekat walaupun model mencadangkan promosi.

### D. Day-close dan komisen

Variance analysis -> trace transactions -> payment/commission/loyalty mismatch report -> cadangan investigation/task. Adjustment memerlukan preview, reason dan approval yang ditetapkan; jangan auto-balance ledger untuk menghilangkan variance.

## 6. Tool result dan policy errors

Setiap result mempunyai `toolVersion`, request/run ID, scope, observedAt, source refs/revisions, policy version, status, missingData, pagination, usage dan freshness. Mutation menambah operation/receipt ID serta durable outcome. Financial values menggunakan integer sen. Reason codes terhad dan user-safe; tiada secret/provider raw errors.

Output successful Q/S mesti mempunyai validated `data` dan provenance; result empty/insufficient tidak mengandungi success-shaped financial placeholder. D result mengandungi draft/proposal ID/hash/state; C/X mengandungi canonical command/intent/receipt state. Protocol tool-call completion bermaksud tool memberi result, bukan bermaksud mutation succeeded. Status domain termasuk proposed/approved/rejected/expired/stale/executing/succeeded/failed/unknown_outcome; UI adapter memetakan status tanpa mengubah authority. `scope` dalam output ialah redacted display metadata, bukan server grant/token.

Bezakan forbidden, insufficient_data, stale_revision, approval_required, provider_unavailable, quota_exhausted, external_unknown_outcome dan conflict. Domain result bukan model probability. Confidence/calibration hanya jika evaluator sebenar menyediakannya dengan provenance.

Tiada arbitrary internet browsing/MCP access untuk semua agent. Connector baharu mesti diinventori, dipin dan diberi grant sempit; imported SOP, tool result dan kandungan luar tidak boleh menaikkan kuasa. Sending/publishing kekal command berizin; penulisan reka bentuk ini tidak menghantar apa-apa mesej.

## 7. Peringkat dan acceptance

| Batch | Tool calon | Bukti sebelum activation |
|---|---|---|
| AT-0 | Registry/policy/context contracts | Schema, role/resource tests, expiry/deadline dan capability disabled reasons |
| AT-1 | 01–05, 09, 13–15, 17–19, 21, 27, 29 | Read/simulation pilot; canonical totals, source citations, no mutation dan cross-user denial |
| AT-2 | 07–08, 10–12, 22–24, 30, 32 | Preview/draft versioning, missing-data dan approval flow |
| AT-3 | 06, 16, 20, 25–26, 31 | Provider/risk dependencies, CAS, idempotency, unknown outcome dan private artifacts |
| AT-4 | 28 dan reviewed learning integration | Intelligence/kos/data gates, eval, published revision dan rollback |

Batch ialah dependency order, bukan janji semua tools sudah ada. Sesuatu tool kekal disabled jika prerequisite domain tiada. Tiada generic write tool untuk menggantikan modul belum siap.

Ujian wajib: mixed-scope batch, stale cache selepas revoke, prompt/tool injection, malformed declaration, expired preview, duplicate approval, quota exhaustion, provider pricing drift, worker restart dan CAS conflict selepas external outcome. Replayed UI tidak melaksanakan command lagi.

Ukur baseline vs pilot: time-to-complete workflow, bilangan langkah manual, tool/model calls, p50/p95 latency, tokens, grounded-answer accuracy, wrong/denied tool attempts dan duplicate mutation count. Sasaran integriti ialah sifar unauthorized/double mutation dalam suite; tiada dakwaan peratus efficiency improvement sebelum ukuran. Data synthetic eval berasingan daripada data production; independent reviewer menilai evidence.

## 8. Evidence register dan completion

Sediakan satu record bagi setiap ADV-01..32 dan MOD-01..10, serta records child bagi setiap specialization/risk split. Fields minimum: logical/module ID, registration+schema version, source files/hashes, dependency/command adapter, risk/grant/scope, status, test command/result/date, synthetic-vs-live label, redacted protocol/toolCall/run/receipt refs, negative case evidence, limitation dan reviewer. Kiraan logical32 tidak memadam keperluan menguji registration tambahan.

Completion dinilai dalam tiga dimensi: sepuluh CPK capabilities, tujuh GUI approaches dan sepuluh modul/32 logical tools. CPK Chat ready tidak meluluskan modul Finance; component_present tidak meluluskan MCP Apps; query result yang betul tidak meluluskan command receipt. `blocked_external` bukan complete dan tidak menghalang batch bebas yang authorized. Tiada installation, auto-login, project selection, cloud subscription, payment atau outbound message dibenarkan oleh dokumen reka bentuk ini.

Rujukan rasmi disemak melalui web/Context7 pada 20 Oktober 2026: [ADK frontend tools](https://docs.copilotkit.ai/google-adk/frontend-tools), [ADK HITL](https://docs.copilotkit.ai/google-adk/human-in-the-loop), [ADK sub-agents](https://docs.copilotkit.ai/google-adk/multi-agent/subagents) dan [MCP Apps](https://docs.copilotkit.ai/google-adk/generative-ui/mcp-apps). Nama domain registrations, grants, envelopes dan thresholds dalam dokumen ini ialah kontrak ABANGCOLEK, bukan API SDK yang didakwa tersedia. Pin/exports/signatures dibuktikan semula pada implementasi; source/docs availability sahaja tidak meluluskan live behavior.
