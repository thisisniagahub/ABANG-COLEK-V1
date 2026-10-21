# Prompt 03 — Integriti Domain, Sepuluh Modul dan 32 Advanced Capabilities

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Bukti dan generated status:** baca [PROJECT-CHECKLIST.md](../../PROJECT-CHECKLIST.md). Integrator menulis actual receipt/environment/source manifest/reviewer, mengemas kini ledger85 berdasarkan bukti lengkap, kemudian menjalankan verifier dan renderer. Jangan edit generated checklist/register dengan tangan; separa/blocked/failed/not-run kekal unchecked. Worker menyerahkan bukti/baki; checkpoint menyimpan next task. Ikut execution contract§10; child task tidak menutup parent feature.

**Refinement commerce/growth:** baca [spec canonical](../design/commerce-growth.md) dan [handover](COMMERCE-GROWTH-HANDOVER-20261021.md). P0 ordering/reconciliation → P1 rewards → P2 reorder/consented retention dalam domain03A/03B;03A integrity tetap sebelum struktur dan03B selepas runtime/grants foundation. Ini subcriteria existing85 IDs; tiada kadar/5-tier/wallet/native app baharu diluluskan dan tiada acceptance ditutup oleh dokumentasi.


Baca [master prompt](IMPLEMENT-ABANGCOLEK.md), [execution contract](AGENT-EXECUTION-CONTRACT.md), [acceptance register](ACCEPTANCE-REGISTER.md), [advanced registry](../design/copilot-advanced-tools.md), [domain review D-01..07](../../reports/blueprint-review-20261020-domain.md) dan decision register00. **03A selepas00 sebelum01; 03B selepas02 sebelum04.** Dua bahagian ialah dependency order wajib, bukan dua pilihan.

## Ownership, inputs dan output

Domain owner memiliki commerce/payment/inventory/dealer/loyalty/consent rules; adapter owner memiliki registry/projections sahaja. Satu cross-domain transaction mempunyai owner tunggal. Lane canonical: backend `server/**`, `api/**`, `shared/**`; frontend `src/**`; ujian `tests/**`, `scripts/**`; integrator docs/config coordination/ledger/checkpoint. Integrator menyelaras interface snapshot tanpa mengedit shared contracts serentak dengan backend. Independent financial/security reviewer diperlukan. Maksimum3 actual workers berasingan fail jika dibenarkan arahan semasa, inline fallback jika slot/tool tiada. Workers tidak revert edits orang lain.

03A menggunakan current paths `server/platform/` dan `shared/`; 03B menggunakan mapped destination01 (`server/modules/`, `server/application/`, `server/agents/tools/`). Jangan mencipta duplicate service pada path lama dan baru. Output **PLANNED**: `reports/implementation/03a-integrity.md`, `03b-domain-tools.md`, canonical policy/version/result contracts, red/green receipts dan checkpoint per bahagian. Semua business values memerlukan approved policy; fixture constants bukan production configuration.

## Fasa 03A — Integriti sebelum struktur

### 03A.1 — Reproduce source gaps dan failing tests

Re-read current `commerce.ts`, `dealers.ts`, `loyalty.ts`, `marginGuardian.ts`, `marketing.ts`, `operations.ts`, `reports.ts`, `auth.ts`, `store.ts`, `app.ts`, `freeModelRouter.ts`, `adkAgent.ts`, `backupScheduler.ts` dan shared contracts/callers. Inspect exact domain methods/transactions sebelum edit; jangan menyamakan test filename dengan feature coverage.

**EXISTING test inputs**: `tests/platform/growth-margin.test.ts`, `finance-review.test.ts`, `dealer-commission-ledger.test.ts`, `loyalty-redemption.test.ts`, `order-tracking-token.test.ts`, `offline-cache.test.ts`, `customer-cart.test.ts`, `outbound-safety.test.ts`, `agent-storefront-referral.test.ts`, `backend-security.test.ts`, `backend-lifecycle.test.ts`, `supabase-persistence.test.ts`. Run relevant baseline, kemudian tambah behavior tests berikut **PLANNED** pada current test tree. Missing file tidak dikira meaningful red.

| PLANNED test / named cases | Master IDs | Expected invariant |
|---|---|---|
| `tests/platform/financial-integrity-v24.test.ts`: `rejects rounded-up margin`, `compares exact threshold`, `rejects missing cost and client totals`, `allocates residual deterministically` | FIN-01 | Integer authoritative arithmetic/provenance; display tidak meluluskan ratio |
| `tests/platform/payment-reconciliation-v24.test.ts`: `dedupes provider receipt`, `records late paid without resurrection`, `holds conflicting paid attempts`, `rejects account amount currency mismatch` | PAY-01/02, STK-01 | Verified money facts disimpan sekali; no double fulfilment/refund |
| `tests/platform/refund-allocation-v24.test.ts`: `partial partition equals single refund`, `replay creates no posting`, `caps cumulative reversal`, `rolls back all domains` | PAY-03, LOY-01, OPS-01 | Allocation/reversal cumulative, append-only history, atomic rollback |
| `tests/platform/stock-integrity-v24.test.ts`: `last unit has one winner`, `excludes expired quarantined lots`, `return requires received QC` | STK-01, OPS-01 | No oversell/automatic restock; failed transaction restores all effects |
| `tests/platform/offline-order-v24.test.ts`: `isolates accounts`, `requires review after reprice`, `stable retry key creates one order` | OFF-01 | Draft bukan reservation, server totals fresh dan no duplicate |
| `tests/platform/privacy-scope-v24.test.ts`: `queued revoke prevents send`, `rejects channel mismatch`, `denies cross org and outlet`, `rechecks download authorization` | PD-01, SEC-02 | Consent/query/command/export boundary server-side |
| Extend existing `order-tracking-token.test.ts`: exact lifecycle, headers, replay/log cases | SEC-01 | Token lifecycle dan minimum public projection, no ID-only access |
| Extend existing `agent-storefront-referral.test.ts`: self-referral/shared-Wi-Fi/unknown signal cases | REF-01/02 | No invented OTP/risk proof; insufficient data safe outcome |

```powershell
bun test ./tests/platform/growth-margin.test.ts ./tests/platform/finance-review.test.ts ./tests/platform/dealer-commission-ledger.test.ts ./tests/platform/loyalty-redemption.test.ts
bun test ./tests/platform/financial-integrity-v24.test.ts ./tests/platform/payment-reconciliation-v24.test.ts ./tests/platform/refund-allocation-v24.test.ts ./tests/platform/stock-integrity-v24.test.ts ./tests/platform/offline-order-v24.test.ts ./tests/platform/privacy-scope-v24.test.ts
```

Capture failures against precise behavior, implement smallest coherent domain fix, rerun same tests. Dua failed fix attempts -> stop approach, read error/source/docs dan research root cause; jangan broaden rewrite atau menukar architecture.

### 03A.2 — FIN-01: one canonical integer calculation

- Wang integer sen, thresholds integer basis points, safe range validation/BigInt bagi cross-product. Compare `contributionSen * 10000 >= netSalesSen * minimumMarginBps`; net sales<=0 tidak eligible. Ratio display selepas decision sahaja.
- Counterexample wajib: net sales100000, costs75004, contribution24996, minimum2500bps -> **reject**, walaupun paparan25.00%. Exact contribution25000 -> pass ratio jika minimum amount/other gates lulus. Include near safe-integer boundary/overflow rejection dan negative denominator.
- Model/client amount/ratio tidak authoritative. Cost provenance/version, shipping/reward/fees/tax bucket tidak double-count; expected loss dan realized loss berasingan. Missing cost/policy -> `insufficient_data`/`POLICY_UNCONFIGURED`, bukan assume0.
- Allocation ikut execution contract §5: exact quota non-negative weights, floor, residual cents mengikut descending fractional remainder, tie stable line ID ascending. Sum allocations=total; all-zero weights dengan non-zero total ditolak. Historical authoritative sale allocation tidak dikira semula memakai polisi baru.
- Satu implementation domain; remove drifting algorithm duplicate dalam `shared/growth-contracts.ts` melalui caller migration, shared hanya DTO/validation yang sesuai. Jangan memindahkan rule ke client untuk mengelak import error.

### 03A.3 — PAY-01..03: receipts, late success dan cumulative refunds

1. Baca Billplz official docs sebelum canonicalization/signature/auth adapter. Verify exact account/order/amount/currency/signature dan retrieve/reconciliation facts; browser redirect bukan payment proof. Missing sandbox credential -> synthetic adapter tests sahaja, live rows `blocked_external`.
2. Dedupe event/attempt/refund IDs dan persist immutable verified facts. Paid tidak turun kerana failed/expired callback lama. Valid paid selepas expired/cancelled/order stock release -> receipt sekali, `payment_exception_review`, fulfilment held. Jangan resurrect order/reservation atau auto-refund tanpa approved command/policy.
3. Uji timeout->reconciliation success, late success, two paid attempts, mismatched amount/currency/account, callback selepas stok diberi kepada order lain dan replay/out-of-order events. Money received berbeza daripada order eligibility; semua facts boleh diaudit.
4. Refund line/quantity eligibility daripada original sale snapshot dan approved entitlement. Recompute target reversal berdasarkan **cumulative successful refunds**, tolak posting terdahulu; jangan round setiap callback sendiri. Original earning/payout/contra immutable dan append-only; cap pada original eligible earning/refundable balance.
5. Fixtures: tiga lines dengan residual1sen; satu line refunded melalui tiga partial attempts sama total satu refund; replay ID no-op; post-payout contra; rounding ties; shipping/fee inclusion explicit daripada approved policy; loyalty earned/redeemed/expired/reversed dan returned-stock QC.
6. Inject commission/loyalty/inventory/CAS failure selepas work dimulakan -> whole transaction rollback, tiada partial success receipt. Unknown provider effect -> `external_unknown_outcome`, reconcile sebelum retry; no compensating fiction.

### 03A.4 — Stock, offline, referral dan operations

- STK-01/OPS-01: physical/reserved/quarantined/available jelas; expiry clock dan lot eligibility verified; two concurrent last-unit orders satu winner. Return hanya restock selepas received/QC policy, bukan selepas refund button.
- OFF-01: account-scoped unsent drafts, logout clears/switch isolates, stale response ignored. Server reprice/revalidate semasa submit; material price/availability change memerlukan review. Same payload stable idempotency key; network retry tidak create order lagi. Offline draft bukan reservation atau saved payment authorization.
- REF-01/02: reuse existing risk/OTP/appeal source dan semak availability setiap integration sebenar; jangan menganggap engine tiada kerana provider live belum configured. Reject self-referral server-side; shared Wi-Fi bukan automatic fraud. Missing required signal/provider -> typed unknown/`insufficient_data`/manual review/disabled reward activation dengan reason. Jangan fabricate risk score atau menyamakan dealer attribution tests dengan customer fraud engine.
- Commerce/growth: P0 provisioning/store/cart/order/reconciliation/tracking dahulu, P1 rewards kemudian, P2 reorder/consented retention selepasnya mengikut [spec](../design/commerce-growth.md) dan [handover](COMMERCE-GROWTH-HANDOVER-20261021.md). Ini dependency domain03A/03B; struktur/runtime/GUI/release asal tidak dilangkau. Store owner, pihak fulfilment dan customer referrer berasingan serta server-bound. Attribution/policy snapshot asal kekal durable merentas callback/retry/refund.
- Referral customer satu peringkat dan dua hala: uji empat kombinasi eligibility buyer/referrer, self/duplicate/unknown-risk, hold/eligible/issued/reversed mengikut enum domain sebenar. Commission dealer, reward referral dan loyalty points ialah entri berasingan; no automatic reward kerana share/signup, tiada kadar komersial rekaan. Refund/replay/concurrency tidak menggandakan credit/contra; stacking memerlukan polisi approved dan margin selepas semua manfaat/fees/costs.
- LOY-01: clock-boundary expiry, concurrent double-spend, refund reversals/caps dan rollback diuji; rates/expiry/stacking daripada approved version. Unknown business policy disable affected execution sahaja.

### 03A.5 — Tracking, authorization, consent dan truthful AI

SEC-01: cryptographic token, stored hash sahaja, minimum private-safe projection, expiry initial14hari. Confirmed handover hanya token masih sah/tidak revoked mendapat expiry14hari dari handover; expired/revoked tidak hidup semula. Reissue authenticated owner sahaja, handover/reissue/revoke idempotent. Actual HTTP tests: ID-only/foreign token denied, expiry boundaries, replay, `Cache-Control: no-store`, referrer policy, rate limits, redacted logs/query handling. Unknown city kekal unknown. Jangan output raw tracking token ke model/tool args.

SEC-02: customer own records, dealer own org, staff permitted outlet/assignment dan founder capability-specific grants diperiksa query/command/export/download. Mixed-scope batch/cache selepas revoke tidak mendedahkan existence/fields. Frontend filter tidak mencukupi.

PD-01: purpose/channel-specific consent berversi checked **at dispatch**, termasuk queued promotions selepas revoke; draft bukan send dan purchase bukan marketing consent. Reorder mencipta cart baharu daripada order berizin, kemudian reprice/revalidate store/stock/fulfilment/voucher/loyalty/referral semasa; tiada replay order/payment/harga lama. Retention/reminder memerlukan consent/preference dan revoke-after-enqueue tests; tiada mesej pelanggan sebenar dihantar oleh task development. Deletion request tidak memadam financial ledger/receipt tanpa approved retention/legal decision. Missing processor/data policy -> deny relevant outbound data, teruskan synthetic work.

AI-01/02: current fake margin/confidence/provider attribution/action success dibuang atau exact path disabled; validate history/decision input, deadlines dan free-only fail-closed. LOCAL_RULES berlabel, no native/vision/calibrated confidence claims. Adapter belum siap02 tidak alasan mengekalkan fake-success fallback. AI-03 shared budget tests02/04 disambung; 03A mesti menghalang unbounded current inference.

### 03A exit gate

Run relevant red->green tests, lint/build/full platform regression dan independent domain/security review. Update 19 master rows dengan environment/evidence, disabled capability reasons dan remaining external gates. No commercial policy invented, no wrong/double mutation, no payment/order authority confusion. Jika policy/provider dependency blocked, synthetic invariants masih boleh verified; live row kekal blocked.

Checkpoint `03A complete for safe dependency closure` menyenaraikan exact next task01, bukan seluruh projek complete. Next: [01 structure](01-structure.md). Jangan menjalankan03B sebelum02.

## Fasa 03B — Registry tools dan modul

### 03B.1 — AT-0 strict registry dan authorized adapters

Input: 03A canonical rules,01 move manifest,02 identity/grant/budget/event interfaces. Target **PLANNED** `server/agents/tools/registry.ts` dan per-domain adapters; domain mutations menggunakan existing canonical commands. ADK, React frontend dan MCP adapters memetakan schema yang sama tanpa memberi SDK/model authority baharu.

Entry minimum ikut registry: logical ID, registration/version, owner/fixed Q/S/D/C/X class, strict input/output schema unknown-key rejection, principal-derived role/resource/field grants, policy/revisions, deadline/quota, idempotency, approval, provenance/data class dan availability/reason. Tool result mempunyai sourceRefs/revisions/observedAt/missingData/status/pagination/usage; C/X menambah durable receipt/outcome. Safe errors tidak memuat raw provider/SQL/env.

**PLANNED** `tests/copilot/registry.test.ts`, `tool-permissions.test.ts`, `tool-budgets.test.ts`: malicious schema/unknown args; Q/S no mutation; grant attenuation; mixed batch denial; cache revoke; precise limit/limit+1; atomic shared accounting. Discovery maksimum8 relevant schemas selepas authorization, page50, context refs20; every dispatch termasuk discovery/page/delegation/child/retry consumes6 total tool units. Caches bukan finance authority; command refetch/revalidate.

### 03B.2 — Fixed batches dan exact counts

Implement order registry tetap; jangan reclassify effect untuk melompat gate:

| Batch | Logical IDs | Gate sebelum expose |
|---|---|---|
| AT-1 | ADV-01..05,09,13..15,17..19,21,27,29 | Scoped read/simulation, canonical totals/provenance, no mutation |
| AT-2 | ADV-07..08,10..12,22..24,30,32 | Preview/draft schema, policy/source revisions, expiry, idempotency |
| AT-3 | ADV-06,16,20,25..26,31 | Provider/risk/executor/artifact dependencies, CAS/receipt/outcome reconciliation |
| AT-4, dalam05 | ADV-28 | Genuine Intelligence candidate/eval/review/publish/rollback gates |

ADV-26 registrations fixed: `inspect_action_receipt` Q, `refresh_external_action_status` X dan `apply_verified_action_outcome` C. Risk bukan input-selected. ADV-25 `execute_approved_action` menerima persisted proposal ref/hash/revisions/key; no arbitrary action/code/SQL. Registration count boleh >32; logical capability count kekal32.

Named specializations fixed oleh registry: `search_catalogue` ADV-02 Q; `compare_products` ADV-03 Q; `prepare_cart_draft` ADV-05 **frontend-only unsent draft**; `get_order_tracking` ADV-04 Q; `explain_dealer_settlement` ADV-14 Q; `summarize_document` ADV-29 Q; `propose_automation` ADV-24 D; `get_operations_brief` ADV-03 Q. Jangan bertanya sama ada menambah capability33 atau invent parent mapping baru.

### 03B.3 — Kesemua MOD-01..10, setiap satu journey dan denial

| ID/module | Acceptance yang mesti implemented/tested |
|---|---|
| MOD-01 Storefront/catalogue | Public store setiap dealer aktif, canonical cart/checkout dan A/B store binding mengikut spec. Copilot search/compare/reorder hanya unsent draft, stale-price confirmation; tool tidak order/reserve/pay |
| MOD-02 Orders/tracking | Own-order timeline/tracking/refund preview, cross-customer denied, public token/private projection separate |
| MOD-03 Inventory | Location scope, physical/reserved/quarantine/available, expiry/FEFO/restock assumptions; no unknown lead-time fiction |
| MOD-04 QC/JEV | Scoped case/evidence/batch/SOP; LOCAL_RULES reasons/missing evidence, safe quarantine/refund proposal |
| MOD-05 Dealer/commission | Signup tanpa pembelian, activation idempotent -> public store + private workspace; org-only earning/payout/contra/settlement. Owner/fulfiller/referrer berasingan; due versus recorded-paid/provenance distinct |
| MOD-06 Loyalty/referral | Customer referral single-level/two-sided, per-party eligibility, distinct commission/reward/points, expiry/reversal/held reasons; unknown signals never create score/activation |
| MOD-07 Marketing | Published products/rights, canonical amount AND ratio, unsent campaign draft, revoke blocks dispatch |
| MOD-08 Finance/day-close | Founder finance grant, timezone/outlet/shift scope, variance/exclusions/receipts; no auto-ledger adjustment |
| MOD-09 Tasks/documents/SOP | Permission/version/citations, untrusted-content isolation, scoped draft task; no implied assignment success |
| MOD-10 Automations/integrations | Redacted health/job retries, allowlisted proposal/dry-run/budget/disable policy; no implicit enable/send |

Write **PLANNED** `tests/copilot/module-coverage.test.ts` with one named happy-path + denied + missing/stale-data case per MOD. Parameterized **PLANNED** `tests/copilot/advanced-tools.test.ts` covers all32 logical IDs and every actual registration. Definition/name presence alone fails completeness test. Record owner/domain handler evidence, output validation and disabled reason for unavailable dependency.

### 03B.4 — External effects, artifacts dan workflows

C/X require fresh grant/revisions/approval, durable intent, idempotency and canonical receipt. Consent rechecked at dispatch. No real customer message/publish for testing without authorized test scope. Unknown effect blocks blind retry; reconciliation has fixed Q/X/C boundary. If worker absent, pending/manual state bukan accepted/succeeded fiction.

Private reports/artifacts: current download authorization, hash/expiry/approved retention, size/count limits, CSV formula injection defenses dan no secret/PII in diagnostics. Summary citations hanya authorized current document versions; model paraphrase tetap model/data budget-gated, deterministic extractive baseline boleh digunakan dengan label.

Run four bounded workflows registry: morning brief; leakage complaint; expiring-stock promotion; day-close/commission. Each demonstrates canonical sources, allowed missing data, preview/approval/receipt separation, no unauthorized/double mutation. Split user-reviewed interactive runs with durable refs jika budget habis; jangan silently replenish6tools/3calls.

## 03B validation, review dan exit

```powershell
bun test ./tests/copilot/registry.test.ts ./tests/copilot/tool-permissions.test.ts ./tests/copilot/tool-budgets.test.ts ./tests/copilot/module-coverage.test.ts ./tests/copilot/advanced-tools.test.ts
bun run test:platform
bun run lint
bun run build
```

Use mapped domain test paths selepas01 dan rerun financial/CAS regressions touched by adapters. Browser journeys04/06 menutup actual tool UI path; fixture pass tidak membuktikan live provider. Independent TS/security/domain review sebelum activation/owned commit apabila authorized.

Exit: setiap MOD10/ADV32 row mempunyai exact registration/handler/tests/results atau precise disabled dependency; schema/count manifest reconciled; financial rules tidak duplicated, registry cannot bypass domain authorization. ADV-28 unresolved dibawa05, bukan diganti manual SOP claim. Next [04 UI/agents](04-ui-and-agents.md). Blocked transport/provider/OTP/finance policy menyekat capability tepat; registry/query/synthetic work yang bebas diteruskan.
