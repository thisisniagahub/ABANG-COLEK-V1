# ABANGCOLEK — Checklist Pelaksanaan Semasa

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](docs/CURRENT-STATUS.md) · [Checklist](PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Rujukan fakta: [CURRENT-STATUS](docs/CURRENT-STATUS.md). Owner: **Codex inline**; candidate `D:/ABANGCOLEK-WORKTREES/codex-completion-20261020`. AGY/Kilo/Copilot/Hermes implementation sessions kekal dihentikan mengikut arahan pengguna.

## Ringkasan yang boleh dipercayai

- Main `18c69b3` sudah dipush dan Vercel production READY untuk **11 fail TypeScript/config sahaja**; bukan seluruh implementasi Copilot.
- Main: lint/build lulus, platform **1423/0****, browser tempatan **16/0**, browser public production **8/0**. [Release receipt](reports/implementation/main-typescript-release-20261020.json).
- GitHub Actions **blocked_external** kerana account billing; job tidak bermula.
- Snapshot ledger `2026-10-20T13:30:00Z`: **59 verified_local / 16 implemented_unverified / 8 blocked_external / 2 not_run = 85**. **47 rekod belum ditutup**, dan 38 label tempatan masih memerlukan current source/runtime proof untuk final release.
- Checkbox acceptance di bawah bermaksud **final integration acceptance semasa**, bukan label unit/synthetic lama. Semua 85 parent acceptance kekal unchecked dalam paparan konservatif ini sehingga current receipt membuktikan keseluruhan requirement. Ini bukan dakwaan semua source tiada atau semua local tests gagal.

## Engineering task dan release yang sudah ada bukti

- [x] **DONE-DEV-TS-01** — Betulkan scoped TypeScript editor projects dan fixtures terpilih pada lane berkaitan. [Receipt](reports/implementation/codex-typescript-problems-20261020.json). Tests/frontend/ext tidak semuanya termasuk dalam leaf tests config; jangan dakwa setiap fail repo sudah diperiksa editor.
- [x] **DONE-MAIN-TS-01** — Commit/push `18c69b3`, sebelas fail konfigurasi/regression, exact SHA Vercel READY. [Receipt](reports/implementation/main-typescript-release-20261020.json).
- [x] **DONE-MAIN-QA-01** — Verifikasi release terpilih main dan public production seperti scope di atas; tiada transaksi business production authenticated disahkan.
- [x] **DOC-ALIGN-01** — Selaraskan188 dokumen milik projek dalam489 fail Markdown checkout utama; inventori/hash/pautan/fences/status disahkan, dua finding review dibetulkan dan candidate disegerakkan melalui preimage checks. [Laporan](reports/documentation-alignment-20261020.md). Scope ini dokumentasi sahaja; tiada parent acceptance Copilot ditutup.
- [ ] **NEXT-SESSION-01** — Reproduce/fix cookie Path dan authorization/revocation pada Copilot/MCP melalui sesi browser sebenar; clear legacy cookie semasa login/logout.
- [ ] **NEXT-ADK-01** — Wiring sebenar SDK Fetch/HttpAgent -> ADK -> canonical tools; signed session grants, `abangcolek_ops`, shared budgets dan no commerce DB authority dalam Python.
- [ ] **NEXT-GUI-DOMAIN-01** — Lengkapkan semua gap GUI/module/tool/domain yang direkod, kemudian browser authenticated dan fresh acceptance audit.
- [ ] **NEXT-RELEASE-01** — Preview/production keseluruhan Copilot hanya selepas review/evidence/gates sah; jangan gabung dirty integration secara pukal ke main.

## Cara membaca setiap requirement

Setiap baris menunjukkan label **snapshot ledger**, phase asal dan test file yang pernah dirujuk. Rujukan test bukan pengesahan bahawa ia baru dijalankan atau mencukupi untuk browser/live acceptance. [Register](docs/prompts/ACCEPTANCE-REGISTER.md) mengekalkan deliverable wajib dan default gates. [Current status](docs/CURRENT-STATUS.md) menyenaraikan semua 45 gap serta jurang source tambahan.

## Sepuluh ciri CopilotKit

- [ ] **CPK-01 — Chat** · snapshot: `blocked_external` · phase 02/04
  - Gemini free tier HTTP 429 "Quota exceeded ... limit: 20, model: gemini-3.6-flash. Please retry in 19h3m41s"; OpenRouter nvidia/nemotron-3-super-120b-a12b:free HTTP 404 "Function not found for account"
  - Bukti snapshot: `tests/platform/copilot-runtime-pipeline.test.ts`; environment `local`, stage `sdk_wired`.

- [ ] **CPK-02 — AG-UI Streams** · snapshot: `implemented_unverified` · phase 05
  - The platform app.ts mount of the AG-UI thread store and the resume route are not implemented.
  - Bukti snapshot: `tests/platform/intelligence-agui-threads.test.ts`; environment `local`, stage `protocol_verified`.

- [ ] **CPK-03 — Automatic Learning** · snapshot: `blocked_external` · phase 05
  - The hosted Automatic Learning offering requires INTELLIGENCE_ACCOUNT_REQUIRED (CopilotKit Intelligence account + terms).
  - Bukti snapshot: `tests/platform/intelligence-learning-pipeline.test.ts`; environment `local`, stage `protocol_verified`.

- [ ] **CPK-04 — Generative UI** · snapshot: `implemented_unverified` · phase 04
  - The startup-loaded versioned declarative surface catalog and the AG-UI -> renderer middleware path are not implemented.
  - Bukti snapshot: `tests/frontend/a2ui-components.test.tsx`; environment `local`, stage `component_present`.

- [ ] **CPK-05 — Declarative UI** · snapshot: `implemented_unverified` · phase 04
  - The versioned surface catalog, the depth/cyclic-tree limits and the AG-UI middleware path are not implemented.
  - Bukti snapshot: `tests/frontend/a2ui-components.test.tsx`; environment `local`, stage `component_present`.

- [ ] **CPK-06 — Human-in-the-loop** · snapshot: `implemented_unverified` · phase 03A/04
  - Only ONE executor is registered (refund.execute); other approved action types still return EXECUTOR_UNAVAILABLE, so the HITL path is not universal.
  - Bukti snapshot: `tests/platform/adv-tools-approval-execution.test.ts`; environment `local`, stage `protocol_verified`.

- [ ] **CPK-07 — Frontend tools** · snapshot: `implemented_unverified` · phase 04
  - The adapter is never instantiated by a live agent run, so no server round-trip drives it.
  - Bukti snapshot: `tests/frontend/frontend-tool-adapters.test.ts`; environment `local`, stage `component_present`.

- [ ] **CPK-08 — Shared state** · snapshot: `implemented_unverified` · phase 02/04
  - The view is not mounted against a live server-issued state store, and entity revision is not separated from policy revision.
  - Bukti snapshot: `tests/frontend/gui03-04-state-tool.test.tsx`; environment `local`, stage `component_present`.

- [ ] **CPK-09 — Headless UI** · snapshot: `verified_local` · phase 02/04
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/frontend/copilot-run-identity-shared.test.tsx`; environment `local`, stage `component_present`.

- [ ] **CPK-10 — Sub-agents** · snapshot: `implemented_unverified` · phase 04
  - The TypeScript runtime has no parent-to-child delegation, no trace propagation and no budget inheritance.
  - Bukti snapshot: `tests/platform/copilot-adk-bridge.test.ts`; environment `local`, stage `protocol_verified`.

## Tujuh pendekatan Generative UI

- [ ] **GUI-01 — Display Only** · snapshot: `implemented_unverified` · phase 04
  - Cards other than the A2UI-rendered ones are still never mounted against a live data path.
  - Bukti snapshot: `tests/frontend/gui01-display-only.test.tsx`; environment `local`, stage `component_present`.

- [ ] **GUI-02 — Interactive** · snapshot: `implemented_unverified` · phase 04
  - The form is not mounted and has no server callback, so decision -> revalidation -> receipt is not exercised.
  - Bukti snapshot: `tests/frontend/gui02-interactive.test.tsx`; environment `local`, stage `component_present`.

- [ ] **GUI-03 — Tool Rendering** · snapshot: `implemented_unverified` · phase 04
  - The view is not mounted against a live tool-lifecycle event source.
  - Bukti snapshot: `tests/frontend/gui03-04-state-tool.test.tsx`; environment `local`, stage `component_present`.

- [ ] **GUI-04 — State Rendering** · snapshot: `implemented_unverified` · phase 04
  - No live state store feeds the view, and entity revision is not separated from policy revision.
  - Bukti snapshot: `tests/frontend/gui03-04-state-tool.test.tsx`; environment `local`, stage `component_present`.

- [ ] **GUI-05 — MCP Apps** · snapshot: `implemented_unverified` · phase 04
  - The browser cannot reach /api/mcp (session cookie scoped to Path=/api/platform returns 401) and the client host frame is not mounted.
  - Bukti snapshot: `tests/platform/mcp-protocol.test.ts`; environment `local`, stage `protocol_verified`.

- [ ] **GUI-06 — A2UI** · snapshot: `implemented_unverified` · phase 04
  - The startup-loaded versioned surface catalog and the AG-UI middleware path are not implemented.
  - Bukti snapshot: `tests/frontend/copilot-gui06-a2ui.test.tsx`; environment `local`, stage `component_present`.

- [ ] **GUI-07 — Your Components** · snapshot: `implemented_unverified` · phase 04
  - The components are not on the same API data path as the rest of the workspace, and theme/reduced-motion coverage on the copilot surface is not proven.
  - Bukti snapshot: `tests/frontend/copilot-gui07-components.test.tsx`; environment `local`, stage `component_present`.

## Sepuluh modul aplikasi

- [ ] **MOD-01 — Storefront & katalog** · snapshot: `implemented_unverified` · phase 03B/04
  - No frontend cart-draft tool; the cart diagnosis mode exists but no UI path drives it.
  - Bukti snapshot: `tests/copilot/mod-01-storefront.test.ts`; environment `local`, stage `component_present`.

- [ ] **MOD-02 — Orders & tracking** · snapshot: `implemented_unverified` · phase 03B/04
  - Public-token projection is not separated from the private order inside the copilot path.
  - Bukti snapshot: `tests/copilot/mod-02-orders.test.ts`; environment `local`, stage `component_present`.

- [ ] **MOD-03 — Inventory** · snapshot: `verified_local` · phase 03B/04
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-03-inventory.test.ts`; environment `local`, stage `component_present`.

- [ ] **MOD-04 — QC & JEV** · snapshot: `verified_local` · phase 03B/04
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-04-qc-jev.test.ts`; environment `local`, stage `component_present`.

- [ ] **MOD-05 — Dealer & komisen** · snapshot: `verified_local` · phase 03B/04
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-05-dealers.test.ts`; environment `local`, stage `component_present`.

- [ ] **MOD-06 — Loyalty & referral** · snapshot: `verified_local` · phase 03B/04
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-06-loyalty.test.ts`; environment `local`, stage `component_present`.

- [ ] **MOD-07 — Marketing** · snapshot: `verified_local` · phase 03B/04
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-07-marketing.test.ts`; environment `local`, stage `component_present`.

- [ ] **MOD-08 — Finance & day-close** · snapshot: `implemented_unverified` · phase 03B/04
  - There is no canonical cost ledger, so get_operational_kpi returns null + COST_BASIS_UNAVAILABLE instead of a value.
  - Bukti snapshot: `tests/copilot/mod-08-finance.test.ts`; environment `local`, stage `component_present`.

- [ ] **MOD-09 — Tasks, documents & SOP** · snapshot: `implemented_unverified` · phase 03B/04
  - No citation / version / expiry output contract on the search and task results.
  - Bukti snapshot: `tests/copilot/mod-09-tasks-sop.test.ts`; environment `local`, stage `component_present`.

- [ ] **MOD-10 — Automations & integrations** · snapshot: `verified_local` · phase 03B/04
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-10-automations.test.ts`; environment `local`, stage `component_present`.

## 32 kemampuan tool

- [ ] **ADV-01 — `discover_capabilities` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-02 — `search_records` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-03 — `build_context_bundle` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-04 — `explain_record` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-05 — `diagnose_checkout` S** · snapshot: `implemented_unverified` · phase 03B
  - Not every required conflict class is detected: stale price, ineligible loyalty, fractional/negative quantity, duplicate line and invalid fulfilment are not all implemented.
  - Bukti snapshot: `tests/copilot/mod-01-storefront.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-06 — `reconcile_payments` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-07 — `preview_refund` S** · snapshot: `implemented_unverified` · phase 03B
  - No preview reference hash, revisions or expiry on the preview result.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-08 — `propose_refund` D** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-04-qc-jev.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-09 — `assess_expiry_risk` S** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-10 — `plan_restock` S** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-11 — `trace_batch` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-12 — `propose_quarantine` D** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-13 — `simulate_campaign` S** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-14 — `explain_commission` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-15 — `audit_loyalty` Q** · snapshot: `implemented_unverified` · phase 03B
  - Detects and explains anomalies but does not remediate them.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-16 — `assess_referral` S** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-17 — `reconcile_dayclose` S** · snapshot: `implemented_unverified` · phase 03B
  - Recomputes variance but does not remediate it.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-18 — `build_finance_digest` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-19 — `trace_transaction` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-20 — `export_report` C** · snapshot: `implemented_unverified` · phase 03B
  - No quota on exports and no download-time re-authorization contract.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-21 — `triage_case` S** · snapshot: `implemented_unverified` · phase 03B
  - Scores priority but does not remediate the case.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-22 — `plan_consignment` S** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-23 — `draft_customer_reply` D** · snapshot: `implemented_unverified` · phase 03B
  - No outbound-send consent guard on the draft.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-24 — `build_action_plan` S** · snapshot: `implemented_unverified` · phase 03B
  - Steps are bound to capability ids but are not grant-aware.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-25 — `execute_approved_action` C/X** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adversarial-m1-integrity.test.ts`; environment `local`, stage `protocol_verified`.

- [ ] **ADV-26 — `reconcile_action` Q/C/X** · snapshot: `implemented_unverified` · phase 03B
  - Implemented as one reconciliation tool; the three separately-required operations (inspect_action_receipt, refresh_external_action_status, apply_verified_action_outcome) are not all present.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-27 — `inspect_runtime` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-28 — `review_skill_candidate` S** · snapshot: `verified_local` · phase 05
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/intelligence-learning-pipeline.test.ts`; environment `local`, stage `protocol_verified`.

- [ ] **ADV-29 — `search_sop` Q** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-30 — `propose_task` D** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-31 — `evaluate_job_retry` S** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

- [ ] **ADV-32 — `draft_campaign` D** · snapshot: `verified_local` · phase 03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/adv-tools-capability-coverage.test.ts`; environment `local`, stage `component_present`.

## 19 acceptance domain/release

- [ ] **FIN-01 — Amount lulus, ratio gagal menyekat kempen; override berizin/audit** · snapshot: `verified_local` · phase 03A
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/growth-margin.test.ts`; environment `local`, stage `component_present`.

- [ ] **PAY-01 — Callback gateway pendua tidak menggandakan order/ledger** · snapshot: `blocked_external` · phase 03A
  - No HTTP callback route is mounted and there is no HMAC X-Signature verification.
  - Bukti snapshot: `tests/platform/payment-reconciliation-v24.test.ts`; environment `local`, stage `component_present`.

- [ ] **PAY-02 — Redirect sahaja tidak mengesahkan paid** · snapshot: `blocked_external` · phase 03A
  - No success-redirect route and no provider-callback route exist, so the journey is never exercised end to end.
  - Bukti snapshot: `tests/platform/backend-lifecycle.test.ts`; environment `local`, stage `component_present`.

- [ ] **PAY-03 — Partial/post-payout refund tepat, append-only dan deduplicated** · snapshot: `verified_local` · phase 03A
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/refund-allocation-v24.test.ts`; environment `local`, stage `component_present`.

- [ ] **STK-01 — Perebutan unit terakhir tidak oversell; kegagalan rollback** · snapshot: `verified_local` · phase 03A
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-03-inventory.test.ts`; environment `local`, stage `component_present`.

- [ ] **OFF-01 — Reconnect revalidate, semak perubahan dan retry tanpa pendua** · snapshot: `implemented_unverified` · phase 03A/04
  - No revalidate-on-reconnect, no server-side revision compare before retry, no per-field conflict resolution.
  - Bukti snapshot: `tests/platform/client-retry.test.ts`; environment `local`, stage `component_present`.

- [ ] **REF-01 — Identiti berbeza pada Wi-Fi sama tidak ditolak semata-mata IP** · snapshot: `not_run` · phase 03A
  - No risk engine, no OTP, no device/velocity/age signals, no reason codes, no appeal path.
  - Bukti snapshot: `not_run` (tiada fail test langsung); environment `documentation`, stage `designed`.

- [ ] **REF-02 — Self-referral ditolak; dealer/customer reward berasingan** · snapshot: `verified_local` · phase 03A
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-06-loyalty.test.ts`; environment `local`, stage `component_present`.

- [ ] **LOY-01 — Redemption atomik, expiry/reversal/retry mengekalkan baki** · snapshot: `verified_local` · phase 03A
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-06-loyalty.test.ts`; environment `local`, stage `component_present`.

- [ ] **SEC-01 — Token, expiry, redaction; ID sahaja tidak membenarkan akses** · snapshot: `implemented_unverified` · phase 03A
  - No revocation path, and the expiry is creation-time only rather than handover-based.
  - Bukti snapshot: `tests/copilot/mod-02-orders.test.ts`; environment `local`, stage `component_present`.

- [ ] **SEC-02 — Dealer silang rekod tidak mendapat data/kuasa** · snapshot: `verified_local` · phase 03A/03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/agent-runtime.test.ts`; environment `local`, stage `component_present`.

- [ ] **DR-01 — Restore database/evidence mencapai RPO/RTO diukur** · snapshot: `implemented_unverified` · phase 06
  - RTO is never measured (no 30-minute drill, no timing assertion) and there is no production drill or key-recovery evidence.
  - Bukti snapshot: `tests/platform/backup-restore.test.ts`; environment `local`, stage `component_present`.

- [ ] **AI-01 — Timeout/quota tidak memutus commerce; fallback tepat** · snapshot: `implemented_unverified` · phase 02
  - PROVIDER_QUOTA_EXHAUSTED and the dead-candidate skip were still in flight at the time of this audit.
  - Bukti snapshot: `tests/platform/copilot-runtime-pipeline.test.ts`; environment `local`, stage `protocol_verified`.

- [ ] **AI-02 — Tiada kad rekaan atau dakwaan tindakan tanpa receipt** · snapshot: `implemented_unverified` · phase 02/03B/04
  - The provenance guard is static source analysis, not a runtime proof, and the guard test was still red at the time of the audit.
  - Bukti snapshot: `tests/platform/provenance-truth-guard.test.ts`; environment `local`, stage `component_present`.

- [ ] **AI-03 — Approval stale/expired/berulang atau gagal CAS tidak menggandakan command** · snapshot: `implemented_unverified` · phase 03A/04
  - No unknown_outcome state when the outcome of an execution cannot be determined.
  - Bukti snapshot: `tests/platform/hitl-execution-v24.test.ts`; environment `local`, stage `protocol_verified`.

- [ ] **PD-01 — Opt-out menghalang promosi termasuk queued dispatch** · snapshot: `implemented_unverified` · phase 03A/03B
  - No opt-out gate at dispatch (publish is blocked outright, so no dispatch path exists to gate) and the asset consent field is still free text.
  - Bukti snapshot: `tests/platform/operational-amendments.test.ts`; environment `local`, stage `component_present`.

- [ ] **OPS-01 — Quarantine tidak dijual dan movement diaudit** · snapshot: `verified_local` · phase 03A/03B
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/copilot/mod-03-inventory.test.ts`; environment `local`, stage `component_present`.

- [ ] **ARC-01 — Import terlarang/cycle ditolak; client bebas server secrets** · snapshot: `verified_local` · phase 01
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/architecture/dependency-boundaries.test.ts`; environment `local`, stage `protocol_verified`.

- [ ] **REL-01 — Preview/production artifact dan config dikenal pasti** · snapshot: `implemented_unverified` · phase 06
  - No deployment receipt: no preview/production artifact id, no deployment URL, and the Playwright browser suite has never been run against a live server.
  - Bukti snapshot: `tests/platform/vercel-entry.test.ts`; environment `local`, stage `component_present`.

## Tujuh ekstensi dengan gate berasingan

- [ ] **EXT-01 — Inspector local** · snapshot: `implemented_unverified` · phase 02/04
  - The dev-only inspector route is not mounted in the platform app.
  - Bukti snapshot: `tests/platform/intelligence-ext-local.test.ts`; environment `local`, stage `component_present`.

- [ ] **EXT-02 — User Memories** · snapshot: `blocked_external` · phase 05
  - Hosted User Memories requires INTELLIGENCE_ACCOUNT_AND_TERMS_REQUIRED.
  - Bukti snapshot: `tests/platform/intelligence-ext-local.test.ts`; environment `local`, stage `component_present`.

- [ ] **EXT-03 — Capture/Product Analytics/collector** · snapshot: `blocked_external` · phase 05
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/ext-03-telemetry.test.ts`; environment `local`, stage `component_present`.

- [ ] **EXT-04 — Slack/Teams Channels** · snapshot: `blocked_external` · phase 05
  - Live Slack/Teams requires CHANNEL_PROVIDER_ACCOUNT_REQUIRED (provider account, app, signature, permission).
  - Bukti snapshot: `tests/platform/intelligence-ext-local.test.ts`; environment `synthetic`, stage `sdk_wired`.

- [ ] **EXT-05 — WebMCP own-app** · snapshot: `blocked_external` · phase 04
  - The browser-side MCP client API and the live own-app registration are not available in this environment.
  - Bukti snapshot: `tests/ext/ext-webmcp-probe.test.ts`; environment `local`, stage `component_present`.

- [ ] **EXT-06 — Voice** · snapshot: `blocked_external` · phase 04
  - Label tempatan sahaja; current integration/release receipt masih diperlukan.
  - Bukti snapshot: `tests/platform/ext-06-voice.test.ts`; environment `local`, stage `component_present`.

- [ ] **EXT-07 — Attachments/multimodal** · snapshot: `implemented_unverified` · phase 04
  - The copilot route does not yet pass attachmentIds through, and there is no vision inference.
  - Bukti snapshot: `tests/platform/ext-07-attachments.test.ts`; environment `local`, stage `component_present`.

## Kontrak tick selepas setiap task

1. Baca CURRENT-STATUS, checklist, checkpoint dan prerequisite source. Codex melaksanakan task ready pertama inline; jangan melancarkan semula external agents.
2. Reproduce dan TDD behavior yang diubah; simpan source/dirty hashes, exact command/result, environment dan scope. Komponen siap sahaja tidak menutup parent feature.
3. Semak keseluruhan requirement dan bukti API/protocol/browser/domain/live yang diwajibkan. Live gate yang belum dipenuhi kekal unchecked, termasuk jika local implementation sudah boleh diuji.
4. Dapatkan review selepas diff stabil. Integrator sahaja menukar checkbox canonical; hanya selepas verifier/renderer menerima receipt yang sepadan dengan source. Jangan bypass stale/failing verification.
5. Sync ledger, register, checklist dan checkpoint dalam batch sama. Rekod current/next task serta gate owner; task DONE/NEXT kecil tidak mengubah denominator 85 atau menutup parent secara automatik.
6. Kekalkan historical receipts. Jika bukti stale, nyatakan ia snapshot; jangan padam bukti asal atau menyalin tick dari laporan lama.
