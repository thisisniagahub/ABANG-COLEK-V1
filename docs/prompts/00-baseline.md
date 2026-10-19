# Prompt 00 — Baseline dan Preflight

Baca [kontrak utama](IMPLEMENT-ABANGCOLEK.md) dan [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md). Laksanakan fasa ini dahulu, kemudian teruskan [03A integriti](03-domains-and-tools.md) sebelum01. Jangan minta pilihan teknikal.

## Ownership dan hasil

Fasa ini membaca source/config dan menulis evidence serta checkpoint; tidak mengubah DB atau mengaktifkan provider. Owner ialah integrator. Output: `reports/implementation/00-baseline.md`, capability matrix dan `docs/handover/IMPLEMENTATION-CHECKPOINT.md`.

## Langkah wajib

1. Sahkan cwd, origin dan HEAD. Simpan status tracked/untracked, modified paths serta hashes fail yang akan disentuh. Lindungi dirty user changes. `node_modules` mungkin symlink; jangan reinstall/recreate sebagai langkah lalai.
2. Baca package scripts, Vite/TS/Vercel config, active entry, runtime launcher, snapshot handler, auth dan agent tools. Trace existing OS agent capabilities kepada adapter canonical; jangan mount legacy full app.
3. Rekod runtime root/data identity secara read-only tanpa membocorkan secret atau business rows. Jangan anggap `D:\ABANGCOLEK-OS\var` atau folder baru berautoriti tanpa config/identity.
4. Jalankan baseline `bun run lint`, `bun run build`, `bun run test:platform`. Record exact failures; jangan fix unrelated failures dalam batch struktur secara senyap.
5. Rekod package pins/peer dependencies/exports dari ADR. Semak Python3.12, uv/venv, Bun dan browser-test tooling. Tiada model calls setakat ini.
6. Discover MCP/plugin tools sebenar tanpa membaca nilai secret. Bezakan callable, configured-only, unavailable dan auth-required. Gunakan fallback kontrak utama.
7. Baca official CopilotKit `.md` docs, pinned source dan AG-UI spec. Sahkan import APIs bagi React ADK bridge, A2UI Fixed Schema dan MCP App resources sebelum code.
8. Semak provider environment **nama dan configured status sahaja**. Sahkan free offering/account/privacy/fees. Tidak boleh membuat inference jika eligibility belum terbukti.
9. Wujudkan matriks CPK-01..10, GUI-01..07, MOD-01..10, ADV-01..32 dan semua19 acceptance IDs blueprint. Semua bermula observed/proposed/not-run mengikut bukti; jangan mewarisi status lulus lama.
10. Assign file ownership dan kerja bebas untuk fasa01; asingkan findings source/security yang perlu diselesaikan dalam fasa03.

## Acceptance dan blocked behavior

Baseline mempunyai timestamps Malaysia, commit/worktree manifest, commands/results, skill/MCP availability dan exact next task. Jika tests gagal, rekod puncanya dan sama ada baseline blocker; kerja docs/moves yang tidak terjejas boleh diteruskan. Jika runtime root atau target identity tidak dapat disahkan, jangan restart/migrate/restore data. Jika credentials/hosting tiada, mark dependency blocked dan teruskan local/synthetic work yang bebas. Tiada claim runtime/provider/production verified daripada metadata.
