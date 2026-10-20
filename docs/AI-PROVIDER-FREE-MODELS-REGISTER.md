# ABANGCOLEK — AI provider dan free-model activation register

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](CURRENT-STATUS.md) · [Checklist](../PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Activation precedence:** Untuk implementasi semasa, hanya tiga exact offerings dan urutannya dalam [ADR-0003](decisions/0003-blueprint-v23-execution-contract.md) boleh melalui activation gates. Groq, OpenCode, Ollama, NVIDIA direct dan BYOK dalam jadual di bawah ialah inventori research, bukan kebenaran memilih provider tambahan. Perubahan allowlist memerlukan keputusan direkodkan; semua hard gates free-only/data/compatibility tetap wajib.

Diselaraskan: **19 Oktober 2026**. Status: **RESEARCH / ACTIVATION_PENDING**. [Free-only policy dan calon](research/2026-10-19-free-model-policy.md) menentukan pemilihan; register ini tidak mengesahkan akaun/quota/model terbaik atau kos runtime sekarang.

## Polisi

Semua inference free-only: chat/tools/subagents/evaluator/title/summary/embedding/vision/STT/TTS/learning. Tiada paid fallback, billable overflow atau langganan baharu. BYOK ialah auth, bukan bukti percuma; local model masih mempunyai kos hardware/elektrik. CopilotKit Intelligence mempunyai gate servis/kos/data berasingan.

| Provider | Route yang boleh dinilai | Default |
|---|---|---|
| Gemini | Exact model + eligible free account/tier/data terms | Disabled sebelum account/pricing/tools/eval proof |
| OpenRouter | Exact catalog :free ID; semua applicable pricing sifar | Tiada auto/paid routing; verify downstream terms |
| Groq | Exact model/free account dengan required tools/schema | Verify quota/compatibility |
| OpenCode | Exact documented free ID/endpoint | Disable apabila promotional expiry/terms unknown |
| Ollama local | Installed model, hardware/license/tools/BM compatible | Inventory/eval dahulu; Vercel localhost bukan mesin pengguna |
| NVIDIA hosted | Offering yang membenarkan penggunaan production tanpa caj | Trial/development entitlement sahaja tidak cukup |
| BYOK gateway | Exact downstream endpoint/model lulus semua gate | Tiada blanket permission atau Manus/built-in fallback automatik |

Nama calon/URL primer berada dalam policy. Tiada ranking pemenang tanpa benchmark. TTL verification maksimum 24 jam atau lebih awal jika promosi tamat.

## Record per exact provider/model/endpoint

```text
providerId, modelId, endpoint, adapterVersion, environment
accountTier, eligibilityEvidenceRef, freeMode(local|eligible-free-tier|trial|unknown)
allApplicableChargesZero, overflowDisabled, dataClassesAllowed
retentionTermsRef, licenseRef, sourceUrls, verifiedAt, expiresAt, quotaNote
capabilities(tools|structuredOutput|streaming|vision|contextLimit)
benchmarkDatasetHash, benchmarkResultsRef, reviewer
primaryOrFallbackForTask, maxTokens, deadlineMs, sharedRunBudget
activation(disabled|eligible|active|cooldown|stale), activationReason
observedProvider, observedModel, usageReceiptRef
```

Trial/unknown tidak diluluskan hanya kerana credit positif. Tiada key dalam register/prompt/browser/Markdown; server-side secret reference sahaja.

## Routing dan verification

Hard gate cost/account/data/capability mendahului task accuracy, BM/English dan p95 latency. Minimum 60 kes sintetik seperti policy; safety failure tidak boleh diimbangi kelajuan. Quota habis -> bounded cooldown -> compatible qualified free fallback -> local_rules/unavailable. Retry tidak mengulangi domain effects. Unknown usage bukan RM0; mock fixture mesti dilabel. Jangan menambah akaun untuk mengelak limits.

Activation memerlukan commit/diff, eligibility evidence tanpa secrets, exact adapter/model test, quota/no-paid-route tests dan runtime receipt. Catalog/UI sahaja tidak cukup. [Roadmap](AI-AGENT-ROADMAP.md) dan [prompts](prompts/README.md) menentukan execution.

## Rekod pengesahan live — 20 Oktober 2026

Probe HTTP sebenar dijalankan daripada mesin pembangun (tanpa kunci dalam dokumen ini). Tiada secret dicatatkan.

| providerId | modelId | endpoint | status | keputusan |
|---|---|---|---|---|
| gemini_free | `gemini-3.6-flash` | `generativelanguage.googleapis.com/v1beta/openai/chat/completions` | 200 | calon utama — aktif |
| gemini_free | `gemini-3.5-flash-lite` | sama | 200 | calon kedua — aktif |
| openrouter | `nvidia/nemotron-3-ultra-550b-a55b:free` | `openrouter.ai/api/v1/chat/completions` | 200 | calon ketiga — aktif (menggantikan `nvidia/nemotron-3-super-120b-a12b:free`) |
| nvidia | `nvidia/nemotron-3-ultra-550b-a55b` | `integrate.api.nvidia.com/v1/chat/completions` | 200 | model ganti untuk provider NIM |
| groq | `openai/gpt-oss-120b` | `api.groq.com/openai/v1/chat/completions` | 200 | model ganti (`llama-3.3-70b-versatile` 404) |
| openrouter | `nvidia/nemotron-3-super-120b-a12b:free` | sama | 404 "Function ... Not found for account" | dibuang daripada calon |
| nvidia | `deepseek-ai/deepseek-r1`, `meta/llama-3.3-70b-instruct`, `nvidia/llama-3.1-nemotron-nano-8b-v1` | sama | 404 / 410 EOL | dibuang |
| gemini_free | `gemini-2.5-flash` | sama | 404 "no longer available to new users" | dibuang |
| opencode_zen | `x-preview-f-free` | `opencode.ai/zen/v1` | 400 model unavailable; kunci 401 `api_key_expired` | **gate luar** — kunci baharu diperlukan |
| openrouter | `thinkingmachines/inkling:free` | sama | 403 "only available on agentic harnesses" | tidak digunakan |

Punca ralat yang dibetulkan dalam source:

1. `FREE_PROVIDERS.gemini_free.baseUrl` berakhir dengan `/` → URL jadi `/v1beta/openai//chat/completions` → HTTP 404 kosong. Semua panggilan Gemini gagal sebelum ini.
2. Shay ketiga `nvidia/nemotron-3-super-120b-a12b:free` mati untuk akaun ini → HTTP 404. Diganti dengan `nvidia/nemotron-3-ultra-550b-a55b:free` (diverifikasi 200).
3. Klasifikasi kegagalan provider tidak mengenali HTTP 410 (model EOL) dan HTTP 401 (kelayakan rosak) sebagai kegagalan bukan-boleh-cuba-semula.

Gate luar yang masih terbuka: kunci `OPENCODE_ZEN_API_KEY` yang telah tamat tempoh (401 `api_key_expired` — **gate akaun**, tiada fix kod) dan GitHub Actions billing.

Suite ujian kini berjalan **offline** (`ABANGCOLEK_DISABLE_LIVE_PROVIDERS=1`, dimuat melalui `bunfig.toml`): ujian unit tidak bergantung pada akaun orang lain dan tidak memakan kuota produksi. Pengesahan live adalah gate berasingan, bukan sebahagian suite unit.

## Rekod pengesahan live — 21 Oktober 2026 (inventori penuh)

Probe HTTP sebenar daripada mesin pembangun (tanpa kunci dalam dokumen ini). Katalog diambil
langsung daripada API provider; **kehadiran dalam katalog ≠ tersedia untuk akaun ini**
(contoh: `nvidia/nemotron-3-super-120b-a12b:free` masih dalam katalog OpenRouter tetapi
404 untuk akaun ini).

| providerId | modelId | endpoint | status | keputusan |
|---|---|---|---|---|
| openrouter | `nvidia/nemotron-3-ultra-550b-a55b:free` | `openrouter.ai/api/v1/chat/completions` | 200, 1049 ms | calon ketiga — aktif, arahan "PING" diikut |
| openrouter | `google/gemma-4-31b-it:free` | sama | **429** "Provider returned error" | model **hidup**, kumpulan free perkongsian penuh ⇒ cooldown + fallback, jangan probe dalam loop |
| nvidia | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` | `integrate.api.nvidia.com/v1/chat/completions` | 200, 2821 ms selepas 1 retry | **vision hidup** — imej dibaca dengan betul ⇒ calon vision untuk EXT-07 (bukan gate luar) |
| nvidia | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` (percubaan 1) | sama | 503 `ResourceExhausted: Worker local total request limit reached (16/16)` | **kapasiti**, bukan kredensial ⇒ bounded retry kemudian `local_rules` |
| gemini_free | `gemini-3.8-flash` | `generativelanguage.googleapis.com/v1beta/openai/chat/completions` | 200, imej ditelan (1104 token input) | id sah + multimodal; jawapan akhir belum observe (thinking token makan bajet output) — memerlukan 1 probe dengan `max_tokens ≥ 200` sebelum diaktifkan |
| groq | `openai/gpt-oss-120b` | `api.groq.com/openai/v1/models` + chat | 200, kunci sah | `llama-3.3-70b-versatile` **tidak lagi dalam katalog** (dibuang, bukan 404 sementara) |
| opencode_zen | `x-preview-f-free` | `opencode.ai/zen/v1/models` | **401 `api_key_expired`** (kedua-dua kunci: `OPENCODE_ZEN_API_KEY` dan `OPENCODE_API_KEY`) | **gate akaun** — kekal dinyahaktifkan |
| openrouter | `nvidia/nemotron-3-super-120b-a12b:free` | sama | 404 (rekod 20 Okt, disahkan semula) | dibuang daripada calon; tetapi masih tersenarai dalam katalog OpenRouter |

**Katalog OpenRouter `:free` hari ini (17 daripada 468 model, semua `prompt=0`/`completion=0`):**
`nvidia/nemotron-3-ultra-550b-a55b:free` (1M ctx) · `google/gemma-4-31b-it:free` (vision) ·
`google/gemma-4-26b-a4b-it:free` (vision) · `nvidia/nemotron-3.5-lightning:free` (3B, 1M ctx,
permintaan berikutnya selepas 429) · `nvidia/nemotron-3.5-super-vl:free` (**vision + structured
output**) · `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` (omni) ·
`minimax/minimax-m3.1-flash:free` (1M ctx, vision) · `liquid/lfm-2.5-2.6b:free` (structured
output termurah) · `xingchen-agi/xing4.0-29b-a4b:free` (structured output) ·
`dots-studio/dots-3-note-preview:free` (vision + schema) · `poolside/laguna-s-2.1:free` ·
`poolside/laguna-xs-2.1:free` · `cohere/north-mini-code:free` ·
`thinkingmachines/inkling:free` + `inkling-small:free` (403 agentic-harness-only) ·
`nvidia/nemotron-3.5-content-safety:free` (guardrail, bukan calon chat) ·
`nvidia/nemotron-3-super-120b-a12b:free` (404 akaun).

**Had free tier (dokumentasikan provider, dibaca 21 Okt 2026):**
- Gemini: had mengikut **project** (bukan kunci), reset tengah malam Pasifik; akaun projek ini
  menunjukkan had sebenar **20 `generate_content`/hari** ⇒ maksimum 1 probe live/hari.
- OpenRouter `:free`: kumpulan upstream perkongsian ⇒ 429 dijangka ⇒ cooldown + fallback.
- NVIDIA NIM: 503 = kapasiti worker (16/16), bukan kredensial.
- `gemini-4-argon` **tidak** ada pada free tier (halaman harga).

**Kesimpulan untuk ledger:** `EXT-07` (vision) **bukan** gate akaun — ada model free yang
vision hidup (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`, 200 dengan imej dibaca betul;
`gemini-3.8-flash` juga menerima imej). Refusal bertip 409 `QUALIFIED_VISION_MODEL_REQUIRED`
hanya betul sementara vision belum diaktifkan dalam laluan platform.

