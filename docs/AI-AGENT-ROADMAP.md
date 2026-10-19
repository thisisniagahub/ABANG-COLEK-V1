# ABANGCOLEK — Operations Copilot roadmap

Diselaraskan: **19 Oktober 2026**. Status: **PLANNED**. [Blueprint v2.3](ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md), [architecture](AI-AGENT-ARCHITECTURE.md), [pelan terperinci](superpowers/plans/2026-10-19-copilotkit-ten-features.md) dan [prompts](prompts/README.md) menentukan urutan. Tidak ada checkbox lulus melalui kemas kini Markdown ini.

## 0. Baseline dan safety

- [ ] Rekod HEAD/branch/dirty manifest, runtime identity dan data selectors; preserve kerja orang lain.
- [ ] Petakan agent ABANGCOLEK-OS/custom Copilot kepada canonical tools.
- [ ] Ganti angka margin/confidence tetap dan provider/success fallback palsu.
- [ ] Buktikan role/resource checks, CSRF, redaction, payload/deadline limits.
- [ ] Bezakan ledger CAS, ADK sessions dan external durable intent/outbox.

## 1. Integrasi dan free-only routing

- [ ] Gunakan versi/stack tetap dalam master/prompt; semak compatibility sebenar sebelum lockfile. Pin registry bukan runtime proof.
- [ ] TypeScript CopilotRuntime + AG-UI + Google ADK Python service; kekalkan React/Vite/Bun.
- [ ] Exact-model allowlist dan account/data/cost verification TTL maksimum 24 jam; stale -> disabled.
- [ ] Benchmark minimum 60 kes sintetik BM/English/tools/grounding/safety mengikut free-only policy.
- [ ] No paid fallback/overflow; semua provider gagal -> labeled local rules/unavailable.

## 2. Founder pilot dan empat ciri asas

- [ ] Chat + Headless UI: Workspace/Pet berkongsi thread/run, cancel/timeout/deduplication.
- [ ] Frontend tools: navigate/filter/highlight/draft allowlist.
- [ ] Shared state: minimum projection, fresh revision/scope, clear on logout/revocation.
- [ ] Phone/tablet/desktop, keyboard, reduced motion dan voice text fallback.

## 3. Generative UI dan human approval

Kontrak khusus: [7 pendekatan Generative UI](design/copilot-generative-ui-seven-approaches.md).

- [ ] Display Only, Interactive, Tool Rendering, State Rendering dan Your Components dengan data canonical.
- [ ] Declarative catalog + fixed-schema A2UI; arbitrary HTML/code/URL ditolak.
- [ ] First-party read-only MCP App, tool/UI resources allowlist dan sandbox.
- [ ] Approval -> fresh authorization -> durable command/receipt; stale/rejected/expired/replayed negative tests.
- [ ] Margin, partial refund dan cumulative commission/loyalty reversal deterministic.

## 4. Semua modul dan capabilities

- [ ] MOD-01 Storefront & katalog; MOD-02 Orders & tracking.
- [ ] MOD-03 Inventory; MOD-04 QC & JEV.
- [ ] MOD-05 Dealer & komisen; MOD-06 Loyalty & referral.
- [ ] MOD-07 Marketing; MOD-08 Finance & day-close.
- [ ] MOD-09 Tasks, documents & SOP; MOD-10 Automations & integrations.
- [ ] ADV-01..32 mengikut registry; setiap modul/tool mempunyai provenance, missing-data, negative scope dan workflow acceptance.

## 5. Sub-agents dan optional Intelligence

- [ ] Commerce Reader, QC/JEV Reviewer, Marketing Drafter: bounded delegation/subset grants/shared parent budget.
- [ ] Native JEV disabled sehingga free-production/data/eval gates; LOCAL_RULES kekal jujur.
- [ ] AG-UI Streams hanya apabila Intelligence cost/data/entitlement gate lulus; replay tidak execute mutation.
- [ ] Automatic Learning: reviewed/versioned skills; tiada autonomous financial policy update.
- [ ] Jika gate belum lulus, dua ciri Intelligence `blocked_external`; jangan label mock/custom alternatif sebagai integrasi rasmi siap.

## 6. Release dan definition of done

- [ ] Lint, platform tests, build dan isolated browser journeys mengikut release runbook.
- [ ] Local + cloud CAS, cross-request persistence, private evidence dan unknown-outcome/outbox tests.
- [ ] Exact SHA/dirty manifest, command/output/date/environment dan actual provider/model/cost receipt.
- [ ] Preview/production mengikut autorisasi aktif; backup/restore dan rollback dibuktikan berasingan.
- [ ] Laporan berasingan: 10 ciri, 10 modul, 32 capabilities, 7 UI approaches; status planned/implemented/verified_local/verified_production/blocked_external.

Skills ialah panduan, MCP/plugin presence bukan connection proof. Tiada pemasangan servis/langganan automatik. Semua pilihan implementasi telah ditetapkan dalam prompt induk; missing credentials/entitlements dilapor blocked_external, bukan alasan mereka source atau kos palsu.
