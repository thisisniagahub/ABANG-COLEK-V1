# Domain policy decisions — initial baseline

<!-- COMMERCE-GROWTH-20261021:BEGIN -->
> **Amendment 21 Oktober 2026 — TARGET_DESIGN:** Keputusan produk tetap: setiap Agent/Stokis aktif mendapat public store + private workspace; customer referral satu peringkat dua hala. Gate business owner masih diperlukan untuk kadar/MOQ/fees, attribution window/first-last touch, hold/expiry/stacking, fulfilment/service area dan refund/consent terms. Implement config/versioning/validation + synthetic tests dahulu, tanpa menyalin kadar MadConomy atau mengaktifkan wallet/cashout. Missing reward policy menyekat reward tepat, bukan semua kerja P0 bebas.
>
> Rujukan: [spesifikasi canonical](../../docs/design/commerce-growth.md) · [handover lengkap](../../docs/prompts/COMMERCE-GROWTH-HANDOVER-20261021.md). Generated acceptance kekal berasaskan ledger dan receipt, bukan nota ini.
<!-- COMMERCE-GROWTH-20261021:END -->


<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../docs/CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Unknown is not approved. Existing source defaults/fixture values are not commercial approval. No production value is invented by this task.

| Gate | State | Owner/dependency | Safe continuation |
|---|---|---|---|
| Costs/margin/fees/refund/commission/loyalty values | POLICY_UNCONFIGURED pending actual policy evidence | Business owner via existing approved config | Test exact arithmetic/canonical provenance against synthetic fixtures; production fail closed where values absent |
| Application model offering/account/privacy | PROVIDER_ELIGIBILITY_UNVERIFIED | Account/data owner evidence | Synthetic protocol tests only; no paid fallback |
| Intelligence free project/data policy | blocked_external | Existing project/account/privacy evidence | Local independent features continue; no relabeling as Intelligence |
| Cloud DR target/keys/scheduler/retention | DR_POLICY_UNCONFIGURED | Authorized runtime/account owner | Disposable local restore tests only; no live overwrite |
| Payment/outbound sandbox/consent/send authority | not activated | Provider/business owner | Synthetic signature/dedupe/reconciliation tests; no real sends |
