# CopilotKit Intelligence — Checklist Aktivasi & Pembetulan Gate (21 Oktober 2026)

**Asas:** dokumentasi CopilotKit semasa (`https://docs.copilotkit.ai/<path>.md`, indeks `/llms.txt`),
disemak pada 21 Okt 2026. Semua sumberdalam webpage yang dipetikan.

> **Ringkasan:** empat gate `blocked_external` dalam ledger kita **berlabel salah**.
> Dua daripadanya (EXT-03 analytics, EXT-06 voice) **bukan** gate akaun Intelijen.
> Satu (CPK-03) bukan gate plan berbayar. Satu sahaja (EXT-04 Slack/Teams) memang
> memerlukan akaun provider — tetapi ia juga memerlukan pendawaian hos yang hari ini
> **tidak wujud** dalam repo kita.

---

## 1. Peta OSS vs CopilotKit Intelligence

| Keupayaan | OSS? | Rujukan |
|---|---|---|
| Protokol AG-UI, sebarang integrasi | **Ya** | `/concepts/oss-vs-enterprise` — "Any AG-UI integration … Yes" |
| Runtime TypeScript + auth | **Ya** (TS sahaja) | "the only runtime that works without Intelligence" |
| Shared state, HITL, Generative UI, frontend tools | **Ya** | baris "Agent chat, frontend tools, agent state, gen-UI | Yes" |
| Voice / transkripsi | **Ya** (STT provider credential sahaja) | `/voice.md` — tiada entitlement disebut |
| Inspector (pane lokal) | **Ya** | "Its Rich Threads and Automatic Learning panes require the corresponding Intelligence services" |
| AG-UI Streams (saved UI, resumable runs, realtime sync) | **Tidak** | "/threads.md: These are capabilities of CopilotKit Intelligence, not guarantees provided by the AG-UI protocol alone" |
| User Memories | **Tidak** | `/intelligence/memories.md` — entitlement + embedder config, gagal closed |
| Automatic Learning | **Tidak** (tapi termasuk plan Developer percuma) | `/intelligence/plans.md` — "Developer … includes AG-UI Streams, User Memory, and Automatic Learning" |
| Product Analytics | **Tidak** | "/intelligence/analytics.md — Product Analytics only counts runs that reach Intelligence through that key" |
| Channels Slack/Teams (managed) | **Tidak** | "Direct does not mean standalone … the CopilotRuntime still owns the Channel lifecycle and uses an Intelligence connection" |

---

## 2. Pembetulan gate (selaras dengan dokumen)

| ID | Label lama | **Label betul** | who/what |
|---|---|---|---|
| `CPK-03` | `INTELLIGENCE_ACCOUNT_REQUIRED` | Akaun + **Self-Service Agreement** + organization pada plan **Developer (percuma)** + project dipilih (project API key) + **Learning container** dicipta dalam browser (stable id) + **15 eligible threads** sebelum larian learning pertama. **Bukan** gate plan berbayar. **Dan** pendawaian hos belum wujud: `api/copilotkit.ts` tiada `intelligence` client dan tiada `identifyUser`. | 🧑 + 🤖 |
| `EXT-03` | `ACTIVATION_EVIDENCE_MISSING` | Dua produk bercampur. **Product Analytics** = Intelligence-only (kira hanya run yang sampai melalui project key). **Capture separuh** = `@copilotkit/learning` standalone collector (OSS, "experimental and self-hosted", "without CopilotKit") — **sudah diimplementasi & verified secara lokal**. | 🧑 keputusan + 🤖 |
| `EXT-04` | `CHANNEL_PROVIDER_ACCOUNT_REQUIRED` | Akaun CopilotKit + project + `CPK_INTELLIGENCE_API_KEY` (adapter **direct** pun masih ada sambungan Intelijen) + aplikasi provider (Slack: "From a manifest" → install → bot token `xoxb-…` → Signing Secret ke Intelijen; Teams: `copilotkit channels add --project-id … --channel-id … --adapter teams --provision` → upload zip; `ChannelMessage.Read.Group` wajib, `Files.Read.All` perlu consent admin) + **Channel Code** (3–64 huruf kecil/tanda hubung; tidak padan ⇒ "Waiting for runtime") + host Node 22+ yang berpanjangan (**serverless tak boleh pegang sambungan gateway**). | 🧑 + 🌐 |
| `EXT-06` | `ACTIVATION_EVIDENCE_MISSING` | **Salah label.** Voice ialah fitur runtime open-source biasa, bukan tawaran hosted. Laluan dokumentasi: `transcriptionService` pada runtime (`@copilotkit/voice`) ⇒ `/info` advertise `audioFileTranscriptionEnabled:true`; tanpanya laluan jawab `503 service_not_configured`. Kebutuhan luar yang sebenar = **kredensial pembekal STT**, bukan akaun Intelijen. | 🤖 + 🌐 |

**Tiada konsep "activation evidence" dalam dokumentasi CopilotKit** — ia kod reason kita sendiri.
Bukti yang sebenar (per `/intelligence/quickstart`, `/backend/runtime-endpoints`, `/cli`):
`.copilotkit/project.json` · project API key di `.env` (`CPK_INTELLIGENCE_API_KEY`) ·
`/info` ⇒ `mode:"intelligence"` + `threadEndpoints.*` + `inspectorMetadata:true` +
`runtimeEntitlements.status:"ready"` · satu thread tersimpan dalam project cloud ·
`npx copilotkit@latest verify --json` dengan **setiap check PASS**.

---

## 3. Checklist ordered untuk pemilik platform

### Fasa A — akaun, terms, project ( membuka kunci untuk CPK-03, EXT-02, EXT-04)
| # | Langkah | Siapa | Rujukan |
|---|---|---|---|
| A1 | Daftar di `https://intelligence.copilotkit.ai` dan **terima CopilotKit Self-Service Agreement** | 🧑 | `/intelligence/managed-intelligence-platform` — "A new account accepts the CopilotKit Self-Service Agreement." |
| A2 | organization pada plan **Developer** (percuma) | 🧑 | `/intelligence/plans` — "Developer is the no-cost plan." |
| A3 | pilih/cipta **project** (satu bagi setiap env) | 🧑 | `/cli` — "A project is where your app's threads, messages, and platform metadata are stored." |
| A4 | `npx copilotkit@latest login` | 🤖 (buka browser) | `/cli` |
| A5 | `npx copilotkit@latest project select` → tulis `.copilotkit/project.json` + `.env` `CPK_INTELLIGENCE_API_KEY` | 🤖 | `/cli`, `/intelligence/quickstart` |
| A6 | `.env` kekal server-side, **jangan commit** | 🤖 | "Keep the key on the server." |

### Fasa B — perubahan kod yang MESTI ada sebelum Intelijen boleh berfungsi
| # | Perubahan | Rujukan |
|---|---|---|
| B1 | `api/copilotkit.ts`: `intelligence: new CopilotKitIntelligence({ apiKey: process.env.CPK_INTELLIGENCE_API_KEY! })` | `/intelligence/quickstart` |
| B2 | tambah `identifyUser` yang resolve sesi server **(construction throw tanpa itu)** | `/auth` — "The Intelligence runtime requires an `identifyUser` callback — construction throws without one" |
| B3 | **jangan** pass `runner` bersama `intelligence` | "TypeScript rejects both options together" |
| B4 | `memory: { access: … }` untuk mount `/memories*` (EXT-02) | `/intelligence/memories` |
| B5 | **Frontend mesti diubah** — `src/features/copilot/agui/aguiClient.ts` kini hard-fail bila runtime tak balas SSE; dengan Intelijen laluan run balas **JSON** (bukan SSE). `@copilotkit/react-core` ialah dependency tetapi **tidak diimport** di mana-mana dalam `src/` ⇒ tiada provider auto-detect, tiada websocket `joinToken`, tiada `useThreads`/`useMemories` | `/backend/runtime-endpoints`, `/intelligence/quickstart` |
| B6 | lindungi `threads/events` + `threads/state` dengan ownership check sendiri (Intelijen **tidak** skop dua route itu) | `/auth` |
| B7 | `GET /threads` kini **perlu** parameter `agentId` (tanpa ⇒ 400) | `/backend/runtime-endpoints` |

### Fasa C — tangkap bukti
| # | Langkah | Siapa |
|---|---|---|
| C1 | `curl -s http://localhost:3010/api/copilotkit/info` ⇒ `mode:"intelligence"`, `threadEndpoints.*=true`, `inspectorMetadata:true`, `runtimeEntitlements.status:"ready"` | 🤖 |
| C2 | hantar satu mesej sebenar ⇒ thread muncul di Inspector → Rich Threads **dan** dalam project cloud | 🤖 + 🧑 |
| C3 | `npx copilotkit@latest verify --round-trip --json` ⇒ **semua check PASS** (UNKNOWN bukan PASS) | 🤖 |
| C4 | isi `activation-decisions.json`: `offeringEvidenceUrl` (URL thread cloud), `verifiedAt`, `accountOwnerRef` (`clerkOrgId`), `authorizationRef` (versi agreement), `feeComponents` (plan) | 🤖 |
| C5 | CPK-03: browser → project → **Learning** → Create Learning container (stable id) | 🧑 |
| C6 | CPK-03: Automatic Learning jalankan **harian** (default 02:00 UTC) dan perlu **15 eligible threads** dahulu | 🧑 |

### Fasa D — Slack / Teams (EXT-04)
| # | Langkah | Siapa |
|---|---|---|
| D1 | Intelligence → project → **Channels → Add channel**; set Display name + **Code** | 🧑 |
| D2 | Slack: "From a manifest" → OAuth & Permissions → **Install to Workspace** → `xoxb-…` → Signing Secret ke Intelijen → `/invote @app` | 🧑 + 🌐 |
| D3 | Teams: jalankan command wizard, upload `<channel>-teams-app.zip` dari **target team** (bukan personal Apps) | 🧑 + 🌐 |
| D4 | dalam folder listener: `login` + `project select`; set `CPK_INTELLIGENCE_API_KEY`, `CHANNEL_CODE` | 🤖 |
| D5 | tulis listener (`@copilotkit/channels` + `@copilotkit/runtime`, Node 22+, host berpanjangan), `createChannel({ name, identifyUser:"platform", agent })`, `channels.ready({ timeoutMs: 30_000 })`, `channels.status().overall === "online"` | 🤖 |
| D6 | bukti sebenar: mention sebenar dalam channel + DM ⇒ "A response in the real workspace validates the Slack token pair, Intelligence delivery, gateway listener, AG-UI agent, and reply path end to end." | 🧑 |

### Fasa E — EXT-03 / EXT-06
| # | Langkah | Siapa |
|---|---|---|
| E1 | EXT-03: pilih — Product Analytics (Intelligence) atau event capture OSS (sudah ada) | 🧑 |
| E2 | EXT-06: **tidak perlu akaun Intelijen** — hanya kredensial STT. alternately: pasang `transcriptionService` pada runtime, atau kekalkan voice browser-sahaja dan **betulkan teks gate** (bukan `INTELLIGENCE_ACCOUNT_AND_TERMS_REQUIRED`) | 🤖 + 🧑 |

---

## 4. Perkara yang docs tidak nyatakan (jangan diteka)
- Tiada konsep "activation evidence"/"activation receipt" dalam docs CopilotKit.
- `activateChannels: false` dalam `api/copilotkit.ts` — **tidak didokumentasikan** di mana-mana page yang dibaca.
- Prefix tepat route memory REST relatif kepada `basePath` (`/memories/…` vs `/api/memories`) — dua bentuk muncul, tidak didokumentasikan.
- Plan tier mana yang meluluskan Channels — `/intelligence/plans` tidak senaraikan Channels.
- Tiada mod "zero-cloud-spend" untuk Intelijen; nearest = plan Developer percuma + penilaian lokal (macOS sahaja — **tidak jalan di Windows**).
