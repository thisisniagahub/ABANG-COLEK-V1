# ABANGCOLEK — Prompt Pack

Tarikh: 19 Oktober 2026. Authority: [master blueprint v2.3](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md). Semua prompt ialah arahan implementasi masa hadapan, bukan receipt siap.

**Mula dengan [IMPLEMENT-ABANGCOLEK.md](IMPLEMENT-ABANGCOLEK.md).** Ia copy-ready dan menetapkan urutan, keputusan, skills, MCP/plugin fallbacks, tests, evidence dan blocked behavior. Jangan menjalankan prompt lama daripada archive atau historical reports.

| Urutan | Prompt fasa | Hasil |
|---|---|---|
| 00 | [Baseline](00-baseline.md) | Inventori, verification baseline, compatibility dan capability availability |
| 01 | [Structure](01-structure.md) | Moves berperingkat dan dependency enforcement |
| 02 | [Copilot foundation](02-copilot-foundation.md) | Runtime/agent/identity/provider/Chat/Headless |
| 03 | [Domains and tools](03-domains-and-tools.md) | Financial gaps, 10 modul dan 32 logical capabilities |
| 04 | [UI and agents](04-ui-and-agents.md) | GUI-01..07, shared state, frontend tools, HITL dan subagents |
| 05 | [Intelligence](05-intelligence.md) | CPK-02/03 jika gate dipenuhi; explicit blocker jika tidak |
| 06 | [Release](06-release.md) | Full verification, recovery, preview dan release readiness |

Urutan execution wajib ialah **00 -> 03A integriti -> 01 struktur -> 02 foundation -> 03B tools -> 04 -> 05 -> 06**, selaras integrity-first blueprint. Nombor fail bukan alasan mendahulukan folder move daripada pembetulan integriti. Semua fasa wajib membaca prompt utama sebagai kontrak bersama. Fasa boleh disambung dalam sesi baharu dengan checkpoint tepat; ia bukan pilihan menu architecture.
