# ABANGCOLEK — Advanced Tool Registry dan Workflow

Tarikh: 19 Oktober 2026. Status: Cadangan reka bentuk; tiada tool baharu dilaksanakan melalui dokumen ini.

Authority semasa: blueprint v2.3 dan [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md). [Prompt utama](../prompts/IMPLEMENT-ABANGCOLEK.md) menetapkan pilihan stack, model dan urutan; pelaksana tidak memilih architecture alternatif. [Tujuh pendekatan UI](copilot-generative-ui-seven-approaches.md) ialah dimensi acceptance tambahan.

## 1. Tujuan dan hubungan

Mengembangkan [10 kemampuan CopilotKit](copilotkit-ten-features.md) menjadi workflow operasi berkesan mengikut [master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md). [Polisi model percuma](../research/2026-10-19-free-model-policy.md) terpakai kepada semua inference, subagent, evaluator berasaskan model dan proses latar belakang. Kiraan margin, reconciliation dan authorization kekal kod deterministik tanpa memerlukan LLM.

Rujukan integrasi: [CopilotKit frontend tools](https://docs.copilotkit.ai/google-adk/frontend-tools), [ADK custom tools](https://adk.dev/tools-custom/), [sub-agents](https://docs.copilotkit.ai/google-adk/multi-agent/subagents). Registry/kontrak domain berikut ialah reka bentuk ABANGCOLEK; ia bukan nama API SDK rasmi atau kemampuan yang sudah dipasang.

### 1.1 Liputan wajib kesemua 10 modul aplikasi

Semua modul berikut termasuk dalam skop Copilot sasaran. Jadual ini membezakan kemampuan yang sudah dipetakan dalam katalog calon daripada kontrak tambahan yang masih perlu diperincikan. Tiada row bermaksud integrasi aktif atau verified.

| Modul | Bantuan Copilot yang diwajibkan dalam reka bentuk | Pemetaan calon dan jurang |
|---|---|---|
| Storefront & katalog | Cari/terangkan produk, bantu pilih dan sediakan troli | ADV-02/03/05; tambah kontrak `search_catalogue`, `compare_products`, `prepare_cart_draft` untuk atribut published, allergy/product facts yang disahkan, harga/version dan kuantiti; tiada order/reservation/payment tersirat |
| Orders & tracking | Cari order berizin, terangkan status dan cadangkan susulan | ADV-02/04/05/07/08/19; tambah output `get_order_tracking` berizin; private order access dan public tracking token mesti mempunyai projection berasingan |
| Inventory | Semak baki, batch, expiry dan cadangkan restock/siasatan | ADV-03/09/10/11/12; bezakan physical, reserved, quarantined dan available; unknown lead-time tidak direka |
| QC & JEV | Triage aduan, semak evidence dan cadangkan penyelesaian | ADV-11/12/21/23/24/29; evidence file bukan bukti vision analysis; penilaian semasa LOCAL_RULES |
| Dealer & komisen | Terangkan jualan, kelayakan, settlement dan adjustment | ADV-04/14/19; tambah kontrak `explain_dealer_settlement` untuk outstanding, allocation dan payment provenance; tiada pengesahan pindahan bank tanpa bukti |
| Loyalty & referral | Terangkan baki, kelayakan, expiry dan sebab ganjaran disekat | ADV-04/15/16; tambah projection balance/expiry dan policy reason; dealer attribution tidak dianggap customer-risk engine lengkap |
| Marketing | Copy, cadangan kempen dan pengiraan margin sebenar | ADV-13/24/32; draf berdasarkan produk published dan rights; approval/publish berasingan |
| Finance & day-close | Ringkaskan variance, semak rekod dan reconciliation | ADV-06/17/18/19/20; founder finance grant dan sempadan tempoh/cawangan; tiada auto-adjust ledger |
| Tasks, documents & SOP | Cari panduan, ringkaskan dokumen dan draf tugasan | ADV-02/23/24/29/30; tambah kontrak `summarize_document` dengan document version, permission dan citation; kandungan dokumen tidak memberi tool authority |
| Automations & integrations | Terangkan job, cadangkan automasi dan diagnosis berizin | ADV-24/26/27/31; tambah kontrak `propose_automation` dengan trigger, scope, budget, dry-run dan disable policy; tiada enable/schedule/external send tersirat |

Nama kontrak tambahan ialah calon reka bentuk, bukan registered tools atau penambahan kepada kiraan 32 logical capabilities semasa. Sebelum implementasi, tentukan sama ada ia specialization tool sedia ada atau capability baharu, kemudian kemas kini registry/version/count serta ujian. Jangan menyembunyikan jurang sebagai tool siap.

### 1.2 Aturan liputan merentas modul

- Setiap modul mempunyai query yang scoped, output/provenance schema, error/missing-data state dan acceptance test sendiri.
- Frontend actions hanya menyediakan UI/draf; submission mengikut command domain dan persetujuan yang diperlukan.
- Role/resource matrix diuji bagi founder, staff, dealer dan customer sebelum sesuatu modul dibuka. Developer diagnostics tidak memberikan business-data grants secara automatik.
- Satu workflow rentas modul tidak boleh memperluas scope daripada rekod asal atau mengekalkan cache selepas akses ditarik balik.
- Liputan modul direkod berasingan daripada 10 kemampuan CopilotKit. Menyiapkan Chat atau tool discovery tidak bermaksud semua modul berintegrasi.

## 2. Satu registry, kuasa berbeza

Setiap definisi menyimpan nama/versi, input/output schema, owner domain, kategori risiko, role/capability, resource scope, approval policy, idempotency, expected revisions, deadline, quota, data classification dan status availability dengan sebab. Availability ialah disabled, ready, degraded atau blocked_external berdasarkan dependency sebenar; definisi wujud tidak bermaksud ready.

| Kelas | Kesan | Kawalan |
|---|---|---|
| Q — query | Baca rekod berizin | Ownership, field projection, pagination dan data freshness |
| S — simulation | Pengiraan tanpa mutasi bisnes | Input provenance, policy version, assumptions dan expiry |
| D — draft/proposal | Simpan draf atau permintaan | Hak menulis jenis rekod itu, revision/idempotency dan audit; tiada execution tersirat |
| C — command | Mutasi domain sebenar | Tool grant, fresh principal, guard, approval jika diwajibkan, durable commit dan receipt |
| X — external effect | Mesej, publish atau gateway effect | C semua + provider activation, consent/explicit intent, durable intent dan reconciliation |

Founder-only bukan alternatif kepada resource checks. Customer hanya rekod sendiri, dealer organisasi sendiri, staff tugasan/cawangan dibenarkan. Developer diagnostics tidak memberikan akses kewangan. Subagent menerima subset grant parent. Role sahaja tidak memberi semua tool; setiap row di bawah masih memerlukan capability-specific grant.

## 3. Katalog 32 tool calon

Semua nama ialah cadangan stabil untuk kontrak. Source owner menunjukkan tempat adapter boleh disambung, bukan dakwaan algoritma lanjutan sudah tersedia. Model tidak mendapat SQL, filesystem, arbitrary HTTP, shell atau eval generik.

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

## 4. Efficiency layer yang dicadangkan

1. **Contextual discovery:** tawarkan maksimum 8 tool relevan setiap langkah pilot. Filter oleh grant dahulu, kemudian intent. Tiada semua schema 32 tool dalam setiap prompt; routing mudah menggunakan rules sebelum inference.
2. **Batch reads:** context bundle dengan field projection, pagination dan aggregate server mengelakkan N+1 calls. Setiap resource masih disemak; satu input batch yang terlarang tidak membocorkan kewujudannya.
3. **Cache berizin:** key mengandungi workspace/user/grants revision/entity revision/policy version. Tiada cache global PII. Reauthorize sebelum serve; data kewangan/stock mesti fresh pada command.
4. **Deterministic first:** margin, totals, FEFO, variance dan eligibility dikira kod. Model hanya menerangkan atau mengatur cadangan dengan sumber.
5. **Plan -> preview -> approve -> execute -> reconcile:** setiap fasa mempunyai artifact/revision. Preview bukan reservation; approval lama dibatalkan jika keadaan material berubah.
6. **Run budget tunggal:** token, calls dan deadline dikongsi parent/subagents. Kekalkan depth 1, specialist concurrency 2 dan maksimum 3 specialist calls bagi pilot sedia dirancang; tambah specialist hanya selepas eval.
7. **Bounded retry:** read yang selamat boleh retry mengikut policy; command memerlukan receipt lookup. Quota 429 menyebabkan cooldown dan failover percuma layak, bukan retry storm.
8. **Async secara jujur:** pekerjaan lama hanya diterima apabila durable worker tersedia; status accepted/job ID berbeza daripada succeeded. Tanpa worker, pulangkan batas kemampuan.

Budgets awal untuk diuji: maksimum 50 item per query page, 20 refs per context bundle, 6 total tool invocations per interactive run dan 30 saat deadline interactive. Pagination/discovery turut dikira; run baharu memerlukan semakan pengguna apabila budget tamat. Sesuaikan selepas mengukur, bukan mendakwa optimum. External calls kekal mempunyai timeout dalam baki deadline; max retries tidak menambah budget.

Accounting eksplisit: setiap dispatch tool, termasuk discovery, pagination, delegation dan tool child, menggunakan satu unit daripada had enam; setiap retry dispatch juga satu unit. Provider retry/failover tanpa tool dispatch menggunakan baki model-call/token/deadline budget yang berasingan, dengan maksimum tiga provider attempts per run pilot. Ia tidak mendapat budget baharu melalui subagent. Workflow boleh merentasi beberapa interactive run dengan artifact/approval durable, tanpa memulakan run tambahan secara senyap. Jika budget tamat selepas effect didispatch, hentikan effect baharu dan kekalkan receipt/status unknown; reconciliation wajib diteruskan melalui job berizin dengan budget recovery berasingan, atau dinyatakan pending manual jika worker tiada. Budget expiry tidak membuktikan effect dibatalkan dan tidak membenarkan blind retry.

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
