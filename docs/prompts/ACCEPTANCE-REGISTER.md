# Register Acceptance — Blueprint v2.4

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh: 20 Oktober 2026. **78 requirement teras = 10 CPK + 7 GUI + 10 MOD + 32 ADV + 19 master**, ditambah 7 EXT dengan gates berasingan. Ini requirement rows, bukan jumlah tests atau keputusan lulus.

**Paparan snapshot, bukan acceptance publish baharu:** ledger pada `2026-10-20T13:30:00Z` merekod 38 `verified_local`, 37 `implemented_unverified`, 9 `blocked_external` dan 1 `not_run`. Tiada status `verified_production_ready` diterima sebagai bukti semasa. [Current status](../CURRENT-STATUS.md) menerangkan provenance dan jurang tambahan source; [checklist](../../PROJECT-CHECKLIST.md) mengekalkan final integration checkboxes unchecked sehingga ada current evidence. Alignment ini tidak menjalankan atau memintas verification gate.

## CPK — 10 requirements

| ID | Deliverable wajib | Owner phase | Status review |
|---|---|---|---|
| CPK-01 | Chat | 02/04 | blocked_external |
| CPK-02 | AG-UI Streams | 05 | implemented_unverified |
| CPK-03 | Automatic Learning | 05 | blocked_external |
| CPK-04 | Generative UI | 04 | implemented_unverified |
| CPK-05 | Declarative UI | 04 | implemented_unverified |
| CPK-06 | Human-in-the-loop | 03A/04 | implemented_unverified |
| CPK-07 | Frontend tools | 04 | implemented_unverified |
| CPK-08 | Shared state | 02/04 | implemented_unverified |
| CPK-09 | Headless UI | 02/04 | verified_local |
| CPK-10 | Sub-agents | 04 | implemented_unverified |

## GUI — 7 requirements

| ID | Deliverable wajib | Owner phase | Status review |
|---|---|---|---|
| GUI-01 | Display Only | 04 | implemented_unverified |
| GUI-02 | Interactive | 04 | implemented_unverified |
| GUI-03 | Tool Rendering | 04 | implemented_unverified |
| GUI-04 | State Rendering | 04 | implemented_unverified |
| GUI-05 | MCP Apps | 04 | implemented_unverified |
| GUI-06 | A2UI | 04 | implemented_unverified |
| GUI-07 | Your Components | 04 | implemented_unverified |

## MOD — 10 requirements

| ID | Deliverable wajib | Owner phase | Status review |
|---|---|---|---|
| MOD-01 | Storefront & katalog | 03B/04 | implemented_unverified |
| MOD-02 | Orders & tracking | 03B/04 | implemented_unverified |
| MOD-03 | Inventory | 03B/04 | verified_local |
| MOD-04 | QC & JEV | 03B/04 | verified_local |
| MOD-05 | Dealer & komisen | 03B/04 | verified_local |
| MOD-06 | Loyalty & referral | 03B/04 | verified_local |
| MOD-07 | Marketing | 03B/04 | verified_local |
| MOD-08 | Finance & day-close | 03B/04 | implemented_unverified |
| MOD-09 | Tasks, documents & SOP | 03B/04 | implemented_unverified |
| MOD-10 | Automations & integrations | 03B/04 | verified_local |

## ADV — 32 requirements

| ID | Deliverable wajib | Owner phase | Status review |
|---|---|---|---|
| ADV-01 | `discover_capabilities` Q | 03B | verified_local |
| ADV-02 | `search_records` Q | 03B | verified_local |
| ADV-03 | `build_context_bundle` Q | 03B | verified_local |
| ADV-04 | `explain_record` Q | 03B | verified_local |
| ADV-05 | `diagnose_checkout` S | 03B | implemented_unverified |
| ADV-06 | `reconcile_payments` Q | 03B | verified_local |
| ADV-07 | `preview_refund` S | 03B | implemented_unverified |
| ADV-08 | `propose_refund` D | 03B | verified_local |
| ADV-09 | `assess_expiry_risk` S | 03B | verified_local |
| ADV-10 | `plan_restock` S | 03B | verified_local |
| ADV-11 | `trace_batch` Q | 03B | verified_local |
| ADV-12 | `propose_quarantine` D | 03B | verified_local |
| ADV-13 | `simulate_campaign` S | 03B | verified_local |
| ADV-14 | `explain_commission` Q | 03B | verified_local |
| ADV-15 | `audit_loyalty` Q | 03B | implemented_unverified |
| ADV-16 | `assess_referral` S | 03B | verified_local |
| ADV-17 | `reconcile_dayclose` S | 03B | implemented_unverified |
| ADV-18 | `build_finance_digest` Q | 03B | verified_local |
| ADV-19 | `trace_transaction` Q | 03B | verified_local |
| ADV-20 | `export_report` C | 03B | implemented_unverified |
| ADV-21 | `triage_case` S | 03B | implemented_unverified |
| ADV-22 | `plan_consignment` S | 03B | verified_local |
| ADV-23 | `draft_customer_reply` D | 03B | implemented_unverified |
| ADV-24 | `build_action_plan` S | 03B | implemented_unverified |
| ADV-25 | `execute_approved_action` C/X | 03B | verified_local |
| ADV-26 | `reconcile_action` Q/C/X | 03B | implemented_unverified |
| ADV-27 | `inspect_runtime` Q | 03B | verified_local |
| ADV-28 | `review_skill_candidate` S | 05 | verified_local |
| ADV-29 | `search_sop` Q | 03B | verified_local |
| ADV-30 | `propose_task` D | 03B | verified_local |
| ADV-31 | `evaluate_job_retry` S | 03B | verified_local |
| ADV-32 | `draft_campaign` D | 03B | verified_local |

## FIN/PAY/STK/OFF/REF/LOY/SEC/DR/AI/PD/OPS/ARC/REL — 19 requirements

| ID | Deliverable wajib | Owner phase | Status review |
|---|---|---|---|
| FIN-01 | Amount lulus, ratio gagal menyekat kempen; override berizin/audit | 03A | verified_local |
| PAY-01 | Callback gateway pendua tidak menggandakan order/ledger | 03A | blocked_external |
| PAY-02 | Redirect sahaja tidak mengesahkan paid | 03A | blocked_external |
| PAY-03 | Partial/post-payout refund tepat, append-only dan deduplicated | 03A | verified_local |
| STK-01 | Perebutan unit terakhir tidak oversell; kegagalan rollback | 03A | verified_local |
| OFF-01 | Reconnect revalidate, semak perubahan dan retry tanpa pendua | 03A/04 | implemented_unverified |
| REF-01 | Identiti berbeza pada Wi-Fi sama tidak ditolak semata-mata IP | 03A | not_run |
| REF-02 | Self-referral ditolak; dealer/customer reward berasingan | 03A | verified_local |
| LOY-01 | Redemption atomik, expiry/reversal/retry mengekalkan baki | 03A | verified_local |
| SEC-01 | Token, expiry, redaction; ID sahaja tidak membenarkan akses | 03A | implemented_unverified |
| SEC-02 | Dealer silang rekod tidak mendapat data/kuasa | 03A/03B | verified_local |
| DR-01 | Restore database/evidence mencapai RPO/RTO diukur | 06 | implemented_unverified |
| AI-01 | Timeout/quota tidak memutus commerce; fallback tepat | 02 | implemented_unverified |
| AI-02 | Tiada kad rekaan atau dakwaan tindakan tanpa receipt | 02/03B/04 | implemented_unverified |
| AI-03 | Approval stale/expired/berulang atau gagal CAS tidak menggandakan command | 03A/04 | implemented_unverified |
| PD-01 | Opt-out menghalang promosi termasuk queued dispatch | 03A/03B | implemented_unverified |
| OPS-01 | Quarantine tidak dijual dan movement diaudit | 03A/03B | verified_local |
| ARC-01 | Import terlarang/cycle ditolak; client bebas server secrets | 01 | verified_local |
| REL-01 | Preview/production artifact dan config dikenal pasti | 06 | implemented_unverified |

## EXT-01..07 — gates tambahan

| ID | Deliverable | Phase | Default dan acceptance | Status review |
|---|---|---|---|---|
| EXT-01 | Inspector local | 02/04 | Local-only selepas compatibility; redaction, tiada public debug endpoint | implemented_unverified |
| EXT-02 | User Memories | 05 | Off sehingga eligible Intelligence/privacy/consent/retention/delete evidence | blocked_external |
| EXT-03 | Capture/Product Analytics/collector | 05 | Off; satu pipeline, non-PII allowlist, opt-out/delete, tiada duplicate collector | blocked_external |
| EXT-04 | Slack/Teams Channels | 05 | External delivery off; synthetic adapter tests, provider/auth/send authorization gate | blocked_external |
| EXT-05 | WebMCP own-app | 04 | Browser probe gate, bounded UI/context grants, tiada eval/cookies | blocked_external |
| EXT-06 | Voice | 04 | Gesture/mic permission, shared controller; external STT/TTS free/privacy gate | blocked_external |
| EXT-07 | Attachments/multimodal | 04 | Canonical private evidence; upload bukan vision, qualified model/data gate | implemented_unverified |
