# Kilo Code — matriks implementasi dan bukti 85 requirement

Companion wajib kepada [prompt induk](KILO-COMPLETE-PROJECT-20261021.md). Tarikh snapshot: **21 Oktober 2026**. Jadual ini memetakan skop, bukan ledger kedua. Status semasa mesti dibaca daripada `reports/implementation/acceptance-status.json`; jangan mengekalkan angka snapshot sebagai keputusan verification baharu.

## Cara menggunakan matriks

1. Inventori tepat: **10 CPK + 7 GUI + 10 MOD + 32 ADV + 19 domain + 7 EXT = 85**. Jangan menggugurkan ID yang blocked atau menukar denominator untuk mendapatkan 100%.
2. Satu assignment worker = satu ID dan exact file list. Paket KILO ialah urutan integrasi; dependencies boleh menyebabkan satu ID disentuh pada beberapa paket sebelum benar-benar ditutup.
3. Setiap row memerlukan acceptance positif **dan** negatif/boundary dalam lajur terakhir, ditambah kontrak terperinci blueprint/ADV. Ia bukan arahan membuat satu test cetek bagi setiap baris.
4. Cari existing test dari ledger/source dan tambah meaningful regressions di situ. Source path/test path mesti disahkan; rujukan `.tsxx` dalam ledger snapshot salah. Test baharu yang ditetapkan di bawah berstatus PLANNED sehingga dicipta.
5. Penuhi seluruh row sebelum verified; helper/component pass tidak menutup live protocol/browser/hosted requirement. Catat environment dan limits. Apabila code sudah ada, buktikan dan review, jangan membina salinan kedua.

## A. Sepuluh ciri CopilotKit

| ID | Ciri dan paket utama | Bukti positif dan negatif yang diwajibkan |
|---|---|---|
| CPK-01 | Chat runtime; KILO-01/05 | Browser session sah -> SDK runtime -> ADK/provider sebenar -> grounded reply dengan provenance. No actor, body-forged actor, unavailable/quota provider ditolak secara bertipe; tiada echo/mock atau silent paid fallback. Text-only bridge bukan proof tools/state. |
| CPK-02 | AG-UI Streams; KILO-05 | Mounted owned thread persistence/replay, ordered cursor, reconnect tanpa duplicated effects dan restore dengan principal segar. Cross-user/workspace, cursor salah, revoked membership ditolak. Hosted saved runs/cross-device memerlukan bukti offering berasingan jika diwajibkan kontrak. |
| CPK-03 | Automatic Learning; KILO-08 | Real evidence -> evaluated candidate -> human publish -> versioned delivery -> rollback, official Intelligence client/identifyUser wired. Failed eval/cross-scope/absent entitlement tidak publish; local pipeline tidak dikira hosted offering. |
| CPK-04 | Generative UI; KILO-05/06 | Tool/state sebenar menghasilkan validated card dengan actual source values pada route browser. Invalid props, fabricated amounts, unknown components dan denied records tidak dirender. |
| CPK-05 | Declarative UI; KILO-06 | Versioned catalog dimuat startup dan middleware sebenar mengeluarkan bounded Fixed Schema surfaces. Invalid catalog/revision/depth/size/action fail closed; tiada runtime-generated arbitrary code. |
| CPK-06 | Human-in-the-loop; KILO-03/06 | Canonical proposal -> approval -> fresh grants/revisions -> command -> durable receipt -> UI. Expired/decided/revoked/stale/tampered/concurrent requests tidak menulis dua kali; crash recovery dibuktikan. |
| CPK-07 | Frontend tools; KILO-06 | Tool schemas sampai ke agent dan browser callback membuka authorized order/filter/highlight/unsent draft. Arbitrary route/JS, denied record dan stale price ditolak; tiada business write melalui UI tool. |
| CPK-08 | Shared state; KILO-04/06 | Order/filter/draft yang dibenarkan konsisten antara page/chat/Pet menggunakan scope dan revision tepat. Stale/cross-account/server-state-forgery ditolak; logout mengosongkan local state milik pengguna. |
| CPK-09 | Headless UI; KILO-04/05 | Pet/workspace berkongsi controller, transcript, thread dan run sebenar; switching tidak duplicate request. Logout/login B dan late A events tidak membocorkan transcript. Named browser/assertion evidence, bukan ID equality sahaja. |
| CPK-10 | Sub-agents aplikasi; KILO-05 | Actual delegation ops -> commerce_reader/qc_jev_reviewer/marketing_drafter dengan narrow grants, shared budget/deadline dan trace. Denied child/recursive depth/call overflow/timeout fail safely; child tidak boleh melaksanakan write tanpa canonical approval. |

## B. Tujuh pendekatan Generative UI

| ID | Pendekatan dan paket utama | Bukti positif dan negatif yang diwajibkan |
|---|---|---|
| GUI-01 | Display Only; KILO-06 | Official tool result -> read-only ABANGCOLEK card; actual values/source/revision/missing data. No script/HTML execution atau click-to-write yang tidak diisytihar. |
| GUI-02 | Interactive; KILO-03/06 | Real callback melalui browser -> authorized server decision -> durable result/receipt. Double-click, expired proposal, revoked role, payload swap dan error memberi state tepat; mounted approval card sahaja tidak cukup. |
| GUI-03 | Tool Rendering; KILO-06 | Actual start/result/error/cancel event mengawal status component, bertahan split stream/reconnect. Out-of-order/duplicate event tidak menjadi fabricated completed action. |
| GUI-04 | State Rendering; KILO-06 | STATE_SNAPSHOT/STATE_DELTA sebenar merender state scoped dengan pemisahan client/entity/policy revisions. Invalid patch, old revision, cross-scope dan unknown fields ditolak. |
| GUI-05 | MCP Apps; KILO-01/02/06 | MCP initialize -> scoped Operations Brief tool -> UI resource -> real sandboxed host handshake/render. Expired authority, wrong origin/source, arbitrary resource/proxy, oversized payload dan CSP escape ditolak. |
| GUI-06 | A2UI Fixed Schema; KILO-06 | Approved startup catalog/middleware/renderer pada live route; bounds dan allowlisted components. Unknown component/action, cycle/depth/size/patch overflow ditolak sebelum render; tiada Dynamic Schema model. |
| GUI-07 | Your Components; KILO-06 | Actual ABANGCOLEK components registered dan accessible dalam desktop/mobile, light/dark, keyboard/reduced-motion; loading/error/empty state betul. Invalid prop dan hidden inaccessible action tidak diterima. |

## C. Sepuluh modul aplikasi

| ID | Modul dan paket utama | Bukti positif dan negatif yang diwajibkan |
|---|---|---|
| MOD-01 | Storefront/katalog; KILO-06/07/10 | Published product search/compare -> truthful cart draft -> reprice confirmation. Unpublished, disabled, forged/stale price, missing facts dan invalid quantity tidak membuat order/reservation. Empty catalogue bukan fake seeded business. |
| MOD-02 | Orders/tracking; KILO-02/07 | Owner-authorized private timeline dan minimum public token projection. Wrong owner, guessed ID, expired/revoked token, PII leakage dan payment redirect tanpa verification ditolak. |
| MOD-03 | Inventory; KILO-07 | Physical/reserved/quarantined/available dengan lots, FEFO dan expiry sebenar. Negative stock, expired/quarantine sale, cross-location read/write dan stale lot revision ditolak secara atomic. |
| MOD-04 | QC/JEV; KILO-03/07 | Authorized case/evidence -> LOCAL_RULES assessment -> SOP/proposal -> canonical approved effect. Missing/unsupported evidence tidak menjadi confidence/vision PASS; cross-case dan stale quarantine/refund ditolak. |
| MOD-05 | Dealer/komisen; KILO-07 | Scoped earning/allocation/due/recorded payment/contra/dispute provenance. Cross-org, partial settlement double count, refund contra duplication dan bank-confirmed claim tanpa bukti ditolak. |
| MOD-06 | Loyalty/referral; KILO-07 | Real ledger earned/redeemed/expired/reversed/held serta separate dealer/customer rewards. Duplicate/self referral, expiry boundary, concurrent redemption dan forged signals diuji; unknown risk tidak direka. |
| MOD-07 | Marketing; KILO-07/08 | Campaign draft menggunakan published facts/asset consent dan deterministic amount+ratio margin. Unverified claim, expired stock, reward/cost double-count, no opt-in dan unapproved publish/send ditolak. |
| MOD-08 | Finance/day-close; KILO-07 | Authorized timezone-aware aggregates menggunakan actual cost basis, exclusions dan reconciliation. Missing cost !=0, wrong outlet/grant, unpaid !=paid dan ledger auto-adjust ditolak. |
| MOD-09 | Tasks/docs/SOP; KILO-07 | Permitted cited source/version/expiry dan task draft/assignment melalui canonical command. Revoked/expired document, injection, unsupported statement dan unauthorized assignee ditolak. |
| MOD-10 | Automations/integrations; KILO-03/07/08 | Redacted job/attempt health, retry diagnosis dan dry-run bounded automation proposal. Unknown effect tidak blind retry; proposal tidak enable/schedule/send; required scope/budget/disable policy tidak boleh hilang. |

## D. Semua 32 advanced capabilities

Q = read-only query; S = simulation tanpa business effect; D = materialized draft/proposal; C = canonical command; X = external effect. Risk class tetap pada registration, tidak dipilih melalui args model. Ikut kontrak terperinci `docs/design/copilot-advanced-tools.md`.

| ID | Registration/logical capability dan paket | Bukti positif dan negatif yang diwajibkan |
|---|---|---|
| ADV-01 | discover_capabilities Q; KILO-05/07 | Intent -> <=8 eligible tool schemas dengan reason/dependency availability. Denied tools tidak bocor melalui list/description/count; expired grant ditolak. |
| ADV-02 | search_records Q; KILO-07 | Scoped typed search/cursor -> hits+source/revision/nextCursor; search_catalogue published-only. Invalid entity/cursor, injection, mixed owner dan page 51 ditolak. |
| ADV-03 | build_context_bundle Q; KILO-06/07 | <=20 authorized refs+allowed fields dengan actual per-source revisions; compare_products/get_operations_brief specialization. Forbidden ref, 21 refs dan mixed revisions tidak menjadi false atomic snapshot. |
| ADV-04 | explain_record Q; KILO-07 | Authorized event/policy/receipt timeline; get_order_tracking/explain_dealer_settlement scoped specialization. Raw public token/PII, other owner, inaccessible receipt link dan missing facts tidak dibocor/direka. |
| ADV-05 | diagnose_checkout S; KILO-07 | Semua price/stock/fulfilment/voucher/loyalty/catalogue conflicts dan actionable next steps; frontend prepare_cart_draft unsent sahaja. Stale/invalid quantity tidak reserve/create order atau silently accept new total. |
| ADV-06 | reconcile_payments Q; KILO-03/07 | Recorded provider facts vs canonical payment/order mengeluarkan mismatch report. Tidak hidden-fetch provider, tidak menganggap redirect/bank note sebagai confirmed paid; pending->paid dan duplicate facts ditangani betul. |
| ADV-07 | preview_refund S; KILO-03/07 | Deterministic refund/commission/loyalty impacts, immutable payload hash, source/policy revisions dan validUntil. Missing allocation, tamper, expiry, stale preview dan rounding drift ditolak. |
| ADV-08 | propose_refund D; KILO-03/07 | Valid preview + reason -> immutable scoped proposal terikat preview/hash/revisions. Changed amount/order, expired preview, unauthorized actor dan duplicate payload conflict ditolak; tidak execute. |
| ADV-09 | assess_expiry_risk S; KILO-07 | Location/time window -> actual lot/FEFO risks dan missing expiry. Cross-location, timezone edge, expired/quarantined lot serta missing date tidak dilabel safe tanpa sebab. |
| ADV-10 | plan_restock S; KILO-07 | Approved sales/stock/horizon+lead-time -> recommendation dan assumptions. Unknown lead-time tidak direka; zero demand/negative stock diuji; tiada PO/transfer effect. |
| ADV-11 | trace_batch Q; KILO-07 | Authorized lot -> receipts/movements/consignments/cases dengan redacted affected orders. Cross-scope joins/PII dan unknown batch existence leak ditolak. |
| ADV-12 | propose_quarantine D; KILO-03/07 | Lot revision/evidence -> bounded proposal dengan available units sebenar. Expired approval, changed stock, cross-location dan amount/unit tamper ditolak semasa canonical execution. |
| ADV-13 | simulate_campaign S; KILO-07 | Real versioned cost/products/discount -> integer contribution amount DAN basis-point ratio, shipping/rewards tepat. Zero sales, missing cost, double-count dan threshold boundary diuji; tiada publish. |
| ADV-14 | explain_commission Q; KILO-07 | Scoped order/commission -> earning/payout/contra/dispute provenance. Cross-dealer org, duplicate refund contra dan payment-confirmed claim tanpa record ditolak. |
| ADV-15 | audit_loyalty Q; KILO-07 | Scoped earned/redeemed/expired/reversed/held ledger checks + bounded authorized remediation proposal jika kontrak menuntut. Audit tidak repair senyap; concurrent redemption/reversal duplicate/expired points diuji. |
| ADV-16 | assess_referral S; KILO-07 | Actual allowed attribution/risk signals -> policy/review reasons; integrated risk engine. Self/duplicate referral, missing OTP/device/age/velocity memberi unknown/deny mengikut policy, bukan fabricated score. |
| ADV-17 | reconcile_dayclose S; KILO-07 | Scoped shift/outlet/revisions -> float/sales/expense/cash variance dan remediation path berizin. Stale/cross-outlet/missing expense dan duplicate reconciliation tidak auto-close atau adjust ledger. |
| ADV-18 | build_finance_digest Q; KILO-07 | Founder finance grant -> timezone-aware reconciled aggregates, exclusions/provenance. Unauthorized/partial period/unpaid facts/missing costs tidak menjadi zero atau confirmed receipt. |
| ADV-19 | trace_transaction Q; KILO-07 | Authorized transaction -> linked stock/payment/commission/loyalty receipts dan revisions. Cross-scope receipt, orphan ref dan unknown external outcome tidak menjadi completed effect. |
| ADV-20 | export_report C; KILO-07 | Approved report/filter -> private hash/expiry artifact dengan quota, CSV escaping dan authorized fresh download. Revoked role, stale link, oversize, path injection dan quota overflow ditolak. |
| ADV-21 | triage_case S; KILO-03/07 | Case/evidence -> JEV LOCAL_RULES reasons/SOP/missing data dan permitted remediation. Missing evidence/native vision/confidence tidak direka; unsafe quarantine/refund tidak autoexecute. |
| ADV-22 | plan_consignment S; KILO-07 | Verified orders/route/capacity -> scoped handover checklist/conflicts. Unknown route/schedule/capacity kekal unknown; expired stock dan cross-outlet orders tidak diluluskan palsu. |
| ADV-23 | draft_customer_reply D; KILO-07/08 | Private grounded reply dengan source refs dan correct care grant. Missing/revoked consent, unsupported claims, wrong customer dan injection ditolak; draft tidak dihantar. |
| ADV-24 | build_action_plan S; KILO-07 | Bounded objective/context -> grant-aware prerequisites/impacts/approval refs. propose_automation D berasingan memerlukan trigger/scope/budget/dry-run/disable policy. Denied step tidak execute; plan bukan authority. |
| ADV-25 | execute_approved_action C; KILO-03 | Immutable approved proposal -> canonical allowlisted executor -> exactly-once durable receipt. External execution X registration berasingan. Replay/stale/expired/revoked/tampered/crash tidak fabricated success. |
| ADV-26 | reconcile_action logical; KILO-03 | Tiga fixed registrations: inspect_action_receipt Q, refresh_external_action_status X, apply_verified_action_outcome C. Unknown outcome direconcile dengan trusted evidence; args tidak menukar risk; blind retry/forged provider proof ditolak. |
| ADV-27 | inspect_runtime Q; KILO-07 | Developer/founder diagnostic grant -> redacted component/health/quota/jobs/backup facts. Raw env/key/log/other tenant info ditolak; unavailable dinyatakan benar. |
| ADV-28 | review_skill_candidate S; KILO-08 | Candidate/version + runnable eval refs -> policy/evaluation review. Failed eval/forged evidence/stale version tidak publish; local evaluator bukan hosted Automatic Learning proof. |
| ADV-29 | search_sop Q; KILO-07 | Permission-filtered lexical cited snippets/version/expiry; summarize_document specialization grounded. Revoked document, prompt injection, expired policy dan unsupported text tidak menjadi trusted instruction. |
| ADV-30 | propose_task D; KILO-07 | Source/action plan+authorized assignee/due -> scoped draft/proposal. Wrong workspace/assignee/timezone, duplicate key mismatch dan missing command authority ditolak; assignment claim memerlukan actual command. |
| ADV-31 | evaluate_job_retry S; KILO-03/07 | Job attempt/idempotency -> safe/unsafe/unknown berdasarkan actual receipt/retry policy. Unknown external effect, exhausted budget, revoked consent dan concurrent retry tidak dihantar semula. |
| ADV-32 | draft_campaign D; KILO-07/08 | Objective+published verified products+valid margin simulation -> grounded draft. Expired simulation/policy, missing asset rights/consent dan unapproved publish/send ditolak. |

## E. Sembilan belas domain/release requirements

| ID | Requirement dan paket | Bukti positif dan negatif yang diwajibkan |
|---|---|---|
| FIN-01 | Margin Guardian; KILO-07 | Actual integer net sales/costs/contribution, amount DAN ratio gates dengan BigInt basis points. Zero denominator, missing cost, threshold boundary, shipping/rewards double-count dan precision diuji. |
| PAY-01 | Payment callback; KILO-03/08 | Real provider signature/canonical payload, dedupe, pending->paid atomic progression dan amount/order/account/currency binding. Forged/replayed/mismatched/conflicting callback ditolak; live merchant proof gated. |
| PAY-02 | Payment acceptance; KILO-03/08 | Browser payment initiation/pending/verified paid/failure dengan server receipt dan durable state. Redirect/cancel/webhook delay/duplicate return tidak mengesahkan paid sendiri; authorized gateway test required bagi live closure. |
| PAY-03 | Refund allocation; KILO-03/07 | Largest remainder integer allocation, zero drift, cumulative partial refund/contra/loyalty reversal dan exactly-once. Overrefund, concurrent stale total dan receipt failure/restart diuji. |
| STK-01 | Stock; KILO-07 | available=physical-reserved-quarantine mengikut policy, atomic reservation/FEFO consume. Expired/quarantine/negative/cross-location/concurrent shortage tidak boleh dijual. |
| OFF-01 | Offline/retry; KILO-04/07 | Stable payload+idempotency -> single submit selepas fresh session/catalogue/price/stock/voucher/loyalty checks. Logout A/login B, changed total/payload, lost response dan duplicate queue tidak menyebabkan wrong-owner effect. |
| REF-01 | Referral risk; KILO-07 | Existing risk engine menggunakan actual allowed OTP/device/velocity/account-age signals dan typed unknown. Self/duplicate/abuse cases ditolak; fake OTP/live provider claim atau model confidence tidak dicipta. |
| REF-02 | Referral attribution; KILO-07 | Separate dealer/customer reward ledgers, one-level attribution dan policy eligibility. Self referral, multi-credit duplicate, refund reversal dan account-crossing diuji. |
| LOY-01 | Loyalty; KILO-07 | Atomic points redemption, expiry dan idempotent reversal dengan audit. Concurrent redeem, expiry boundary, insufficient points dan partial refund tidak memberi duplicate reward/negative balance. |
| SEC-01 | Tracking credential; KILO-02/07 | Hashed-at-rest token dengan minimum projection, expiry/revoke/rate limit konsisten termasuk payment return. Raw token/PII dalam logs/model/response, guessed ID dan expired/revoked access ditolak. |
| SEC-02 | Dealer scoping; KILO-02/07 | Server-derived per-org terms/commission/outlet access, fresh membership. Body-forged dealer, downgraded MCP actor dan cross-org read/command ditolak. |
| DR-01 | Backup/restore; KILO-07/11 | Integrity+manifest verified restore pada disposable target dengan measured RPO/RTO dan failure path. Corrupt/wrong-version/wrong-key restore ditolak; production drill tidak diganti helper timing dan business DB tidak ditimpa. |
| AI-01 | Free model routing; KILO-05 | Eligible canonical free candidate -> real answer, bounded cooldown/failover dan truthful fallback. Dead/paid/ineligible/quota cases fail closed; synthetic quota test bukan live quota exhaustion. |
| AI-02 | Provenance/no fabrication; KILO-04/05/07 | Setiap amount/state/recommendation/receipt bersumber canonical record atau explicit assumption/unknown. SSE error, missing evidence, empty model reply dan forged source tidak menghasilkan success/0/confidence palsu. |
| AI-03 | Human approval; KILO-03/06 | Genuine human decision+fresh role/scope/policy/entity CAS -> canonical receipt. Expired/already decided/duplicate/revoked/tampered actions dan unknown outcome ditangani tanpa fake receipt. |
| PD-01 | Privacy/consent; KILO-04/07/08 | Structured consent/asset provenance, retention/delete dan dispatch-time opt-out termasuk queued jobs/voice/attachments/memory. Revocation selepas queue mesti menghalang send; logout/transcript leakage ditolak. |
| OPS-01 | Operations/quarantine; KILO-03/07 | Quarantine/movements canonical dan excluded saleable stock, approved scoped action. Stale units, cross-outlet, duplicate movement dan side-effect failure tidak drift stock. |
| ARC-01 | Architecture; KILO-07/10 | Approved migration stage manifests/import parity, module->platform direction dan tests discovered. Forbidden platform->agents cycle/undeclared exception/hidden reexport ditolak; runtime data roots kekal. |
| REL-01 | Release; KILO-01/09/10/11 | Stable source/lock, cold function startup, actual browser/protocol/domain receipts, CI exact SHA dan authorized production deployment. Build-only, READY-only, list-only, timeout atau skipped mandatory proof tidak menutup release. |

## F. Tujuh ekstensi CopilotKit

| ID | Capability dan paket | Bukti positif dan negatif yang diwajibkan |
|---|---|---|
| EXT-01 | Inspector; KILO-08 | Actual local authorized Inspector integration dengan real redacted runtime/threads; developer/founder inspection diuji. Customer/production/missing grant denied; guarded route sahaja tidak membuktikan UI panes bekerja. |
| EXT-02 | User Memories; KILO-08 | Actual scoped offering adapter dengan consent, retention, delete dan restore/re-auth behavior. Cross-user/stale/revoked memories disekat; no entitlement typed unavailable, local store bukan hosted proof. |
| EXT-03 | Analytics; KILO-08 | Official product adapter menerima minimized consented events pada approved project dengan provenance. Opt-out/redaction/revocation/retention tested; OSS collector alone bukan offering activation. |
| EXT-04 | Slack/Teams Channels; KILO-08 | Official declaration/activation + persistent authenticated host, provider event -> scoped response dan receipt/dedupe. Unavailable provider/forged event/revoked user/opt-out/retry unknown ditolak; synthetic delivery != live delivery. |
| EXT-05 | Own-app WebMCP; KILO-08 | Actual browser tool registration + bounded schema/user activation/fresh grants dan revoke/unregister. Unsupported browser, stale registration dan forbidden tool fail safely; probe sahaja tidak menutup lifecycle. |
| EXT-06 | Voice; KILO-04/08 | Qualified free-only STT/TTS actual transport -> authorized transcript/run, mic permission/cancel/timeout/retention. Denied permission, no free provider, logout/late audio dan paid fallback ditolak. |
| EXT-07 | Attachments/multimodal; KILO-05/08 | Authorized canonical upload IDs -> thread/run/ADK/tool passthrough -> actual qualified vision result dengan provenance. Foreign IDs, MIME/content/size violations, revoked files, retention expiry dan upload-only vision claim ditolak. |

## G. Regresi baharu yang ditetapkan

Fail **PLANNED** berikut memberi tempat tetap bagi reproduksi dapatan yang belum diliputi existing tests. Sebelum mencipta, cari test semantik setara; jika sudah ada, extend fail itu dan rekod penggantian path dalam plan. Jangan mencipta duplicate suite. Tests writer memiliki `tests/**`; primary memiliki Python tests `agents/google-adk/tests/**` kerana lane tests AGENTS tidak meliputi `agents/**`.

| Task | Fail PLANNED atau EXISTING | Nama assertion wajib / trigger |
|---|---|---|
| KILO-01 | EXISTING `tests/platform/production-route-restore.test.ts`; PLANNED `tests/platform/deployment-cold-start.test.ts` | `cold function startup resolves runtime dependencies and serves typed routes`; actual request, bukan source grep |
| KILO-02 | PLANNED `tests/platform/mcp-session-authority-revalidation.test.ts` | `same-user role downgrade invalidates initialized MCP tool and resource access`; workspace/outlet/version/revoke variants |
| KILO-02 | PLANNED `tests/platform/mcp-membership-selection.test.ts` | `selected-workspace founder authority is independent of membership order`; no cross-workspace union |
| KILO-02 | PLANNED `tests/platform/payment-return-token-expiry.test.ts` | `expired or revoked tracking credential cannot read payment return`; boundary before/at/after expiry |
| KILO-03 | EXISTING `tests/platform/payment-reconciliation-v24.test.ts` | `pending event followed by paid event posts payment exactly once for the same transaction`; conflicting/downgrade cases |
| KILO-03 | PLANNED `tests/platform/refund-execution-recovery.test.ts` | `refund effect followed by receipt failure converges after restart without a second financial effect`; fault points/concurrency |
| KILO-04 | PLANNED `tests/e2e/copilot-session-privacy.spec.ts` | `logout and login as another user clears both surfaces and rejects late prior-user events` |
| KILO-04 | PLANNED `tests/frontend/copilot-stream-framing.test.ts` | `fragmented error stream never becomes action success`; UTF-8/CRLF/cancel/cleanup |
| KILO-05/06 | PLANNED `tests/e2e/copilot-live-runtime.spec.ts` | `owned session traverses official runtime to tool and state renderers`; real SDK/domain route, synthetic provider explicitly labeled if used |
| KILO-05 | EXISTING `agents/google-adk/tests/test_agents.py` | `owned thread context and shared budget survive parent-child dispatch`; foreign scope and call/deadline exhaustion |
| KILO-06 | EXISTING `tests/frontend/gui01-display-only.test.tsx`, `gui02-interactive.test.tsx`, `gui03-04-state-tool.test.tsx` in same directory | Component behavior remains mandatory; extend live browser proof rather than relabel component tests protocol-verified |
| KILO-06 | EXISTING `tests/frontend/a2ui-components.test.tsx`, `copilot-gui05-mcp-app.test.tsx`, `copilot-gui06-a2ui.test.tsx`, `copilot-gui07-components.test.tsx` in same directory | Catalog/host/renderer limits, source/origin, real mount, component design/accessibility |
| KILO-09 | PLANNED `tests/platform/acceptance-closure-enforcement.test.ts` | `verified row with remaining requirement or nonexecuted named assertion is rejected`; missing manifest/test/prose escape variants |
| KILO-10 | EXISTING `tests/e2e/landing-release.spec.ts`, `tests/e2e/workspace-experiences.spec.ts`, `tests/e2e/landing-emons.spec.ts`, `tests/e2e/landing-emons-touch.spec.ts` | Approved six-chapter journey, accessible fallback/dialog, visible copy contract, touch/hit target across viewports |

Nama assertion ialah kontrak tingkah laku; laksanakan dalam bahasa/konvensyen test repo tanpa mengubah maksud. Binding ledger mesti menggunakan actual testcase title selepas test ditulis/dijalankan, bukan placeholder nama jadual ini.

## H. Checklist pelaksana dan penutupan

Checkbox di bawah ialah proses implementasi, bukan salinan 85 acceptance ticks. Mulakan unchecked dan tick hanya dengan receipt. Paparan acceptance kekal generated `PROJECT-CHECKLIST.md` dan register canonical.

- [ ] KILO-00: preflight, manifest, ownership dan dependency queue selesai.
- [ ] KILO-01: dependency cold start dan route parity dibuktikan pada local/package; deployment proof berasingan.
- [ ] KILO-02: MCP fresh authority, deterministic membership dan shared token expiry regressions lulus.
- [ ] KILO-03: payment progression, exactly-once refund recovery dan canonical HITL/reconciliation lulus.
- [ ] KILO-04: Pet/workspace shared lifecycle, logout privacy dan stream error/cancel dibuktikan browser.
- [ ] KILO-05: authenticated official runtime/ADK, owned history, actual tools/state/delegation dan shared budget dibuktikan.
- [ ] KILO-06: semua GUI dan frontend tools dibuktikan melalui real runtime/browser, bukan component sahaja.
- [ ] KILO-07: semua MOD/ADV/domain local requirements serta approved structure/JEV/privacy/recovery selesai.
- [ ] KILO-08: semua CPK/EXT/payment local integration selesai; external activations ditutup hanya dengan actual evidence.
- [ ] KILO-09: verifier/ledger semantic gates, 85 bindings dan generated docs konsisten.
- [ ] KILO-10: full test recipe, Python, actual browser, relevant typechecks dan CI definition lengkap; external CI status dilaporkan tepat.
- [ ] KILO-11: source-stable final checks + independent review + concrete release package siap; release memerlukan authority dan live receipts berasingan.

Jangan tick parent paket yang masih mempunyai local gap. External dependency yang belum dipenuhi kekal unchecked pada row acceptance berkaitan, walaupun local subtask sudah mempunyai receipt. Jika tiada lagi kerja bebas yang selamat, serahkan senarai gate tepat; jangan loop provider, memalsukan approval atau melaporkan seluruh projek siap.
