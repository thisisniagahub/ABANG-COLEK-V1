# ABANGCOLEK — AI provider dan free-model activation register

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Activation precedence:** Untuk implementasi semasa, hanya tiga exact offerings dan urutannya dalam [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md) boleh melalui activation gates. Groq, OpenCode, Ollama, NVIDIA direct dan BYOK dalam jadual di bawah ialah inventori research, bukan kebenaran memilih provider tambahan. Perubahan allowlist memerlukan keputusan direkodkan; semua hard gates free-only/data/compatibility tetap wajib.

Diselaraskan: **19 Oktober 2026**. Status: **RESEARCH / ACTIVATION_PENDING**. [Free-only policy dan calon](../research/2026-10-19-free-model-policy.md) menentukan pemilihan; register ini tidak mengesahkan akaun/quota/model terbaik atau kos runtime sekarang.

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

Activation memerlukan commit/diff, eligibility evidence tanpa secrets, exact adapter/model test, quota/no-paid-route tests dan runtime receipt. Catalog/UI sahaja tidak cukup. [Roadmap](../AI-AGENT-ROADMAP.md) dan [prompts](../prompts/README.md) menentukan execution.
