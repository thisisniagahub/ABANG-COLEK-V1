# AGENTS.md — ABANGCOLEK-PLATFORM

> Fail ini ialah fail **konvensyen** yang diwarisi oleh setiap subagent. Kemas kini ia
> **sebelum** satu swarm besar, bukan di tengah flight. Sumber kebenaran acceptance ialah
> `reports/implementation/acceptance-status.json` — bukanTicks manual, bukan laporan lisan.

## 0. Ringkas quickest

```bash
bun run lint                                    # tsc --noEmit && tsc --noEmit -p tsconfig.platform.json
bun run build                                   # vite build + prerender (regenerate dist/, gitignored)
bun run test:platform                           # suite penuh (jev+platform+copilot+frontend+architecture+ext+dashboard-model+landing-brand-theme)
bun scripts/maintenance/check-boundaries.ts     # gate architecture (cycle + exception register)
bun scripts/maintenance/verify-acceptance.ts    # gate acceptance sebenar (85 baris ledger)
bun scripts/maintenance/render-acceptance-register.ts   # register + checklist daripada ledger
```

Semua ujian kini dijalankan dengan `--isolate` (satu global baharu bagi setiap fail) —
ini yang menghalang `mock.module` Bocor antara fail.

## 1. Lane & had fail (keputusan ini yang paling penting)

| Lane | Fail | Agent |
|---|---|---|
| Backend | `server/**`, `api/**`, `shared/**` | `abangcolek-writer-backend` |
| Frontend | `src/**` | `abangcolek-writer-frontend` |
| Ujian | `tests/**`, `scripts/**` | `abangcolek-writer-tests` |
| Audit (read-only) | — | `abangcolek-auditor` |

**Jangan sentuh fail lane lain.** Kalau perlunya, laporkan path + perubahan yang diperlukan.
Secara praktikal: **satu item acceptance = satu agent.** Jangan beri 10 item kepada satu
agent — had langkah akan memotongnya separuh jalan dan mewarisi kod separuh siap.

## 2. Definition of Done (semua mesti benar)

1. Perubahan diimplementasikan daripada **keadaan sebenar** — tiada nilai reka.
2. Ujian_exists yang **membuktikan** tingkah laku **dan gagal** apabila tingkah laku itu
   rosak (kes negatif). Ujian yang hanya "hijau" tidak-toolah apa-apa.
3. `bun run lint` exit 0, `bun run build` exit 0, suite berkaitan 0 fail.
4. Laporan akhir memuat: apa yang berubah (`file:line`), arahan tepat + exit code + kiraan
   sebenar, apa yang **belum** siap + blocker tepat, dan senarai penuh fail yang diubah.
5. Tiada claim tanpa bukti. "SUCCESS" tanpa arahan + exit code + kiraan **tidak** diterima.

## 3. Peraturan rumah (tidak boleh ditawar)

1. **Wang = integer sen.** Tiada aritmetik float untuk amaun atau peratus. Peratus guna
   **BigInt basis points** (`marginSen * 10000n / netSales`).
2. **Pelayan memiliki kebenaran.** Aktor/role/tenant datang daripada sesi sahaja — bukan
   daripada input pelayar, bukan daripada body, bukan daripada header.
3. **Jangan fabrikati.** Jika nilai tidak dapat dikira daripada keadaan sebenar, pulangkan
   keputusan bertipe dengan **reason code yang boleh dibaca mesin**. Bukan `null` senyap,
   bukan `0`, bukan `PASS`.
4. **"Tidak dikira" ≠ sifar.** Semantik null: `confidence`/`probabilities`/`score`/
   `probability`/`isAffirmative` yang tidak dikira mesti `null` — tidak sekali-kali `0`,
   `false`, `{}` atau `0%`. `isAffirmative: null` bermaksud "tidak diketahui", bukan "Tidak".
5. **Kekal dekat dengan lapisan.** `server/platform` ialah monolit legacy; `server/agents/**`
   ialah modul. Arah yang dibenarkan: modul → platform. Platform **tidak boleh** import
   modul (cycle ⇒ `check-boundaries` merah). Modul **boleh** import platform.
6. **Jangan lemahkan ujian.** Tiada delete, `xit`, `todo` untuk hide failure, matcher
   dilonggarkan, atau type dilebar untuk mendapat hijau. Jika kontrak lama salah, **kemaskini
   ujian** dengan satu baris penjelasan.
7. **Jangan commit** kecuali diminta secara eksplisit. Jangan `git stash` (berkongsi antara
   worktree), jangan `git reset`/`checkout`/`clean` pada tree yang sedang diedit lane lain.

## 4. Komen dalam kod

- Tulis ** Bahasa Melayu** untuk komen dan mesej pengguna (repo ini berbahasa Melayu).
- Komenプライバシー whatsapp: explain **mengapa**, bukan **apa** — kod sudah tanya "apa".
- Tiada komen yang menduplikasi kod, tiada komen "TODO" tanpa owner, tiada emoji.

## 5. Sumber kebenaran

| Topik | Fail |
|---|---|
| Status 85 requirement | `reports/implementation/acceptance-status.json` (ledger) |
| Register + checklist | dijana daripada ledger — `bun scripts/maintenance/render-acceptance-register.ts`. Fail yang DIHASILKAN ialah `docs/prompts/ACCEPTANCE-REGISTER.md` + `PROJECT-CHECKLIST.md`; jika ia masih memaparkan snapshot lama, ia belum di-render (semak tarikh render therein). |
| Bukti verifikasi | `reports/implementation/acceptance-verification.json` (dijana) |
| Indeks status | `docs/CURRENT-STATUS.md` |
| Backlog kerja | `reports/open-task-backlog-20261021.md` |
| Wave 1 checkpoint | `reports/wave1-checkpoint-20261021.md` |

**Tick hanya bila ada bukti.** `verified_local` bermaksud "ada resept tempatan yang boleh
diperiksa" — ia bukan certification production. `blocked_external` bermaksud ada gate
akaun/krediti; kerja tempatan yang masih boleh dilakukan **mesti** tetap dilakukan.

## 6. Provider & model (data live 21 Okt 2026)

- Senarai calon rasmi: `shared/copilot-contracts.ts` (`PROVIDER_CANDIDATES`).
- Register + status live: `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md`.
- **Mati untuk akaun ini** (jangan probe semula): `openrouter/nvidia/nemotron-3-super-120b-a12b:free`
  (404), `opencode_zen/x-preview-f-free` (kunci `api_key_expired`, 401),
  `gemini-2.5-flash` (404), `thinkingmachines/inkling*:free` (403 agentic-harness-only).
- **Hidup & disahkan**: `gemini_free/gemini-3.6-flash`, `gemini_free/gemini-3.5-flash-lite`,
  `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`, `nvidia/nemotron-3-ultra-550b-a55b`,
  `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` (**vision** — 200, imej dibaca dengan betul),
  `groq/openai/gpt-oss-120b`.
- Kuota: Gemini free tier projek ini = **20 `generate_content`/hari** (reset tengah malam
  Pasifik). OpenRouter `:free` = kumpulan perkongsian ⇒ **429 dijangka** ⇒ cooldown +
  fallback, jangan probe dalam loop. NIM 503 = kapasiti, bukan kredensial.

## 7. Protocol & kontrak luar

- CopilotKit docs: `https://docs.copilotkit.ai/<path>.md` (indeks: `/llms.txt`).
- AG-UI protocol: `https://docs.ag-ui.com/<path>.md` (indeks: `/llms.txt`).
- **Jangan jawab dari ingatan** — API bergerak; semak dokumen semasa sebelum menulis kod
  yang menyentuh CopilotKit/AG-UI.
- Skill repo: `.agents/skills/copilotkit` (ada `verify` CLI yang menyelesaikan 11 perkara
  pendawaian dalam satu arahan: `npx copilotkit@latest verify --json`).
