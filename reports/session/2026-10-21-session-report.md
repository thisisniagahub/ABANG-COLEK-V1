# Laporan Sesi — Pembaikan Provider & Ralat Runtime, Integrasi `main`

**Tarikh:** 21 Oktober 2026 (sesi mula 20 Oktober 2026, 18:29 UTC)
**Cawangan:** `integrate/blueprint-v23`
**Commit sesi ini:** `8c2d015` (lane integrasi + pembaikan provider), `bd2a83f` (merge `origin/main`)
**Status semasa commit:** `8c2d015` sudah push ke `origin/integrate/blueprint-v23`; `bd2a83f` (merge) belum push.

---

## 1. Ringkasan

Sesi ini bermula dengan soalan "nak `git push main` ke?". Semasa menyediakan release gate,
`bun run test:platform` mendedahkan ralat HTTP yang berulang dan satu `ReferenceError`.
Tiga punca sebenar ditemui (bukan symptom), semua dibetulkan pada source:

| # | Ralat yang dilihat | Punca sebenar | Status |
|---|---|---|---|
| 1 | Gemini `HTTP 404` (body kosong) untuk **semua** panggilan | `baseUrl` berakhir dengan `/` → router menambah `/chat/completions` → URL `…/v1beta/openai//chat/completions` | Dibetulkan |
| 2 | OpenRouter `HTTP 404 "Function … Not found for account"` | Calon ketiga `nvidia/nemotron-3-super-120b-a12b:free` mati untuk akaun ini | Diganti dengan model yang hidup (HTTP 200) |
| 3 | `ReferenceError: localStorage is not defined` | `pluginService` rujuk `localStorage` terus; service dimuatkan di luar browser (Node/Bun/SSR/prerender) | Dibetulkan |
| 4 | NIM `404`/`410`, Groq `404`, Gemini `2.5-flash` `404` | Model lama / EOL / tidak lagi tersedia | Diganti dengan model yang disahkan hidup |
| 5 | `HTTP 410` (model EOL) & `401` (kunci rosak) tidak diklasifikasi | `classifyProviderHttpFailure` hanya kenal 404/429/403 | Ditambah sebagai kegagalan **tidak boleh cuba semula** |
| 6 | Ujian `timeout 25000ms` + suite makan kuota produksi | Suite memanggil provider **secara live**; kuota free tier Gemini = 20 permintaan/hari | Suite kini offline (deterministik) |

**Bukti keputusan akhir:** `1145 pass / 0 fail / 10 todo` (159 fail ujian), `tsc` bersih
(dua config), `bun run build` bersih, dan **tiada** provider-failure log dalam output suite
(hanya 2 baris dalam 2 fail ujian yang **mensimulasikan** 404/429 untuk mengesahkan kod
reason — itu bukti failover yang sengaja).

---

## 2. Fix mengikut fail

### 2.1 `server/platform/freeModelRouter.ts` — punca utama ralat HTTP

| Perubahan | Reason |
|---|---|
| `gemini_free.baseUrl`: `…/v1beta/openai/` → `…/v1beta/openai` (buang trailing slash) | URL berganda yang menyebabkan HTTP 404 untuk semua panggilan Gemini |
| `openrouter.defaultModel` → `nvidia/nemotron-3-ultra-550b-a55b:free` | Shay lama `nemotron-3-super` mati untuk akaun ini (404); yang baru disahkan HTTP 200 secara live |
| `nvidia.defaultModel` → `nvidia/nemotron-3-ultra-550b-a55b` | `deepseek-ai/deepseek-r1` (404) dan model llama-3.3/3.1 (410 EOL) tidak boleh digunakan |
| `groq.defaultModel` → `openai/gpt-oss-120b` | `llama-3.3-70b-versatile` memulangkan 404 "does not exist or you do not have access" |
| Tambah `liveProvidersDisabled()` + skip provider bila `ABANGCOLEK_DISABLE_LIVE_PROVIDERS=1` | Menentukan mod offline untuk suite ujian sahaja |
| Komen dikemas kini (senarai calon ketiga) | Elak klasifikasi yang lapuk |

### 2.2 `shared/copilot-contracts.ts` — kontrak yang dikongsi

- Calon ketiga `STRICT_FREE_CANDIDATE_SEQUENCE` → `nvidia/nemotron-3-ultra-550b-a55b:free`
  (nama: *NVIDIA Nemotron 3 Ultra 550B Free*).
- `classifyProviderHttpFailure`: tambah `410` → `PROVIDER_MODEL_NOT_FOUND` (tidak boleh cuba
  semula) dan `401` → `PROVIDER_ACCESS_DENIED` (kelayakan rosak, bukan gangguan sementara).
  Teks `end of life` / `api_key_expired` / `authentication_error` juga dikenal.
- Komen atas susunan calon menyatakan tarikh pertukaran + rujukan bukti.

### 2.3 `server/agents/providers/model-adapters.ts` — hapuskan drift

- `createDefaultAdapterRegistry()` kini **membina registry daripada `STRICT_FREE_CANDIDATE_SEQUENCE`**
  (satu sumber kebenaran), bukan menyalin literal model secara manual. Sebelum ini ada dua
  senarai ID model dalam dua fail — punca model mati tinggal di satu tempat.
- Kemas kini import kontrak.

### 2.4 `src/services/pluginService.ts` — `ReferenceError` sebenar

- Tambah `private storage(): Storage | null` yang menyemak `typeof localStorage === 'undefined'`.
- `loadPlugins()` / `savePlugins()` guna helper itu. Rujukan terus kepada `localStorage`
  di luar browser kini tidak meletup (Node/Bun, SSR, prerender).

### 2.5 `src/services/jevEngine.ts`

- Penulisan skill Hermes dilindungi `typeof localStorage === 'undefined'` (gaya sama seperti
  fungsi lain dalam fail tersebut) — tiada lagi `console.warn` palsu di luar browser.

### 2.6 Suite ujian offline (deterministik)

- `bunfig.toml`: `[test] preload = ["./tests/setup/offline-providers.ts"]`.
- `tests/setup/offline-providers.ts` (baru): menetapkan `ABANGCOLEK_DISABLE_LIVE_PROVIDERS=1`.
- **Sebab:** suite unit tidak-Seorang dependency pada akaun orang lain. Sebelum ini suite
  memanggil provider live — ia **(a) memakan kuota free tier produksi** (Gemini 20/hari),
  **(b) gagal secara rawak** apabila kuota habis, dan **(c) satu ujian bergantung pada
  provider *gagal*** (menyangka `local_rules`because semua provider mati).
- Pengesahan live provider kini ialah **gate berasingan** (dokumentasi), bukan sebahagian suite unit.

### 2.7 Ujian & bukti baharu

| Fail | Perubahan |
|---|---|
| `tests/platform/adk-specialists.test.ts` | Tambah 2 ujian: (a) tiada `baseUrl` provider berakhir dengan `/` (regression untuk URL berganda), (b) `410`/`401` diklasifikasi sebagai bukan-boleh-cuba-semula |
| `tests/frontend/plugin-service-storage.test.ts` (baru) | Buktikan `pluginService` berfungsi tanpa `localStorage` |
| 9 fail ujian lain | ID model mati dikemas kini ke ID yang hidup (`nvidia/nemotron-3-ultra-550b-a55b:free` + nama) supaya ujian kekal konsisten dengan kontrak |

### 2.8 Dokumentasi & ledger (kebenaran, bukan hiasan)

- `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md`: tambah **Rekod pengesahan live 20 Oktober 2026**
  — jadual status HTTP sebenar bagi setiap model/endpoint (tanpa sebarang kunci), punca ralat yang
  dibetulkan, dan gate luar yang masih terbuka.
- `docs/CURRENT-STATUS.md`: tambah bahagian "Pembaikan provider free — 20 Oktober 2026"
  yang menyatakan keadaan sebenar semasa + mod offline suite.
- `scripts/maintenance/audit-ledger-closure.ts` & `scripts/maintenance/fix-acceptance-test-names.ts`:
  teks bukti `CPK-01` dikemas kini kepada bukti live semasa (200 untuk Gemini 3.6/3.5-Lite dan
  OpenRouter nemotron-3-ultra). Rekod CPK-01 **kekal `partial`** — bukti tempatan sudah dikuatkuasakan,
  bukti production + kuota free tier masih belum diperoleh.

### 2.9 Pembersihan

- Dipadam: `public/lazy-test.html` ( artifak debug dalam `public/` — ia ikutSHIP ke production),
  `var/probe-free-models.ts`, `var/probe-free-models-2.ts` (skrip probe sementara).

---

## 3. Bukti pengesahan live (tanpa kunci dalam dokumen)

| providerId | modelId | status | keputusan |
|---|---|---|---|
| gemini_free | `gemini-3.6-flash` | 200 | calon utama — aktif |
| gemini_free | `gemini-3.5-flash-lite` | 200 | calon kedua — aktif |
| openrouter | `nvidia/nemotron-3-ultra-550b-a55b:free` | 200 | calon ketiga — aktif (ganti `nemotron-3-super`) |
| nvidia | `nvidia/nemotron-3-ultra-550b-a55b` | 200 | model NIM |
| groq | `openai/gpt-oss-120b` | 200 | model Groq |
| openrouter | `nvidia/nemotron-3-super-120b-a12b:free` | 404 | dibuang |
| nvidia | `deepseek-ai/deepseek-r1`, `meta/llama-3.3-70b-instruct`, `nvidia/llama-3.1-nemotron-nano-8b-v1` | 404 / 410 | dibuang |
| gemini_free | `gemini-2.5-flash` | 404 ("no longer available to new users") | dibuang |
| opencode_zen | `x-preview-f-free` | 400 model unavailable; kunci 401 `api_key_expired` | **gate luar** |
| openrouter | `thinkingmachines/inkling:free` | 403 "only available on agentic harnesses" | tidak digunakan |

---

## 4. Git

### 4.1 Commit

| Commit | Kandungan |
|---|---|
| `8c2d015` | Lane integrasi (595 fail: CopilotKit v2 runtime, domain tools, A2UI, MCP brief, ADK Python specialists, bukti acceptance 85 requirement, rewrite landing) **+** pembaikan provider/storage/offline dalam dokumen ini |
| `bd2a83f` | Merge `origin/main` (patch release `18c69b3`) ke dalam lane integrasi |

### 4.2 Resolusi conflict merge (8 fail)

| Fail | Konflik | Resolusi | Asas |
|---|---|---|---|
| `src/features/landing/ScrollWorldHero.tsx` | Hero filem (main) vs hero EMONS/AnimatedColekWorld (branch) | **Branch** | Rewriting landing 20/10 22:25 lebih baru daripada publish main 20/10 02:07 |
| `src/features/landing/LandingPage.tsx` | Empty-catalogue CTA | **Branch** | Versi lane integrasi |
| `src/features/landing/scroll-world.css` | CSS filem vs EMONS | **Branch** (dari HEAD) | Konsisten dengan hero yang dipilih |
| `src/features/landing/WorldHotspot.tsx` | Struktur hotspot | **Branch** | Sama |
| `vercel.json` | `bunVersion` 1.4.x + cron vs 1.x | **Branch** (`1.4.x` + cron `/api/platform-worker`) | Cron ialah fungsi platform yang tiada di main |
| `tsconfig.platform.json` | `include` berbeza | **Union** | Kedua-dua senarai |
| `package.json` | `test:platform` lebih luas vs sempit | **Branch** (lebih luas) | Menyelubungi lebih banyak direktori ujian |
| `.gitignore`, `.vscode/settings.json`, `tests/architecture/typescript-projects.test.ts` | Tambah/tambah | **Union** (senarai kes lebih luas) | Tiada kehilangan |

`GengColekShare.tsx` (product sharing) **identik** pada kedua-dua sisi — ia dikekalkan.

### 4.3 Keadaan push

- `origin/integrate/blueprint-v23` → `8c2d015` ✅ (sudah push)
- `bd2a83f` (merge) → **belum push**
- `main` / `origin/main` → `18c69b3` (belum disentuh; masih dalam sync)

---

## 5. Yang BELUM selesai (监督管理局)

| Item | Status | Nota |
|---|---|---|
| E2E Playwright | ❌ 15 gagal / 2 lulus / 36 tidak run | Semua satu punca: `SyntaxError: Cannot use import statement outside a module` — suite e2e ini **baharu dan belum pernah hijau** (ledger `REL-01` sendiri menyatakan "Playwright browser suite has never been run against a live server"). Perlu diagnosis berasingan. |
| Pushing `bd2a83f` ke origin | ⏳ belum |READY — branch push sahaja selesai |
| FF `main` + push `main` | ⏳ belum | Tertakluk pada e2e gate (runbook `docs/runbooks/production-release.md`) |
| Kuota free tier Gemini | ⏳ luar | 20 permintaan/hari, dipulihkan ~19 jam selepas probe 20/10. Semua panggilan production akan jatuh ke `local_rules` selepas kuota habis — failover itu direka untuk itu. |
| `OPENCODE_ZEN_API_KEY` | ⏳ luar | 401 `api_key_expired` — kunci baharu perlu dibekalkan oleh pengguna |
| `OPENROUTER_API_KEY` / `NVIDIA_API_KEY` / `GROQ_API_KEY` | ✅ hidup | Disahkan 200 |

---

## 6. Nota integriti & konkurensi

- **Tiada secret** dikomit: imbasan pattern `sk-*`, `AIza*`, `ghp_*`, `AKIA*`, `xox*`, `sb_secret_*`,
  JWT, `-----BEGIN … PRIVATE KEY-----` terhadap 306 fail pending → hanya **fixture ujian**
  (`sk-abcdefghijklmnopqrstuvwxyz`, `AKIAIOSFODNN7EXAMPLE`).
- **Worker lain (goal-loop) menulis dalam repo ini serentak** semasa sesi: dia membina semula
  feature "TypeSafe native provider" (`server/platform/jev/typesafeProvider.ts`,
  `jevRouter.ts`, `tests/jev/*`) dan kemudian **merollback**-nya, serta menulis semula
  `ScrollWorldHero.tsx` ketika saya sedang merge. Semua perubahan itu **belum commit**
  (lint + suite hijau atasnya) dan sengaja tidak dicampur dalam commit sesi ini.
- Skrip probe sementara dan `scripts/maintenance/resolve-conflict.ps1` (helper worker) tidak dikomit.

---

## 7. Cara sahkan semula

```powershell
# suite penuh (offline, deterministik)
bun run test:platform

# typecheck dua config
bun run lint

# build + prerender
bun run build

# bukti live provider (kunci daripada environment)
#   gemini-3.6-flash / gemini-3.5-flash-lite / nvidia-nemotron-3-ultra:free
#   → rujuk jadual dalam docs/AI-PROVIDER-FREE-MODELS-REGISTER.md

# e2e (perlu qa:server + vite 3001)
bun run qa:server
$env:PLATFORM_API_TARGET='http://127.0.0.1:3011'; bun run dev:ui --port 3001 --strictPort
$env:PLATFORM_TEST_URL='http://127.0.0.1:3001'; bun run test:e2e
```
