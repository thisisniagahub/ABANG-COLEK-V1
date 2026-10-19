# Prompt 03 — Financial Integrity, Sepuluh Modul dan Advanced Tools

Baca [kontrak utama](IMPLEMENT-ABANGCOLEK.md), blueprint sections5–8 dan [advanced registry](../design/copilot-advanced-tools.md). **Bahagian03A selepas00 sebelum01** membetulkan integriti source sedia ada. **Bahagian03B selepas02** melaksanakan AT-0..3. Kedua-duanya wajib; tiada broad generic write tool.

## Keutamaan dan ownership

Domain owner memegang finance/order/inventory/dealer/loyalty rules; registry owner hanya membina adapters dan projection. Reviewer security/domain bebas. Pecahkan batch mengikut satu transaksi/test boundary, bukan semua domain serentak.

## Langkah wajib

### 03A — Integriti sebelum restructure

Langkah1–3 di bawah serta gates tambahan berikut dilakukan pada source locations semasa sebelum01. Semua tests sedia ada direconcile dengan worktree; jangan mengaktifkan feature berisiko yang gagal.

- AI-01/02: pada agent/router semasa, buang fabricated margin/confidence/provider attribution/action claims, validate history/decision input, tambah deadline dan free-only fail-closed behavior. Jika adapter sebenar belum ada, disable inference/command terjejas dan nyatakan sebab; jangan mempertahankan fake success.
- OFF-01: draf akaun-scoped, logout/thread isolation, server reprice/revalidate, perubahan harga memerlukan review, same-payload stable idempotency dan retry tanpa order berganda. Offline draft bukan reservation.
- SEC-01: token generation/hash/private projection dan lifecycle ADR-0003 (initial14 hari; confirmed handover extension14 hari bagi token masih sah; expired/revoked hanya authenticated reissue). Implement revoke, no-store/referrer/log redaction/rate limits dan negative ID-only access. Unknown city tidak direka. Uji actual HTTP response, lifecycle, replay dan logging.
- SEC-02: dealer cross-org dan staff/outlet access ditolak di query/command/exports; frontend filter bukan security.
- PD-01: consent tujuan/channel dan revoke dicek semula ketika dispatch; queued promotion disekat. Jika transport belum tersedia, negative tests dan disabled state jelas.
- REF-01/02: semak Wi-Fi false positives dan server-side self-referral. OTP/payment fingerprint belum verified -> reward activation blocked/manual review bersebab; jangan membuat synthetic risk score lalu claim production engine.
- STK-01/OPS-01/LOY-01: last-unit race, quarantined/expired lots, received return QC, loyalty expiry/double-spend serta rollback diuji bersama refund/commission.
- FIN-01 dan PAY-01..03: laksanakan langkah1–3 berikut; gateway live proof kekal blocked jika akses tiada. Checkpoint03A menyenaraikan setiap ID pass/blocked dan capability yang disabled, kemudian sambung01.

### 03B — Registry/tools selepas foundation

Langkah4–10 dilaksanakan selepas02 dengan canonical domain rules yang telah ditutup pada03A.

1. Tulis/confirm failing tests untuk margin amount-vs-ratio, missing cost/provenance, shipping allocation, expected-vs-realized loss dan server rejection client-supplied totals. Implement integer sen/policy versions seperti blueprint.
2. Tulis tests partial/repeated refund, cumulative cap, per-line commission allocation, loyalty reversal/expiry, returned-stock QC dan full rollback apabila satu domain gagal. Projection boleh berubah; history earning/payout/contra tidak dipadam.
3. Betulkan transition guards dan provider evidence. Implement Billplz adapter hanya menggunakan official verified canonicalization/account/order/amount/currency matching. Missing sandbox credentials -> adapter tests synthetic dan live PAY rows blocked; jangan tandakan gateway verified atau pindah provider.
4. Implement free-only tool registry Q/S/D/C/X, input/output schema, grants/resource scope, availability, revisions, idempotency, deadline dan provenance. `execute_approved_action` menerima proposal reference tersimpan, bukan arbitrary code/action.
5. AT-1 query/simulation dahulu, AT-2 preview/draft, kemudian AT-3 approved execution/reconciliation/private exports. Naming dan risk class tetap; ADV-26 dipecah registrations seperti spec. Update logical vs registered counts.
6. MOD-01..10: setiap modul mempunyai read/evaluation/draft journey berizin. Lengkapkan contracts carian/perbandingan produk, cart draft, tracking, dealer settlement, document summary dan automation proposal; jangan anggap generic search melengkapkan semua.
7. Context discovery maksimum8 schemas relevan; pagination50/context refs20; shared run budget seperti registry. Authorize setiap record, redact field dan invalidation selepas revoke. Bounded aggregate menggantikan N+1; cache bukan financial authority.
8. Consent marketing disemak pada dispatch termasuk queued work. Draft bukan send; provider activation/idempotent intent/outcome reconciliation diperlukan sebelum external effect. Jangan menghantar mesej sebenar untuk membuktikan code tanpa scope ujian yang sah.
9. Risk/OTP customer referral dependency tiada -> insufficient_data/manual review atau disabled activation mengikut domain policy, bukan score rekaan. Dealer referral tests bukan bukti customer OTP engine.
10. Private artifacts mempunyai permission semasa download, retention/hash, limits dan CSV injection protection. Diagnostic tools tidak output raw env/secret/PII.

## Acceptance

Run domain tests dan integration suite, termasuk last-unit race, multi-scope batch, cache revoke, stale quote/approval, unknown outbound outcome dan CAS. UI/report mesti sepadan canonical amounts. Independent review sebelum commit. Semua ADV/MOD rows mempunyai evidence atau exact disabled dependency; tiada register-ready berasaskan nama sahaja. Update checkpoint04.
