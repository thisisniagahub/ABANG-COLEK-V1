# Prompt 06 — Full Verification, Recovery dan Release

Baca [kontrak utama](IMPLEMENT-ABANGCOLEK.md), runbooks dan semua checkpoints. Ini verification/release gate, bukan arahan menyembunyikan incomplete features.

## Langkah wajib

1. Semak final source/worktree manifest dan owned diff. Audit CPK10/GUI7/MOD10/ADV32 plus semua19 master acceptance IDs (FIN/PAY/STK/OFF/REF/LOY/SEC/DR/AI/PD/OPS/ARC/REL) serta actual registration count; status mesti berpandukan evidence.
2. Jalankan `bun run lint`, `bun run build`, `bun run test:platform`, locked Python tests dan scoped Playwright suite. Rekod baseline failures berasingan, actual coverage denominator dan artifacts.
3. CLI verify pinned4.29.0 mengikut skill; model round-trip hanya selepas free gate. Tiada provider/Intelligence credentials -> row blocked, bukan test mocked dilabel live.
4. Failure injection: 429/timeout/cancel, corrupted/missing snapshot, CAS conflict, revoked session, stale approval, duplicate callback/outbound outcome dan server restart. Tiada double mutation atau false success.
5. Backup restore ke clean disposable target termasuk private evidence, transaction/ledger totals, checksum dan auth boundaries. Ukur RPO/RTO, jangan guna anggaran. Ketiadaan snapshot mesti degraded/unavailable.
6. Semak secrets/client bundle, dependency audit, original media tracking/privacy dan migration compatibility. Jangan output credentials atau data bisnes dalam laporan.
7. Preview deployment hanya ke project yang dipadankan dan authorized. Buktikan actual UI/API bundles, favicon, SPA deep links, auth/logout, storefront/cart/orders, dealer, QC/day-close, Copilot/GUI, runtime-agent identity dan persistence after restart.
8. Revalidate free-only provider policies sebelum aktivasi. Jika external commands belum lulus, kekalkan disabled dengan UI reason. Jangan disable seluruh integrasi hanya untuk menyembunyikan warning.
9. Independent code/security/domain review dan E2E evidence diperlukan sebelum production. Fail code milik pihak lain tidak dimasukkan dalam commit.
10. Jika sesi memberikan authorization push/deploy yang masih sah, lakukan owned atomic commits dan remote push selepas gates lulus. Jika tiada authorization, sediakan exact diff/commit/artifact dan satu tindakan approval terakhir. Jangan mereka authorization daripada dokumen ini.
11. Periksa Vercel build/runtime logs, deployed commit/artifact dan production critical journeys selepas release. Auto-deploy bukan bukti hanya kerana Git push berjaya. Rekod rollback readiness dan monitoring outcome.

## Laporan akhir

Fail, behavior berubah, commands/results, local/preview/production receipts, coverage, costs observed/unknown, blockers dan next executable task. Fail/blocked/not-run kekal jelas. Kesemua10 hanya complete jika semua CPK rows benar-benar verified; Intelligence blocked tidak menghalang pelaporan siap untuk subset yang terbukti.
