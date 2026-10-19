<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Pelan Pelaksanaan Master ABANGCOLEK: 18 Task Lengkap

**Tarikh:** 4 Oktober 2026  
**Status:** IN_PROGRESS (Wave 1 Active)  
**Lead:** Antigravity (AGY) Sovereign Implementation Lead  
**Canonical Source:** `D:\ABANGCOLEK-PLATFORM`  
**Authoritative Runtime/Data:** `D:\ABANGCOLEK-OS\var` (SQLite: `D:\ABANGCOLEK-OS\var\lib\platform\platform.sqlite`)  

---

## 1. Ringkasan & Prinsip Pelaksanaan

1. **Evidence-First & Zero Guessing**: Setiap task mesti disahkan dengan kod sebenar, ujian unit/integrasi/e2e, dan outcome receipt.
2. **Kekalkan Stack & Architecture**: React/Vite/Tailwind frontend + Bun/SQLite modular monolith backend. Tiada penambahan perkhidmatan cloud berbayar atau penukaran stack.
3. **Pemisahan Status Yang Tepat**:
   - `DONE_LOCAL`: Kod siap dan lulus ujian lokal.
   - `CONNECTED_VERIFIED`: Integrasi provider terbukti dengan live handshake/outcome.
   - `READY_FOR_OWNER` / `WAIT_OWNER_INPUT`: Sedia untuk review/input pemilik tanpa data palsu.
   - `WAIT_RESOURCE`: Memerlukan kelulusan kos/akses luar.
   - `DONE_DOCUMENTED`: Penilaian arkitektur dan dokumentasi lengkap.
   - `PRODUCTION_VERIFIED`: Melepasi seluruh gate pengeluaran.
4. **Perlindungan Data**: Runtime root `D:\ABANGCOLEK-OS\var` dilindungi. Sebarang ujian QA menggunakan pangkalan data pakai buang (`var/lib/qa`).

---

## 2. Peta Pembahagian Kerja & Swarm (18 Tasks)

### Gelombang 1: Teras Keselamatan, Akses, Navigasi & JEV
- **D02 [Access/Navigation]**: Capability-aware navigation metadata & backend negative tests.
  - Fail: `src/features/platform/routes.ts`, `src/features/platform/WorkspaceNavigation.tsx`, `src/features/platform/AppRouter.tsx`, `server/platform/auth.ts`, `tests/platform/capability-navigation.test.ts`.
- **D03 [Developer Scoped Workspaces]**: Distinct Developer Reports (diagnostics/system execution summaries) & Settings (readiness & safe runtime controls).
  - Fail: `src/features/workspaces/WorkspaceContent.tsx`, `src/features/workspaces/DeveloperReports.tsx`, `src/features/workspaces/DeveloperSettings.tsx`, `tests/platform/developer-workspaces.test.ts`.
- **E01 [JEV Engine & Evaluation]**: Native JEV evaluation, golden regression dataset, calibration & benchmark with honest local fallback.
  - Fail: `shared/jev-contracts.ts`, `server/platform/jev/`, `src/features/workspaces/JevEvaluationWorkspace.tsx`, `tests/jev/evaluation-benchmark.test.ts`.
- **B01 [Security & Credential Audit]**: Credential incident follow-through runbook, access audit, and safe rotation protocol.
  - Fail: `docs/runbooks/credential-revocation-audit.md`.
- **B05 + D07 [Product Truth & Onboarding]**: Product portfolio & brand assets verification, schema onboarding flow, unverified indicators, preview.
  - Fail: `src/features/brand/brand-assets.ts`, `src/features/workspaces/ProductOnboarding.tsx`, `shared/platform-contracts.ts`, `server/platform/commerce.ts`, `tests/platform/product-onboarding.test.ts`.
- **C02 [Hosting Topology ADR]**: Verified zero-new-spend full-platform hosting topology ADR.
  - Fail: `docs/decisions/0002-zero-new-spend-hosting-topology.md`.

### Gelombang 2: Integrasi Data, Automasi & Pembersihan
- **D04 [Audited Migration/Parity]**: Legacy Google/Supabase data maps, dry-run, reconciliation tooling & rollback.
  - Fail: `server/platform/migration/`, `scripts/legacy-migration-dryrun.ts`, `tests/platform/legacy-migration.test.ts`.
- **E02 [Agent Runtime Injection]**: Hermes & Agent-Reach connected runtime transport, source allowlist, quota/timeout controls & receipts.
  - Fail: `server/automation/adapters.ts`, `server/automation/sourcePolicy.ts`, `server/platform/app.ts`, `tests/platform/agent-runtime.test.ts`.
- **E03 [Social Marketing Engine]**: Postiz one-channel pilot adapter, rights/exact-revision approval, manual export vs publish receipts.
  - Fail: `server/platform/marketing.ts`, `src/features/workspaces/marketing.tsx`, `tests/platform/marketing-publish.test.ts`.
- **E04 [WhatsApp & Guided Flows]**: Native WhatsApp / Flows capability seam, official Cloud API adapter, rate limits & web-guided flow parity.
  - Fail: `server/platform/whatsapp.ts`, `src/features/flows/`, `tests/platform/whatsapp-flows.test.ts`.
- **C01 [Revision Review & Linux CI]**: Review git diffs, clean lockfile/CI workflow for Linux headless runner.
  - Fail: `.github/workflows/ci.yml`.
- **F02 [Root Housekeeping]**: Reference-safe cleanup of root directory to $\le 15$ core files.
  - Fail: Root files audit and consolidation.

### Gelombang 3: Integrasi Pariti Warisan, Sintesis Research & Verifikasi Hos
- **D05 [Selected Legacy Pilots]**: Selective porting of Google Workspace adapter, bus freight SOP/schedule, and founder assistant.
  - Fail: `server/platform/legacyAdapters.ts`, `src/features/workspaces/FounderAssistant.tsx`, `tests/platform/legacy-pilots.test.ts`.
- **E05 [Research Disposition Matrix]**: Formal disposition matrix and useful pattern extraction for Grok Bot, Meta Muse, OpenAI dots, DeepSeek Harness, and Hermes.
  - Fail: `docs/research/RESEARCH-DISPOSITION-MATRIX.md`.
- **C03 [Host Security Verification]**: Host security test suite for same-origin API JSON, CSRF, secure cookies, and negative RBAC.
  - Fail: `tests/platform/host-security.test.ts`.
- **C04 [Persistence & Worker Recovery]**: Persistence and durable worker crash recovery verification.
  - Fail: `tests/platform/production-persistence.test.ts`.

### Gelombang 4: Penerimaan Bisnes, Keselarasan Dokumentasi & Laporan Akhir
- **C05 [Whole-Role Business Journeys]**: Comprehensive journey tests across Public, Customer, Staff, Founder, Dealer, and Developer.
  - Fail: `tests/e2e/business-journeys.test.ts`.
- **Documentation Alignment**: Synchronize `ABANGCOLEK-SOURCE-OF-TRUTH.md`, `PROJECT-ALIGNMENT-BACKLOG.md`, `CAPABILITY-MATRIX.md`, `AGENT-HANDOVER-A-Z.md`, `MARKDOWN-ALIGNMENT-REGISTER.md`.
- **Final Delivery Report**: Detailed per-task outcome table, limitations, and owner next steps.

---

## 3. Pelaksanaan Fasa Demi Fasa
Setiap langkah mengikut kitaran TDD:
`[RED: Test Gagal/Spesifikasi] -> [IMPLEMENT: Tulis Kod Bersih] -> [GREEN: Ujian Lulus] -> [INSPECT: Linter & Review]`.
