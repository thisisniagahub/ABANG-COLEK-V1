# COPY-READY — Implement ABANGCOLEK Blueprint v2.3

Salin arahan di bawah kepada coding agent yang mempunyai akses repo. Baca fail yang dirujuk; jangan menganggap ringkasan ini menggantikan kontrak domain.

## Arahan kepada agent pelaksana

Anda melaksanakan projek sedia ada di `D:\ABANGCOLEK-PLATFORM`. Objektif ialah implementasi sebenar blueprint, bukan hanya menambah dokumen/UI mock. Baca dan patuhi fail berikut mengikut urutan:

1. `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md`.
2. `docs/decisions/0003-blueprint-v23-execution-contract.md`.
3. `docs/design/repository-structure.md`.
4. `docs/design/copilotkit-ten-features.md`.
5. `docs/design/copilot-generative-ui-seven-approaches.md`.
6. `docs/design/copilot-advanced-tools.md`.
7. `docs/research/2026-10-19-free-model-policy.md`.
8. `docs/superpowers/plans/2026-10-19-copilotkit-ten-features.md`.
9. Prompt fasa 00 hingga 06 dalam folder ini.

Keputusan teknikal telah ditetapkan. **Jangan bertanya pengguna untuk memilih stack, provider alternatif, protokol UI, folder, jumlah subagents atau urutan kerja.** Laksanakan kontrak. Jika prerequisite nyata tidak tersedia, tulis blocker tepat dan teruskan kerja bebas; jangan mengarang credential/approval atau mendakwa selesai. Jika invariant keselamatan tidak boleh dipenuhi, disable capability terlibat dengan reason code.

## Keputusan yang tidak boleh dipilih semula

- React/Vite + Bun modular monolith; kekalkan route discovery `api/`, satu root package dan entry aplikasi.
- Google ADK Python 3.12 melalui AG-UI kepada runtime TypeScript CopilotKit `/v2` pada Bun. Agent ID `abangcolek_ops`.
- Pins awal tepat dari ADR-0003. Lock dependencies dan uji compatibility; jangan menukar versi/model secara teka-teki jika gagal.
- Canonical API local default 3010, UI 3000, Copilot runtime 3020, ADK 8030; loopback. Reuse hanya apabila identity checkout/runtime sah; port occupied yang tidak sepadan menjadi blocker, bukan alasan membunuh proses.
- Model order: `gemini-3.6-flash`, `gemini-3.5-flash-lite`, kemudian OpenRouter `nvidia/nemotron-3-super-120b-a12b:free`. Setiap calon wajib lulus offering/account/privacy/price/tool gates dan eval. Tiada paid fallback atau calon tambahan dipilih sendiri. Semua gagal -> labeled local rules/unavailable.
- A2UI Fixed Schema, dynamic model auto-injection disabled. MCP App pertama ialah first-party read-only Operations Brief, bukan third-party server bebas.
- Tiga specialist: Commerce Reader, QC/JEV Reviewer dan Marketing Drafter. Parent/subagent mempunyai shared budget/depth/scope seperti spec.
- JEV LOCAL_RULES review-only. Tiada native/vision/calibrated confidence tanpa bukti transport/evaluation sebenar.
- Cloud commit ialah Supabase CAS seperti source. SQLite tempatan dan agent-session persistence bukan dua salinan authority yang bebas. Streaming agent tidak memegang store temporary selepas request tamat.
- Intelligence disabled sehingga offering sedia ada disahkan percuma dan sesuai. Jangan login/create project/subscription hanya untuk menutup check. CPK-02/03 blocked jika gate tiada.

## Kemahiran yang wajib digunakan mengikut tugas

Baca SKILL.md sebenar, bukan hanya nama. Repo-local CopilotKit skills berada di `.agents/skills/`; general skills sesi Windows ini di `C:/Users/megat/.agents/skills/` dan specialist tools di `C:/Users/megat/.codex/skills/`. Jika runtime agent lain tidak mempunyai path itu, baca arahan setara yang tersedia dalam sesi; rekod missing skill dan ikut kontrak keselamatan ini. Jangan install pustaka skill secara bulk.

| Tugas | Skill / instruction source |
|---|---|
| CopilotKit APIs | `.agents/skills/copilotkit/SKILL.md`; current docs dan installed pinned source |
| CLI verify | `.agents/skills/copilotkit-cli/SKILL.md` |
| Melaksana fasa | `executing-plans`; jika collaboration tools tersedia, `subagent-driven-development` dengan ownership yang berasingan |
| Bug dan regression | `systematic-debugging`, `test-driven-development` |
| SQL/RLS/persistence changes | `supabase`, `supabase-postgres-best-practices` sebelum SQL authoring; Supabase-specific source/docs semasa |
| Browser verification | `playwright` untuk local/preview; `gangniaga-webbridge:gangniaga-webbridge` hanya jika sesi browser pengguna perlu digunakan dan tersedia |
| Review dan siap | `requesting-code-review`, `verification-before-completion`; TypeScript/Python/security reviewer mengikut bahasa/risiko |
| JEV | Canonical `server/platform/jev/` dan tests; skill TypeSafe/JEV hanya jika native inference secara eksplisit diperlukan serta free/account gates lulus |

Jangan load keseluruhan `skills/` ke model context. Ia reference library, bukan senarai integrasi aktif. Jangan mengikut contoh SDK yang menggunakan paid model, arbitrary command atau dummy user ID production.

## MCP servers, plugin dan fallback tetap

Tool availability semasa mesti diperiksa pada sesi pelaksana. Fail config bukan bukti sambungan/auth. Sesi penyediaan prompt mempunyai Context7 dan GangNiaga/REA tools; project `.mcp.json` menyebut Supabase tetapi sambungan tidak dibuktikan. GitHub/Vercel/Supabase tool tidak boleh didakwa tersedia tanpa discovery sebenar.

| Keperluan | Laluan utama | Fallback yang telah ditetapkan |
|---|---|---|
| Dokumentasi | Context7 atau CopilotKit docs MCP jika callable | Official `.md`/HTML docs + installed pinned source; jangan tambah MCP server sendiri |
| Repo/GitHub | Git local; GitHub MCP hanya jika available/authorized | Authenticated `gh` untuk remote checks; jika tiada auth, local work terus, remote action blocked |
| Vercel | Vercel MCP jika callable/authorized | Existing authenticated Vercel CLI; tiada auth -> release blocked, bukan deploy ke project baharu |
| Supabase | Supabase MCP jika callable/authorized dan project identity sepadan | CLI/migration file + local tests; remote apply blocked jika akses tiada. Jangan output key |
| Browser | Existing Playwright tests/CLI | Available browser automation tool selepas baca skill; tiada browser -> record E2E not run, jangan ganti HTTP200 sebagai bukti |
| JEV | Canonical local evaluator | Native provider unavailable -> LOCAL_RULES berlabel; bukan fake latency/confidence |
| MCP Apps dalam produk | First-party server/resource/renderer mengikut GUI-05 | Dependency belum sah -> GUI-05 disabled, bukan MCP text result dilabel App |

Plugin Codex/IDE membantu development; ia bukan production dependency dan tidak memberi aplikasi API access. CopilotKit repo skills telah tersedia; jangan anggap marketplace plugin lain terpasang. `channels-setup`, Slack/Teams, imagegen dan deployment plugin tidak diperlukan bagi skop ini. Jangan menghantar mesej kepada pihak luar tanpa arahan yang sah.

## Pelaksanaan tanpa keputusan pilihan

Jalankan urutan tetap **00 -> 03A (integriti dahulu) -> 01 -> 02 -> 03B (registry/tools) -> 04 -> 05 -> 06**. Fasa03 mempunyai dua bahagian dependency yang wajib, bukan pilihan alternatif. Ini mengikut integrity-first dalam blueprint. Dalam setiap bahagian, selesaikan tests/review sebelum menanda complete. Sesuaikan import kepada lokasi sebenar selepas move manifest; jangan mencipta duplicate domain service.

Jika collaboration tersedia, gunakan maksimum tiga workers dengan fail ownership berasingan dan parent sebagai integrator. Jika tidak tersedia, jalankan sequence yang sama sendiri. Semua worker diberitahu bahawa mereka bukan satu-satunya pengubah repo dan tidak boleh revert edit pihak lain. Reviewer tidak mengubah fail implementer tanpa coordination.

Jangan menyekat semua kerja kerana satu provider/Intelligence gate. Capability blocked direkod dan kerja bebas diteruskan. Jika approach gagal dua kali, hentikan approach itu, baca error dan research root cause. Jangan cuba stack/model berbayar yang berbeza.

## Gates dan bukti

- Rekod HEAD dan dirty manifest sebelum edit. Preserve user edits, media, DB, evidence dan credentials. Tiada clone/reset/clean/reinstall generik atau bulk git add.
- TDD bagi business/security logic: failing test -> confirm failure -> implement -> pass -> independent review. Jangan menulis test yang sekadar menyalin implementation.
- Setiap CPK-01..10, GUI-01..07, MOD-01..10 dan ADV-01..32 mempunyai row status, path/nama test, command, result, environment, timestamp, commit/worktree manifest dan receipt/artifact. Logical tool count tidak sama dengan registered functions.
- Jejak juga semua acceptance blueprint: FIN-01, PAY-01..03, STK-01, OFF-01, REF-01..02, LOY-01, SEC-01..02, DR-01, AI-01..03, PD-01, OPS-01, ARC-01 dan REL-01. Fasa03A memiliki domain/offline/tracking/consent, fasa02/04 memiliki AI, fasa01 memiliki ARC, fasa06 memiliki DR/REL. Jangan menutup master requirement hanya kerana CPK/GUI pass.
- Jalankan baseline dan final `bun run lint`, `bun run build`, `bun run test:platform`. Gunakan `bun run test:e2e` dengan fixture/QA environment yang disahkan dan Python tests seperti prompt02. Rekod actual coverage; sasaran business/security >=80% hanya boleh didakwa dengan denominator yang diukur.
- CopilotKit wiring check selepas real runtime tersedia: `npx copilotkit@4.29.0 verify --expect-runtime oss --round-trip --agent abangcolek_ops --json --via skill:copilotkit-cli`. Sahkan CLI flags dengan `--help`; jika pin/flags tidak menyokong command, rekod compatibility blocker dan semak docs, bukan menukar app package pins. CLI version berbeza daripada runtime package version. Round-trip memanggil model: jalankan hanya selepas free gates. Tiada provider -> blocked, bukan memaksa login Intelligence.
- Deterministic mock digunakan untuk tests dan dilabel. Live provider, AG-UI protocol, role boundaries, CAS, browser dan deployment masing-masing memerlukan evidence sendiri.
- Pre-existing failures dibezakan daripada regressions. Jangan disable tests/guards, padam historical evidence atau menyembunyikan fallback untuk kelihatan lulus.

## Checkpoint dan laporan akhir

Selepas setiap batch kemas kini `docs/handover/IMPLEMENTATION-CHECKPOINT.md`: completed/current/next task, exact paths, revisions, test results, blockers dan rollback. Simpan receipts tanpa secrets di `reports/implementation/` atau runtime ignored storage yang sesuai. Jangan tulis model reasoning dalaman.

Laporan akhir menyatakan apa yang benar-benar berubah, files, tests, actual local/preview/production status, unresolved external gates dan next executable step. Jangan kata seluruh projek/10 features/production siap apabila ada row blocked/not run. Tiada permission question bagi pilihan teknikal yang sudah ditetapkan. Untuk credentials, bayaran atau action yang benar-benar memerlukan pengguna, jelaskan tindakan tepat dan dependency sahaja; jangan minta pengguna memilih architecture semula.
