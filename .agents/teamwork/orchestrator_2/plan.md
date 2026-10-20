# Plan: ABANGCOLEK Platform v2.4 Autopilot

## Overview
Melaksanakan baki fasa pembangunan platform ABANGCOLEK v2.4 secara teratur dan disahkan dengan teliti:
- **Milestone 1 (Fasa 03A)**: Integriti Kewangan, Lejar, HITL Lifecycle (SELESAI - 40 ujian unit lulus).
- **Milestone 2 (Fasa 01)**: Struktur Monolith Modular & Pindaan Aset Selamat.
- **Milestone 3 (Fasa 02)**: CopilotKit Runtime Fetch v2 & Python Google ADK Free Bridge.
- **Milestone 4 (Fasa 03B)**: Registri 32 Advanced Tools & 10 Modul Berkanun.
- **Milestone 5 (Fasa 04)**: 7 Pendekatan Generative UI & A2UI Fixed Schema.
- **Milestone 6 (Fasa 06 / E2E)**: Ujian Akhir, Sifar Ralat Linter/Build, Pengerasan Liputan, Pengemaskinian Daftar Bukti.

## Step-by-Step Execution Plan

### Milestone 2: Fasa 01 (Struktur Monolith Modular & Pindaan Aset Selamat)
1. **Exploration**: Spawn 3 Explorers (`explorer_m2_1`, `explorer_m2_2`, `explorer_m2_3`) untuk menyiasat:
   - Sempadan kebergantungan import sedia ada (`src/`, `server/`, `shared/`).
   - Lokasi fail arkib media `PRODUCT LLH*` di root dan keperluan pemindahan ke `references/media/product-2026-10-17/` dengan integriti hash.
   - Penstrukturan semula folder dokumentasi (`docs/architecture/`, `docs/product/`, `docs/runbooks/`).
   - Reka bentuk skrip `scripts/maintenance/check-boundaries.ts` dan ujian `tests/architecture/dependency-boundaries.test.ts`.
2. **Implementation (Worker)**: Spawn `worker_m2` untuk:
   - Menyediakan `scripts/maintenance/check-boundaries.ts` dan `tests/architecture/dependency-boundaries.test.ts`.
   - Melaksanakan pemindahan fail dokumentasi dan arkib media tanpa ubah hash.
   - Menjalankan `bun test tests/architecture/dependency-boundaries.test.ts`.
3. **Review (Reviewers)**: Spawn 2 Reviewers (`reviewer_m2_1`, `reviewer_m2_2`) menyemak ketepatan pemindahan dan ujian sempadan.
4. **Adversarial Verification (Challengers)**: Spawn 2 Challengers (`challenger_m2_1`, `challenger_m2_2`) menguji cubaan melanggar sempadan import (contoh: import rahsia server dalam src/).
5. **Integrity Audit**: Spawn `teamwork_preview_auditor` menyemak keaslian pelaksanaan dan tiada pemintasan.
6. **Gate Evaluation**: Menilai keputusan dalam `GATE_STATUS.md`.

### Milestone 3: Fasa 02 (CopilotKit Runtime & Python ADK Free Bridge)
1. Exploration: Siasat CopilotKit Fetch v2 endpoint (`server/agents/copilot/runtime.ts` dan route `/api/platform/copilot/v2`), konfigurasi proxy Vite port 3020, HttpAgent ke Python ADK port 8030, serta router model percuma `server/agents/providers/model-router.ts`.
2. Implementation: Bangunkan runtime, penyambung HttpAgent, dan model router mengikut urutan percuma.
3. Review & Verification: Reviewers, Challengers, dan Forensic Auditor.
4. Gate: Semak kelulusan.

### Milestone 4: Fasa 03B (Registri 32 Tools & Kawalan Privasi)
1. Exploration: Siasat skema 32 alatan terurus (AT-0 hingga AT-3), penguatkuasaan had bajet (6 alatan per sesi), dan sekatan IDOR (SEC-02, PD-01).
2. Implementation: Bangunkan `registry.ts` dan `definitions.ts` dengan skema Zod ketat.
3. Review & Verification: Reviewers, Challengers, dan Forensic Auditor.
4. Gate: Semak kelulusan.

### Milestone 5: Fasa 04 (Generative UI & A2UI Fixed Schema)
1. Exploration: Siasat 5 kad kanonikal A2UI dan sistem Fixed Renderer di `src/features/copilot/`.
2. Implementation: Bina komponen kad dan registri A2UI dengan perlindungan suntikan rawak.
3. Review & Verification: Reviewers, Challengers, dan Forensic Auditor.
4. Gate: Semak kelulusan.

### Milestone 6: Fasa Akhir (100% E2E Pass, Build, Lint & Daftar Bukti)
1. Jalankan keseluruhan ujian platform (`bun test`).
2. Jalankan `bun run lint` dan pastikan tsc exit code 0.
3. Jalankan `bun run build` dan pastikan binaan pengeluaran bersih tanpa ralat.
4. Kemas kini `PROJECT-CHECKLIST.md` dan `ACCEPTANCE-REGISTER.md` secara atomik dengan resit rasmi.
5. Laporkan penyiapan kepada Sentinel.
