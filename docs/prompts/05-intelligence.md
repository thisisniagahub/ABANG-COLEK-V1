# Prompt 05 — Intelligence Streams dan Reviewed Learning

Baca [kontrak utama](IMPLEMENT-ABANGCOLEK.md), ten-feature Tasks7–8 dan checkpoint04. Fasa ini **tidak membenarkan bayaran, subscription, project baharu atau penghantaran data luar secara automatik**.

## Gate yang wajib

Semak offering/project yang sudah tersedia, owner identity, terms/licensing, free eligibility/quota, credentials server-side, retention/export/delete dan data scope. Jika gate tiada, rekod CPK-02/03 `blocked_external`, prerequisites tepat, dan teruskan fasa06 bagi kemampuan lain. Jangan memaksa login/upgrade atau memilih self-hosted Kubernetes untuk mengelak gate.

## Jika semua gate dipenuhi

1. Tulis tests cross-user thread, forged identity, replayed mutation, expired session, reconnect dan server death. Runtime resolves stable verified user; browser user ID tidak dipercayai.
2. Connect Intelligence adapter dengan mapping user/thread/ADK session dan exact approved data policy. Existing native persistence dikekalkan; history import sekali bukan replication penuh.
3. Verify CPK-02 refresh, reconnect, second-device continuation, restored cards/state dan no tool reexecution. Bezakan disconnect UI, stop request dan already-dispatched command. Streams bukan server-crash execution recovery.
4. CPK-03: satu container `abangcolek-qc-triage`; completed permitted/redacted QC workflows sahaja. Default ingestion off bagi finance/customer PII dan deny memory of secrets.
5. Gunakan threshold/schedule project sebenar. Review supporting runs -> candidate insight/skill -> eval -> human publish -> pinned delivery. Tiada immediate-learning promise, automatic approval atau model-weight training claim.
6. Skill tidak mengubah grants, pricing, commission/refund policy. Uji unpublished/foreign/incompatible revision rejection dan rollback kepada revision terdahulu.
7. Validasi export/delete/retention serta quota/cost controls. Tiada history dikirim semata-mata untuk cukupkan minimum count.

## Acceptance

CPK-02/03 hanya verified jika real project events/skills/delivery diuji dengan approved scope dan receipt. Manual SOP review atau app-owned history tidak dilabel sebagai produk Intelligence. Independent privacy/security review, evidence dan checkpoint06 diwajibkan.
