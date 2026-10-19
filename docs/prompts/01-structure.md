# Prompt 01 — Restructure Repo Tanpa Perubahan Tingkah Laku

Baca [kontrak utama](IMPLEMENT-ABANGCOLEK.md), [structure design](../design/repository-structure.md) dan checkpoint03A. Integriti wajib mendahului restructure. Destinasi telah ditetapkan; jangan pilih monorepo lain atau framework baru.

## Ownership dan hasil

Migration owner memegang manifest moves dan config/import edits. Worker frontend/backend tidak memindahkan fail sama. Output `reports/implementation/01-structure.md` dan migration map dengan hashes.

## Urutan wajib

1. Stage A: gunakan exact docs/media map dalam structure design. Sahkan absolute paths kekal dalam repo; reject collisions. Gunakan PowerShell native `Move-Item -LiteralPath`, bukan cross-shell delete/move. Tidak memindahkan DB, secrets atau tool directories.
2. Update maintained links/indexes dan exact code/config consumers; historical payload kekal kecuali approved banner/link errata. Preserve asset export trees.
3. Stage B: extract application shell/router/layout dan canonical HTTP client dahulu; kemudian relocate low-coupling frontend features. Jangan pindah business helper ke generic lib hanya kerana ia shared.
4. Stage C: extract bootstrap/HTTP/infrastructure/agent boundaries. Inventori method, callers dan transaction contexts sebelum memisahkan commerce/dealer modules. Tiada functional finance rewrite dalam commit move.
5. Stage D: group shared contracts, tests dan scripts mengikut design. Recalculate `import.meta.dir`, fixture paths dan discovery globs. Temporary re-export facade mesti mempunyai expiry/consumer list dan satu implementation sahaja.
6. Tambah dependency checker yang memahami TS resolver/aliases/re-exports; gunakan existing TypeScript dependency dahulu. Ujian negatif untuk client->server, shared->app, feature internals dan cycles. Legacy exceptions mempunyai owner dan removal task.
7. Bagi setiap stage, banding pre/post hash/count, import/config resolution, casing Linux dan local links. Run relevant tests, lint/build. Jalankan navigation/auth E2E selepas frontend move dan domain/CAS tests selepas backend move.
8. Independent reviewer periksa manifest dan diff; commit hanya batch owned apabila checks relevan lulus. Jangan stage dirty code pihak lain.

## Acceptance

Fail asal/destinasi accounted for, tiada lost content, runtime/public routes dan test discovery kekal. Jangan menutup baseline failures dengan memadam tests. Jika file berubah oleh worker/pengguna selepas hash capture, hentikan move fail itu, reconcile content dan rekod manifest baharu; jangan overwrite. Update checkpoint ke fasa02.
