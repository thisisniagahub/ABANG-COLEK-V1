
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Remaining release completion plan

User authorizes finishing remaining tasks while leaving MCP setup aside. Preserve unrelated dirty files, running business database and all prior reviewed commits. Do not fabricate provider credentials or successful external outcomes.

1. Inspect and regression-pin the remaining review findings. Implement independent fixes for outbound intent/idempotency, canonical onboarding settings and import accounting. Keep provider adapters absent until actual credentials/transports are available.
2. Implement bounded first-party cloud job execution with a secure worker boundary and truthful scheduler readiness. A configured automation definition is not proof an arbitrary instruction can execute; unsupported schedules/providers must fail explicitly.
3. Bound hosted response/export sizes and add redacted production diagnostics. Preserve local export behavior and signed authorization.
4. Validate the user-applied Supabase SQL using actual service-only access once server credential is configured. Verify privileges, snapshot persistence and private evidence. Never print keys.
5. Run focused regressions, strict types, complete unit/coverage and meaningful browser checks on final source. Independent post-implementation security/code review is mandatory.
6. Commit only reviewed changes; reconcile remote main without force; push and verify Vercel deployment for the exact SHA after production configuration gates pass. Inspect logs, served favicon/JSON routes and canonical session/persistence, not just deployment Ready.

External gates: SUPABASE_SERVICE_ROLE_KEY is not yet configured in Vercel; GitHub Actions billing previously blocked runners. Do not conceal either failure, delete business data, or bypass browser approval.

### Canonical Google identity completion
1. Add focused failing verifier and canonical identity security tests.
2. Verify Supabase user over trusted HTTPS with bounded response and timeout; only confirmed Google identities accepted.
3. Persist issuer/subject binding atomically; never attach existing email or grant provider-supplied roles; deny revoked membership.
4. Add PKCE callback with tab-bound pending state and canonical session exchange, then focused tests/typecheck and independent review.

### Owner onboarding policy UI
Expose optional location/dealer policy drafts with explicit owner approval, real settings version, stale conflict reload and truthful saved counts. Preserve draft product approval. Verify focused browser regression and strict types.
