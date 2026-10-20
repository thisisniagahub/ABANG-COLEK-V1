# ADR-0002 — Zero-New-Spend Full-Platform Hosting Topology

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **SUPERSEDED — 19 Oktober 2026:** [ADR-0003](0003-blueprint-v23-execution-contract.md) dan [master blueprint v2.3](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) menggantikan local-only topology dan penolakan cloud dalam rekod ini. Kandungan di bawah ialah keputusan/snapshot sejarah, bukan deployment receipt atau arahan mengaktifkan tunnel. Runtime cloud menggunakan authority Supabase CAS seperti source; runtime local/data path mesti disahkan berasingan. Gunakan [prompt semasa](../prompts/IMPLEMENT-ABANGCOLEK.md).

**Tarikh:** 2026-10-04  
**Status:** SUPERSEDED_BY_ADR_0003; kandungan sejarah dikekalkan.
**Task ID:** C02  
**Canonical Source:** `D:\ABANGCOLEK-PLATFORM`  
**Rujukan:** [ADR-0001](0001-project-authority-and-continuity.md), [Source of Truth](../ABANGCOLEK-SOURCE-OF-TRUTH.md), [Recovery Runbook](../runbooks/platform-recovery.md)

---

## 1. Konteks & Keperluan Sistem

Platform ABANGCOLEK ialah **modular monolith** yang menggabungkan:
1. **Frontend Web SPA**: React 18, Vite, Tailwind CSS, Lucide icons, Emons Scroll Controller.
2. **Backend API**: Bun runtime (`server/platform/app.ts`), modular domain services (Commerce, Work, Operations, Dealers, Marketing, JEV, Automation).
3. **Pangkalan Data Berwibawa**: SQLite dalam mod WAL (`D:\ABANGCOLEK-OS\var\lib\platform\platform.sqlite`).
4. **Penyimpanan Fail Bukti**: Sistem fail tempatan selamat (`var/lib/platform/evidence/`).
5. **Durable Worker & Scheduled Jobs**: Bun background worker dengan lease idempotency dan periodic cleanup.

### Batasan Mandatori (Zero-New-Spend Invariant)
- **Sifar Perbelanjaan Baharu**: Dilarang melanggan perkhidmatan berbayar (AWS RDS, PostgreSQL cloud, Redis Cloud, Vercel Pro, atau model berbayar pihak ketiga).
- **Integriti Data Tempatan**: Runtime authoritative sedia ada di `D:\ABANGCOLEK-OS\var` mesti dilindungi daripada sebarang snapshot corruption atau penghapusan data bisnes.
- **Same-Origin Cookie & CSRF Security**: Sesi platform menggunakan HTTP-only cookie (`platform_session`), `SameSite=Strict`, dan `x-csrf-token`.

---

## 2. Penilaian Alternatif Hosting & Topology

| Pilihan Topologi | Sokongan Frontend SPA | Sokongan Bun API + Worker | Sokongan SQLite (WAL & Persistence) | Kos Kewangan | Status Penilaian |
|---|---|---|---|---|---|
| **A. Vercel / Cloudflare Pages (Frontend Sahaja)** | Ya (Cemerlang) | Tidak (Serverless timeout, stateless) | Tidak (Ephemeral disk merosakkan SQLite) | RM 0 | **DITOLAK SEBAGAI FULL PLATFORM**. Hanya boleh sebagai static CDN jika API dihos berasingan. |
| **B. Cloud Managed Database (Supabase/Neon + Vercel)** | Ya | Separuh (Edge/Serverless functions) | Memerlukan penulisan semula seluruh kod store ke Postgres | Potensi caj tambahan | **DITOLAK**. Melanggar seni bina SQLite monolith dan DEC-02. |
| **C. Sovereign Host + Cloudflare Tunnel (Zero-Trust)** | Ya | Ya (Bun v1.4.2 natively active) | Ya (NTFS/ext4 local volume dengan ACID WAL) | **RM 0 (Percuma)** | **DIPILIH & DISAHKAN (RECOMMENDED)**. |
| **D. Oracle Cloud Always Free VM (Linux aarch64)** | Ya | Ya (Bun Linux binary) | Ya (Block volume persistent) | RM 0 | Pilihan alternatif luar jangka jika host fizikal perlu dialih keluar. |

---

## 3. Keputusan Seni Bina (Decisions)

### DEC-02-1: Topologi Pengeluaran Berdaulat (Sovereign Host + Tunnel)
Platform ABANGCOLEK akan dijalankan sebagai perkhidmatan monolith pada host berdaulat:
- **Port Dalaman**:
  - `3010`: Bun Modular Monolith HTTP API & WebSocket Server.
  - `3000`: Vite SPA static server / production dist server.
- **Reverse Proxy & Ingress Zero-Cost**:
  - Menggunakan **Cloudflare Tunnel (`cloudflared`)** atau **Caddy/Nginx** reverse proxy tempatan.
  - Menyediakan penamatan TLS/HTTPS percuma secara automatik.
  - Semua laluan `/api/platform/*` dihalakan secara *same-origin* ke port 3010, manakala semua fail web statik dihidangkan di root `/`. Ini mengekalkan perlindungan CSRF dan keselamatan *Strict Cookies* tanpa isu CORS.

### DEC-02-2: Persistensi & Integriti Pangkalan Data SQLite
- Lokasi pangkalan data disahkan kekal pada pemacu tempatan dengan sokongan fail locks penuh (NTFS di Windows atau ext4 di Linux).
- Mod WAL (`PRAGMA journal_mode = WAL;`) dan `PRAGMA synchronous = NORMAL;` digunakan untuk kelajuan menulis dan keselamatan concurrency.
- Pengekalan data evidence fail disimpan pada volume fizikal yang sama di bawah `var/lib/platform/evidence`.

### DEC-02-3: Polisi Sandaran & Pemulihan (Backup & Disaster Recovery)
- Sandaran berkala dijalankan menggunakan skrip `scripts/platform-backup.ts` yang melaksanakan arahan rasmi SQLite `VACUUM INTO` untuk snapshot konsisten tanpa mengganggu proses berjalan.
- Sandaran disimpan dalam direktori `var/backups/` dengan perancangan sinkronisasi ke Google Drive sedia ada (melalui rclone/pCloud zero-cost) sebagai *offsite redundancy*.

### DEC-02-4: Penjadualan Worker & Pembersihan Proses
- Tugas automasi latar belakang dijalankan secara *in-process* oleh loop Bun worker dengan lease expiration (15 minit), menghalang pembentukan proses *zombie*.
- Perkhidmatan dipantau oleh watchdog (`scripts/qa-platform.ts` / Task Scheduler Windows / systemd Linux).

---

## 4. Runbook Penerapan Pengeluaran (Deployment Runbook)

### Langkah 1: Pengesahan & Pembinaan Frontend
```powershell
Set-Location -LiteralPath 'D:\ABANGCOLEK-PLATFORM'
bun run build
# Menjana folder dist/ yang dioptimumkan
```

### Langkah 2: Menjalankan Perkhidmatan Monolith Bun
```powershell
$env:PLATFORM_RUNTIME_ROOT = 'D:\ABANGCOLEK-OS\var'
$env:PLATFORM_DATABASE = 'D:\ABANGCOLEK-OS\var\lib\platform\platform.sqlite'
$env:PORT = '3010'
bun run server/platform/serve.ts
```

### Langkah 3: Mengaktifkan Ingress Selamat (Cloudflare Tunnel)
```powershell
cloudflared tunnel --url http://localhost:3010
```

---

## 5. Status Semakan & Rollback

- **Status Pengeluaran Semasa**: `READY_LOCAL` (Persekitaran lokal lengkap dan terbukti melalui ujian unit & integrasi).
- **Langkah Pemilik Seterusnya**: Pemilik mengaktifkan Cloudflare Tunnel rasmi dengan domain kustom apabila bersedia untuk capaian umum.
- **Rollback**: Sekiranya mod pengeluaran perlu dihentikan, hentikan proses Bun server port 3010. Pangkalan data SQLite di `D:\ABANGCOLEK-OS\var` kekal utuh tanpa perubahan struktur yang merosakkan.
