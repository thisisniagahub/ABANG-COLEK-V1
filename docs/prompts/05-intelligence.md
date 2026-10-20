# Prompt 05 — Gated Intelligence Streams dan Reviewed Learning

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Checklist wajib selepas setiap task:** baca [PROJECT-CHECKLIST.md](../../PROJECT-CHECKLIST.md). Integrator mengekalkan `[ ]` semasa in_progress/separa/blocked/failed/not_run; tukar kepada `[x]` hanya selepas acceptance item lulus dengan actual tests, environment, source manifest dan reviewer. Tambah evidence link yang wujud, sync acceptance register/checkpoint/counters dan rekod exact next task sebelum handoff. Worker menghantar bukti, bukan mengedit tick canonical serentak. Ikut execution contract§10; jangan menutup parent feature hanya kerana child task selesai.


Baca [master prompt](IMPLEMENT-ABANGCOLEK.md), [execution contract](AGENT-EXECUTION-CONTRACT.md), [CPK-02/03 dan Intelligence contract](../design/copilotkit-ten-features.md), [advanced registry ADV-28](../design/copilot-advanced-tools.md), [acceptance register](ACCEPTANCE-REGISTER.md) dan checkpoint04. Fasa ini tidak mengizinkan subscription, account/project creation, paid inference, login automatik atau penghantaran business data tanpa approved scope.

## Inputs, ownership dan outputs

Input: runtime/ADK/owned thread mapping02, canonical event/card/state contracts04, activation/policy decisions00 dan existing project offering jika ada. Integrator memiliki account/project gate; backend/Python owner mapping/persistence adapters; privacy/security reviewer memeriksa data lifecycle; frontend owner replay/reconnect UX. Jangan duplicate commerce DB atau menulis shared contracts secara serentak.

Output **PLANNED** `reports/implementation/05-intelligence.md`, per-ID receipts CPK-02/03/ADV-28, activation decision evidence dan checkpoint06. Status mesti environment-specific. **EXISTING** `tests/platform/copilot-intelligence.test.ts` menguji local policy/router assertions; hand-created status object, fallback response atau manual SOP bukan bukti product Streams/Automatic Learning.

## 05.1 — External gate sebelum SDK network atau data

Semak read-only metadata/terms menggunakan tools sebenar dan fallback manifest; jangan install/auth connector untuk menjadikan availability hijau. Gate berikut semuanya perlu bukti:

| Gate | Evidence minimum | Jika tidak ada |
|---|---|---|
| Existing offering/project | Owner/account/project identity, official terms/license, exact free eligibility/quota dan no required paid tier | CPK-02/03 `blocked_external`; jangan create project/subscribe |
| Credentials/deployment | Server-side configured status, approved endpoint/project identity, supported runtime/ADK deployment | Missing gate, no localhost production atau browser key |
| Data/privacy | Allowed classes/purposes, processor/account policy, retention/export/delete/redaction, approval ref dan expiry | `POLICY_UNCONFIGURED`, synthetic tests sahaja |
| Costs/quotas | Ingestion/storage/replay/learning/eval/delivery fees, quota behavior dan overflow disabled | `PROVIDER_ELIGIBILITY_UNVERIFIED`, no request |
| SDK compatibility | Exact Intelligence package/API release metadata dan lock compatible dengan ADR runtime/bridge | `DEPENDENCY_INCOMPATIBLE`, jangan install latest/mereka import |

ADR tidak memberi pin bagi setiap optional Intelligence SDK. Jika package tambahan diperlukan, verifikasi official registry/source, exact compatibility dan reviewed lock amendment dahulu; jangan agent-select arbitrary latest atau mengubah runtime pins. Jika existing offering menggunakan server configuration sahaja, dokumentasikan tanpa menambah dependency kosmetik.

Tuliskan `activation-decisions.json` mengikut exact contract schema, tanpa tokens/business payload. Periksa telemetry/vendor network via documented controls, bukan guessed environment variable. Unknown/free label generik bukan account-specific evidence.

**Jika satu gate gagal:** record dependency, reason/evidence, affected CPK/ADV rows, safe disabled UI dan next executable local task. Tulis negative/synthetic contract tests berikut yang masih bebas, kemudian terus06. Tiada obligation menghantar data atau mengumpul conversations semata-mata untuk menutup row. Lapan CPK lain tetap boleh maju.

## 05.2 — TDD contract dan identity mapping

Tulis **PLANNED** `tests/copilot/intelligence-gates.test.ts`, `streams-replay.test.ts`, `learning-policy.test.ts`, Python `agents/google-adk/tests/test_intelligence_mapping.py` dan `test_learning_delivery.py`. Sediakan deterministic fake transport yang dilabel untuk failure/negative cases; bukan product-certified simulation.

| Named test | Expected invariant |
|---|---|
| `rejects unapproved offering data and stale verification` | Tiada network ingestion/restore/learning ketika activation gagal |
| `rejects browser principal and foreign thread` | Mapping workspace/user/thread->ADK/Intelligence server-owned dan reauthorized |
| `replay restores display without tool execution` | Historical tool call/card replay tidak mutate/dispatch semula |
| `reconnect and second device require fresh session` | Revoked owner/workspace denied; reconnect tidak mendapat old grants |
| `server death does not invent execution recovery` | Streams delivery berbeza daripada durable command/worker recovery |
| `learning excludes finance PII and secrets by default` | Completed permitted/redacted QC records sahaja eligible |
| `unpublished foreign incompatible skill denied` | Published/version-pinned compatible delivery sahaja, no grant expansion |
| `rollback restores prior approved skill revision` | Skills/audit retained, no automatic model/policy rewrite |

```powershell
bun test ./tests/copilot/intelligence-gates.test.ts ./tests/copilot/streams-replay.test.ts ./tests/copilot/learning-policy.test.ts
uv run --project agents/google-adk pytest agents/google-adk/tests/test_intelligence_mapping.py agents/google-adk/tests/test_learning_delivery.py
```

Run red against absent/unsafe behavior, implement adapter/policy, rerun green. Jika actual product gate unavailable, positive integration/live cases kekal `not_run`/`blocked_external`; synthetic safety assertions boleh pass dengan label. Gunakan fallback locked Python02 jika uv tiada.

## 05.3 — CPK-02 real Streams jika gate lulus

1. Register real adapter/project mengikut official pinned contract. Stable verified user mapping; browser `userId` tidak authoritative. Store opaque project/thread/session refs server-side dan enforce ownership pada create/read/restore/import.
2. Kekalkan native ADK session persistence02. History import jika diperlukan ialah explicit one-time approved/export step, bukan ongoing DB replication atau automatic upload seluruh history.
3. Observe one permitted synthetic conversation melalui actual service: stream->disconnect->refresh->reconnect->second-device authenticated continuation. Cards/state/tool outcomes restore dengan same refs dan source revisions; count command executions kekal satu.
4. Reauthorize restore selepas logout/revoke/workspace membership change; no previous-principal state flash atau private artifact access. Replayed stale data ditanda stale sebelum fresh command.
5. Bezakan UI disconnect, requested cancel, canceled run dan command yang sudah dispatched/committed. Kalau server mati selepas external effect, replay tidak menyelesaikan unknown outcome; canonical reconciliation/worker diperlukan.
6. Capture real project event/request IDs, correlation/surface IDs, timing dan replay/no-duplicate evidence tanpa sensitive prompts/tokens. HTTP200 atau localStorage restore tidak menutup CPK-02.

## 05.4 — CPK-03 reviewed learning dan ADV-28 jika gate lulus

Fixed learning container `abangcolek-qc-triage`. Eligible inputs hanya completed, consented/approved dan redacted QC workflows; default ingestion off finance/customer PII/evidence secrets. Raw image/file bukan evidence vision inference. Jangan mengirim history tambahan untuk memenuhi minimum count.

Read actual project threshold/schedule; jangan invent minimum count/cadence atau menjanjikan immediate learning. Lifecycle wajib: supporting completed runs -> candidate insight/skill -> provenance review -> deterministic/approved model eval -> human publish -> pinned compatible delivery -> rollback. Tiada model-weight training, automatic approval atau immediate SOP rewrite claim.

`review_skill_candidate` ADV-28 menerima scoped candidate/revision dan eval refs, read/simulation result dengan missing evidence. Candidate skill tidak boleh menukar grants, minimum margin, pricing, commission/refund policy, provider/model sequence atau budget. Jangan auto-publish kerana score melebihi threshold; authorized reviewer action berasingan.

Tests deny unpublished/foreign/stale/incompatible revision, prompt injection dalam learned text, missing supporting run, revoked source, unsafe proposed policy, and rollback. Eval model jika digunakan tertakluk exact free/data/account gates dan shared run budgets; no hidden eval route. Deterministic checks sahaja dilabel deterministic.

Sahkan actual published skill delivery kepada correct agent/project/thread, effect pada permitted QC suggestion dan rollback previous revision; actual project receipt diperlukan. Manual SOP review tidak ditukar label menjadi Automatic Learning.

## 05.5 — Export/delete/retention dan outage behavior

Uji permitted export, targeted deletion/retention expiry dan private data no longer readable selepas revoke; finance receipts tidak dipadam tanpa approved retention decision. Distinguish service copy versus canonical records/session store dan document responsibility per layer.

Outage/quota/expired credential -> precise unavailable/degraded status dan bounded no-paid fallback. No second project/account/provider dipilih sendiri. Existing conversation read boleh dipaparkan hanya jika owner authorized dan source jelas; blocked Intelligence tidak mematikan seluruh canonical app.

## Validation, review dan exit

**PLANNED** browser `tests/e2e/copilot-intelligence.spec.ts`: actual service reconnect/second device/denied restore; learning review/publish/delivery/rollback apabila service gates sah. Synthetic transport tests sahaja tidak memberi live status.

```powershell
bun run lint
bun run build
bun run test:platform
bun test ./tests/copilot/intelligence-gates.test.ts ./tests/copilot/streams-replay.test.ts ./tests/copilot/learning-policy.test.ts
bun run test:e2e tests/e2e/copilot-intelligence.spec.ts
```

Last browser command hanya dijalankan positive live mode jika permitted project tersedia; jika tidak, record explicit blocked case, jangan mark skipped suite passed. Privacy/security reviewer wajib menyemak export/data classes/retention/publish authority sebelum activation.

Exit boleh mempunyai CPK-02/03/ADV-28 `blocked_external` dengan receipts/negative tests dan exact prerequisites. Semua10CPK hanya verified apabila genuine Streams/Learning juga diuji. Save receipts ke `reports/implementation/evidence/<ID>.json`, cost observed/unknown, source manifest dan next [06 release verification](06-release.md). Jangan berhenti seluruh implementation untuk memaksa signup atau bayaran.
