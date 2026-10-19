# ABANGCOLEK — Operations Copilot architecture

Diselaraskan: **19 Oktober 2026**. Status: **TARGET_DESIGN**, bukan runtime receipt. [Master Blueprint v2.3](ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) menentukan kontrak bisnes. [10 ciri](design/copilotkit-ten-features.md), [32 logical capabilities](design/copilot-advanced-tools.md), [free-only policy](research/2026-10-19-free-model-policy.md) dan [prompts](prompts/README.md) ialah spesifikasi pelaksanaan bersama.

## Baseline dan sasaran yang diputuskan

React/Vite dan Bun domain backend dikekalkan. Agent ABANGCOLEK-OS sedia ada dipetakan kepada canonical tools; jangan mount semula financial actions legacy berasaskan browser store. Class custom `server/platform/adkAgent.ts`, nama framework dan SSE custom tidak membuktikan integrasi SDK rasmi. Kad margin/confidence tetap perlu diganti hasil domain sebenar atau `insufficient_data`.

```text
React Workspace + Pet / CopilotKit React and headless hooks
  -> authenticated TypeScript CopilotRuntime on Bun
  -> HttpAgent / AG-UI -> Google ADK Python service
  -> scoped canonical tool gateway -> Bun domain commands
  -> SQLite local OR authoritative Supabase snapshot CAS cloud commit
```

Agent Python ialah servis berasingan, bukan migrasi seluruh aplikasi kepada Python/Next.js. ADK sessions menyimpan thread/run; commerce ledger berasingan. Jangan kekalkan transaksi SQLite merentas model/network await atau melepaskan success sebelum durable commit. Hosting long-lived agent/streams mesti dibuktikan; Vercel request bukan daemon kekal. Founder pilot didahulukan sebelum role lain.

## Liputan wajib

| Ciri | Kontrak ABANGCOLEK |
|---|---|
| Chat | Scoped records, grounded answer, source dan missing-data |
| AG-UI Streams | Intelligence entitlement/data/cost gate; saved UI/reconnect bukan execution recovery automatik |
| Automatic Learning | Completed run -> skill candidate -> human review -> version -> publish |
| Generative UI | Output canonical; tiada angka rekaan |
| Declarative UI | Catalog komponen dan validated schema |
| Human-in-the-loop | Proposal, approval dan execution/receipt berasingan |
| Frontend tools | Navigate/filter/highlight/draft allowlist |
| Shared state | Selected record/filter/draft; bukan authority bayaran/stok |
| Headless UI | Workspace/Pet berkongsi thread dan run tanpa duplicate |
| Sub-agents | Commerce Reader, QC/JEV Reviewer, Marketing Drafter; subset grants dan shared budget |

Sepuluh modul wajib: Storefront & katalog; Orders & tracking; Inventory; QC & JEV; Dealer & komisen; Loyalty & referral; Marketing; Finance & day-close; Tasks/documents/SOP; Automations & integrations. Uji MOD-01..10 secara berasingan daripada ciri CopilotKit. ADV-01..32 ialah 32 logical capabilities; specialization tidak menambah kiraan tanpa registry revision.

Tujuh pendekatan Generative UI wajib dipetakan: Display Only, Interactive, Tool Rendering, State Rendering, MCP Apps, A2UI dan Your Components. Gunakan komponen ABANGCOLEK sendiri, fixed-schema A2UI dan first-party read-only MCP App untuk pilot. Dynamic layout/model tambahan disabled; remote MCP Apps bukan blanket permission. Callback interactive mesti reauthorize server-side. Setiap pendekatan mempunyai schema, error/unknown state, permission dan acceptance berasingan.

## Authority dan execution

```text
session -> fresh principal/membership -> capability + resource scope
 -> query/simulation/draft -> immutable proposal + required approval
 -> recheck revision/policy/idempotency -> domain command
 -> durable commit -> receipt
```

Customer hanya rekod sendiri; dealer approved organization sendiri; staff assigned outlet/work; founder capability khusus; developer diagnostics tidak memberi financial authority. Agent bukan role baharu. Prompt, confidence, shared state dan subagent tidak menaikkan kuasa.

Registry: Q query, S simulation, D draft/proposal, C command dan X external effect. Model tidak mendapat arbitrary SQL/filesystem/shell/HTTP/eval. Approval terikat payload/revision/policy/expiry; perubahan payload memerlukan approval baharu. Timeout/unknown memerlukan reconciliation sebelum retry. External effects memerlukan durable intent/outbox dan provider idempotency; local lock sahaja tidak selamat merentas cloud instances. Semua monetary calculations deterministic integer sen dan related writes satu unit transaksi.

## Provider dan kos

Free-only meliputi chat, tools, subagents, evaluators, embedding, title, summary, vision dan voice. Exact allowlist, account eligibility, zero applicable charge, data terms, deadline dan shared run budget wajib. BYOK bukan percuma; trial/NVIDIA/Manus/built-in fallback tidak diaktifkan secara automatik. Provider gagal -> qualified free fallback -> `local_rules` atau `unavailable` dengan actual mode/provider/model. Tiada paid fallback/billable overflow. Intelligence ialah gate servis/kos/data berasingan; dua ciri kekal `blocked_external` jika tidak layak.

## JEV, knowledge dan UX

`server/platform/jev/assessment.ts`, `policyEngine.ts` dan `evaluations.ts` ialah source local rules/policy semasa. `LOCAL_RULES` tidak mempunyai calibrated model probability. Foto evidence bukan vision analysis. Native TypeSafe ialah optional disabled extension sehingga free-production entitlement, privacy, transport dan evaluation dibuktikan. JEV triage/abstention bukan refund approval. Dokumen/SOP/memory ialah untrusted content dengan source/version/scope/retention.

Phone satu column/safe-area composer, tablet two-pane, desktop split; kekalkan light/dark, keyboard/focus, reduced motion dan accessible status. Pet/voice optional dengan microphone permission, stop/mute dan text fallback. Tiada secrets dalam DOM/localStorage/URL.

## Verification

Aliran minimum: login -> scoped order -> canonical card -> proposal -> approval -> execution -> committed receipt. Uji cross-scope/revocation, prompt injection, stale payload, replay, CAS conflict, provider timeout dan unknown outcome. Rekod commit+dirty manifest, commands, environment, date/results dan limitations. Tiada test/deployment baharu dilaporkan melalui dokumen ini.

Baca `.agents/skills/copilotkit/SKILL.md` dan official docs sebelum API code. Gunakan skill TDD/security/review/verification yang tersedia; MCP/plugin mesti callable/authenticated, bukan dianggap aktif melalui nama dalam AGENTS.
