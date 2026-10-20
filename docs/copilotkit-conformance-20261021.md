# CopilotKit / AG-UI Conformance — ABANGCOLEK-PLATFORM (21 Oktober 2026)

**Asas:** dokumentasi CopilotKit semasa (`https://docs.copilotkit.ai/<path>.md`) + protokol AG-UI
(`https://docs.ag-ui.com/<path>.md`). Audit hanya baca — tiada kod diubah dalam laporan ini,
kecuali dua fix yang dinyatakan di §4.

> **Fakta asas:** kita **bukan** menjalankan aplikasi CopilotKit. Kita menjalankan
> **endpoint AG-UI yang Written sendiri**, dilayani oleh handler runtime CopilotKit.
> Bukti: `useFrontendTool` / `useCopilotAction` / `useAgent` / `<CopilotKit` / `CopilotChat`
> ⇒ **0 hit** dalam `src/`, `api/`, `server/`. `@copilotkit/react-core` ialah dependency tetapi
> **tidak diimport** di mana-mana. Kesan: setiap kontrak frontend berdokumentasi
> (auth `headers`, frontend tools, `CopilotChat attachments`, `useAgent` shared state,
> `onError` subscriber) **belum diimplementasikan**, walaupun handler server memang sebenar.

---

## 1. Auth — identiti tidak pernah sampai ke agent

| # | Lokasi | Keadaan kita | Sasaran berdokumentasi |
|---|---|---|---|
| A1 | `api/copilotkit.ts:233-237` | Tiada `hooks.onRequest` ⇒ `GET /api/copilotkit/info`, `threads/*`, `transcribe` **tidakdiaut** | "Authenticate in `onRequest`. It is the only hook that runs on every route." |
| A2 | `api/copilotkit.ts:223` | `actor = options.actor ?? PUBLIC_ORIGIN_ACTOR` ⇒ sesi yang sah **diabaikan**, dijalankan sebagai tetamu | Forward identiti disahkan (atau, jika memang mahu anonim, nyatakan dalam descriptor dan **kekalkan tiada data authority**) |
| A3 | `src/features/copilot/agui/aguiClient.ts:378` vs pelayan | `X-CSRF-Token` dihantar tetapi **tidak pernah disahkan** server-side ⇒ kawalan mati | Either verify it on the run route, or stop sending it |
| A4 | `api/copilotkit.ts:336-338` | Route `threads/*` milik runtime **tanpa** ownership check (guard kita ada di route family lain) | `onBeforeHandler` + `userOwnsThread`; `threads/events`/`threads/state` ⇒ **404** untuk thread milik orang lain (bukan 403) |
| A5 | `api/copilotkit.ts:229-237` | Tiada `identifyUser` | Wajib **hanya** bila ada client Intelligence; "Reading a user id straight out of a header … hands every caller the ability to name themselves" |

**Nuansa (jangan over-fix):** docs **membenarkan** anonymity untuk runtime OSS —
"If you run the TypeScript runtime without Intelligence … your agent can run anonymously."
Jadi `PUBLIC_ORIGIN_ACTOR` **sah** jika route itu memang tidak memberi data authority.

**Yang sudah betul:** cookie `Path=/` (`server/platform/sessionCookie.ts:36`) ⇒ sampai ke
`/api/copilotkit`, `/api/mcp`, `/v2`; pengesahan sesi server-side opaque + DB-backed
(`auth.ts:31-50`); multi-`Set-Cookie` berasingan (`app.ts:160-167`); logout clear 2 skop.

---

## 2. Attachments / vision — dakwaan "gate luar" kita **terlalu pesimis**

| # | Lokasi | Keadaan kita | Sasaran berdokumentasi |
|---|---|---|---|
| V1 | `api/copilotkit.ts:142-147` | `content` bukan-string diratakan jadi `''` | Teruskan `ContentPart[]` (`text`/`image`/`audio`/`video`/`document` + `source.data`/`source.url`) |
| V2 | `api/copilotkit.ts:288-307`, `api/platform/copilot/v2.ts:99-120`, `server/platform/app.ts:740-745` | HTTP **409** menghentikan run | AG-UI: "A producer that cannot use a content part … **MUST NOT fail the run** because of it. Skipping what it cannot use and continuing is the conforming behaviour." ⇒ failure permukaan = `RUN_ERROR`, bukan 409 pra-`RUN_STARTED` |
| V3 | `shared/intelligence-availability.ts:97-107` | `locality:'remote'` + reason gaya Intelijen | Ia **gate buku model** (kelayakan model + data scope), bukan entitlement |
| V4 | `shared/founder-intelligence-contracts.ts:408` | `vision: { available: false; … }` (literal) | Lebarkan ke `available: boolean` supaya model vision boleh diaktifkan tanpa ubah jenis |
| V5 | `api/copilotkit.ts:55-74` | `attachmentIds` (bukan sebahagian `RunAgentInput`) | Lampiranständig sebagai `messages[].content` |
| V6 | `src/features/copilot/**` | Tiada UI lampiran | `attachments={{enabled, accept, maxSize, onUpload, onUploadFailed}}` |

**Bukti vision ialah gate model, bukan akaun:**
- "Supported by most vision-capable models" / "Model-dependent" — tiada Intelijen, tiada `identifyUser`, tiada project key dalam page itu.
- "any AG-UI-compatible agent … can receive them" — ejen kita ialah custom AG-UI agent ⇒ dalam skop.
- Tiada baris Intelijen dalam jadual OSS/Intelijen yang involve vision.
- "There is no CopilotKit-specific provider to install" — semua provider kita (OpenRouter, NIM, Gemini, Groq) **OpenAI-compatible** ⇒ adapter yang sama.

**Yang kita ada dan TIDAK Penalty:** sha256 rujukan, `ATTACHMENT_REVOKED` (409),
`ATTACHMENT_PERMISSION_DENIED` (403), `revokeAttachment` — docs **tidak** sebut apa-apa
tentang kebenaran lampiran; itu kepunyaan kita dan ia **bukan** Kegagalan conformance.

---

## 3. Voice — bukan entitlement Intelijen

- `TranscriptionService` (kelas abstrak) + `TranscriptionServiceOpenAI` = **OSS**; "plug in any
  transcription provider — Whisper, AssemblyAI, Deepgram, your own model".
- Runtime tanpa `transcriptionService` tetap serving route dan jawab **503 `{ "error": "service_not_configured" }`**;
  butang mikrofon tidak pernah muncul. **Keadaan kita hari ini = tepat ikut dokumen.**
- Kod ralat kanonik: `TRANSCRIPTION_FAILED`, `TRANSCRIPTION_SERVICE_NOT_CONFIGURED`,
  `TRANSCRIPTION_INVALID_AUDIO`, `TRANSCRIPTION_RATE_LIMITED`, `TRANSCRIPTION_AUTH_FAILED`,
  `TRANSCRIPTION_NETWORK_ERROR`.
- Multipart: medan audio mesti bernama **`audio`**; JSON: `mimeType` wajib bersama base64 `audio`.
- Letak surat: "Let the provider's own errors propagate unchanged. The runtime classifies failures
  by reading the error text for markers like `rate`, `429`, `auth` and `too long`."

**Divergence:** `shared/intelligence-availability.ts:110-119` mengecam STT luar sebagai
`locality:'remote'` + `EXTERNAL_STT_TTS_NOT_CONFIGURED` ⇒  DOCUMENTEKAN sebagai `provider credential gate`.
**Beyond spec dan bagus (jangan buang):** penunjuk kebenaran mikrofon, revoke, dedah lokasi
pemprosesan, dan peraturan turun-tahap trust transkrip.

---

## 4. Frontend tools & error codes

| # | Lokasi | Jurang | Sasaran |
|---|---|---|---|
| FT1 | `api/copilotkit.ts:149-157` | `RunAgentInput` tiada `tools` | Iktisarkan set alat pelayar |
| FT2 | `api/copilotkit.ts:136-191` | Tiada `TOOL_CALL_START/_ARGS/_END` | Ejen cadang call dan **biarkan unanswered**; aplikasi yang eksekusi |
| FT3 | `aguiClient.ts:320-331` | `buildMessages` tak boleh bawa `ToolMessage` | Run seterusnya bawa satu tool message bagi setiap call, dikunci `toolCallId` |
| FT5 | `server/agents/tools/registry.ts` + `server/platform/domainTools.ts` | **Dua** permukaan alat yang tak saling nampak (32 ADV vs 19 domain) | Satu permukaan; alat pelayar ikut model frontend-tools |
| FT6 | `server/agents/tools/definitions.ts:47-51` | Hard fail bila bilangan ≠ 32 | Tiada had documented — tetapi kekalkan sebagai **invariant tempatan**, jangancii sebagai syarat CopilotKit |
| FT7 | — | Tiada consent gate dalam laluan tindakan pelayar | "Applications SHOULD obtain user consent before executing a side-effectful tool call" |
| FT8 | `server/agents/copilot/runtime.ts` | Tiada `STATE_SNAPSHOT`/`STATE_DELTA` | Saluran shared-state AG-UI yang berdokumentasi |

**Error codes — jangan align vocabulary server kita.** `CopilotKitCoreErrorCode` ialah enum
**subscriber sisi klien**; tiada vocabulary serverCanonical. Jadi:
- **Kekalkan** reason code SCREAMING_CASE kita (`EXECUTOR_UNAVAILABLE`,
  `LOCAL_RULES_BUDGET_EXHAUSTED`, `REVALIDATION_CONFLICT`, `DISPATCH_OPTED_OUT`,
  `ASSET_CONSENT_NOT_GRANTED`, `ORDER_ID_NOT_FOUND`, `ATTACHMENT_REVOKED`, …).
- **Align hanya di sempadan klien**: `AGENT_RUN_ERROR_EVENT` / `AGENT_RUN_FAILED` /
  `TOOL_HANDLER_FAILED` / `TOOL_NOT_FOUND` / `AGENT_NOT_FOUND` / `AGENT_THREAD_LOCKED`.
- `TOOL_NOT_FOUND` dan `TOOL_HANDLER_FAILED` ⇒ **padanan tepat** dengan enum kanonik.
- `PROVIDER_MODEL_NOT_FOUND` / `PROVIDER_CREDENTIALS_MISSING` ⇒ reason dalamAN `AGENT_RUN_FAILED`
  (docs: puncanya "a bad model string, a missing API key on the server, a provider error").

---

## 5. Model / runtime

- "**The model is set on the agent.** CopilotKit does not expose a cloud-hosted endpoint for
  choosing or switching the model at request time" ⇒ pilihan server-side kita **patuh**.
- "There is no CopilotKit-specific provider to install" ⇒ 6 provider kita semuanya
  OpenAI-compatible ⇒ **satu** adapter (`createOpenAI({ baseURL })`).
- Built-in Agent guna **AI SDK 6** (`ai@6` + `@ai-sdk/*@ai-v6`) ⇒ repo kita **tiada** `ai`/
  `@ai-sdk/*` dependency ⇒ migrasi ke factory mode terblokir pada dependency itu.
- "Never use `forwardedProps` for credentials, tenant identity, authorization, or unrestricted
  model and provider selection" ⇒ jangan tambah `model` ke `properties`.
- **Risiko `useSingleEndpoint`:** `api/copilotkit.ts:315-319` pintasan `POST /api/copilotkit`
  ⇒ dalam single-route mode handler rasmi expect envelope `{method,params,body}` ⇒ pintasan
  ini akan pecahkan runtime. ("Pinning the wrong mode 404s silently.")
- **Risiko `/info`:** `api/copilotkit.ts:327-331` memulangkan descriptor **tulis sendiri** dari
  laluan rasmi `/info` ⇒ risiko kejujuran (self-certifying at a canonical endpoint).

---

## 6. Fix yang sudah saya apply semasa audit

| Fix | Lokasi |
|---|---|
| Client tidak lagi membuang `payload.code` — reason code pelayan dikekalkan dalam objek ralat | `src/features/copilot/agui/aguiEvents.ts` (tambah `code?`), `src/features/copilot/agui/aguiClient.ts:187-198` |
| Gate CPK-03/EXT-03/EXT-04/EXT-06 dibetulkan dalam ledger | `reports/implementation/acceptance-status.json` |
| Checklist aktivasi untuk pemilik | `docs/copilotkit-intelligence-activation-checklist.md` |

---

## 7. Apa yang docs **TIDAK** tetapkan (tiada tindakan conformance)

Vocabulary reason code server · kebenaran/revocation lampiran + sha256 · penunjuk &
revoke mikrofon + dedah lokasi pemprosesan · dasar free-provider (kuota, cooldown, failover,
`COPILOT_RUN_BUDGET`, had 6 dispatch) · bilangan alat · medan `attachmentIds` · actor
tetamu/anonymous · `identifyUser` tanpa Intelijen · jadual ownership thread sisi server.

---

## 8. Urutan divestasi (P0 → P2)

**P0 (betul/keselamatan)**
1. `hooks.onRequest` pada route runtime — aut pintu `/info`, `threads/*`, `transcribe`, run.
2. Ownership check untuk `threads/*` (404 untuk thread orang lain); `threads/clear` hanya untuk operator.
3. Sahkan `X-CSRF-Token` pada run route **atau** hentikan menghantarnya.
4. Hentikan 409 lampiran — teruskan content part, kegagalan ⇒ `RUN_ERROR`.

**P1 (conformance protokol)**
5. Teruskan `ContentPart[]` multimodal.
6. Iktisarkan `RunAgentInput.tools` + `TOOL_CALL_*` + `ToolMessage` pusing balik.
7. `STATE_SNAPSHOT`/`STATE_DELTA`.
8. `RUN_ERROR.code` ⇒ kod kanonik; simpan reason code dalam payload.
9. Jangan pintasan `POST /api/copilotkit` dalam single-route mode.
10. Jangan pulangkan descriptor sendiri dari `/info`.

**P2 (keupayaan / kejujuran)**
11. Klasifikasi semula vision + STT sebagai gate model/provider, bukan Intelijen; lebarkan
    `vision.available` ke `boolean`.
12. `transcriptionService` pada runtime ⇒ `/info` advertise `audioFileTranscriptionEnabled:true`.
13. Register provider: nota "satu adapter", pin `ai@6`, lajur keupayaan endpoint per provider,
    dan labelkan failover/cooldown sebagai **dasar kita sendiri**.
