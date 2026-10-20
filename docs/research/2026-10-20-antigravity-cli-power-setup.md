# Antigravity CLI untuk ABANGCOLEK: penyelidikan dan cadangan setup

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh semakan: 20 Oktober 2026, Asia/Kuala_Lumpur.

Status: **RESEARCH COMPLETE; CONFIGURATION PROPOSED; PERFORMANCE NOT BENCHMARKED.** Dokumen ini tidak mengubah konfigurasi AGY, memasang plugin, melancarkan agent coding atau menerima mana-mana task aplikasi sebagai selesai.

## 1. Keputusan yang disyorkan

Gunakan AGY native sebagai pelaksana utama, Gemini 3.8 Flash High sebagai model harian, satu penulis kod pada satu kawasan, review berasingan untuk perubahan kritikal, MCP berasaskan tugas dan bukti ujian yang terikat kepada source. Sasaran ialah menghasilkan perubahan yang diterima dengan kurang retry, masa dan penggunaan kuota. Tiada benchmark dalam semakan ini yang membuktikan konfigurasi tertentu sebagai coding agent paling kuat di pasaran.

Kekalkan keputusan AGY-only: Copilot CLI tidak diperlukan untuk pelan ini; Hermes tidak menjadi dependency. Jangan menggantikan stack aplikasi atau polisi model aplikasi hanya kerana menukar model coding agent.

## 2. Bukti mesin semasa

Perintah diagnostik yang dijalankan ialah `agy --version`, `agy --help`, `agy models`, `agy plugin list --json`, pemeriksaan OS/volume dan bacaan konfigurasi terpilih. Tiada prompt inferens baharu dijalankan. Nilai credentials, header dan environment MCP tidak dicetak.

| Pemeriksaan | Hasil diperhatikan | Implikasi |
| --- | --- | --- |
| Executable dalam PATH | `C:\Users\megat\AppData\Local\agy\bin\agy.EXE` | Gunakan native binary ini; tidak perlu memasang wrapper lain. |
| Versi | `1.4.2` | Sejajar dengan entri teratas changelog rasmi yang dibaca. |
| Windows | Build `26100`; volume D ialah NTFS | Uji sandbox pada mesin sebenar; isu exFAT tidak sepadan dengan volume projek ini. |
| Model tersimpan | `Gemini 3.8 Flash (High)` | Sudah sesuai sebagai titik mula yang boleh diukur. |
| Agent mode | `accept-edits` | Edit autonomi sudah diaktifkan. |
| Tool permission | `always-proceed` | Semua tindakan yang dibenarkan polisi lain boleh berjalan dengan kurang semakan; terlalu luas untuk dijadikan profil global lalai. |
| Artifact review | `always-proceed` | Tiada review artifact secara lalai; asingkan ini daripada bukti ujian. |
| Akses luar workspace | `true` | Sempadan kerja perlu dikecilkan kepada worktree dan direktori serahan yang diperlukan. |
| Sandbox / AI credits | Kedua-dua key tidak ditetapkan secara eksplisit dalam settings yang dibaca | Ini bukan bukti keadaan runtime; pin secara jelas dalam profil yang dicadangkan. |
| Plugin | **22 dipasang; 19 enabled** | Kiraan awal lisan 23 dibetulkan kepada 22 selepas pengiraan JSON. |
| Komponen plugin enabled | 182 entri skill, 15 entri MCP, 4 entri hook | Bilangan deklarasi; bukan bilangan unik, tools aktif, sambungan sihat atau keseluruhan badan skill dimuatkan. |
| Status line / title | Custom status line disabled; custom title enabled | Profiling perlu meliputi title runner juga. |
| Root rules | `AGENTS.md` dan `GEMINI.md` tiada dalam root projek serta integration worktree yang diperiksa | Arahan yang diberikan dalam chat tidak semestinya tersedia pada sesi AGY lain. |
| Project MCP | `.mcp.json` wujud; `.agents/mcp_config.json` tiada | Jangan anggap konfigurasi milik client lain dibaca oleh AGY. |

Inventori model akaun, hasil `agy models`:

```text
gemini-3.8-flash-high
gemini-3.8-flash-medium
gemini-3.8-flash-low
claude-sonnet-4-6
claude-opus-4-6-thinking
gpt-oss-120b-medium
```

Dua entri global, `webbridge` dan `hermes`, mempunyai key `url`. Dokumentasi MCP semasa menetapkan `serverUrl` untuk remote transports. Ini ialah jurang schema yang perlu diperiksa; semakan ini tidak membuktikan semua sambungan browser gagal. Plugin WebBridge berasingan juga enabled. Rujukan: [MCP rasmi](https://antigravity.google/docs/mcp/).

Global rules sedia ada sudah mempunyai evidence contract, perlindungan perubahan pengguna dan arahan menggunakan `C:/Users/megat/Scripts/agy-verify.cmd`. Kekalkan asas tersebut; audit keberkesanan wrapper dan hooks sebelum menambah guardian yang bertindih.

## 3. Apa yang ditemui dalam sumber rasmi dan GitHub

Repo [google-antigravity/antigravity-cli](https://github.com/google-antigravity/antigravity-cli) ialah rujukan rasmi yang menghubungkan CLI kepada dokumentasi produk. Tree yang diperiksa menonjolkan dokumentasi, contoh dan pelaporan isu; kewujudannya tidak bermaksud keseluruhan engine native boleh dibina daripada repo tersebut.

[Changelog rasmi](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md) menunjukkan pembaikan berkaitan Windows sandbox, background tasks, MCP disconnect dan pengendalian output. Ia turut mendokumenkan `/compact`. Jangan memasang semula binary yang sudah sesuai hanya untuk mengikuti panduan lama. Pin versi dalam bukti ujian kerana perubahan CLI boleh mengubah kelakuan runner.

Terdapat ketidakselarasan dokumentasi: halaman headless menyebut timeout lalai lima minit, tetapi `--help` binary tempatan menyatakan `0s`, iaitu menunggu turn selesai. Runner perlu memberikan `--print-timeout` secara eksplisit. Begitu juga, jangan menganggap semua nilai effort yang diterima parser tersedia untuk semua model.

Isu [Windows sandbox pada exFAT #1296](https://github.com/google-antigravity/antigravity-cli/issues/1296) ialah laporan khusus yang berguna untuk preflight, bukan bukti kerosakan mesin ini. Isu [custom status/title subprocess #709](https://github.com/google-antigravity/antigravity-cli/issues/709) dilaporkan pada versi lama; gunakan sebagai sebab mengukur proses dan resource, bukan sebagai diagnosis yang sudah disahkan pada 1.4.2.

## 4. Model dan kuota: keputusan tetap untuk mesin ini

| Tugas | Pilihan yang disyorkan | Had penggunaan |
| --- | --- | --- |
| Implementasi harian, TypeScript/Bun, ujian dan integrasi | **Gemini 3.8 Flash High** | Kekal sebagai default awal; jangan tukar model setiap beberapa tool call. |
| Inventori, pencarian fail dan ringkasan kecil | Flash Low atau Medium dalam sesi research khusus | Hanya apabila tugasan jelas dan hasil boleh disemak. |
| Review kewangan, auth, CAS dan concurrency yang sukar | Sesi review berasingan dengan **Claude Opus 4.6 Thinking**, jika kuota membenarkan | Cadangan calon reviewer; belum dibuktikan lebih tepat melalui A/B projek ini. |
| Model yang belum disenaraikan akaun | Tiada pemilihan automatik | Jangan mereka slug atau mengaktifkan pembayaran untuk mendapatkannya. |

[Jadual model rasmi](https://antigravity.google/docs/models/) kini menyenaraikan Gemini 4 Argon dan Claude 5.5 pada pelan tertentu, tetapi kedua-duanya tidak muncul dalam katalog akaun yang diperiksa. Jadual itu juga menjadualkan penamatan Claude 4.6 dan GPT-OSS 120B pada **2 November 2026**. Oleh itu, reviewer 4.6 ialah pilihan sementara: semak `agy models` semula sebelum tarikh tersebut; jika tiada pengganti berizin, gunakan review sesi baharu pada Flash High dan rekod hadnya.

Tiada cadangan paid fallback. `useG1Credits` dicadangkan `false`. Polisi free-only untuk model dalam aplikasi ABANGCOLEK kekal berasingan daripada entitlement dan kuota coding CLI.

## 5. Konteks, rules dan skills

Cadangan struktur berikut **belum diwujudkan**:

```text
<worktree>/
  AGENTS.md
  .agents/
    rules/
      financial-integrity.md
      copilot-runtime.md
      frontend-quality.md
    agents/
      abco-reviewer.md
    skills/
      <existing CopilotKit skills>/
      abco-implement/SKILL.md
      abco-verify/SKILL.md
    mcp_config.json
    hooks.json
  scripts/agent/
    <tested, bounded runner and evidence helpers>
  reports/agy/
    <run receipts without credentials or private reasoning>
```

Root `AGENTS.md` perlu pendek dan menyatakan worktree sah, fail autoriti, urutan fasa, perintah ujian sebenar, perlindungan diff sedia ada dan definisi selesai. Butiran domain masuk ke rules berskop fail atau `model_decision`; jangan inline seluruh blueprint pada setiap turn. Dalam rules modular, gunakan `trigger` yang sah; fail tanpa frontmatter yang betul boleh diabaikan. Rujukan: [rules dan activation rasmi](https://antigravity.google/docs/rules/).

Skills menggunakan progressive disclosure: nama dan deskripsi diketahui dahulu, badan penuh dibaca apabila relevan. Satu skill untuk implementasi milestone dan satu untuk verification mencukupi sebagai tambahan projek. Gunakan `copilotkit` serta `copilotkit-cli` sedia ada mengikut tugas. Skill Supabase, security atau UI hanya dianggap tersedia selepas discovery AGY mengesahkannya; pemasangan pada client lain tidak membuktikan akses AGY. Rujukan: [agent skills rasmi](https://antigravity.google/docs/skills/).

Pilih **Superpowers sebagai workflow utama** untuk ABANGCOLEK. Conductor dan Gemini Kit boleh kekal dipasang, tetapi elakkan tiga workflow berlainan mengawal milestone yang sama. Android, Flutter, scientific tooling dan BigQuery tidak perlu menjadi kebergantungan kerja React/Bun ini. Jangan disable plugin global secara pukal kerana ia dikongsi dengan projek dan surface lain; inventori serta ukur dahulu. [Dokumentasi plugin](https://antigravity.google/docs/plugins/) menerangkan synchronization dan lokasi pemasangan.

Gunakan [panel `/context`](https://antigravity.google/docs/cli/commands/context/) untuk melihat penggunaan konteks. Cadangan operasi sendiri: checkpoint selepas satu milestone diterima atau sebelum konteks terlalu penuh; ambang awal 60–70% boleh diuji, bukan had rasmi produk. Simpan keputusan, fail berubah dan task seterusnya sebelum compaction. Kurangkan pembacaan fail penuh dan output terminal panjang. `verbosity: low` hanya mengurangkan paparan; ia tidak membuktikan pengurangan token model.

## 6. Susunan agent yang disyorkan

Mulakan dengan **satu AGY utama sebagai penulis** dan satu research/reviewer apabila perlu. Penulis kedua hanya dibenarkan untuk kawasan bebas dengan worktree dan ownership jelas. Tiada dua agent menulis kontrak bersama atau lockfile serentak.

Custom agents ditemui dalam `.agents/agents/`; setiap tugas mesti membawa objektif, fail milik, kontrak input/output, acceptance IDs, arahan semakan dan format serahan. Jangan menyalin keseluruhan chat. Nama tools mesti diambil daripada runtime sebenar; dokumentasi mengakui typo tool boleh menyebabkan hang. Uji satu custom reviewer dahulu sebelum menambah peranan lain. Rujukan: [custom subagents rasmi](https://antigravity.google/docs/subagents/).

[`/boost`](https://antigravity.google/docs/boost/) menyediakan reasoning serta verification berbilang agent untuk masalah sukar. [`/teamwork-preview`](https://antigravity.google/docs/teamwork/) menyediakan orkestrasi milestone dengan peranan review dan audit. Kedua-duanya didokumenkan untuk paid plans. Jangan jadikan kedua-duanya default setiap task atau andaikan ia menjimatkan kuota. Untuk ABANGCOLEK, pertimbangkan Boost selepas root cause sukar dikenal pasti; pertimbangkan Teamwork hanya selepas task ownership, runner dan acceptance baseline stabil serta akses akaun disahkan.

## 7. MCP yang perlu disediakan

| Kemampuan | Keputusan setup |
| --- | --- |
| Dokumentasi semasa | Context7, disahkan melalui satu lookup sebenar. |
| Git dan fail tempatan | Gunakan native `git` dan `rg`; tambah MCP hanya jika ada keperluan yang tidak diliputi tools sedia ada. |
| GitHub | Baca isu/PR apabila task memerlukannya; sempadankan write scope dengan arahan pengguna. |
| Browser QA | Pilih satu laluan utama: WebBridge untuk sesi berizin pengguna, atau browser/Playwright untuk ujian app; jangan menggandakan browser agents tanpa sebab. |
| Supabase | Sambungan khusus project ABANGCOLEK; mulakan read-only untuk audit. Mutation/migration hanya dalam task yang memang mengarahkannya. |
| Vercel | Log dan deployment inspection semasa fasa release; bukan dependency setiap lint/test. |
| Blender, Hermes, data/science tools | Tidak menjadi core profile ABANGCOLEK. Kekalkan pemasangan lain tanpa menjadikannya prasyarat projek ini. |

MCP tambahan ialah akses dan potensi overhead, bukan jaminan kecerdasan. Gunakan `.agents/mcp_config.json` untuk konfigurasi projek yang disokong; simpan credentials di mekanisme auth/env yang sesuai, bukan Git. Ukur startup dan tool-call latency serta periksa `/mcp`; status enabled atau config parse sahaja tidak membuktikan tool berfungsi.

## 8. Permissions dan terminal Windows

Berikut ialah **cadangan merge terpilih**, bukan pengganti keseluruhan `settings.json` dan bukan konfigurasi yang telah diuji end-to-end:

```json
{
  "agentMode": "accept-edits",
  "toolPermission": "proceed-in-sandbox",
  "enableTerminalSandbox": true,
  "allowNonWorkspaceAccess": false,
  "artifactReviewPolicy": "agent-decides",
  "useG1Credits": false,
  "verbosity": "low",
  "notifications": true
}
```

Key settings disemak terhadap [reference rasmi](https://antigravity.google/docs/cli/reference/). Sediakan allowlist tepat untuk lint, ujian, build dan bacaan Git yang diperlukan; routine edits/tests boleh berjalan autonomi. Periksa dahulu rules sedia ada kerana explicit allow/deny boleh mengubah kesan profil. Gunakan `--add-dir` secara sempit apabila serahan di luar worktree perlu dibaca. Jangan jadikan `--dangerously-skip-permissions` sebagai launcher harian.

[Execution mode](https://antigravity.google/docs/cli/modes/) dan [permission matching](https://antigravity.google/docs/permissions?tab=cli) ialah lapisan berbeza. `accept-edits` tidak membuktikan shell command dibenarkan. PowerShell memerlukan perhatian pada matching exact/regex; jangan anggap prefix rule meluluskan semua variasi command. Uji command yang sepatutnya dibenarkan serta yang sepatutnya disekat.

Windows mempunyai perincian sandbox berbeza mengikut versi dan OS; [panduan sandbox](https://antigravity.google/docs/sandbox/) perlu dibaca bersama changelog. Sahkan Bun, Git, Python, cache dan localhost QA berfungsi; jangan mematikan sandbox secara global untuk menyembunyikan kegagalan preflight.

Dalam run terdahulu yang diperiksa semula, **13 daripada 13 task log** dalam conversation `31cc6c98-629c-4932-b843-c10ae9944b74` mengandungi signature `starship`/`TERM=dumb` dan `Test-Path`. Ini bukti noise terminal pada run tersebut, bukan ukuran latensi atau punca tunggal timeout. Lokasi: `.system_generated/tasks/task-*.log` di bawah brain conversation itu.

Keutamaan terminal: asingkan pemuatan banner, prompt, HUD dan integrasi interaktif daripada command agent. Tiada setting rasmi shell-arguments yang cukup disahkan dalam penyelidikan ini untuk menulis key rekaan. Membuka AGY daripada `pwsh -NoProfile` sahaja tidak membuktikan shell dalaman AGY turut mengabaikan profile. Pembetulan mesti disahkan melalui output command dalaman yang bersih, tanpa mengubah profil interaktif pengguna secara membuta tuli.

## 9. Runner, hooks dan bukti selesai

Receipt terdahulu yang dibaca semula:

| Fail di control directory luar repo | Bukti |
| --- | --- |
| `agy-00.exit.json` dan `agy-00.stdout.log` | Exit 0, status `SUCCESS`, `response` panjang 0. |
| `agy-03a-fin.stderr.log` | Signature timeout dan `terminating 12 background task(s) on exit`. |
| `agy-03a-fin.stdout.log` | Response ada, tetapi angka usage ialah kumulatif conversation, bukan kos khusus satu batch yang sudah dibuktikan. |

Control directory: `D:\ABANGCOLEK-WORKTREES\multi-cli-control-20261020`. Bukti ini menghalang kita daripada menyamakan `SUCCESS` dengan task aplikasi diterima. Dokumentasi [headless rasmi](https://antigravity.google/docs/cli/headless/) turut menjelaskan bahawa tool yang memerlukan approval boleh soft-deny dan run masih keluar 0.

Runner yang dicadangkan mesti menolak penerimaan milestone apabila berlaku timeout, response kosong, task latar belum berakhir, permission denial yang menghalang skop atau acceptance evidence tiada. Rekod status runner sendiri seperti `INCOMPLETE`; jangan ubah envelope asal AGY. Gunakan `--print=<prompt>` untuk mengelakkan pitfall parsing lama, `--output-format=stream-json` bagi automasi yang memerlukan progress, timeout eksplisit per milestone dan conversation ID eksplisit untuk resume. Jangan mengumpul raw thoughts dalam laporan atau Git.

Receipt per milestone perlu menyimpan task/acceptance IDs, worktree, commit, hash diff serta fail untracked yang relevan, commands, exit codes, log paths dan batas semakan. Semak hash source semula selepas ujian; bukti sebelum edit seterusnya tidak meliputi source baharu. Bekukan penulis lain semasa final verification milestone.

Cadangan [hooks](https://antigravity.google/docs/hooks/): `SessionStart` untuk preflight ringkas, `PreToolUse` untuk guard sempadan yang diuji, dan `Stop` untuk memeriksa receipt serta merekod status. Hadkan masa hooks dan elakkan recursive retries. Hook `Stop` tidak boleh menghalang laporan kegagalan yang jujur atau memaksa agent mendakwa berjaya. Jangan menjalankan seluruh suite selepas setiap write, dan jangan menyuntik seluruh blueprint pada setiap model invocation.

[`/learn`](https://antigravity.google/docs/commands/learn/) boleh mencadangkan pembelajaran sebagai rules/skills melalui proposal yang boleh direview. Gunakan untuk pola yang sudah disahkan; jangan menerbitkan arahan global atau andaian bisnes secara automatik.

## 10. Penilaian Reddit dan plugin komuniti

| Sumber yang dibaca, termasuk komen yang tersedia | Penilaian |
| --- | --- |
| [AGY CLI takes forever](https://www.reddit.com/r/GoogleAntigravityCLI/comments/1v2uvgo/agy_cli_takes_forever_to_complete_anything/) | Pengguna versi 1.1.5 mengaitkan hang dengan global MCP dan melaporkan workaround konfigurasi per projek. Anecdote lama; jangan menyalin arahan memadam config global ke mesin ini. |
| [Flash 3.8 efficiency discussion](https://www.reddit.com/r/google_antigravity/comments/1x03o55/have_you_been_noticing_your_38_flash_using_way/) | Menarik perhatian kepada retry, file reads dan context accumulation. Berguna sebagai hipotesis audit; tiada bukti benchmark bebas yang membenarkan angka penjimatan universal. |
| [Claude Code wrapper discussion](https://www.reddit.com/r/GoogleAntigravityCLI/comments/1u32fws/claude_code_plugin_for_antigravity_cli/) | Motivasi asal menyebut kekurangan flag model/multi-agent. Flag model dan subagents kini wujud; wrapper tidak perlu untuk menyelesaikan kekurangan tersebut pada binary ini. |
| [Statusline discussion](https://www.reddit.com/r/GoogleAntigravityCLI/comments/1tthe98/i_built_a_statusline_skill_for_antigravity_cli/) | Berguna untuk visibility; bukan bukti peningkatan ketepatan coding. |
| [agy_help discussion](https://www.reddit.com/r/GoogleAntigravityCLI/comments/1w90oca/agy_help_a_zerohallucination_antigravity_dev/) | Pola semak local/help/live docs sesuai; dakwaan zero-hallucination ialah dakwaan pembuat, bukan jaminan. |

Repo [AndyAWD/antigravity-cli-statusline](https://github.com/AndyAWD/antigravity-cli-statusline) menyediakan metrik dan konfigurasi merentas surface; skrip konfigurasi turut melakukan perubahan fail. Cadangan: gunakan [status line rasmi](https://antigravity.google/docs/cli/statusline/) dan `/usage` dahulu. Plugin ini optional selepas review skop penulisan, bahasa English dan overhead runner. Jangan pasang hanya kerana mahu agent lebih kuat.

Repo [AndyAWD/antigravity-help-agent](https://github.com/AndyAWD/antigravity-help-agent) sesuai sebagai calon pembantu dokumentasi. Untuk setup awal ini, Context7 serta docs rasmi sudah mencukupi. Jangan menambah salinan knowledge base yang akhirnya memerlukan maintenance tambahan tanpa faedah yang diukur.

## 11. Urutan pelaksanaan dan syarat penerimaan

Checklist ini khusus setup AGY. Ia tidak menandakan implementation checklist ABANGCOLEK selesai.

- [x] Semak dokumentasi rasmi, GitHub, Reddit dan native CLI tempatan.
- [x] Sahkan model akaun, inventori plugin, konfigurasi terpilih dan receipt lama.
- [x] Tetapkan cadangan default, skop tools, peranan dan urutan setup.
- [ ] **P0 — Snapshot:** simpan backup config, senarai plugin dan status worktree; jangan overwrite diff pengguna.
- [ ] **P0 — Terminal/runner:** buktikan command dalaman bersih; baiki penerimaan false-success, timeout dan background-task completion.
- [ ] **P0 — Boundaries:** semak existing permission rules, sandbox, credentials dan akses tambahan yang benar-benar diperlukan.
- [ ] **P1 — Project context:** tambah root rules pendek, skills task-specific dan pautan ke dokumen autoriti.
- [ ] **P1 — Tools:** sahkan satu panggilan berguna setiap MCP yang diperlukan; betulkan schema tanpa memadam integrasi lain.
- [ ] **P1 — Agent review:** uji satu reviewer; pastikan ownership dan permission berfungsi sebelum parallel writes.
- [ ] **P2 — Benchmark:** jalankan sekurang-kurangnya tiga task tetap: bug backend, aliran UI dan perubahan kontrak Copilot. Gunakan input source setara dalam worktree berasingan.
- [ ] **P2 — Compare:** rekod masa hingga accepted patch, retry, kegagalan command, lint/test/browser result, usage delta dan kesilapan reviewer. Asingkan cache-read daripada token baharu dan elakkan mengira cumulative conversation sebagai satu task.
- [ ] **P2 — Release profile:** terima konfigurasi hanya selepas peningkatan yang boleh diukur tanpa menambah regression; rollback komponen yang merosot.

Urutan projek kekal daripada [prompt AGY semasa](../prompts/CONTINUE-AGY-20261020.md), [master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md), [checkpoint](../handover/IMPLEMENTATION-CHECKPOINT.md) dan [PROJECT-CHECKLIST](../../PROJECT-CHECKLIST.md). Selepas task implementasi, tick hanya acceptance yang bukti source, ujian dan runtime yang disyaratkan benar-benar lengkap. Build pass atau laporan agent sahaja tidak membuktikan seluruh CopilotKit setup berfungsi.

## 12. Had semakan

Research ini tidak menguji inferens model secara A/B, runtime semua MCP, penguatkuasaan sandbox, custom agents atau hooks baharu. Plugin enabled tidak bermaksud semua komponen berjaya dimuatkan. Tiada perubahan global, dependency, source aplikasi, database, deployment, commit atau push dibuat untuk task research ini. Hanya dokumen penyelidikan ini ditambah.
