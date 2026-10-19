# ABANGCOLEK — Seven Generative UI Approaches

Tarikh: 19 Oktober 2026. Status: Kontrak sasaran GUI-01..07, belum implemented/verified. Authority: [master blueprint v2.3](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md).

## Pilihan yang telah ditetapkan

Gunakan Google ADK Python melalui AG-UI dan TypeScript CopilotKit v2 runtime. React/Vite kekal. Pakai komponen ABANGCOLEK, data canonical serta renderer/schema yang disahkan dalam pinned packages. Jangan gunakan Built-in Agent hanya kerana halaman contoh generik menggunakannya. Tiada dynamic schema secondary-model inference.

| ID | Use case dan implementasi sasaran | Acceptance |
|---|---|---|
| GUI-01 Display Only | Kad order, expiry, margin dan komisen tanpa callback mutasi | Server projection/revision; tiada angka rekaan; empty/error/loading states; redaction |
| GUI-02 Interactive | Product picker, input simulation dan draft review; frontend tool melalui AGUIToolset | Callback schema, keyboard/focus, cancel dan duplicate click; tiada bypass domain approval |
| GUI-03 Tool Rendering | Paparkan queued/running/succeeded/failed/unknown berdasarkan event dan receipt | Malformed tool output ditolak; replay render sahaja; partial/error tidak digambarkan berjaya |
| GUI-04 State Rendering | Selected order, filter, draft state dan workflow progress | Thread/user/workspace isolation, schema/revision, reset selepas switch; client tidak spoof paid/role/price |
| GUI-05 MCP Apps | First-party read-only Operations Brief App menggunakan data minimum daripada registry | Tools mempunyai UI resources; runtime/renderer negotiated; iframe sandbox/CSP dan origin/message validation; tiada credentials di UI resource; scoped data sahaja |
| GUI-06 A2UI | Fixed Schema JSON untuk Operations Brief dan Refund Impact panels, data diisi oleh query/evaluator | Catalog allowlist, size/depth limits, unknown component ditolak, stable IDs, cancel/replay; dynamic injection disabled dan tiada auxiliary paid calls |
| GUI-07 Your Components | Adapter kepada cards/panels/forms ABANGCOLEK untuk semua surface | Theme/light-dark, mobile, keyboard, reduced motion dan BM/English; component props schema dan source data sama |

## Fail dan boundary

Frontend: `src/features/copilot/cards/`, `interactive/`, `tool-rendering/`, `state-rendering/`, `mcp-apps/`, `declarative/`, `components/`. Create hanya apabila implementasi wujud; jangan salin design system kedua. Interface framework dipisah daripada komponen pure.

Server: `server/agents/copilot/runtime.ts`, `server/agents/tools/registry.ts`, `server/agents/mcp/operations-brief.ts` dan `server/agents/mcp/ui-resource.ts`. First-party MCP endpoint berada di runtime service `/api/copilot-mcp`; ia berautentikasi dan tidak menjadi unrestricted tool proxy. Browser/resource tidak menerima service-role key atau grant server-to-server. SDK bridge/token exchange mesti mengikuti kontrak rasmi pinned version dan diuji.

Python: fixed-schema surfaces pada `agents/google-adk/ui_surfaces.py`, state adapters pada `sessions.py`. Semua actions kembali kepada canonical authorization; A2UI state hanya projection, bukan authority.

## Sumber dan verification

- [Display Only](https://docs.copilotkit.ai/generative-ui/display), [Interactive](https://docs.copilotkit.ai/generative-ui/interactive): halaman generik berlabel Built-in Agent; semak adapter ADK.
- [Tool Rendering](https://docs.copilotkit.ai/google-adk/generative-ui/tool-rendering), [State Rendering](https://docs.copilotkit.ai/google-adk/generative-ui/state-rendering).
- [MCP Apps](https://docs.copilotkit.ai/google-adk/generative-ui/mcp-apps), [A2UI](https://docs.copilotkit.ai/google-adk/generative-ui/a2ui), [Your Components](https://docs.copilotkit.ai/google-adk/generative-ui/your-components).

Fail/endpoint ialah destinasi yang diputuskan, bukan bukti sudah wujud. Capture GUI-01..07 melalui synthetic protocol tests dan browser journeys sebelum live activation. Intelligence history/replay ialah gate tambahan; local render tidak membuktikan cross-device restoration.
