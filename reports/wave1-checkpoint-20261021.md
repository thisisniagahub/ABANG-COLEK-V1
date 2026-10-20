# Wave 1 Checkpoint — ABANGCOLEK-PLATFORM (21 Oktober 2026)

**Skop:** Wave 0 (evidence) + Wave 1 (implementasi teras) daripada `reports/open-task-backlog-20261021.md`.
**Kaedah:** 16 lane subagent diberi, setiap satu dengan had laluan fail dan Definition of Done; orkestrator membuat pembetulan sendiri di server/frontend,ECB verifies dan menulis dokumen.
**Status dokumen:** semua nombor di bawah datang daripada arahan sebenar, bukan dakwaan.

---

## 1. Gate akhir wave 1 (semua hijau)

| Gate | Perintah | Exit | Hasil |
|---|---|---:|---|
| Typecheck | `bun run lint` (`tsc --noEmit && tsc --noEmit -p tsconfig.platform.json`) | **0** | 0 ralat di `src/**`, `server/**`, `api/**`, `shared/**`, `tests/**` |
| Build | `bun run build` (Vite + prerender) | **0** | `✓ built in 13.06s` |
| Boundaries | `bun scripts/maintenance/check-boundaries.ts` | **0** | `Scanned 272 files, resolved 836 internal imports` · `Zero unauthorized boundary violations found` · cycle FORBIDDEN dan STALE_REGISTERED_CYCLE **tiada lagi** |
| Ujian | `bun test ./tests/jev ./tests/platform ./tests/copilot ./tests/frontend ./tests/ext ./tests/architecture` | **0** | **1193 pass / 11 todo / 0 fail** — 1204 ujian, 165 fail |

Perbandingan baseline (sebelum wave): `tests/platform`+`tests/copilot` = 901 pass / 10 todo / 0 fail; `tests/jev`+`tests/platform` = 826 pass / 0 fail. Tambahan ~290 ujian datang daripada wave ini (null-semantics JEV, typed failures, order resolution, refund intent, lifecycle pending, inspector route, aggregate runner, frontend null semantics, discovery semantics).

## 2. Yang berubah

**37 fail diubah + 30 fail baharu** (67 fail, tiada commit).

| Area | Fail berubah | Fail baharu yang paling penting |
|---|---:|---|
| `server/**` | 22 | `sessionCookie.ts`, `aguiThreads.ts`, `paymentCallbacks.ts`, `paymentCallbackRoutes.ts`, `inspection/inspector.ts`, `jev/dimensions.ts`, `tenancy.ts`, `liveProviderProbe.probe.ts` |
| `src/**` | 13 | `cards/jevValueSemantics.ts`, `cards/JevPrimitivesCard.tsx` |
| `tests/**` | 13 | `jev/null-semantics.test.ts`, `jev/taxonomy-drift.test.ts`, `platform/copilot-typed-failures.test.ts`, `platform/copilot-pending-contracts.test.ts`, `platform/dev-inspector-route.test.ts`, `platform/test-all-runner.test.ts`, `frontend/jev-null-semantics.test.tsx`, `frontend/abangcolek-discovery-jev-semantics.test.ts` |
| `shared/**` | 8 | `order-reference-contracts.ts`, `provider-run-contracts.ts`, `payment-contracts.ts`, `jev-contracts.ts`, `intelligence-{availability,errors,records}.ts` |
| `api/**` | 3 | `platform/payments/{callback,return}.ts` |
| `reports/` | 5 | `chat-log-synthesis-20261021.md`, `open-task-backlog-20261021.md`, `w0-evidence-20261021.md`, `implementation/live-provider-evidence-20261021.json` |

## 3. Item yang ditutup dengan bukti

| Item | Bukti |
|---|---|
| BL-14 cookie scope | `Path=/` + multi-`Set-Cookie` (session dahulu, legacy clear kemudian) + `revokePresentedSessions`; `tests/platform/host-security.test.ts` mengesahkan skop efektif |
| BL-15 mount thread store | `AguiThreadStore` di `server/platform/app.ts`, `X-Thread-Id`, `GET /copilot/threads/:id/events` (SSE + `X-Last-Event-Id` + `X-Receipt-Count` + `?after=`), `requireOwned()` |
| BL-21 attachment guard | 409 `VISION_INFERENCE_UNAVAILABLE` + `QUALIFIED_VISION_MODEL_REQUIRED`, tiada hash direka; route awam `NO_SESSION_AUTHORITY` |
| BL-22 inspector | 404 produksi (sebelum sesi dikira), 403 customer, snapshot sebenar `{generatedAt, threads, totals, persistence, locality}` |
| BL-23/24/25 semantik null JEV | `null` ≠ 0/false/{}, drift ⇒ `UNKNOWN` + `taxonomyDrift`, kad render "Tidak dikira"/"Tidak diketahui", 19 ujian frontend + 3 ujian jev |
| BL-28 order resolution | complete-token match, longest id menang, `ORDER_ID_AMBIGUOUS` fail-closed, refund intent negation-aware — ujian hijau |
| BL-30 bajet provider | 3 panggilan / 30s / token caps, `LOCAL_RULES_BUDGET_EXHAUSTED`, label `local_rules` jujur, tiada provider body bocor |
| BL-31 assertion bajet | dipecah 2 kes (tiada provider vs bajet beku) |
| BL-40 harness | `test:ext` + skrip agregat `test` dalam `package.json`; `test:platform` (gate CI) **tidak** disentuh; `scripts/test-all.ts` + 5 ujian runner |
| BL-09 empat semakan audit | fence ganjil 0, rahsia 0 hit, 489/188 reproduce, candidate lane 290 fail |
| BL-10/BL-11 dokumen | `CPK-01`, `EXT-03`, `EXT-06` direkonsiliasi; authority table ke HEAD `6c5b16e` |
| **CPK-01 + AI-01 (ledger)** | bukti live sebenar — 5 probe HTTP 200 + 1 HTTP 404 dead-candidate ⇒ `verified_local` / `live_verified` |

## 4. Bukti live provider (21 Okt 2026, 05:47 PG)

| Probe | HTTP | Reason | Latency |
|---|---:|---|---:|
| `gemini_free/gemini-3.6-flash` (calon utama) | 200 | `PROVIDER_CALL_SUCCEEDED` | 1440 ms |
| `gemini_free/gemini-3.5-flash-lite` | 200 | `PROVIDER_CALL_SUCCEEDED` | 999 ms |
| `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` | 200 | `PROVIDER_CALL_SUCCEEDED` | 6042 ms |
| `openrouter/nvidia/nemotron-3-super-120b-a12b:free` (dokumen dead) | 404 | `PROVIDER_MODEL_NOT_FOUND` → `unusable` | 563 ms |
| `nvidia/nemotron-3-ultra-550b-a55b` (router platform lama) | 200 | `PROVIDER_CALL_SUCCEEDED` | 2084 ms |
| `ollama/llama3.2:latest` (tidak sampai) | — | `PROVIDER_UNAVAILABLE` → `local_rules` | 1 ms |

Actor gate: tanpa actor server ⇒ `ACTOR_NOT_VERIFIED`, 0 panggilan provider, actor daripada badan diabaikan. No-echo: canary tiada dalam respons. Bajet: `maxModelCalls 3`, `modelCallsMade 1`, `deadlineMs 30000`, token caps dipatuhi.
**Caveat jujur:** branch 429 (`PROVIDER_QUOTA_EXHAUSTED`) **tidak** dibuktikan live (semua calon jawab 200 pada percubaan pertama) — ia kekal unit-proven dan **tidak** patut dibuktikan dengan sengaja membakar kuota 20/hari. Fail bukti: `reports/implementation/live-provider-evidence-20261021.json`.

## 5. Ledger selepas wave 1

| Status | Sebelum | Selepas |
|---|---:|---:|
| verified_local | 38 | **40** |
| implemented_unverified | 37 | 36 |
| blocked_external | 8 | 8 |
| not_run | 1 | 1 (REF-01 — sedang dibina) |
| partial | 1 | 0 |
| **Belum ditutup** | **47** | **45** |

## 6. Cycle architecture dibaiki (bukan daftar pengecualian)

`server/platform` ialah LEGACY_MONOLITH; arah yang dibenarkan modul → platform. Import `app.ts` ke `server/agents/intelligence/*` menutup pusingan `tools → platform → intelligence → tools`. Fix: implementasi dipindahkan ke layer yang sah (`server/platform/inspection/inspector.ts`, `server/platform/aguiThreads.ts`, `server/platform/tenancy.ts`, `shared/intelligence-{availability,errors,records}.ts`) dengan shim `export *` di laluan lama — laluan import dan identiti kelas (`instanceof IntelligenceError`) kekal berfungsi, tiada ujian perlu disentuh. `check-boundaries.ts` kini exit 0 tanpa sebarang daftar baharu.

## 7. Apa yang MASIH belum siap

| Kumpulan | Item |
|---|---|
| Wave 1 W1 (sedang jalan) | BL-16 surface catalog, BL-17 revision entity/policy, BL-18 HITL executor registry, BL-19 preview hash, BL-20 revocation/expiry, BL-29 parser purge, BL-32 `unknown_outcome` |
| Wave 2 (sedang jalan) | BL-33…BL-36 (MOD-01/02/08/09), BL-37…BL-42 (ADV-05/15/17/20/21/23/24/26), BL-43 OFF-01, BL-44 PD-01 |
| Wave 4 (sedang jalan) | BL-59 REF-01 risk engine, BL-60 DR-01 |
| Wave 3 (selepas lane atas) | BL-45 `verify-acceptance` + regenerate ledger, BL-46 sync checklist/register, BL-47 Playwright live + deployment receipt (REL-01), BL-48 suite ×2 no-flake, BL-49 refresh `CURRENT-STATUS.md`, BL-50 report induk |
| Gate akaun (BLOCKED untuk pengguna) | BL-51 kunci `OPENCODE_ZEN_API_KEY` baharu, BL-52 GitHub Actions billing, BL-53 CopilotKit Intelligence + terms, BL-54 hosted User Memories, BL-55 Slack/Teams app + signing secret, BL-56 live MCP browser client, BL-57 payment gateway credential, BL-58 Gemini quota (sudah pulih — dibuktikan dengan probe live 21 Okt) |

## 8. Rekahtrump yang direkodkan (untuk sesi akan datang)

1. **Import runtime pakej luaran dalam `server/**` memecahkan ujian launcher** — `server/platform` kini tidak mengimport `@ag-ui/core` sebagai runtime dependency ( guna `import type` + literal nama event). Ujian `tests/platform/runtime-launcher.integration.test.ts` boot pelayan dalam checkout sintetik tanpa `node_modules` sebenar.
2. **`mock.module` dalam Bun adalah global proses** — `tests/jev/taxonomy-drift.test.ts` bocor ke fail lain; fix: snapshot eksport sebenar sebelum mock + `afterAll` restore.
3. **Path DB tetap + `unlinkSync` yang ditelan = 409 palsu** — `tests/platform/host-security.test.ts` kini guna path unik per-run.
4. **Lane subagent mati pada had langkah** — 9 daripada 16 lane hit had. Pelarvik: skop lebih kecil, satu lane satu fail-kumpulan, dan orkestrator tranquill mengbacks up lane yang separuh siap.
5. **Overclaim dalam laporan** — beberapa lane tutup dengan "DONE" tanpa verifikasi; pembetulan: Definition of Done merangkumi arahan + exit code + kiraan sebenar, dan orkestrator sentiasa jalankan gate sendiri.
