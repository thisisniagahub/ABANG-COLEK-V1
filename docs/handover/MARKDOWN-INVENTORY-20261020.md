# ABANGCOLEK — Inventori Markdown 20 Oktober 2026

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Inventori dokumentasi bertarikh; bukan certification semua fungsi aplikasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

## Scope dan kiraan

Inventori checkout utama merangkumi **489 fail Markdown**, termasuk **188 dokumen milik projek** yang diselaraskan. **236 skill/vendor**, **63 agent coordination**, **1 generated cache** dan **1 transkrip peribadi** dipelihara byte-identical. **314 fail** di nested checkout berasingan `.kilo/worktrees` turut dihash dan tidak diubah; ia tidak dikira semula sebagai dokumen checkout utama.

Sumber carian ialah `rg --files --hidden --no-ignore -g '*.md'` dengan pengecualian dependency `node_modules`/venv, Git internals, build/runtime/media dan nested worktree yang diinventori berasingan. `outputs`, nota `.work/rea` dan roster `.kilo/agents` termasuk dalam scope. Frontmatter empat roster tidak diubah; context notice tidak mengaktifkan agent. Fail protected tidak ditulis semula sebagai spesifikasi bisnes.

Snapshot preimage dan SHA-256 penuh: `D:/ABANGCOLEK-WORKTREES/codex-takeover-control-20261020/documentation-alignment/before` dan `before.json`. Hash akhir dan hasil validation berada dalam [machine receipt](../../reports/documentation-alignment-20261020.json). Prefix hash di bawah untuk bacaan ringkas; hash bagi artifak yang menerangkan dirinya sendiri hanya disimpan dalam receipt akhir bagi mengelak self-reference.

## Setiap fail checkout utama

| Path | Peranan | Tindakan | SHA-256 selepas (prefix) |
|---|---|---|---|
| `.agents/skills/channels-setup/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 27e3a86144796519 |
| `.agents/skills/copilotkit-channels/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7d417ac4050c98f9 |
| `.agents/skills/copilotkit-channels/sources.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4f355a33b8edc915 |
| `.agents/skills/copilotkit-cli/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 6e239419878b4e6f |
| `.agents/skills/copilotkit/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 6a0b7d6bce1a9bb9 |
| `.agents/skills/inspector-docs/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | adaf2eaa060f1208 |
| `.agents/skills/inspector-docs/references/pane-map.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 8989a7991f58698d |
| `.agents/skills/inspector-workbench/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fd0a77e7e5d4651a |
| `.agents/skills/intelligence-docs/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0b60de8248cebe62 |
| `.agents/skills/intelligence-vocabulary/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b82b31b523266d60 |
| `.agents/skills/intelligence-vocabulary/references/words.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f844029c5ec76e4f |
| `.agents/skills/setup-slack-channel/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 37cca1a6a69d0816 |
| `.agents/skills/setup-slack-channel/references/intelligence-channel.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 8f85478ce5b25a6d |
| `.agents/skills/setup-slack-channel/references/local-runtime.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 80c1f4f4e75b6ca3 |
| `.agents/skills/setup-slack-channel/references/optional-e2e.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 47c82b66c5775882 |
| `.agents/skills/setup-slack-channel/references/secrets-and-credentials.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f94f6a2574c03714 |
| `.agents/skills/setup-slack-channel/references/slack-workspace-and-app.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 40b1c8a2e8efb55d |
| `.agents/skills/setup-slack-channel/references/troubleshooting.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 507ed5b272680a3f |
| `.agents/teamwork/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4343a2cab5873709 |
| `.agents/teamwork/ORIGINAL_REQUEST.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fbe1e548be238022 |
| `.agents/teamwork/explorer_1/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4719626c0c91a617 |
| `.agents/teamwork/explorer_1/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3c8820dd142d6173 |
| `.agents/teamwork/explorer_1/analysis.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 1656e28e45e1e99a |
| `.agents/teamwork/explorer_1/handoff.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 52492d38cc76368b |
| `.agents/teamwork/explorer_1/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b543a10370cd1dc8 |
| `.agents/teamwork/explorer_2/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3b8911f1f4c8ec95 |
| `.agents/teamwork/explorer_2/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 2bff083e4c4507ed |
| `.agents/teamwork/explorer_2/analysis.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 89770a569974a29d |
| `.agents/teamwork/explorer_2/handoff.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f4f530a0550e563b |
| `.agents/teamwork/explorer_2/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7e309c13c3cd0a49 |
| `.agents/teamwork/explorer_m1_1/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 937cf920fdc945bf |
| `.agents/teamwork/explorer_m1_1/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 88b48914b22b19ba |
| `.agents/teamwork/explorer_m1_1/analysis.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b0bba06de1e72705 |
| `.agents/teamwork/explorer_m1_1/handoff.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 80aa00dcb8db5db4 |
| `.agents/teamwork/explorer_m1_1/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 5b69353f60d09cb3 |
| `.agents/teamwork/explorer_m1_2/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4c6e6bfe2f5c2330 |
| `.agents/teamwork/explorer_m1_2/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 6e374e9ba3c85302 |
| `.agents/teamwork/explorer_m1_2/analysis.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 1643fc8208adda42 |
| `.agents/teamwork/explorer_m1_2/handoff.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | ed3dd5441e11468b |
| `.agents/teamwork/explorer_m1_2/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 6f4c715e8489c2d5 |
| `.agents/teamwork/explorer_m1_3/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 5d434146878de190 |
| `.agents/teamwork/explorer_m1_3/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0034d8b537485561 |
| `.agents/teamwork/explorer_m1_3/analysis.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 672c0e8568dc2508 |
| `.agents/teamwork/explorer_m1_3/handoff.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | a2f2bcd18f0eb646 |
| `.agents/teamwork/explorer_m1_3/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d354359423a49255 |
| `.agents/teamwork/explorer_m2_1/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 97ac360a200df424 |
| `.agents/teamwork/explorer_m2_1/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c18d7f3570b0009a |
| `.agents/teamwork/explorer_m2_1/context.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d9176936cf1404dc |
| `.agents/teamwork/explorer_m2_1/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | ac2f9495da8d3aa4 |
| `.agents/teamwork/explorer_m2_2/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 86a485bb1775c093 |
| `.agents/teamwork/explorer_m2_2/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 47acf652b14214f6 |
| `.agents/teamwork/explorer_m2_2/context.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | db15ecc58dc06e54 |
| `.agents/teamwork/explorer_m2_2/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b8d08f88a5b3da4d |
| `.agents/teamwork/explorer_m2_3/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4ad17ec745ffd1a6 |
| `.agents/teamwork/explorer_m2_3/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e598361cdb4764c5 |
| `.agents/teamwork/explorer_m2_3/context.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7dff6836c9467900 |
| `.agents/teamwork/explorer_m2_3/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | a26e9da6596ebec3 |
| `.agents/teamwork/orchestrator_1/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | ab04f63ff32bd763 |
| `.agents/teamwork/orchestrator_1/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3a9c562bdc97b89f |
| `.agents/teamwork/orchestrator_1/PROJECT.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7bbb493607e4406f |
| `.agents/teamwork/orchestrator_1/TEST_INFRA.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4c62065eaf6acc48 |
| `.agents/teamwork/orchestrator_1/TEST_READY.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0dee152a26eb4c8f |
| `.agents/teamwork/orchestrator_1/context.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f1a7bb454efca1e7 |
| `.agents/teamwork/orchestrator_1/plan.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b49f5423be9d4f2e |
| `.agents/teamwork/orchestrator_1/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 9ba60a202cb826bb |
| `.agents/teamwork/orchestrator_2/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e03d2f6073f5b6fb |
| `.agents/teamwork/orchestrator_2/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0808bfcc089050a9 |
| `.agents/teamwork/orchestrator_2/PROJECT.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e344793c067359b7 |
| `.agents/teamwork/orchestrator_2/context.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e4c3b45fe86edd06 |
| `.agents/teamwork/orchestrator_2/plan.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7578078349cb9fa3 |
| `.agents/teamwork/orchestrator_2/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f65c50cefc733320 |
| `.agents/teamwork/sentinel/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f434c3d8c5dbeb96 |
| `.agents/teamwork/sentinel/handoff.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | bb9d14f61655d7d5 |
| `.agents/teamwork/spec_miner_1/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 675111c343185743 |
| `.agents/teamwork/spec_miner_1/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 96eb1dfcbd9dc671 |
| `.agents/teamwork/spec_miner_1/handoff.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 77cb7e6ca7d3e5b0 |
| `.agents/teamwork/spec_miner_1/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 1b8f90116ceeaa8a |
| `.agents/teamwork/spec_miner_1/spec_report.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 050a79216f791813 |
| `.agents/teamwork/worker_m1/BRIEFING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c34cf61c83413fe8 |
| `.agents/teamwork/worker_m1/DISPATCH.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 6e4a9a9544e9191b |
| `.agents/teamwork/worker_m1/progress.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 1d51054ff0758489 |
| `.kilo/agents/abangcolek-auditor.md` | session_notice_frontmatter_preserved | Diselaraskan; preimage disimpan | cee1a01a6bdf6da9 |
| `.kilo/agents/abangcolek-writer-backend.md` | session_notice_frontmatter_preserved | Diselaraskan; preimage disimpan | 66d490541423bfba |
| `.kilo/agents/abangcolek-writer-frontend.md` | session_notice_frontmatter_preserved | Diselaraskan; preimage disimpan | 08d1c067873f37c3 |
| `.kilo/agents/abangcolek-writer-tests.md` | session_notice_frontmatter_preserved | Diselaraskan; preimage disimpan | 6cf7bcb83f9699c8 |
| `.pytest_cache/README.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 73fd6fccdd802c41 |
| `.work/rea/emons-hero-evidence-notes.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 8b26e11cb08d69ac |
| `DESIGN.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | cfe056c641d80754 |
| `JEV.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | d9dc5804877b1d38 |
| `PROJECT-CHECKLIST.md` | current_checklist | Hash akhir dalam JSON receipt; self-reference dielak | receipt akhir |
| `README.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | cdab42b115028ebe |
| `agents/google-adk/DEPENDENCY-NOTES.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 90f756b963b48d6c |
| `agents/google-adk/README.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 52522183c1b24b51 |
| `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | 931b5b0fabe3fb17 |
| `docs/ABANGCOLEK-PLATFORM-ARCHITECTURE.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 7d39fcb7f0285a66 |
| `docs/ABANGCOLEK-SOURCE-OF-TRUTH.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | c74839be5e978e2b |
| `docs/AI-AGENT-ARCHITECTURE.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | 61455e08acccf31f |
| `docs/AI-AGENT-ROADMAP.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | 2c89d578d025d9fd |
| `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | d66c48fbb917dd71 |
| `docs/CURRENT-STATUS.md` | current_evidence_index | Diselaraskan; preimage disimpan | cb573c1a09811d63 |
| `docs/README.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 7fb70947e382cb46 |
| `docs/architecture/ABANGCOLEK-PLATFORM-ARCHITECTURE.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | dcb1ea74e0ed912c |
| `docs/architecture/AI-AGENT-ARCHITECTURE.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | 50039202c0b0c06a |
| `docs/architecture/AI-PROVIDER-FREE-MODELS-REGISTER.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | e024cc9f48572da8 |
| `docs/archive/legacy-oct2026/ABANGCOLEK-PLATFORM-STATUS-2026-10-16.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | cf67bb12391b470b |
| `docs/archive/legacy-oct2026/ABANGCOLEK_DISCOVERY_AND_PLAN.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 8e0d32aebbd27c4d |
| `docs/archive/legacy-oct2026/ABANGCOLEK_OS_UPGRADE_BLUEPRINT.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | d7aa7ba79d94e0c9 |
| `docs/archive/legacy-oct2026/AGY-MASTER-IMPLEMENTATION-PROMPT-20261019.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 61a2db963d859cc0 |
| `docs/archive/legacy-oct2026/AUDIT_TERPERINCI_KESELURUHAN_PROJEK_ABANGCOLEK_OS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 659c8493d3c2ff07 |
| `docs/archive/legacy-oct2026/AUDIT_TERPERINCI_REPO_ABANG_COLEK_ECOSYSTEM.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | e3b22c9835fea6fd |
| `docs/archive/legacy-oct2026/CADANGAN_PENAMBAHBAIKAN_DAN_TEMA_LOGO_ABANGCOLEK.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | f2825e840131ff93 |
| `docs/archive/legacy-oct2026/CARA_PENGOPERASIAN_SEPATUTNYA_ABANGCOLEK_OS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 829de4e014dab89c |
| `docs/archive/legacy-oct2026/FORENSIK_AUDIT_LENGKAP_REPO_ABANG_COLEK.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 79bfb8ff4b5257e4 |
| `docs/archive/legacy-oct2026/JEV_ARCH.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 503a0c3fc639f3c2 |
| `docs/archive/legacy-oct2026/JEV_ECOSYSTEM_AUDIT_REPORT.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 94f2196f5cefa214 |
| `docs/archive/legacy-oct2026/KATALOG_DAN_PANDUAN_SKILL_EJEN_AI.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 020b0a85783cc1ea |
| `docs/archive/legacy-oct2026/KEDUDUKAN_DAN_ARKITEKTUR_JEV_DALAM_PROJEK.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 8ded22bae9b7a364 |
| `docs/archive/legacy-oct2026/PANDUAN_COMMAND_PALETTE.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 937151b05d3693cf |
| `docs/archive/legacy-oct2026/PANDUAN_DAN_PEMASANGAN_SUPERPOWERS_DAN_JEV_SKILLS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 68a464a18ab604d1 |
| `docs/archive/legacy-oct2026/PROFILE_59_ATTESTATION.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 8ff8cdce400048fb |
| `docs/archive/legacy-oct2026/PROJECT-ALIGNMENT-BACKLOG.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 39dbab9b6afe6465 |
| `docs/archive/legacy-oct2026/REVIEW-2026-10-16.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 501045a981687b4b |
| `docs/archive/legacy-oct2026/REVIEW_HERMES_AGENT_DAN_DEEPSEEK_JEV_MERGE.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | f29241418602c179 |
| `docs/archive/legacy-oct2026/STITCH_ABANGCOLEK_SPEC.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | c71d5785996c535e |
| `docs/decisions/0001-project-authority-and-continuity.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 7f47803aeef2999f |
| `docs/decisions/0002-zero-new-spend-hosting-topology.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | b381c7ace3610488 |
| `docs/decisions/0003-blueprint-v23-execution-contract.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 291811125832e95d |
| `docs/design-qa.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 30561af2a26393c8 |
| `docs/design/brand-spec.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | 09d6861e38a3646b |
| `docs/design/copilot-advanced-tools.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | c9f6a0364d3969e6 |
| `docs/design/copilot-generative-ui-seven-approaches.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | 44fe7e850199ffce |
| `docs/design/copilotkit-ten-features.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | aba8b042b3f6cad8 |
| `docs/design/landing-page.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | 7f55bcddc54a9a30 |
| `docs/design/repository-structure.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | a5bc82b453f871b2 |
| `docs/design/workspaces.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | d7d66eb27dd2bae4 |
| `docs/handoffs/2026-10-18-continuation-prompt.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 81ab85a58c3a721a |
| `docs/handoffs/2026-10-19-blueprint-finalization-review.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | fd622d823a59d1a4 |
| `docs/handover/AGENT-HANDOVER-A-Z.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 48e593a512783e74 |
| `docs/handover/AGY-MASTER-IMPLEMENTATION-PROMPT.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | f2f99b3079de39fb |
| `docs/handover/CAPABILITY-MATRIX.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | f0ae88666cbc4314 |
| `docs/handover/COPILOT-DEPENDENCY-REQUESTS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | c5ff0439a7529766 |
| `docs/handover/COPILOT-FRONTEND-HANDOFF.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 15c2447d121eb129 |
| `docs/handover/IMPLEMENTATION-CHECKPOINT.md` | active_guide_or_prompt | Hash akhir dalam JSON receipt; self-reference dielak | receipt akhir |
| `docs/handover/MARKDOWN-ALIGNMENT-REGISTER.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | f21f46da65b49337 |
| `docs/handover/MARKDOWN-INVENTORY-20261019.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 13df9ed590528558 |
| `docs/handover/MARKDOWN-INVENTORY-20261020.md` | active_guide_or_prompt | Hash akhir dalam JSON receipt; self-reference dielak | receipt akhir |
| `docs/product/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | c90940ea7f8c559b |
| `docs/product/AI-AGENT-ROADMAP.md` | target_spec_with_current_authority | Diselaraskan; preimage disimpan | c46ce65f76e747b1 |
| `docs/production-release.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 3f6c5032145dca6f |
| `docs/prompts/00-baseline.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 02ba3aa4c6adf6dd |
| `docs/prompts/01-structure.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 1968087ae11cc069 |
| `docs/prompts/02-copilot-foundation.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 57f5d21c42f203aa |
| `docs/prompts/03-domains-and-tools.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | b2f913876fb4a943 |
| `docs/prompts/04-ui-and-agents.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | da423c3789a40f5f |
| `docs/prompts/05-intelligence.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | b1945e5c4a881946 |
| `docs/prompts/06-release.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 889d10a132a8fc2e |
| `docs/prompts/ACCEPTANCE-REGISTER.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | a9bece7b95d1a72d |
| `docs/prompts/AGENT-EXECUTION-CONTRACT.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | aad429be476f91d5 |
| `docs/prompts/CONTINUE-AGY-20261020.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | da5e04250d6b688f |
| `docs/prompts/CONTINUE-AGY-AUTONOMOUS-TEAMWORK-20261020.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | af220c92ec0f77ad |
| `docs/prompts/CONTINUE-MULTI-CLI-20261020.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 2bbf7124fd087b23 |
| `docs/prompts/IMPLEMENT-ABANGCOLEK.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | dfbf670643a7d3dc |
| `docs/prompts/README.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 01b9ee0480445522 |
| `docs/research/2026-10-19-free-model-policy.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 818648bee9f6c7a5 |
| `docs/research/2026-10-19-github-project-structure.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | f123a8bafb3511a0 |
| `docs/research/2026-10-20-antigravity-cli-power-setup.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 6dfa6f02bd3623cc |
| `docs/research/RESEARCH-DISPOSITION-MATRIX.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | c52ed5965da77c89 |
| `docs/runbooks/credential-revocation-audit.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 6b4b03fe828093c1 |
| `docs/runbooks/design-qa.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 4470249c2da25796 |
| `docs/runbooks/platform-recovery.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 752a71cce878ff6e |
| `docs/runbooks/production-release.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | a643523aad10408c |
| `docs/stitch_prompts/abang_colek_agent_restock_portal.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | b444ae3824397c03 |
| `docs/stitch_prompts/abang_colek_express_bus_cargo_tracker.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | adc2d346487f3267 |
| `docs/stitch_prompts/abang_colek_jev_social_intelligence.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 4fd40e11e2359540 |
| `docs/stitch_prompts/abang_colek_kiosk_storefront.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 51543d6fa02d6b97 |
| `docs/stitch_prompts/abang_colek_sovereign_command_hub.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | b833c4d6bbed6b31 |
| `docs/superpowers/plans/2026-10-02-platform-expansion.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 211b8165028f076d |
| `docs/superpowers/plans/2026-10-03-emons-live-scene-upgrade.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 7e6e4a129223f9ce |
| `docs/superpowers/plans/2026-10-03-emons-scroll-hero.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | ab100eb233a015c3 |
| `docs/superpowers/plans/2026-10-03-project-alignment.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 32e6409e08efa5bd |
| `docs/superpowers/plans/2026-10-04-all-tasks-implementation.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 25120085d3c00214 |
| `docs/superpowers/plans/2026-10-17-abangcolek-emons-landing-spec.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | a73e19f3d94f9342 |
| `docs/superpowers/plans/2026-10-17-abangcolek-emons-landing.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | fbebe216eea319e8 |
| `docs/superpowers/plans/2026-10-17-customer-commerce.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 4c0e8de82bd08659 |
| `docs/superpowers/plans/2026-10-17-reusable-rea-emons-deliverables.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | be463ca1bc4c43e5 |
| `docs/superpowers/plans/2026-10-18-production-release.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | e45f3d3170f5edc7 |
| `docs/superpowers/plans/2026-10-18-release-completion.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | fc1d501d2228c139 |
| `docs/superpowers/plans/2026-10-19-copilotkit-ten-features.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | cfed678d5abe71c9 |
| `docs/superpowers/plans/2026-10-20-agy-autonomous-handoff.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | c1dd2f62811a3437 |
| `docs/superpowers/plans/2026-10-20-blueprint-review-and-prompts.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | bc59d24870d4a375 |
| `docs/superpowers/plans/2026-10-20-current-documentation-alignment.md` | active_guide_or_prompt | Hash akhir dalam JSON receipt; self-reference dielak | receipt akhir |
| `docs/superpowers/plans/2026-10-20-multi-cli-implementation.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | aacaf7623ebd3231 |
| `outputs/ABANGCOLEK_BRAND_GUIDELINES_v1.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 1a37596db71115f3 |
| `outputs/ABANGCOLEK_PROJECT_REVIEW_2026-10-17.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | f620f0fde32e7ba8 |
| `outputs/ABANGCOLEK_REVIEW.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 4242ef22e331ffcb |
| `outputs/ABANGCOLEK_SOCIAL_CROSSPLATFORM_REVIEW.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | d2b3c56f1f89cca5 |
| `outputs/ABANGCOLEK_TIKTOK_FOUNDER_REVIEW.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | ba82808e2b8a1f17 |
| `outputs/EMONS_COMPONENT_README.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | baa52502ae7c40a4 |
| `outputs/EMONS_HERO_API_ASSET_INVENTORY.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | e7949098112e1ee3 |
| `outputs/EMONS_HERO_WCAG_AUDIT.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | a908279062ea302f |
| `outputs/EMONS_REA_ANALYSIS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | f51c6b7e7a48aca1 |
| `outputs/EMONS_UI_COMPONENTS_REA.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 419417258a0521a1 |
| `outputs/abangcolek-ecommerce-research.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 077a412e8255033c |
| `outputs/abangcolek-product-image-screening-2026-10-17.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 638db4efe8deeffc |
| `outputs/abangcolek-social-product-availability-2026-10-17.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | fc36b13d3f4cb7bf |
| `outputs/product-image-inventory-2026-10-17.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 9fe171f2b2e6a368 |
| `outputs/proposals/ABANGCOLEK-Founder-Business-Proposal-Blueprint-v23.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 6e8ee3c00fa9e62e |
| `outputs/proposals/NOTEBOOKLM-Founder-Slides-Brief-v23.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | e5a167fe8d0124ed |
| `outputs/review-manus-project-6CxpRnfGsjo3ptntsksiCf.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 0e1a01993d7b3e33 |
| `reports/APA_YANG_DIBANGUNKAN_ABANGCOLEK_OS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | a850519168b6ed64 |
| `reports/CODEX_REVIEW_MENYELURUH_ABANGCOLEK_OS_2026-10-01.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | eefd4b4ef7f16c8b |
| `reports/DASHBOARD_NEXT_LEVEL_2026-10-02.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 8fd0104690ac2cd3 |
| `reports/DASHBOARD_REFERENCE_REDESIGN_2026-10-02.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 1afdc3499bbaf323 |
| `reports/DASHBOARD_UI_UX_IMPLEMENTATION_2026-10-01.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 140fc2936ce2e978 |
| `reports/DELEGASI_JIMAT_TOKEN_AGY_HERMES_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | bf430b4bf4be6460 |
| `reports/DESIGN_QA_HERO_EMONS_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | b78355f1915b18e7 |
| `reports/FORENSIK_AUDIT_JEV_DAN_KOD_ABANGCOLEK_OS_2026.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | b9d28abc51f1061d |
| `reports/FORENSIK_AUDIT_LENGKAP_REPO_ABANG_COLEK.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 1dbfb02ece313fa1 |
| `reports/GLOBAL_THEME_SIDEBAR_IMPLEMENTATION_2026-10-02.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | c59e296fc432f769 |
| `reports/IMPLEMENTASI_HERO_EMONS_DAN_ASET_ASLI_ABANGCOLEK_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | ec214f52d7c9971e |
| `reports/INVENTORI_IMEJ_PRODUK_ABANGCOLEK_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 4c3693179e3c3d49 |
| `reports/JEV_ECOSYSTEM_AUDIT_REPORT.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 23c1a2511dbae834 |
| `reports/PLATFORM_EXPANSION_IMPLEMENTATION_2026-10-02.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 37c81e0148a09a43 |
| `reports/RECAP_SINTESIS_DAN_PELAKSANAAN_ABANGCOLEK_2026-10-02.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 753e8507d0974f5c |
| `reports/RESEARCH_DASHBOARD_WOW_FACTOR_RM300K_2026-10-01.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 1c29c7817a91061f |
| `reports/RESEARCH_PRODUK_SOSIAL_ABANGCOLEK_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 0826772c3ead7909 |
| `reports/REVIEW_GOOGLE_AI_STUDIO_ABANGCOLEK_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | be80c8d7a4871c7e |
| `reports/REVIEW_KONSEP_EMONS_DAN_LANDING_ABANGCOLEK_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 7b8e82c201c70a84 |
| `reports/REVIEW_LIVE_SCROLL_EMONS_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 374e3810d94eec3a |
| `reports/REVIEW_SHARED_CHAT_6AC065B1_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | ea5cd50ebdccff18 |
| `reports/SINTESIS_DAN_ALIGNMENT_ABANGCOLEK_2026-10-03.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 0470bdb55c63713b |
| `reports/audits/2026-10-20-acceptance-source-audit.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 0c1659c1ed122a7a |
| `reports/audits/2026-10-20-dependency-pin-resolution.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 295c31f7d1744c6e |
| `reports/audits/2026-10-20-double-check-findings.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 61247025a5978e40 |
| `reports/audits/2026-10-20-kilo-docs-self-review.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 27ba5ce978bd7213 |
| `reports/audits/2026-10-20-wave-plan-writers.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 1e9e73cad2853293 |
| `reports/blueprint-review-20261020-domain.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | ea73d19d52ce0460 |
| `reports/blueprint-review-20261020.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | d350a6be5a9c0a81 |
| `reports/documentation-alignment-20261019.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | d336203051b8e83a |
| `reports/documentation-alignment-20261020.md` | active_guide_or_prompt | Hash akhir dalam JSON receipt; self-reference dielak | receipt akhir |
| `reports/implementation/00-baseline.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 906fac021e459c57 |
| `reports/implementation/00-capability-availability.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | a2d3387d959cb7c6 |
| `reports/implementation/00-gate-review.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 5082572319ea7f17 |
| `reports/implementation/00-independent-review.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 0196e19a00ec6ebf |
| `reports/implementation/05-intelligence.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | cc6274ba63dc82bf |
| `reports/implementation/06-verification-release.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 6511eb32800b25ca |
| `reports/implementation/acceptance-evidence.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 4dd7eb5a236b927d |
| `reports/implementation/codex-typescript-problems-20261020.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | a8749e77c856905e |
| `reports/implementation/domain-policy-decisions.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 5bbf42e33b7ae35e |
| `reports/research/2026-10-02/01_GROK_BOT_OVERVIEW.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | bada7c9e1a54872c |
| `reports/research/2026-10-02/02_META_MUSE.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 0d7d5345e0fdc0ae |
| `reports/research/2026-10-02/03_OPENAI_INTRODUCING_DOTS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | ce43fe4fbebbac84 |
| `reports/research/2026-10-02/04_DEEPSEEK_HARNESS_QUICKSTART.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 9d23c66205c9e7c6 |
| `reports/research/2026-10-02/05_HERMES_AGENT_DOCS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 5ae36b8c45d4a9ed |
| `reports/research/2026-10-02/06_JEV_SYNTHESIS_ABANGCOLEK_OS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 7479009951f85dcf |
| `reports/research/2026-10-02/07_PELAN_UPGRADE_ABANGCOLEK_OS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 8580a01caaf9e74a |
| `reports/research/2026-10-02/08_WHATSAPP_FLOW_ZERO_COST.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 8704f79cedab627d |
| `reports/research/2026-10-02/09_PLATFORM_EXPANSION_ZERO_COST_MASTERPLAN.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 7653852a763ecff3 |
| `reports/research/2026-10-02/10_AGENT_STOKIS_BUSINESS_SYSTEM.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | a64b83a2bfa21021 |
| `reports/research/2026-10-02/11_MARKETING_SOCIAL_AUTOMATION_POSTIZ_AGENT_REACH.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 11e3c4d9150e5bd3 |
| `reports/research/2026-10-02/12_JEV_PLATFORM_CAPABILITY_PLAN.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | ae90663859e039de |
| `reports/research/2026-10-02/README.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 2ec8e6b8c27e4ee2 |
| `reports/reviews/2026-10-18/backend-boundaries.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 837be390a3ab0254 |
| `reports/reviews/manus-2026-10-18/REVIEW.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | af991f6894c26964 |
| `reports/reviews/manus-2026-10-18/referenced-local-report.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 693fdb13622345b8 |
| `reports/reviews/repository-2026-10-18/REVIEW.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | 1b86ecc9fff80df1 |
| `reports/ui-ux/2026-10-18/PRODUCTION_DIAGNOSIS.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | cb11a5f41ba2f172 |
| `reports/ui-ux/2026-10-18/UI_UX_REVIEW.md` | historical_context_or_dated_receipt | Diselaraskan; preimage disimpan | e2df5ed8033547a7 |
| `scripts/maintenance/fasa01/staged-move-plan.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 72e87b3fd3c4e28e |
| `session-ses_eb0a.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 995f4c12c566919b |
| `skills/STACK_PROFILES.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | a7052620ab1e6ce7 |
| `skills/architecture-design/api-design-and-versioning/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 87beca6ba2c3ae5e |
| `skills/architecture-design/api-gateway-configurator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 03e1cbc4489881fe |
| `skills/architecture-design/clean-architecture-scaffolder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0274620793568e8d |
| `skills/architecture-design/contract-first-api-development/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | cdbae38ecb8bb788 |
| `skills/architecture-design/distributed-system-patterns/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 1caa5b71435eefc6 |
| `skills/architecture-design/domain-driven-design-builder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 2b1adc30e67d25bf |
| `skills/architecture-design/event-driven-system-designer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 70b40779264ebc7a |
| `skills/architecture-design/hexagonal-architecture-builder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c2969917d227b4ba |
| `skills/architecture-design/microservices-architect/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3dda5ccda4dd23bb |
| `skills/architecture-design/modular-monolith-designer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 359beb251b3b0cf3 |
| `skills/architecture-design/monolith-to-microservices-migrator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 6bec62f8a84969d6 |
| `skills/architecture-design/multi-tenancy-architect/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4b0a2c019e329a27 |
| `skills/architecture-design/real-time-system-designer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 639640677ca2005a |
| `skills/architecture-design/serverless-architecture-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | be176b275710390f |
| `skills/architecture-design/system-design-documentation/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 15f433b2352fe30d |
| `skills/codegen-scaffolding/api-mocking-server/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 5e7b59413986588e |
| `skills/codegen-scaffolding/boilerplate-project-scaffolder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 37cef0f6720b3cee |
| `skills/codegen-scaffolding/cli-tool-builder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | bb84374380a02d4f |
| `skills/codegen-scaffolding/code-template-engine/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 78caec08d27379fc |
| `skills/codegen-scaffolding/component-library-creator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 47176a8b6a5f2aa1 |
| `skills/codegen-scaffolding/crud-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 5f1472400f34478a |
| `skills/codegen-scaffolding/database-schema-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e84d102b406df992 |
| `skills/codegen-scaffolding/dockerfile-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 510535c322323c50 |
| `skills/codegen-scaffolding/full-stack-feature-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 235846c72628b8be |
| `skills/codegen-scaffolding/github-actions-workflow/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c601b72c8bd1dbbb |
| `skills/codegen-scaffolding/graphql-schema-builder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 541453d3e28f9689 |
| `skills/codegen-scaffolding/mock-data-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fc89b51c09c37729 |
| `skills/codegen-scaffolding/openapi-code-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3e229752d7abaa15 |
| `skills/codegen-scaffolding/react-hook-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 87b4e8b471476d54 |
| `skills/codegen-scaffolding/terraform-module-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7253b87b86a15250 |
| `skills/data-analytics/analytics-dashboard-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | aab8b24ac1bd0f7c |
| `skills/data-analytics/cdc-pipeline/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7253429199c41a5f |
| `skills/data-analytics/data-catalog-creator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 8cb92bcdc13c1689 |
| `skills/data-analytics/data-lake-architecture/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 56694dc31ea78fed |
| `skills/data-analytics/data-mesh-implementation/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 340e27cade164e6f |
| `skills/data-analytics/data-pipeline-builder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7040d3c493121b85 |
| `skills/data-analytics/data-quality-framework/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 94d20491a8b8e64f |
| `skills/data-analytics/data-warehouse-designer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e38613b1ebc1561c |
| `skills/data-analytics/database-migration-orchestrator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0d2dbeb32f9d1b87 |
| `skills/data-analytics/feature-store-builder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f02a1241d1c07bdf |
| `skills/data-analytics/graph-database-modeler/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | bc79056c991a3a77 |
| `skills/data-analytics/ml-model-deployment/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e55a3fa158faf936 |
| `skills/data-analytics/sql-query-optimizer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 399c127b4eb22378 |
| `skills/data-analytics/stream-processing/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d9efa8628c2213ca |
| `skills/data-analytics/time-series-database/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7e8dc9eb1bebc47a |
| `skills/devops-infra/alerting-and-monitoring/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | a4a19cd90199dfde |
| `skills/devops-infra/build-optimization/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 6c00471dfc366a9c |
| `skills/devops-infra/ci-cd-pipeline-orchestrator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 99d46c3b3d3eb994 |
| `skills/devops-infra/cloud-migration/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 37c72543ab55958b |
| `skills/devops-infra/configuration-management/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 39a21d0465c92dc0 |
| `skills/devops-infra/container-orchestration/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fa155358dc870992 |
| `skills/devops-infra/cost-optimization/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c1d958dbeea6071a |
| `skills/devops-infra/database-administration-automation/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 95e88d3e53bdb224 |
| `skills/devops-infra/disaster-recovery-planner/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 5bee30ff0a07c7ac |
| `skills/devops-infra/gitops-workflow/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 931a938eaa95fba7 |
| `skills/devops-infra/infrastructure-as-code-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d03b09fef11545d9 |
| `skills/devops-infra/kubernetes-cluster-manager/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c502d76581e180a6 |
| `skills/devops-infra/logging-aggregation/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | a689ff38f452fe0a |
| `skills/devops-infra/multi-region-deployment/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f80f551530b253e5 |
| `skills/devops-infra/network-infrastructure/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 630dded516c87ae6 |
| `skills/devops-infra/observability-stack/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 9b2837ed3a4d5147 |
| `skills/devops-infra/rolling-update-strategies/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 75f46bcf84c77fa4 |
| `skills/devops-infra/secret-injection/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | dde455daeadb68d2 |
| `skills/devops-infra/serverless-framework/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fa62ac24711f1972 |
| `skills/devops-infra/service-mesh-configurator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3badac4b5e82cb41 |
| `skills/documentation-knowledge/api-documentation/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 9968cbdeff455afb |
| `skills/documentation-knowledge/architecture-decision-records/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c53b083ea703d18b |
| `skills/documentation-knowledge/changelog-automation/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 882bb17647bca92d |
| `skills/documentation-knowledge/code-comment-enricher/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 710d04af9935dc00 |
| `skills/documentation-knowledge/database-schema-documentation/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fd91684a71e8f962 |
| `skills/documentation-knowledge/dependency-graph-visualizer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c58ae53d5705eff7 |
| `skills/documentation-knowledge/diagram-as-code/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b221a25180018e71 |
| `skills/documentation-knowledge/incident-post-mortem/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 793c774e4aed8ea1 |
| `skills/documentation-knowledge/knowledge-base-builder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 539fb320c4889f02 |
| `skills/documentation-knowledge/living-documentation-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c600a8ba306a0bdd |
| `skills/documentation-knowledge/onboarding-guide-creator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 397b1bc3cd4df89b |
| `skills/documentation-knowledge/performance-baseline-documentation/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f99cc9822db79c5d |
| `skills/documentation-knowledge/readme-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 39dddbce1361ba50 |
| `skills/documentation-knowledge/runbook-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | cd4d44cdc4401777 |
| `skills/documentation-knowledge/tutorial-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b2317bdde972d5a6 |
| `skills/jev-core/agentic-levels/jev-10-levels-agentic-engineers/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | acd873aa2c77c7e2 |
| `skills/jev-core/agentic-levels/jev-advanced-use-cases/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e7fa96a755632983 |
| `skills/jev-core/agents-that-act/agent-desktop/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | bc0a0116457d99b7 |
| `skills/jev-core/agents-that-act/blink/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 594f56324c343396 |
| `skills/jev-core/agents-that-act/jev-drone/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e5b45ed4fe0e5724 |
| `skills/jev-core/agents-that-act/jev-ultrafast/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d530dc54770d2b28 |
| `skills/jev-core/build-and-judge/canny/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 59cd6f71e4546f56 |
| `skills/jev-core/build-and-judge/jev-curate/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | a2b350102a982507 |
| `skills/jev-core/build-and-judge/json-render/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 6d387762060deab5 |
| `skills/jev-core/build-and-judge/killmyidea/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 74a1efecd0b1a697 |
| `skills/jev-core/context-and-memory/fast-jev-compaction/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | dd86a0aca6e88089 |
| `skills/jev-core/context-and-memory/neo4jev/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 356e3403a653e642 |
| `skills/jev-core/context-and-memory/semdecide/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0fed93615f9b03bd |
| `skills/jev-core/context-and-memory/winnow/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d3e2207e3425d5dc |
| `skills/jev-core/dev-workflow/jev-codex-router/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4b273c75efae88df |
| `skills/jev-core/dev-workflow/jev-mcp/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4589e3bcf29bc2dc |
| `skills/jev-core/dev-workflow/jev-review/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7067be21e1e5208e |
| `skills/jev-core/dev-workflow/typesafe-mcp/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 2772d8e39571028c |
| `skills/jev-core/markets-and-play/jev-trader/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | db0a4f8466eef869 |
| `skills/jev-core/markets-and-play/onevonejev/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 34cf26c8e41db83c |
| `skills/jev-core/markets-and-play/prism/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 593a961c6903f129 |
| `skills/jev-core/markets-and-play/typesafe-mario/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b73bdfd3adb1ba19 |
| `skills/maintenance-optimization/api-response-optimizer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d9a89ae3733f0981 |
| `skills/maintenance-optimization/bundle-size-optimizer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | cf392cbf92afb0b0 |
| `skills/maintenance-optimization/cache-strategy-implementer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | dcc187d21e9a6627 |
| `skills/maintenance-optimization/code-complexity-reducer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0d1e53100f442596 |
| `skills/maintenance-optimization/code-duplication-remover/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c1b303169400b8e7 |
| `skills/maintenance-optimization/container-image-optimizer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b5ef182f7e3c3e6e |
| `skills/maintenance-optimization/database-query-optimizer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 367ae261465204e7 |
| `skills/maintenance-optimization/dead-code-eliminator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7702c18031b69408 |
| `skills/maintenance-optimization/dependency-updater/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fc003ba842fc5825 |
| `skills/maintenance-optimization/error-handling-standardizer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 8f89d407e53fa6a8 |
| `skills/maintenance-optimization/logging-optimizer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4614261d32024a2a |
| `skills/maintenance-optimization/memory-leak-detector/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 17b74c10493557ce |
| `skills/maintenance-optimization/performance-optimizer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 756de89c482c6594 |
| `skills/maintenance-optimization/smart-refactoring-engine/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 1478648f1dcc7870 |
| `skills/maintenance-optimization/technical-debt-analyzer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 53f25877bc204e24 |
| `skills/meta/architecture-review-and-approval/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 538945ab84a7d5c5 |
| `skills/meta/change-management-and-rollback/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | ac8f9c0c7c3fd333 |
| `skills/meta/compliance-evidence-pack/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b5d176d7af2b27d9 |
| `skills/meta/delivery-checklist-and-handoff/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4656c24951d11b56 |
| `skills/meta/multi-skill-orchestration/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e50fbef9a2fe99e6 |
| `skills/meta/performance-budgeting/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4b2a97de6aa21afa |
| `skills/meta/risk-and-assumption-tracker/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c934e0f46b4bcfbd |
| `skills/meta/skill-intake-and-triage/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b8545e7efdfd1876 |
| `skills/meta/skill-quality-gate/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 09867732dc45ea7d |
| `skills/meta/stack-profile-manager/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d82f5b4ec42e457b |
| `skills/security-compliance/access-control-matrix/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 1b8f02ef751e34fd |
| `skills/security-compliance/api-security-enforcer/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 21be75d3e69b343f |
| `skills/security-compliance/audit-logger/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 46e0ed8d5ad6be3a |
| `skills/security-compliance/authentication-system-builder/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 41f417e38aa0a76f |
| `skills/security-compliance/certificate-manager/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 98a0e284b513b850 |
| `skills/security-compliance/compliance-checker/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 2f740fb6cc3ef1ec |
| `skills/security-compliance/container-security-scanner/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 21425e9e766c4213 |
| `skills/security-compliance/data-privacy-guardian/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d76ed67cbd622df1 |
| `skills/security-compliance/penetration-testing-runner/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | acb2ea27703063cb |
| `skills/security-compliance/secrets-management/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c91f424c2f4a75bb |
| `skills/security-compliance/security-hardening-auditor/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 508bcdb23d20d1b0 |
| `skills/security-compliance/security-incident-response/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b0e64cf846836b56 |
| `skills/security-compliance/supply-chain-security/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 4ab8cdebc928c5bf |
| `skills/security-compliance/threat-modeling-framework/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | dcec31d0721004bb |
| `skills/security-compliance/zero-trust-architecture/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | bae14a56068d3be2 |
| `skills/superpowers/brainstorming/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 8b883cc136d60e30 |
| `skills/superpowers/brainstorming/spec-document-reviewer-prompt.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 793f2546815a28f2 |
| `skills/superpowers/brainstorming/visual-companion.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 95a58903eeac8e24 |
| `skills/superpowers/diagnosing-superpowers/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 9c68190617f4f20e |
| `skills/superpowers/diagnosing-superpowers/prompts/analyst-common.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 87f5303d6c45b3fb |
| `skills/superpowers/diagnosing-superpowers/prompts/cost-and-time.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 72ee384cf6bc3dae |
| `skills/superpowers/diagnosing-superpowers/prompts/plan-adherence.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | d2681d76bf70eff9 |
| `skills/superpowers/diagnosing-superpowers/prompts/quality-evidence.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 01b29eea22501ddd |
| `skills/superpowers/diagnosing-superpowers/prompts/repeated-work.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e9a7b8bde8521c89 |
| `skills/superpowers/diagnosing-superpowers/prompts/request-conflicts.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 2fee01230cf625de |
| `skills/superpowers/diagnosing-superpowers/prompts/scrub-audit.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c230befe2ab708fa |
| `skills/superpowers/diagnosing-superpowers/prompts/scrub.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 58e84fb2db013a94 |
| `skills/superpowers/diagnosing-superpowers/prompts/similar-session.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | abec588fb5f59a2b |
| `skills/superpowers/diagnosing-superpowers/prompts/skill-timeline.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c2f24ba30c7be3b1 |
| `skills/superpowers/diagnosing-superpowers/prompts/stumbles.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | bf103612b7b78dcd |
| `skills/superpowers/diagnosing-superpowers/references/context-safety.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 39c5259de8416f30 |
| `skills/superpowers/diagnosing-superpowers/references/github-issues.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0444c209fa848cda |
| `skills/superpowers/diagnosing-superpowers/references/redaction-policy.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 6eca8a3a16b174f2 |
| `skills/superpowers/diagnosing-superpowers/references/session-discovery.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 383801d792eed50a |
| `skills/superpowers/diagnosing-superpowers/templates/bundle-README.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 75e2d9c9dc1bf2ab |
| `skills/superpowers/diagnosing-superpowers/templates/case.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 8e5ecb243d01a9a4 |
| `skills/superpowers/diagnosing-superpowers/templates/issue.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f8a6d000e412be11 |
| `skills/superpowers/diagnosing-superpowers/templates/report.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 5844320cd9cfefb0 |
| `skills/superpowers/dispatching-parallel-agents/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fc9875393a1dcd6b |
| `skills/superpowers/executing-plans/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 9e0cf3924324bd93 |
| `skills/superpowers/finishing-a-development-branch/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 2b8cb8f9cabb1951 |
| `skills/superpowers/receiving-code-review/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | bbe7eb200ac9feb9 |
| `skills/superpowers/requesting-code-review/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c12edf804d7b0646 |
| `skills/superpowers/requesting-code-review/code-reviewer.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 5e618b2a89ab9616 |
| `skills/superpowers/subagent-driven-development/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3acabb8d9a3114c4 |
| `skills/superpowers/subagent-driven-development/implementer-prompt.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | bda42c4969d1578e |
| `skills/superpowers/subagent-driven-development/re-review-prompt.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | ea2d362871c1269b |
| `skills/superpowers/subagent-driven-development/task-reviewer-prompt.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f1431b65a6e63e5f |
| `skills/superpowers/systematic-debugging/CREATION-LOG.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 397f122f115f9943 |
| `skills/superpowers/systematic-debugging/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 23f249e47a3a4b06 |
| `skills/superpowers/systematic-debugging/condition-based-waiting.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 02aa854bd9e761f2 |
| `skills/superpowers/systematic-debugging/defense-in-depth.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 9407efcbd028a5ec |
| `skills/superpowers/systematic-debugging/root-cause-tracing.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | f6359a35f1c695f7 |
| `skills/superpowers/systematic-debugging/test-academic.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 51e07c1c56052a6c |
| `skills/superpowers/systematic-debugging/test-pressure-1.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fbf04219c44460e7 |
| `skills/superpowers/systematic-debugging/test-pressure-2.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fc6b2594bed3f2a1 |
| `skills/superpowers/systematic-debugging/test-pressure-3.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 69ed6a5a59dac92d |
| `skills/superpowers/test-driven-development/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 90fa0021a5336094 |
| `skills/superpowers/test-driven-development/writing-good-tests.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 87f56d0a4236f804 |
| `skills/superpowers/using-git-worktrees/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 49ac647dd5a65e0e |
| `skills/superpowers/using-superpowers/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c460d4e164f6583d |
| `skills/superpowers/using-superpowers/references/antigravity-tools.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 343af08abab2936a |
| `skills/superpowers/using-superpowers/references/claude-code-tools.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fc455de197f1ca60 |
| `skills/superpowers/using-superpowers/references/codex-tools.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 51d2e878aac90809 |
| `skills/superpowers/using-superpowers/references/gemini-tools.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3e0e732356eaf178 |
| `skills/superpowers/using-superpowers/references/hermes-tools.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 32c262e22da268ac |
| `skills/superpowers/using-superpowers/references/muse-tools.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 7fc9b703682c55b4 |
| `skills/superpowers/using-superpowers/references/pi-tools.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | fb6db6991508e958 |
| `skills/superpowers/verification-before-completion/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 8f15b9f67e566f28 |
| `skills/superpowers/writing-plans/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0fdb0f2af96e7d8e |
| `skills/superpowers/writing-skills/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 93e2c54d3ed8503f |
| `skills/superpowers/writing-skills/anthropic-best-practices.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 26f2fc231b4bea7a |
| `skills/superpowers/writing-skills/examples/CLAUDE_MD_TESTING.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3648a10c414546fd |
| `skills/superpowers/writing-skills/persuasion-principles.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 73ffb3d9d9f510f8 |
| `skills/superpowers/writing-skills/testing-skills-with-subagents.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 134a5d0f695d717f |
| `skills/testing-quality/accessibility-testing/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | c020f66667447e40 |
| `skills/testing-quality/api-testing-suite/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 888aded17b5bd69f |
| `skills/testing-quality/chaos-engineering-runner/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 3a50bf2af71604cd |
| `skills/testing-quality/contract-testing/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 512bfd099c77f6e3 |
| `skills/testing-quality/cross-browser-testing/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | b9751afb6aa9ccb6 |
| `skills/testing-quality/database-testing/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0eaa852a142fb640 |
| `skills/testing-quality/fuzz-testing/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 377aed55e4acda8c |
| `skills/testing-quality/mobile-testing-framework/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | a395e6464455d7cd |
| `skills/testing-quality/performance-testing-framework/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 726f487174a4c5b0 |
| `skills/testing-quality/property-based-testing/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 0254fd6ce93c989f |
| `skills/testing-quality/security-testing-automation/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | e44e8dc9d99b9d30 |
| `skills/testing-quality/smoke-test-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 59e0ea13d93b63e8 |
| `skills/testing-quality/snapshot-testing/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 401b7d7150157f49 |
| `skills/testing-quality/test-automation-suite-generator/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 8825a4a71957978e |
| `skills/testing-quality/visual-regression-tester/SKILL.md` | preserved_byte_identical | Diperkekal tanpa perubahan byte | 1eb70eace2c0228f |
| `tests/architecture/fixtures/README.md` | active_guide_or_prompt | Diselaraskan; preimage disimpan | 081cea18c1d5e5fc |

## Nested checkout berasingan — dipelihara

Paths berikut milik checkout berasingan di bawah `.kilo/worktrees`. Tiada prompt/status atau vendor di dalamnya ditulis semula; ini mengelakkan overwrite lane lain. Semua hash diperiksa sekali lagi selepas alignment.

| Path | Tindakan | SHA-256 (prefix) |
|---|---|---|
| `.kilo/worktrees/abangcolek-logo-theme-20261017/outputs/ABANGCOLEK_BRAND_GUIDELINES_v1.md` | preserved_byte_identical | d5540daf55f1af21 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/outputs/ABANGCOLEK_TIKTOK_FOUNDER_REVIEW.md` | preserved_byte_identical | 82f180578546a147 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/outputs/ABANGCOLEK_SOCIAL_CROSSPLATFORM_REVIEW.md` | preserved_byte_identical | 1a416b025a8308c4 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/outputs/ABANGCOLEK_REVIEW.md` | preserved_byte_identical | 73fcc843f9f895b0 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/outputs/ABANGCOLEK_FOUNDER_STORYBOARDS_2026-10-17.md` | preserved_byte_identical | 3fb5a58d517251ec |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/REVIEW-2026-10-16.md` | preserved_byte_identical | 71127500dd9f53bc |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/visual-regression-tester/SKILL.md` | preserved_byte_identical | 1eb70eace2c0228f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/SINTESIS_DAN_ALIGNMENT_ABANGCOLEK_2026-10-03.md` | preserved_byte_identical | bbd9a0611e5876de |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/REVIEW_SHARED_CHAT_6AC065B1_2026-10-03.md` | preserved_byte_identical | 57471a1902bb0daa |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/REVIEW_LIVE_SCROLL_EMONS_2026-10-03.md` | preserved_byte_identical | 1685c3d35d7f1afe |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/REVIEW_KONSEP_EMONS_DAN_LANDING_ABANGCOLEK_2026-10-03.md` | preserved_byte_identical | 12f9e3ccbe24e197 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/REVIEW_GOOGLE_AI_STUDIO_ABANGCOLEK_2026-10-03.md` | preserved_byte_identical | f4d293d7d18e0712 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/RESEARCH_PRODUK_SOSIAL_ABANGCOLEK_2026-10-03.md` | preserved_byte_identical | f2ee7cd243ba4f28 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/RESEARCH_DASHBOARD_WOW_FACTOR_RM300K_2026-10-01.md` | preserved_byte_identical | c54e22ef7b14163e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/test-automation-suite-generator/SKILL.md` | preserved_byte_identical | 8825a4a71957978e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/snapshot-testing/SKILL.md` | preserved_byte_identical | 401b7d7150157f49 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/JEV.md` | preserved_byte_identical | 5609105e0dcb575a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/DESIGN_QA_HERO_EMONS_2026-10-03.md` | preserved_byte_identical | ea8bb20b3aaafb2c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/DELEGASI_JIMAT_TOKEN_AGY_HERMES_2026-10-03.md` | preserved_byte_identical | ab223c77e2d9668b |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/DASHBOARD_UI_UX_IMPLEMENTATION_2026-10-01.md` | preserved_byte_identical | 8b05c1a24904f2a9 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/DASHBOARD_REFERENCE_REDESIGN_2026-10-02.md` | preserved_byte_identical | c25841cf09634fb1 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/DASHBOARD_NEXT_LEVEL_2026-10-02.md` | preserved_byte_identical | c9478d8c6aa292c0 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/README.md` | preserved_byte_identical | ee7a82151a67aa36 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/12_JEV_PLATFORM_CAPABILITY_PLAN.md` | preserved_byte_identical | 9fbb67ccbb5b71cc |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/11_MARKETING_SOCIAL_AUTOMATION_POSTIZ_AGENT_REACH.md` | preserved_byte_identical | bb894a70358b56fe |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/10_AGENT_STOKIS_BUSINESS_SYSTEM.md` | preserved_byte_identical | 70b4bab439425ea3 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/09_PLATFORM_EXPANSION_ZERO_COST_MASTERPLAN.md` | preserved_byte_identical | 82807a2ec50fb84e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/08_WHATSAPP_FLOW_ZERO_COST.md` | preserved_byte_identical | 18076a01902d1f87 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/07_PELAN_UPGRADE_ABANGCOLEK_OS.md` | preserved_byte_identical | 1ff95b10617179ab |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/06_JEV_SYNTHESIS_ABANGCOLEK_OS.md` | preserved_byte_identical | aeb777e749bfa29a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/05_HERMES_AGENT_DOCS.md` | preserved_byte_identical | 8d23cb99a3b84eb7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/04_DEEPSEEK_HARNESS_QUICKSTART.md` | preserved_byte_identical | 8d9012433aef1d97 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/03_OPENAI_INTRODUCING_DOTS.md` | preserved_byte_identical | 379d6995d947deb5 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/02_META_MUSE.md` | preserved_byte_identical | 922a88cb72d81663 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/research/2026-10-02/01_GROK_BOT_OVERVIEW.md` | preserved_byte_identical | fc3594f70e321683 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/RECAP_SINTESIS_DAN_PELAKSANAAN_ABANGCOLEK_2026-10-02.md` | preserved_byte_identical | e652f86fb65c9dc1 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/PLATFORM_EXPANSION_IMPLEMENTATION_2026-10-02.md` | preserved_byte_identical | 344bc951a2eb47f9 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/JEV_ECOSYSTEM_AUDIT_REPORT.md` | preserved_byte_identical | 43d52bec033184ad |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/INVENTORI_IMEJ_PRODUK_ABANGCOLEK_2026-10-03.md` | preserved_byte_identical | 15e62d1e3427c851 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/IMPLEMENTASI_HERO_EMONS_DAN_ASET_ASLI_ABANGCOLEK_2026-10-03.md` | preserved_byte_identical | 6df476387afc6d55 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/GLOBAL_THEME_SIDEBAR_IMPLEMENTATION_2026-10-02.md` | preserved_byte_identical | 075d0ba2a59a3682 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/FORENSIK_AUDIT_LENGKAP_REPO_ABANG_COLEK.md` | preserved_byte_identical | 5c94cf3c86887094 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/FORENSIK_AUDIT_JEV_DAN_KOD_ABANGCOLEK_OS_2026.md` | preserved_byte_identical | e2cc960cf573421f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/smoke-test-generator/SKILL.md` | preserved_byte_identical | 59e0ea13d93b63e8 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/security-testing-automation/SKILL.md` | preserved_byte_identical | e44e8dc9d99b9d30 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/CODEX_REVIEW_MENYELURUH_ABANGCOLEK_OS_2026-10-01.md` | preserved_byte_identical | b0dbfcf41b5d3648 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/reports/APA_YANG_DIBANGUNKAN_ABANGCOLEK_OS.md` | preserved_byte_identical | f458c54fab0ca25c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/README.md` | preserved_byte_identical | 73a117634d242fb5 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/superpowers/plans/2026-10-17-abangcolek-emons-landing.md` | preserved_byte_identical | 2e929dc582f821bc |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/superpowers/plans/2026-10-17-abangcolek-emons-landing-spec.md` | preserved_byte_identical | b0ed1c9cd54d1513 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/superpowers/plans/2026-10-04-all-tasks-implementation.md` | preserved_byte_identical | 3029af5a3fca3914 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/superpowers/plans/2026-10-03-project-alignment.md` | preserved_byte_identical | a157c37825445697 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/superpowers/plans/2026-10-03-emons-scroll-hero.md` | preserved_byte_identical | 78f5ddb071a43d0a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/superpowers/plans/2026-10-03-emons-live-scene-upgrade.md` | preserved_byte_identical | ae2214f0fd231876 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/superpowers/plans/2026-10-02-platform-expansion.md` | preserved_byte_identical | f55d47b89c3515d8 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/property-based-testing/SKILL.md` | preserved_byte_identical | 0254fd6ce93c989f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/writing-skills/testing-skills-with-subagents.md` | preserved_byte_identical | 134a5d0f695d717f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/writing-skills/SKILL.md` | preserved_byte_identical | 93e2c54d3ed8503f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/writing-skills/persuasion-principles.md` | preserved_byte_identical | 73ffb3d9d9f510f8 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/performance-testing-framework/SKILL.md` | preserved_byte_identical | 726f487174a4c5b0 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/tutorial-generator/SKILL.md` | preserved_byte_identical | b2317bdde972d5a6 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/stitch_prompts/abang_colek_sovereign_command_hub.md` | preserved_byte_identical | 550c867ecc6396d9 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/stitch_prompts/abang_colek_kiosk_storefront.md` | preserved_byte_identical | 90080c2325f038fc |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/stitch_prompts/abang_colek_jev_social_intelligence.md` | preserved_byte_identical | 7421bca476519e40 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/stitch_prompts/abang_colek_express_bus_cargo_tracker.md` | preserved_byte_identical | 4c9d13ba473bf2ed |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/stitch_prompts/abang_colek_agent_restock_portal.md` | preserved_byte_identical | 36f32e75cd7bc860 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/STITCH_ABANGCOLEK_SPEC.md` | preserved_byte_identical | 3e33e76b682d3398 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/writing-skills/examples/CLAUDE_MD_TESTING.md` | preserved_byte_identical | 3648a10c414546fd |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/writing-skills/anthropic-best-practices.md` | preserved_byte_identical | 26f2fc231b4bea7a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/mobile-testing-framework/SKILL.md` | preserved_byte_identical | a395e6464455d7cd |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/runbook-generator/SKILL.md` | preserved_byte_identical | cd4d44cdc4401777 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/runbooks/platform-recovery.md` | preserved_byte_identical | 437e8265d716be93 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/runbooks/credential-revocation-audit.md` | preserved_byte_identical | 03b26ea65db70351 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/REVIEW_HERMES_AGENT_DAN_DEEPSEEK_JEV_MERGE.md` | preserved_byte_identical | 173f780d8fb93eb9 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/terraform-module-generator/SKILL.md` | preserved_byte_identical | 7253b87b86a15250 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/writing-plans/SKILL.md` | preserved_byte_identical | 0fdb0f2af96e7d8e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/fuzz-testing/SKILL.md` | preserved_byte_identical | 377aed55e4acda8c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/readme-generator/SKILL.md` | preserved_byte_identical | 39dddbce1361ba50 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/research/RESEARCH-DISPOSITION-MATRIX.md` | preserved_byte_identical | 8ed2e6a127a71b4c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/README.md` | preserved_byte_identical | 7e857d63477e6e89 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/PROJECT-ALIGNMENT-BACKLOG.md` | preserved_byte_identical | 0a4b3198ebc82de0 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/PROFILE_59_ATTESTATION.md` | preserved_byte_identical | f9847c17b1377b7e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/PANDUAN_DAN_PEMASANGAN_SUPERPOWERS_DAN_JEV_SKILLS.md` | preserved_byte_identical | 8f790c7f6a396145 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/PANDUAN_COMMAND_PALETTE.md` | preserved_byte_identical | ad3a482c03445bbb |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/KEDUDUKAN_DAN_ARKITEKTUR_JEV_DALAM_PROJEK.md` | preserved_byte_identical | 1682d3b177f1a03a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/KATALOG_DAN_PANDUAN_SKILL_EJEN_AI.md` | preserved_byte_identical | 07d96e32d1ddff70 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/JEV_ECOSYSTEM_AUDIT_REPORT.md` | preserved_byte_identical | be5aa25bab4943aa |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/JEV_ARCH.md` | preserved_byte_identical | 98ab6defe8923c5a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/react-hook-generator/SKILL.md` | preserved_byte_identical | 87b4e8b471476d54 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/verification-before-completion/SKILL.md` | preserved_byte_identical | 8f15b9f67e566f28 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/database-testing/SKILL.md` | preserved_byte_identical | 0eaa852a142fb640 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/performance-baseline-documentation/SKILL.md` | preserved_byte_identical | f99cc9822db79c5d |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/handover/MARKDOWN-ALIGNMENT-REGISTER.md` | preserved_byte_identical | 5b7c31656f4ef339 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/handover/CAPABILITY-MATRIX.md` | preserved_byte_identical | 369021b7e8ca22d0 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/handover/AGY-MASTER-IMPLEMENTATION-PROMPT.md` | preserved_byte_identical | 3b447471f6a76f73 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/handover/AGENT-HANDOVER-A-Z.md` | preserved_byte_identical | 5dc4ce72520e503f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/FORENSIK_AUDIT_LENGKAP_REPO_ABANG_COLEK.md` | preserved_byte_identical | f6ed1d5428c0d9cc |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/design-qa.md` | preserved_byte_identical | 9092bcd6ef29d4f7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/openapi-code-generator/SKILL.md` | preserved_byte_identical | 3e229752d7abaa15 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/using-superpowers/SKILL.md` | preserved_byte_identical | c460d4e164f6583d |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/onboarding-guide-creator/SKILL.md` | preserved_byte_identical | 397b1bc3cd4df89b |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/.work/landing-five-chapter-draft-20261018/README.md` | preserved_byte_identical | 8dd8410dc7c24f80 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/design/brand-spec.md` | preserved_byte_identical | 12b71e52aa7765e5 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/design/abangcolek-founder-social-research.md` | preserved_byte_identical | cbf812c46961c0f8 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/mock-data-generator/SKILL.md` | preserved_byte_identical | fc89b51c09c37729 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/living-documentation-generator/SKILL.md` | preserved_byte_identical | c600a8ba306a0bdd |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/using-superpowers/references/pi-tools.md` | preserved_byte_identical | fb6db6991508e958 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/using-superpowers/references/muse-tools.md` | preserved_byte_identical | 7fc9b703682c55b4 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/using-superpowers/references/hermes-tools.md` | preserved_byte_identical | 32c262e22da268ac |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/using-superpowers/references/gemini-tools.md` | preserved_byte_identical | 3e0e732356eaf178 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/using-superpowers/references/codex-tools.md` | preserved_byte_identical | 51d2e878aac90809 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/using-superpowers/references/claude-code-tools.md` | preserved_byte_identical | fc455de197f1ca60 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/using-superpowers/references/antigravity-tools.md` | preserved_byte_identical | 343af08abab2936a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/cross-browser-testing/SKILL.md` | preserved_byte_identical | b9751afb6aa9ccb6 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/decisions/0002-zero-new-spend-hosting-topology.md` | preserved_byte_identical | bfafdf43f0af575d |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/decisions/0001-project-authority-and-continuity.md` | preserved_byte_identical | 9641449187df857f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/CARA_PENGOPERASIAN_SEPATUTNYA_ABANGCOLEK_OS.md` | preserved_byte_identical | dd063168fda931b8 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/CADANGAN_PENAMBAHBAIKAN_DAN_TEMA_LOGO_ABANGCOLEK.md` | preserved_byte_identical | 3efb455f4abbf2b3 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/AUDIT_TERPERINCI_REPO_ABANG_COLEK_ECOSYSTEM.md` | preserved_byte_identical | e75c7dfdfe1cc8c8 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/AUDIT_TERPERINCI_KESELURUHAN_PROJEK_ABANGCOLEK_OS.md` | preserved_byte_identical | 593c03f5b4146594 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/AI-PROVIDER-FREE-MODELS-REGISTER.md` | preserved_byte_identical | f297a3def07de7cf |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/graphql-schema-builder/SKILL.md` | preserved_byte_identical | 541453d3e28f9689 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/AI-AGENT-ROADMAP.md` | preserved_byte_identical | 3135c35192b0414f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/AI-AGENT-ARCHITECTURE.md` | preserved_byte_identical | 685c34fe50c18be3 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/ABANGCOLEK_OS_UPGRADE_BLUEPRINT.md` | preserved_byte_identical | 55ba9d017d87170a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/ABANGCOLEK_DISCOVERY_AND_PLAN.md` | preserved_byte_identical | 64605a8d12cf8459 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/ABANGCOLEK-SOURCE-OF-TRUTH.md` | preserved_byte_identical | 960a6920aa67c7e8 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/ABANGCOLEK-PLATFORM-STATUS-2026-10-16.md` | preserved_byte_identical | 021deca43e71a1f8 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/docs/ABANGCOLEK-PLATFORM-ARCHITECTURE.md` | preserved_byte_identical | f1b89cc388b3b3ae |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/knowledge-base-builder/SKILL.md` | preserved_byte_identical | 539fb320c4889f02 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/using-git-worktrees/SKILL.md` | preserved_byte_identical | 49ac647dd5a65e0e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/contract-testing/SKILL.md` | preserved_byte_identical | 512bfd099c77f6e3 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/github-actions-workflow/SKILL.md` | preserved_byte_identical | c601b72c8bd1dbbb |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/incident-post-mortem/SKILL.md` | preserved_byte_identical | 793c774e4aed8ea1 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/code-template-engine/SKILL.md` | preserved_byte_identical | 78caec08d27379fc |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/test-driven-development/writing-good-tests.md` | preserved_byte_identical | 87f56d0a4236f804 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/test-driven-development/SKILL.md` | preserved_byte_identical | 90fa0021a5336094 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/chaos-engineering-runner/SKILL.md` | preserved_byte_identical | 3a50bf2af71604cd |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/diagram-as-code/SKILL.md` | preserved_byte_identical | b221a25180018e71 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/full-stack-feature-generator/SKILL.md` | preserved_byte_identical | 235846c72628b8be |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/cli-tool-builder/SKILL.md` | preserved_byte_identical | bb84374380a02d4f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/api-testing-suite/SKILL.md` | preserved_byte_identical | 888aded17b5bd69f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/systematic-debugging/test-pressure-3.md` | preserved_byte_identical | 69ed6a5a59dac92d |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/systematic-debugging/test-pressure-2.md` | preserved_byte_identical | fc6b2594bed3f2a1 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/systematic-debugging/test-pressure-1.md` | preserved_byte_identical | fbf04219c44460e7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/systematic-debugging/test-academic.md` | preserved_byte_identical | 51e07c1c56052a6c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/systematic-debugging/SKILL.md` | preserved_byte_identical | 23f249e47a3a4b06 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/systematic-debugging/root-cause-tracing.md` | preserved_byte_identical | f6359a35f1c695f7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/systematic-debugging/defense-in-depth.md` | preserved_byte_identical | 9407efcbd028a5ec |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/systematic-debugging/CREATION-LOG.md` | preserved_byte_identical | 397f122f115f9943 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/systematic-debugging/condition-based-waiting.md` | preserved_byte_identical | 02aa854bd9e761f2 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/dependency-graph-visualizer/SKILL.md` | preserved_byte_identical | c58ae53d5705eff7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/dockerfile-generator/SKILL.md` | preserved_byte_identical | 510535c322323c50 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/boilerplate-project-scaffolder/SKILL.md` | preserved_byte_identical | 37cef0f6720b3cee |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/testing-quality/accessibility-testing/SKILL.md` | preserved_byte_identical | c020f66667447e40 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/subagent-driven-development/task-reviewer-prompt.md` | preserved_byte_identical | f1431b65a6e63e5f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/subagent-driven-development/SKILL.md` | preserved_byte_identical | 3acabb8d9a3114c4 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/database-schema-documentation/SKILL.md` | preserved_byte_identical | fd91684a71e8f962 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/database-schema-generator/SKILL.md` | preserved_byte_identical | e84d102b406df992 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/api-mocking-server/SKILL.md` | preserved_byte_identical | 5e7b59413986588e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/subagent-driven-development/re-review-prompt.md` | preserved_byte_identical | ea2d362871c1269b |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/subagent-driven-development/implementer-prompt.md` | preserved_byte_identical | bda42c4969d1578e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/code-comment-enricher/SKILL.md` | preserved_byte_identical | 710d04af9935dc00 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/requesting-code-review/SKILL.md` | preserved_byte_identical | c12edf804d7b0646 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/requesting-code-review/code-reviewer.md` | preserved_byte_identical | 5e618b2a89ab9616 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/changelog-automation/SKILL.md` | preserved_byte_identical | 882bb17647bca92d |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/crud-generator/SKILL.md` | preserved_byte_identical | 5f1472400f34478a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/receiving-code-review/SKILL.md` | preserved_byte_identical | bbe7eb200ac9feb9 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/system-design-documentation/SKILL.md` | preserved_byte_identical | 15f433b2352fe30d |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/architecture-decision-records/SKILL.md` | preserved_byte_identical | c53b083ea703d18b |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/finishing-a-development-branch/SKILL.md` | preserved_byte_identical | 2b8cb8f9cabb1951 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/documentation-knowledge/api-documentation/SKILL.md` | preserved_byte_identical | 9968cbdeff455afb |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/codegen-scaffolding/component-library-creator/SKILL.md` | preserved_byte_identical | 47176a8b6a5f2aa1 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/event-driven-system-designer/SKILL.md` | preserved_byte_identical | 70b40779264ebc7a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/serverless-architecture-generator/SKILL.md` | preserved_byte_identical | be176b275710390f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/.superpowers/sdd/2026-10-17-abangcolek-emons-landing-plans/task-2-brief.md` | preserved_byte_identical | 033919a2245db4d4 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/domain-driven-design-builder/SKILL.md` | preserved_byte_identical | 2b1adc30e67d25bf |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/real-time-system-designer/SKILL.md` | preserved_byte_identical | 639640677ca2005a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/.superpowers/sdd/2026-10-17-abangcolek-emons-landing/task-2-brief.md` | preserved_byte_identical | 3cb430fc690ab262 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/.superpowers/sdd/2026-10-17-abangcolek-emons-landing/task-1-brief.md` | preserved_byte_identical | a1522bc551c9f287 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/.superpowers/sdd/2026-10-17-abangcolek-emons-landing/progress.md` | preserved_byte_identical | c244576684cac4a6 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/time-series-database/SKILL.md` | preserved_byte_identical | 7e8dc9eb1bebc47a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/service-mesh-configurator/SKILL.md` | preserved_byte_identical | 3badac4b5e82cb41 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/executing-plans/SKILL.md` | preserved_byte_identical | 9e0cf3924324bd93 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/serverless-framework/SKILL.md` | preserved_byte_identical | fa62ac24711f1972 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/stream-processing/SKILL.md` | preserved_byte_identical | d9efa8628c2213ca |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/distributed-system-patterns/SKILL.md` | preserved_byte_identical | 1caa5b71435eefc6 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/secret-injection/SKILL.md` | preserved_byte_identical | dde455daeadb68d2 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/sql-query-optimizer/SKILL.md` | preserved_byte_identical | 399c127b4eb22378 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/multi-tenancy-architect/SKILL.md` | preserved_byte_identical | 4b0a2c019e329a27 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/contract-first-api-development/SKILL.md` | preserved_byte_identical | cdbae38ecb8bb788 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/rolling-update-strategies/SKILL.md` | preserved_byte_identical | 75f46bcf84c77fa4 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/monolith-to-microservices-migrator/SKILL.md` | preserved_byte_identical | 6bec62f8a84969d6 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/dispatching-parallel-agents/SKILL.md` | preserved_byte_identical | fc9875393a1dcd6b |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/ml-model-deployment/SKILL.md` | preserved_byte_identical | e55a3fa158faf936 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/clean-architecture-scaffolder/SKILL.md` | preserved_byte_identical | 0274620793568e8d |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/observability-stack/SKILL.md` | preserved_byte_identical | 9b2837ed3a4d5147 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/modular-monolith-designer/SKILL.md` | preserved_byte_identical | 359beb251b3b0cf3 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/graph-database-modeler/SKILL.md` | preserved_byte_identical | bc79056c991a3a77 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/network-infrastructure/SKILL.md` | preserved_byte_identical | 630dded516c87ae6 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/api-gateway-configurator/SKILL.md` | preserved_byte_identical | 03e1cbc4489881fe |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/api-design-and-versioning/SKILL.md` | preserved_byte_identical | 87beca6ba2c3ae5e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/disaster-recovery-planner/SKILL.md` | preserved_byte_identical | 5bee30ff0a07c7ac |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/microservices-architect/SKILL.md` | preserved_byte_identical | 3dda5ccda4dd23bb |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/feature-store-builder/SKILL.md` | preserved_byte_identical | f02a1241d1c07bdf |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/templates/report.md` | preserved_byte_identical | 5844320cd9cfefb0 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/templates/issue.md` | preserved_byte_identical | f8a6d000e412be11 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/templates/case.md` | preserved_byte_identical | 8e5ecb243d01a9a4 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/templates/bundle-README.md` | preserved_byte_identical | 75e2d9c9dc1bf2ab |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/SKILL.md` | preserved_byte_identical | 9c68190617f4f20e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/multi-region-deployment/SKILL.md` | preserved_byte_identical | f80f551530b253e5 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/database-administration-automation/SKILL.md` | preserved_byte_identical | 95e88d3e53bdb224 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/architecture-design/hexagonal-architecture-builder/SKILL.md` | preserved_byte_identical | c2969917d227b4ba |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/references/session-discovery.md` | preserved_byte_identical | 383801d792eed50a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/references/redaction-policy.md` | preserved_byte_identical | 6eca8a3a16b174f2 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/references/github-issues.md` | preserved_byte_identical | 0444c209fa848cda |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/references/context-safety.md` | preserved_byte_identical | 39c5259de8416f30 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/database-migration-orchestrator/SKILL.md` | preserved_byte_identical | 0d2dbeb32f9d1b87 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/logging-aggregation/SKILL.md` | preserved_byte_identical | a689ff38f452fe0a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/data-lake-architecture/SKILL.md` | preserved_byte_identical | 56694dc31ea78fed |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/kubernetes-cluster-manager/SKILL.md` | preserved_byte_identical | c502d76581e180a6 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/data-warehouse-designer/SKILL.md` | preserved_byte_identical | e38613b1ebc1561c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/stumbles.md` | preserved_byte_identical | bf103612b7b78dcd |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/skill-timeline.md` | preserved_byte_identical | c2f24ba30c7be3b1 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/similar-session.md` | preserved_byte_identical | abec588fb5f59a2b |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/scrub.md` | preserved_byte_identical | 58e84fb2db013a94 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/scrub-audit.md` | preserved_byte_identical | c230befe2ab708fa |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/request-conflicts.md` | preserved_byte_identical | 2fee01230cf625de |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/repeated-work.md` | preserved_byte_identical | e9a7b8bde8521c89 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/quality-evidence.md` | preserved_byte_identical | 01b29eea22501ddd |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/plan-adherence.md` | preserved_byte_identical | d2681d76bf70eff9 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/cost-and-time.md` | preserved_byte_identical | 72ee384cf6bc3dae |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/diagnosing-superpowers/prompts/analyst-common.md` | preserved_byte_identical | 87f5303d6c45b3fb |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/data-catalog-creator/SKILL.md` | preserved_byte_identical | 8cb92bcdc13c1689 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/infrastructure-as-code-generator/SKILL.md` | preserved_byte_identical | d03b09fef11545d9 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/data-quality-framework/SKILL.md` | preserved_byte_identical | 94d20491a8b8e64f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/cost-optimization/SKILL.md` | preserved_byte_identical | c1d958dbeea6071a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/brainstorming/visual-companion.md` | preserved_byte_identical | 95a58903eeac8e24 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/brainstorming/spec-document-reviewer-prompt.md` | preserved_byte_identical | 793f2546815a28f2 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/superpowers/brainstorming/SKILL.md` | preserved_byte_identical | 8b883cc136d60e30 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/cdc-pipeline/SKILL.md` | preserved_byte_identical | 7253429199c41a5f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/gitops-workflow/SKILL.md` | preserved_byte_identical | 931a938eaa95fba7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/data-pipeline-builder/SKILL.md` | preserved_byte_identical | 7040d3c493121b85 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/container-orchestration/SKILL.md` | preserved_byte_identical | fa155358dc870992 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/STACK_PROFILES.md` | preserved_byte_identical | a7052620ab1e6ce7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/analytics-dashboard-generator/SKILL.md` | preserved_byte_identical | aab8b24ac1bd0f7c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/data-analytics/data-mesh-implementation/SKILL.md` | preserved_byte_identical | 340e27cade164e6f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/configuration-management/SKILL.md` | preserved_byte_identical | 39a21d0465c92dc0 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/build-optimization/SKILL.md` | preserved_byte_identical | 6c00471dfc366a9c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/stack-profile-manager/SKILL.md` | preserved_byte_identical | d82f5b4ec42e457b |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/ci-cd-pipeline-orchestrator/SKILL.md` | preserved_byte_identical | 99d46c3b3d3eb994 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/cloud-migration/SKILL.md` | preserved_byte_identical | 37c72543ab55958b |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/zero-trust-architecture/SKILL.md` | preserved_byte_identical | bae14a56068d3be2 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/devops-infra/alerting-and-monitoring/SKILL.md` | preserved_byte_identical | a4a19cd90199dfde |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/skill-quality-gate/SKILL.md` | preserved_byte_identical | 09867732dc45ea7d |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/compliance-evidence-pack/SKILL.md` | preserved_byte_identical | b5d176d7af2b27d9 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/performance-budgeting/SKILL.md` | preserved_byte_identical | 4b2a97de6aa21afa |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/threat-modeling-framework/SKILL.md` | preserved_byte_identical | dcec31d0721004bb |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/skill-intake-and-triage/SKILL.md` | preserved_byte_identical | b8545e7efdfd1876 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/change-management-and-rollback/SKILL.md` | preserved_byte_identical | ac8f9c0c7c3fd333 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/multi-skill-orchestration/SKILL.md` | preserved_byte_identical | e50fbef9a2fe99e6 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/supply-chain-security/SKILL.md` | preserved_byte_identical | 4ab8cdebc928c5bf |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/technical-debt-analyzer/SKILL.md` | preserved_byte_identical | 53f25877bc204e24 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/risk-and-assumption-tracker/SKILL.md` | preserved_byte_identical | c934e0f46b4bcfbd |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/architecture-review-and-approval/SKILL.md` | preserved_byte_identical | 538945ab84a7d5c5 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/security-incident-response/SKILL.md` | preserved_byte_identical | b0e64cf846836b56 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/smart-refactoring-engine/SKILL.md` | preserved_byte_identical | 1478648f1dcc7870 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/compliance-checker/SKILL.md` | preserved_byte_identical | 2f740fb6cc3ef1ec |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/audit-logger/SKILL.md` | preserved_byte_identical | 46e0ed8d5ad6be3a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/meta/delivery-checklist-and-handoff/SKILL.md` | preserved_byte_identical | 4656c24951d11b56 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/security-hardening-auditor/SKILL.md` | preserved_byte_identical | 508bcdb23d20d1b0 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/performance-optimizer/SKILL.md` | preserved_byte_identical | 756de89c482c6594 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/certificate-manager/SKILL.md` | preserved_byte_identical | 98a0e284b513b850 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/api-security-enforcer/SKILL.md` | preserved_byte_identical | 21be75d3e69b343f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/secrets-management/SKILL.md` | preserved_byte_identical | c91f424c2f4a75bb |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/authentication-system-builder/SKILL.md` | preserved_byte_identical | 41f417e38aa0a76f |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/memory-leak-detector/SKILL.md` | preserved_byte_identical | 17b74c10493557ce |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/data-privacy-guardian/SKILL.md` | preserved_byte_identical | d76ed67cbd622df1 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/access-control-matrix/SKILL.md` | preserved_byte_identical | 1b8f02ef751e34fd |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/penetration-testing-runner/SKILL.md` | preserved_byte_identical | acb2ea27703063cb |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/security-compliance/container-security-scanner/SKILL.md` | preserved_byte_identical | 21425e9e766c4213 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/code-duplication-remover/SKILL.md` | preserved_byte_identical | c1b303169400b8e7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/logging-optimizer/SKILL.md` | preserved_byte_identical | 4614261d32024a2a |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/bundle-size-optimizer/SKILL.md` | preserved_byte_identical | cf392cbf92afb0b0 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/dead-code-eliminator/SKILL.md` | preserved_byte_identical | 7702c18031b69408 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/cache-strategy-implementer/SKILL.md` | preserved_byte_identical | dcc187d21e9a6627 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/api-response-optimizer/SKILL.md` | preserved_byte_identical | d9a89ae3733f0981 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/code-complexity-reducer/SKILL.md` | preserved_byte_identical | 0d1e53100f442596 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/error-handling-standardizer/SKILL.md` | preserved_byte_identical | 8f89d407e53fa6a8 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/container-image-optimizer/SKILL.md` | preserved_byte_identical | b5ef182f7e3c3e6e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/dependency-updater/SKILL.md` | preserved_byte_identical | fc003ba842fc5825 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/maintenance-optimization/database-query-optimizer/SKILL.md` | preserved_byte_identical | 367ae261465204e7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/markets-and-play/jev-trader/SKILL.md` | preserved_byte_identical | db0a4f8466eef869 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/markets-and-play/typesafe-mario/SKILL.md` | preserved_byte_identical | b73bdfd3adb1ba19 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/markets-and-play/onevonejev/SKILL.md` | preserved_byte_identical | 34cf26c8e41db83c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/markets-and-play/prism/SKILL.md` | preserved_byte_identical | 593a961c6903f129 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/agentic-levels/jev-advanced-use-cases/SKILL.md` | preserved_byte_identical | e7fa96a755632983 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/build-and-judge/killmyidea/SKILL.md` | preserved_byte_identical | 74a1efecd0b1a697 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/build-and-judge/jev-curate/SKILL.md` | preserved_byte_identical | a2b350102a982507 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/agentic-levels/jev-10-levels-agentic-engineers/SKILL.md` | preserved_byte_identical | acd873aa2c77c7e2 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/context-and-memory/winnow/SKILL.md` | preserved_byte_identical | d3e2207e3425d5dc |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/agents-that-act/jev-ultrafast/SKILL.md` | preserved_byte_identical | d530dc54770d2b28 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/build-and-judge/canny/SKILL.md` | preserved_byte_identical | 59cd6f71e4546f56 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/dev-workflow/typesafe-mcp/SKILL.md` | preserved_byte_identical | 2772d8e39571028c |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/agents-that-act/blink/SKILL.md` | preserved_byte_identical | 594f56324c343396 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/build-and-judge/json-render/SKILL.md` | preserved_byte_identical | 6d387762060deab5 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/agents-that-act/agent-desktop/SKILL.md` | preserved_byte_identical | bc0a0116457d99b7 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/agents-that-act/jev-drone/SKILL.md` | preserved_byte_identical | e5b45ed4fe0e5724 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/context-and-memory/semdecide/SKILL.md` | preserved_byte_identical | 0fed93615f9b03bd |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/dev-workflow/jev-review/SKILL.md` | preserved_byte_identical | 7067be21e1e5208e |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/context-and-memory/fast-jev-compaction/SKILL.md` | preserved_byte_identical | dd86a0aca6e88089 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/dev-workflow/jev-codex-router/SKILL.md` | preserved_byte_identical | 4b273c75efae88df |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/context-and-memory/neo4jev/SKILL.md` | preserved_byte_identical | 356e3403a653e642 |
| `.kilo/worktrees/abangcolek-logo-theme-20261017/skills/jev-core/dev-workflow/jev-mcp/SKILL.md` | preserved_byte_identical | 4589e3bcf29bc2dc |
