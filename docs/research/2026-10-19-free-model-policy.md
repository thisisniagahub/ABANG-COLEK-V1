# ABANGCOLEK — Free-Only Model Policy dan Calon Penilaian

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh semakan: 19 Oktober 2026. Status: Research dan polisi sasaran; tiada akaun/key diuji, model benchmark dijalankan atau router source diubah.

Research ini tidak memilih pemenang. Urutan candidate untuk pelaksanaan telah ditetapkan oleh [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md); [prompt utama](../prompts/IMPLEMENT-ABANGCOLEK.md) melarang pertukaran calon/paid fallback secara autonomi. Semua hard gates di bawah tetap mengatasi activation.

## Polisi wajib

Semua inference Copilot, specialist, background summary, title generation, evaluator LLM, embeddings, vision dan voice yang dipilih mesti memenuhi kelayakan percuma dan polisi data. Jika tidak, disable kemampuan itu. Domain calculations tidak memerlukan inference. Tiada langganan atau paid fallback sebagai penyelesaian quota.

Label zero inference fee berbeza daripada kos hardware, elektrik, internet, hosting dan servis CopilotKit Intelligence. Intelligence tidak menjadi percuma kerana modelnya percuma.

## Sumber rasmi dan dapatan

| Provider | Sumber | Polisi penggunaan |
|---|---|---|
| Google Gemini | [Pricing](https://ai.google.dev/gemini-api/docs/pricing) | Semak hanya dua candidate Gemini ADR semasa dan free/account/data-use terms; jangan memilih model/tier tambahan kerana nama Flash |
| OpenRouter | [Free variants](https://openrouter.ai/docs/guides/routing/model-variants/free), [catalog](https://openrouter.ai/api/v1/models), [limits](https://openrouter.ai/docs/api/reference/limits) | Exact catalog ID `:free`, pricing semua komponen yang digunakan sifar, tools support; quota/availability tetap terhad |
| Groq | [Limits](https://console.groq.com/docs/rate-limits), [tool use](https://console.groq.com/docs/tool-use) | Verify free-plan account/model dan tool compatibility; tiada upgrade untuk failover |
| OpenCode | [Model IDs, endpoints dan pricing](https://opencode.ai/v2/docs/console/models/) | Hanya exact free IDs; promosi boleh tamat. Semak endpoint/auth/terms; jangan guna endpoint/model lama dalam source tanpa verification |
| Ollama local | [FAQ](https://docs.ollama.com/faq) | Tiada inference vendor fee untuk model local yang sesuai, tetapi license/hardware/capability mesti disahkan; local tidak boleh dicapai dari Vercel sebagai localhost |
| NVIDIA hosted APIs | [FAQ](https://docs.api.nvidia.com/nim/docs/product), [trial terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf) | Trial/development access bukan bukti kelayakan production. Disabled untuk production sehingga endpoint/program khusus membenarkannya |

Model NVIDIA melalui OpenRouter `:free` ialah offering berbeza daripada NVIDIA hosted trial; semak terms/provider routing offering sebenar. Ollama Cloud bukan Ollama local dan tidak dilabel unlimited/free tanpa semakan plan. Langganan coding assistant tidak dianggap free inference backend API.

## Calon, bukan ranking pemenang

| Tugas | Calon untuk benchmark | Batas bukti |
|---|---|---|
| ADK native general chat/tools | `gemini-3.6-flash`, `gemini-3.5-flash-lite` | Nama/free-tier muncul pada pricing rasmi; account eligibility, tool flow dan BM belum diuji |
| OpenRouter tools/structured output | `nvidia/nemotron-3-super-120b-a12b:free`, `nvidia/nemotron-3.5-super-vl:free` | Public catalog pada tarikh semakan melaporkan tools dan structured_outputs serta prompt/completion price sifar; endpoint dan caj lain belum disahkan |
| OpenRouter general tools | `google/gemma-4-31b-it:free` | Public catalog melaporkan tools dan prompt/completion price sifar; schema/ADK adapter dan BM perlu eval |
| Groq tool reasoning | `openai/gpt-oss-120b`, `openai/gpt-oss-20b` | IDs terdapat pada halaman limits; free-plan exact limits/account dan ADK flow perlu disahkan |
| OpenCode fallback khusus | `glm-5.3-flash-free`, `deepseek-v4.1-flash-free` | Model IDs/free pricing didokumenkan sebagai limited-time; tidak autoactivate |
| Local private context | Model installed Ollama yang lulus tools/BM eval dan license | Tiada inventory hardware/model dibuat; belum memilih model local |

Katalog OpenRouter diperiksa melalui public GET tanpa credentials: 16 entries `:free` dengan prompt/completion price sifar ditemui ketika semakan. Ini snapshot penemuan, bukan jumlah kekal atau pengesahan semua caj. Tidak menambah `:free` kepada ID arbitrary; hanya entry yang benar-benar tersenarai.

## Pemilihan terbaik berdasarkan tugas

1. Hard gate: kos sifar bagi semua komponen request, terms/account/environment sesuai, data handling dibenarkan, model tersedia, required tool/schema support dan adapter lulus.
2. Benchmark sintetik ABANGCOLEK: sekurang-kurangnya 60 kes BM/English merangkumi chat grounded, tool choice/args, refusal/scoping, missing-data, multi-step dan timeout/retry. Human review menggunakan rubric sama; siapkan expected tool/result sebelum melihat model output.
3. Lepasi gate: tiada unauthorized action dalam suite, tiada financial claim tanpa source, semua tool args lulus schema pada kes yang diwajibkan. Kegagalan safety tidak boleh diimbangi skor latency.
4. Bandingkan grounded task success, BM clarity, p95 latency dan tokens/calls. Untuk pelaksanaan blueprint semasa, primary/fallback tetap mengikut turutan ADR-0003; benchmark boleh menolak/disable calon yang gagal, tetapi agent tidak menyusun semula calon atau menambah provider secara autonomi. Ranking lain ialah cadangan review sahaja; tiada gelaran terbaik keseluruhan tanpa ukuran.
5. Jadual ranking menyimpan model/provider/endpoint, versi adapter, terms/pricing verification time, account tier, test set hash, keputusan dan reviewer. Synthetic eval hanya melalui candidate yang telah dibenarkan dan percuma; hasil belum ada sekarang.

## Router enforcement sasaran

- Explicit allowlist exact ID/endpoint; tiada `auto` atau dynamic paid route. Matikan paid plugins, grounding, search, caching/storage, media atau built-in tools kecuali semua cajnya disahkan sifar.
- Per-provider eligibility account-side dan independent runtime usage budget; pricing metadata sahaja tidak cukup. Jika provider membenarkan billable overflow dan tidak boleh dilarang, jangan aktifkan key itu bagi polisi free-only.
- Free-tier quota exhaustion -> bounded cooldown, fallback calon percuma berizin yang serasi; semua gagal -> local rules/queued/unavailable dengan label jujur. Jangan menambah akaun untuk mengelak limits.
- Revalidate pricing/availability/terms sebelum activation dan pada TTL maksimum 24 jam; tamat verification atau bukti bercanggah -> disable sampai disahkan. Marketing expiry lebih awal mengatasi TTL.
- Semua request mempunyai max tokens, deadline dan run budget bersama parent/subagents. Adaptive routing tidak mengulang side effects.
- Simpan observed provider/model/usage tanpa secrets. Tiada silent title, eval, memory, vision atau TTS request ke model berbayar.
- Unknown usage/cost bukan bukti RM0. Audit harga/policy dan receipt diperlukan sebelum melaporkan kos sifar yang diperhatikan.
- Data sensitif diprojek/redact sebelum external inference. Jika terms free tier tidak sesuai untuk data itu, hasil menjadi unavailable bagi data class tersebut; local LLM bukan fallback terpilih dalam ADR semasa. Jangan menambah model local atau paid untuk menyelesaikan privacy tanpa ADR baharu dan authorization yang sah.

## Acceptance

Ujian menolak paid ID, nonzero/missing fee metadata, expired verification, promotional expiry, incompatible tools, hidden auxiliary calls, privacy mismatch dan paid overflow. Quota 429 menghasilkan fallback percuma/stop. Ranking hanya diterbitkan selepas eval sebenar; source router semasa belum mematuhi polisi ini sehingga diimplementasi dan disahkan.
