
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](docs/CURRENT-STATUS.md) · [Checklist](PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<p align="center">
  <img src="public/assets/brand/ABANG-COLEX-LOGO-2.png" alt="ABANGCOLEK logo" width="180" />
</p>

<h1 align="center">ABANGCOLEK Platform</h1>

<p align="center">
  <strong>Operating system untuk operasi makanan, stokis, commerce, quality, marketing dan automation ABANGCOLEK.</strong>
</p>

<p align="center">
  <a href="https://vercel.com/niaga-hub-pro/abang-colek-v1"><img src="https://img.shields.io/badge/Production-Vercel-black?logo=vercel" alt="Production on Vercel" /></a>
  <a href="https://github.com/thisisniagahub/ABANG-COLEK-V1/actions"><img src="https://img.shields.io/github/actions/workflow/status/thisisniagahub/ABANG-COLEK-V1/vercel-production.yml?branch=main&label=CI%20%2B%20deploy" alt="CI and deploy status" /></a>
  <img src="https://img.shields.io/badge/runtime-Bun%201.4.2-f9f1e1?logo=bun&logoColor=black" alt="Bun 1.4.2" />
  <img src="https://img.shields.io/badge/frontend-React%20%2B%20Vite-61dafb?logo=react&logoColor=black" alt="React and Vite" />
</p>

<p align="center">
  <a href="https://vercel.com/niaga-hub-pro/abang-colek-v1">Live deployment</a> ·
  <a href="https://github.com/thisisniagahub/ABANG-COLEK-V1/actions">Actions</a> ·
  <a href="docs/README.md">Documentation index</a> ·
  <a href="docs/runbooks/platform-recovery.md">Recovery runbook</a>
</p>

![ABANGCOLEK Platform visual](public/assets/brand/abangcolek-world-v2.webp)

> **Status20Oktober2026:** main `18c69b3` sudah dipush; Vercel production READY bagi patch11 fail TypeScript/config/regression sahaja. Main lint/build lulus;1423 platform tests,16 local browser tests dan8 public production browser tests lulus. GitHub Actions tidak bermula kerana account billing. Implementasi Copilot baharu masih dalam lane development. Baca [CURRENT-STATUS](docs/CURRENT-STATUS.md) dan [checklist](PROJECT-CHECKLIST.md) untuk85 requirement, jurang sebenar dan scope bukti.

## Apa yang dibina

**Kemajuan dan task semasa:** buka [PROJECT-CHECKLIST.md](PROJECT-CHECKLIST.md). Checklist memisahkan dokumentasi, release landing dan implementasi Copilot; ticks memerlukan evidence, bukan source presence atau laporan agent sahaja.

ABANGCOLEK Platform menyatukan operasi harian dalam satu workspace yang boleh diaudit:

- **Public experience** — landing page, product catalogue, lokasi, bantuan dan dealer application.
- **Customer** — purchases, status, private receipts, complaints dan membership scope.
- **Staff** — assigned orders, tasks, QC, shifts, documents dan SOP.
- **Founder** — overview, approvals, stock/batch, dealers, marketing, finance, people dan settings.
- **Developer** — readiness, jobs, runtime identity, evaluations, reports dan platform settings.
- **Dealer/stokis** — baseline source menggunakan approved organisation scope pada customer membership. **TARGET_DESIGN 21 Oktober:** setiap Agent/Stokis aktif menerima Online Store public sendiri yang ABANGCOLEK sediakan dan Dealer Workspace private dengan navigasi/identiti dealer, menggunakan membership/grants canonical. Pendaftaran terus tidak memerlukan pembelian terdahulu; empat auth roles semasa tidak mengehadkan pengalaman dealer wajib ini.
- **JEV/evidence** — local rules, policy, evidence, revision, receipt dan evaluation boundaries.
- **Automation** — typed contracts, adapters, local job state dan mock provider state tanpa mendakwa provider luar sudah aktif.

[Spesifikasi Commerce & Growth](docs/design/commerce-growth.md) memperincikan sasaran `/kedai/:slug`, anonymous published browsing, server-bound store/dealer/referrer/fulfiller dan referral pelanggan satu peringkat dua hala mengikut polisi approved. P0 ordering, P1 rewards dan P2 retention ialah urutan dalam domain ini; runtime, integriti dan release gates projek tetap wajib. Share biasa tidak memberi reward; kadar lima tingkat Ahmad’s ialah research sahaja. Wallet top-up, cash withdrawal dan native app wajib kekal deferred. Ini skop pembangunan, bukan bukti provisioning atau transaksi sudah berfungsi; lihat [handover](docs/prompts/COMMERCE-GROWTH-HANDOVER-20261021.md).

## Visual overview

<p align="center">
  <img src="public/assets/brand/platform-icon-192.png" alt="ABANGCOLEK platform icon" width="96" />
</p>

### Architecture

```mermaid
flowchart TD
    A[Landing + AppRouter + role workspaces] --> B[/api/platform + typed contracts/]
    B --> C[Auth · CSRF · revision · idempotency]
    C --> D[Bun domain modules]
    D --> E[(Local SQLite + private files)]
    D --> K[Hosted Supabase snapshot CAS + private evidence]
    D --> F[Evidence + JEV review]
    D --> G[Local job worker + automation]
    H[GitHub Actions] --> I[lint + platform tests + build]
    L[Main Git integration] --> J[Vercel: abang-colek-v1]
```

### Repository map

| Folder | Tanggungjawab |
| --- | --- |
| `src/` | React UI, AppRouter, landing, platform shell dan workspaces |
| `server/` | Bun API, domain modules, runtime identity, JEV dan automation |
| `shared/` | Typed contracts dan status schemas yang dikongsi frontend/backend |
| `public/` | Logo, brand assets, manifest dan public-only assets |
| `tests/` | Platform, JEV, integration dan browser journey tests |
| `scripts/` | Development, prerender, QA, backup dan build helpers |
| `docs/` | Source of truth, runbooks, plans dan documentation index |
| `reports/` | Research, audit, design QA dan implementation evidence |
| `var/` | Runtime database/log/files; jangan commit data operasi sebenar |

## Quick start

### Prerequisites

- Windows, macOS atau Linux
- [Bun 1.4.2](https://bun.sh/)
- Git
- SQLite runtime melalui setup projek

### Install dan run

```bash
# Existing workspace: verify root and git status before modifying.
cd D:/ABANGCOLEK-PLATFORM
# Install only when dependencies are missing and installation is authorized.
bun install --frozen-lockfile
bun run dev
```

Untuk UI sahaja:

```bash
bun run dev:ui
```

Default development surface menggunakan UI pada port `3000` dan API pada port `3010` melalui launcher projek. Jangan jalankan launcher kedua pada port yang sama atau memulakan platform dengan database kosong lalu menganggap data operasi hilang.

## Verification gates

Jalankan gates ini sebelum merge atau deploy:

```bash
bun run lint
bun run test:platform
bun run build
```

Untuk browser journeys dan QA server:

```bash
bun run test:e2e
bun run qa:server
```

Local build membaca `PLATFORM_DATABASE` atau default database checkout. Configured cloud build membaca authoritative Supabase snapshot dan gagal tertutup jika tidak dapat dibaca. Jika database tiada, catalogue public boleh kosong; itu bukan bukti bahawa business catalogue production telah onboarded.

## Environment configuration

Gunakan `.env.example` sebagai rujukan. Simpan nilai sebenar hanya dalam local secret store atau Vercel Project Settings — **jangan letakkan token, password, private key atau cookie dalam README, commit, issue atau chat**.

Contoh local setup:

```powershell
Copy-Item .env.example .env.local
# Isi nilai local yang diperlukan; jangan commit .env.local
```

Credential/provider readiness mesti dibuktikan secara berasingan. Mock state, adapter contract atau local implementation tidak sama dengan integration production.

## Continuous delivery ke Vercel

Setiap push ke `main` menjalankan workflow [`.github/workflows/vercel-production.yml`](.github/workflows/vercel-production.yml):

1. checkout repository;
2. install Bun `1.4.2` dengan frozen lockfile;
3. jalankan `lint`;
4. jalankan `test:platform`;
5. jalankan production build;
6. optional CLI deploy hanya jika `VERCEL_TOKEN` dikonfigurasi; canonical autodeploy ialah Vercel Git integration ke **niaga-hub-pro/abang-colek-v1**. Sahkan exact SHA dalam deployment; CI boleh blocked sebelum berjalan dan tidak menjamin deploy.

### Optional GitHub CLI deployment secret

Untuk optional CLI deployment sahaja, konfigurasi secret repository berikut di **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Kegunaan |
| --- | --- |
| `VERCEL_TOKEN` | Token Vercel milik account/team yang mempunyai akses ke team `niaga-hub-pro`, project `abang-colek-v1` |

Workflow tidak menyimpan token dalam source code. Jika token pernah terdedah, revoke token lama dahulu dan cipta token baharu sebelum menambahnya ke GitHub Actions.

> **Important:** Vercel email yang memiliki `VERCEL_TOKEN` tidak perlu sama dengan email GitHub, tetapi token tersebut mesti mempunyai akses kepada project/team yang betul.

## Security dan data boundaries

- Jangan commit `.env`, token, cookies, database production, browser profile, cache atau generated runtime artifacts.
- Semak perubahan dengan `git diff --check` dan `git status` sebelum commit.
- Role, organisation membership, revision, idempotency dan evidence boundary hendaklah disahkan di backend.
- First-party documents/tasks/calendar bukan Google records automatik.
- Google, Supabase, WhatsApp, Postiz dan provider AI legacy tidak dianggap synced atau aktif tanpa proof khusus.
- Sebelum external execution, sahkan rights, approval, credentials dan zero-new-spend.

## Documentation starting points

- [Documentation index](docs/README.md)
- [Source of truth](docs/ABANGCOLEK-SOURCE-OF-TRUTH.md)
- [Master Blueprint v2.4](docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md)
- [Implementation prompts](docs/prompts/README.md)
- [Status snapshot 16 Oktober](docs/archive/legacy-oct2026/ABANGCOLEK-PLATFORM-STATUS-2026-10-16.md)
- [AI agent architecture](docs/AI-AGENT-ARCHITECTURE.md)
- [Capability matrix](docs/handover/CAPABILITY-MATRIX.md)
- [Platform recovery runbook](docs/runbooks/platform-recovery.md)
- [JEV architecture and rules](JEV.md)
- [Research index](reports/research/2026-10-02/README.md)

## Contributing

1. Cipta branch kerja daripada `main`.
2. Kekalkan perubahan kecil dan boleh diaudit.
3. Tambah atau kemas kini tests untuk behaviour baharu.
4. Jalankan lint, platform tests dan build.
5. Semak secrets, generated files dan database sebelum commit.
6. Buka pull request dengan ringkasan, evidence dan risiko deployment.

## License

Status license dan hak penggunaan assets perlu disahkan oleh pemilik projek sebelum public redistribution. Brand assets dalam repository adalah untuk penggunaan ABANGCOLEK Platform sehingga dinyatakan sebaliknya.

## Blueprint alignment — 19 Oktober 2026

[Blueprint v2.4](docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) ialah target contract. Scope Copilot: **10 ciri**, **10 modul**, **32 logical capabilities** dan **7 Generative UI approaches**. Rujuk [AI architecture](docs/AI-AGENT-ARCHITECTURE.md), [tool registry](docs/design/copilot-advanced-tools.md) dan [free-only policy](docs/research/2026-10-19-free-model-policy.md). Custom chat/SSE/kad dan class bernama ADK bukan bukti integrasi framework rasmi. Jangan lapor kesemua ciri aktif melalui documentation update.

Sasaran: React/Vite + TypeScript CopilotRuntime pada Bun -> Google ADK Python/AG-UI -> canonical scoped domain tools. Founder pilot, fixed-schema A2UI dan first-party read-only MCP App. Model/evaluator/voice/title/summary free-only; tiada paid fallback. Intelligence Streams/Learning mempunyai gate kos/data/entitlement berasingan. LOCAL_RULES JEV tidak memberi calibrated model probability atau financial authority.

Local SQLite dan hosted Supabase CAS ialah runtime berbeza. [Release runbook](docs/production-release.md) menerangkan temporary SQLite, CAS commit, private evidence dan cloud worker limits. Jangan migrate data/folder atau mount legacy app hanya kerana struktur sasaran didokumenkan. Use existing assets dan workflows; scripts/tests/runtime mesti diperiksa sebelum completion. Alignment Markdown ini tidak menjalankan test/deploy baharu.
