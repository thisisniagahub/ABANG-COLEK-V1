# Prompt 04 — Tujuh Generative UI Approaches dan Bounded Subagents

Baca [kontrak utama](IMPLEMENT-ABANGCOLEK.md), [GUI contract](../design/copilot-generative-ui-seven-approaches.md), ten-feature Tasks3–6 dan checkpoint03. Pilihan protocol dan specialists telah ditetapkan.

## Pelaksanaan tetap

1. Write failing tests untuk malformed tool result, unknown UI component/action, oversized/deep JSON, source revision mismatch, fake amount/confidence dan unsafe markup.
2. GUI-01: read-only canonical cards. GUI-02: structured interactive callbacks untuk selection/draft dan founder review; tiada callback label success tanpa domain receipt.
3. GUI-03: render real tool events dan canonical result/error/unknown states. Replay hanya render; jangan execute tool semula.
4. GUI-04 dan CPK-08: scoped state projection selected order/filter/draft. Reset pada user/workspace/thread switch; client tidak menulis authority paid/price/role. ADK context parsing mengikut wire contract rasmi, bukan type assumption client.
5. GUI-05: first-party Operations Brief MCP App pada runtime `/api/copilot-mcp`. Implement MCP tool+UI resources dengan SDK pin ADR, auth/scoped projection, iframe sandbox, CSP, origin/message validation dan no credential forwarding ke resource. Tiada arbitrary third-party URL/server registration.
6. GUI-06: Fixed Schema A2UI panels Operations Brief dan Refund Impact; use approved component catalog. Explicit disable dynamic schema/secondary-model injection. Test emitted operations/protocol dengan pinned ADK adapter dan React renderer.
7. GUI-07: reuse ABANGCOLEK components/styles, mobile/light-dark/keyboard/reduced-motion. Tiada replacement design system.
8. CPK-07: route/filter/highlight/draft frontend tools allowlist; tiada eval/arbitrary HTTP/cookie-reading generik.
9. CPK-06: approval payload hash/revision/expiry, strict input decision schema, revalidation execution, reject/expire/stale/CAS/retry. Durable receipt diperlukan; unknown effect direconcile. Jangan gunakan Boolean coercion input arbitrary.
10. CPK-10: parent `abangcolek_ops` hanya delegate kepada `commerce_reader`, `qc_jev_reviewer`, `marketing_drafter`. Depth1/concurrency2/max3 specialist calls dan shared budgets. Child tidak menerima grant lebih luas; actual delegation trace tanpa reasoning dalaman.

## Fail dan acceptance

Ikut proposed frontend/runtime/Python paths dalam GUI contract; label tests `GUI-01..07`. Tambah Python subagent tests dan TS schema/state/approval tests. Playwright meliputi semua tujuh pendekatan, thread switch, keyboard/mobile, denied data access, malformed UI resource/message dan duplicate events.

Gunakan fixture sintetik yang dilabel, kemudian satu live allowed tool journey selepas provider gates. Sahkan user-selected component callback tidak dianggap approval kewangan secara tersirat. Review TypeScript/Python/security dan update capability matrix. Jika SDK MCP/A2UI tidak compatible, disabled row dengan exact evidence; jangan mengganti sekadar HTML card lalu claim protocol pass. Update checkpoint05.
