# Blueprint v2.3 — Domain, financial integrity dan operational gates

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../docs/CURRENT-STATUS.md) · [Checklist](../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh: 20 Oktober 2026, Asia/Kuala_Lumpur. Skop: review baca sahaja terhadap master blueprint sections 1–8 dan 10–14, prompt pelaksanaan serta registry berkaitan. Hanya laporan ini ditulis. Tiada suite aplikasi, provider inference, migrasi, restore, deployment atau ujian browser dijalankan. Dapatan source di bawah ialah pemeriksaan statik, bukan keputusan runtime.

## Keputusan review

Kontrak asas kukuh: local SQLite dan cloud CAS dibezakan, Rules Own The Money jelas, refund/commission append-only, consent diperiksa semasa dispatch, serta status evidence tidak menganggap dokumen sebagai implementasi. Namun arahan “tanpa keputusan pilihan” belum benar-benar deterministik pada allocation/rounding, nama dan kiraan tool tambahan, late payment, privacy retention dan recovery cloud. Pelaksana masih boleh menghasilkan implementasi berbeza yang semuanya nampak mematuhi ayat semasa.

Keputusan teknikal ADR-0003 perlu dikekalkan. Dapatan berikut tidak mencadangkan stack, provider atau authority baharu.

## Dapatan mengikut keutamaan

### D-01 — P1: Semakan margin boleh meluluskan ratio di bawah minimum selepas rounding paparan

- Requirement: `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md:164` mewajibkan integer sen/basis points tetapi menyerahkan rounding/allocation supaya “eksplisit”; `:194` menyekat ratio di bawah minimum.
- Source: `server/platform/marginGuardian.ts:24` membundarkan ratio kepada dua perpuluhan sebelum membandingkannya pada `:27`. Salinan algoritma juga berada di `shared/growth-contracts.ts:128` dan `:131`; shared masih mempunyai fungsi domain kewangan, sedangkan blueprint meletakkan rules dalam domain modules.
- Counterexample statik: net sales 100,000 sen, jumlah kos 75,004 sen, contribution 24,996 sen dan threshold 25% menghasilkan ratio sebenar 24.996%, lalu dibundarkan kepada 25.00% dan lulus jika minimum amount lulus. Ini pengiraan daripada source, bukan test yang telah dijalankan.
- Pembetulan kontrak: eligibility membandingkan `contribution_sen * 10000 >= net_sales_ex_tax_sen * minimum_margin_bps` tanpa rounding paparan; gunakan integer arithmetic dengan overflow guard atau BigInt. Ratio paparan dibundarkan selepas keputusan. Net sales <=0 tidak mempunyai eligible ratio. Tetapkan satu implementasi canonical; shared hanya membawa kontrak/pure validation, tanpa salinan rule yang boleh drift.
- Acceptance tambahan FIN-01: 24.996% lawan 25% mesti ditolak; tepat 25% lulus jika syarat lain lulus; numerator/denominator besar tidak overflow; zero/negative denominator disekat; client-supplied ratio tidak dipercayai. Nilai threshold komersial sebenar kekal finance-owner gate.

### D-02 — P1: Allocation dan refund masih memerlukan keputusan kewangan yang tidak boleh direka oleh coding agent

- Evidence: blueprint `:180–192` menjelaskan bucket kos/double counting dengan baik, tetapi `:228` hanya menyebut “line allocation, cumulative cap dan rounding”. Prompt `docs/prompts/03-domains-and-tools.md:28–30` meminta implementasi tanpa menetapkan algoritma allocation. Blueprint `:260–266` pula meninggalkan attribution, earning trigger, expiry/stacking dan risk thresholds untuk ditetapkan.
- Kesan: refund beberapa line, diskaun order-wide, partial quantity, shipping refund dan residual satu sen boleh menghasilkan reversal berlainan. Contoh komisen RM10/RM2 tidak menguji residual atau repeated partial refunds. Source `server/platform/dealers.ts:197–217` menerima amount contra dan tidak mempunyai refund ID/line allocation dalam input itu; ia bukan bukti PAY-03 lengkap.
- Pembetulan kontrak: pin allocation teknikal sebelum 03A: asas eligible line berasal daripada sale snapshot; residual diagih secara deterministik dan stable tie-break mengikut line ID; cumulative refund/reversal dikira semula daripada cumulative successful refunds kemudian ditolak posting terdahulu. Jangan round setiap callback secara bebas. Semak dengan finance owner bahawa asas ini sepadan polisi sedia diluluskan; jika tiada, gunakan synthetic tests dan `insufficient_data`/disabled financial execution.
- Acceptance PAY-03/LOY-01: tiga line dengan residual satu sen; refund satu line dalam tiga attempts berbanding satu attempt menghasilkan jumlah sama; replay refund ID tidak menambah posting; jumlah reversal tidak melebihi earning asal; shipping/fee/refund dasar tidak tersirat. Commission rates, refund entitlement, loyalty expiry, attribution window dan post-payout deficit offset ialah business authorization, bukan pilihan implementer.

### D-03 — P1: Late successful payment tidak mempunyai transition penyelesaian yang lengkap

- Evidence: blueprint `:207` memberi `pending -> paid/failed/expired/cancelled` dan melarang callback lewat menurunkan paid, tetapi tidak menetapkan provider mengesahkan bayaran selepas attempt expired/cancelled atau order sudah dibatalkan. Prompt 03 `:30` meminta “betulkan transition guards” tanpa outcome ini. PAY-01/02 hanya menamakan dedupe dan redirect.
- Kesan: pelaksana boleh membuang callback sah sebagai invalid transition, menghidupkan semula order tanpa stok, atau menyamakan provider paid dengan order fulfilment approved. Dedupe callback sahaja tidak menutup jurang ini.
- Pembetulan kontrak: receipt provider yang sah direkod secara immutable tanpa memaksa order kembali ke keadaan lama. Pisahkan keadaan wang diterima daripada order/stock eligibility; jika order/stok tidak lagi layak, tahan fulfilment dan tandakan reconciliation/manual review dengan reason code yang tetap. Automatic refund hanya selepas polisi refund dan provider activation yang sah. Ini cadangan pembetulan state contract; ia belum diimplementasi.
- Acceptance PAY-01/PAY-02/STK-01: timeout diikuti successful reconciliation; success selepas expired/cancelled; dua payment attempts yang kedua-duanya paid; jumlah/currency/account mismatch; callback tiba selepas stok dilepaskan kepada order lain; paid tidak turun selepas event failed lama. Setiap kes menyimpan receipt dan tiada double fulfilment/refund.

### D-04 — P1: DR-01 boleh kelihatan lengkap melalui metadata walaupun backup tidak lagi boleh dipulihkan

- Evidence: blueprint `:349–353` meminta manifest/retention, RPO <=4h dan RTO <=30m tetapi schedule/durable target/retention cloud belum dipilih. Prompt `docs/prompts/06-release.md:11` meminta clean restore tanpa menyatakan source cloud snapshot + private evidence export yang dipakai. Runbook `docs/runbooks/platform-recovery.md:131` masih menyerahkan retention/encryption/off-site copy kepada operator.
- Source yang memang wujud: `server/platform/backupScheduler.ts:7–10` mempunyai default local 4h/6 snapshots; `:96–98` menggunakan directory tempatan; `:349–361` menggunakan interval in-process. `checkRpoStatus` pada `:281–308` hanya membaca metadata status verified/createdAt; ia tidak memanggil `verifySnapshot` pada `:241–274`. Snapshot yang failnya hilang boleh mempunyai metadata usia muda. Cloud evidence berada dalam adapter berasingan `server/platform/supabasePersistence.ts:102–115`, sedangkan backup tempatan membaca filesystem pada `server/platform/backup.ts:27–31`.
- Pembetulan kontrak: 00 wajib merekod backend pemulihan setiap runtime yang telah authorized, snapshot history target, export evidence, scheduler identity, retention, encryption/key recovery dan owner alarm. Jika remote backup target belum tersedia, cloud DR-01 `blocked_external`; local drill tidak menutup cloud row. Jangan memilih storage provider baharu. RPO readiness mengambil latest recoverable verified bytes dan evidence manifest, bukan timestamp metadata sahaja. RPO sebenar termasuk tempoh job backup, bukan hanya start interval 4h.
- Acceptance DR-01: delete/corrupt physical snapshot dengan metadata masih verified; evidence object hilang; scheduler restart/missed run; incomplete upload; target recovery bebas; transaksi terakhir dan jumlah ledger diperiksa; masa RPO/RTO diukur. Tiada dakwaan RPO/RTO dicapai dalam review ini.

### D-05 — P2: Sepuluh module IDs dan additional tool names belum dipakukan walaupun count menjadi release gate

- Evidence: prompt utama `docs/prompts/IMPLEMENT-ABANGCOLEK.md:79` mewajibkan MOD-01..10 dan ADV-01..32; prompt03 `:33` memerintahkan melengkapkan kontrak tambahan. Registry `docs/design/copilot-advanced-tools.md:17–28` menyenaraikan sepuluh modul tanpa ID MOD. `:30` menyerahkan keputusan specialization versus capability baharu kepada pelaksana serta meminta registry/version/count dikemas kini.
- Kesan: dua agent boleh memberi MOD-03 kepada modul berlainan atau menambah tool baharu sambil masih melaporkan ADV32; “semua modul siap” tidak boleh diperiksa secara stabil. Ini bukan kekurangan jumlah tool semata-mata; identiti acceptance tidak tetap.
- Pembetulan kontrak: tambah MOD-01 Storefront, MOD-02 Orders, MOD-03 Inventory, MOD-04 QC/JEV, MOD-05 Dealer, MOD-06 Loyalty/referral, MOD-07 Marketing, MOD-08 Finance/day-close, MOD-09 Tasks/documents/SOP, MOD-10 Automations/integrations mengikut urutan semasa. Bekukan tambahan search_catalogue/compare_products/prepare_cart_draft/get_order_tracking/explain_dealer_settlement/summarize_document/propose_automation sebagai named specializations dengan parent ADV ID dan input/output/role schemas. Jika disahkan capability baharu, lakukan keputusan registry-version/count yang direview sebelum code, bukan penambahan senyap.
- ADV-26 sudah diperbetulkan dengan baik: registry `:95–97` menetapkan tiga registration berlainan Q/X/C. Kekalkan pemisahan logical capability vs registered function; jangan memaksa jumlah functions sama dengan32.

### D-06 — P2: Retention/privacy approval menjadi gate tetapi tidak mempunyai artefak keputusan yang tepat

- Evidence: blueprint `:51–52` meminta retention draft, `:253` evidence private, `:268` marketing consent, `:298` memory retention/pemadaman dan `:411` business-owner approval. Registry `:42` mempunyai data classification; free policy `docs/research/2026-10-19-free-model-policy.md:41,52,56` mempunyai account/terms/privacy/TTL gates. Namun tiada schema decision register yang memadankan data class, purpose, provider, retention dan deletion behavior kepada activation.
- Kesan: agent boleh memilih tempoh simpan, menghantar evidence/PII ke offering free yang tidak sesuai, atau menganggap opt-out marketing turut memadam rekod kewangan yang perlu dikekalkan. Sebaliknya agent juga boleh menyekat seluruh kerja kerana satu polisi belum ditandatangani.
- Pembetulan kontrak: 00 menghasilkan policy-decision table dengan owner, effective version, purpose/channel, eligible data classes, approved processors/account tier, retention/deletion/export behavior, decision evidence dan activation status. Runtime menggunakan approved version dan default deny untuk kombinasi belum diluluskan. Test/dev menggunakan data sintetik; kemampuan bebas diteruskan. Jangan mencipta tempoh undang-undang atau menganggap semua rekod perlu dipadam serentak.
- Acceptance PD-01/AI-01/SEC-02: queued promotion selepas revoke tidak dihantar; consent tujuan A tidak mengizinkan channel B; provider privacy verification expired ditolak; deletion request tidak memadam ledger/receipt tanpa polisi yang sah; request scope tidak meluas selepas tool chaining.

### D-07 — P2: “Keputusan terbuka” boleh dibaca sebagai izin memilih semula keputusan ADR yang telah tetap

- Evidence: blueprint `:402–411` masih meletakkan “ADR runtime/CAS” dan “SDK/protokol” dalam jadual keputusan terbuka; ADR-0003 `:12–23` dan prompt utama `:19–32` sudah memakukan authority, SDK, agent ID, model order, ports, MCP App dan Intelligence gate.
- Pembetulan kontrak: ubah label deliverable kepada “verification/capacity evidence untuk runtime/CAS yang telah dipilih” dan “compatibility/adapter evidence untuk SDK/protokol ADR-0003”. Keputusan teknikal hanya dibuka semula melalui ADR pembetulan yang boleh direview selepas blocker nyata. Kekalkan business/provider approval gates secara jelas; arahan jangan tanya stack tidak bermaksud user sudah meluluskan komisen, inference, subscription atau deploy.

## Apa yang sudah tetap dan boleh diteruskan tanpa meminta pilihan stack

| Kelas | Keputusan yang sudah ditetapkan | Had authority |
|---|---|---|
| Architecture/runtime | React/Vite+Bun modular monolith; local SQLite; cloud whole-snapshot Supabase CAS | Tidak mengizinkan cutover/restore atau DB root baharu |
| Copilot/protocol | SDK /v2, Fetch runtime, ADK Python/AG-UI; agent ID dan tiga specialist tetap | Metadata pin belum membuktikan compatibility runtime |
| UI tools | GUI01..07, Fixed Schema, first-party read-only Operations Brief MCP App | Tiada arbitrary third-party connectors atau ledger writes melalui frontend |
| Inference | Exact candidate order ADR; eligibility/terms/privacy/tool eval; tiada paid fallback | Candidate list bukan kebenaran menghantar PII atau proof account free |
| Tracking | Initial14 hari; confirmed handover +14 hari bagi token masih sah; reissue authenticated | Lifecycle ini sasaran, bukan fungsi semasa yang telah verified |
| Execution | 00 ->03A ->01 ->02 ->03B ->04 ->05 ->06; independent review dan evidence per batch | Blocked external row tidak menghentikan kerja bebas |

## Keputusan yang masih memerlukan business/account authorization

- Harga/kos sebenar, minimum margin, eligible products, commission/reward rates, attribution/stacking/earning trigger, expiry dan refund entitlement. Test constants bukan polisi perniagaan diluluskan.
- Post-payout deficit recovery/offset serta appeal/dispute terms.
- Consent purpose/channel, retention/deletion/data handling dan penggunaan evidence/PII oleh model atau Intelligence.
- Provider account eligibility/credentials dan integration activation; permission deploy yang masih sah; remote data restore/cutover.

Default apabila bukti gate tiada: synthetic/local work diteruskan, capability tepat disabled/blocked dengan reason, tiada nilai komersial direka dan tiada paid/provider/architecture alternatif dipilih.

## Pemeriksaan acceptance IDs

Master table di `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md:365–383` mengandungi tepat **19 row,19 ID unik**. Kiraan diekstrak daripada row table menggunakan regex PowerShell; ini pemeriksaan dokumen, bukan suite aplikasi.

`FIN-01`, `PAY-01`, `PAY-02`, `PAY-03`, `STK-01`, `OFF-01`, `REF-01`, `REF-02`, `LOY-01`, `SEC-01`, `SEC-02`, `DR-01`, `AI-01`, `AI-02`, `AI-03`, `PD-01`, `OPS-01`, `ARC-01`, `REL-01`.

CPK10+GUI7+MOD10+ADV32 ialah59 logical rows; bersama master19, jumlah minimum ialah78 requirement rows merentas dimensi yang berbeza. Registered tool tests boleh melebihi32 dan evidence boleh menyokong lebih satu requirement. Angka78 bukan jumlah test dan bukan keputusan lulus.

## Cadangan pembetulan prompt yang paling segera

1. Tambah artefak `domain-policy-decisions` dalam 00: technical allocation/rounding contract, module IDs, approved commercial/privacy policy versions dan blocked reasons. Wujudnya fail tidak dikira approval; rujuk decision evidence sebenar.
2. Tambah counterexample threshold rounding dan cumulative allocation fixtures kepada 03A sebelum restructuring.
3. Tambah late success/payment conflict cases dan safe reconciliation outcome kepada 03A; tiada automatic order resurrection.
4. Bekukan MOD IDs dan specialization parent mappings sebelum03B supaya workers tidak memilih count/schema berlainan.
5. Pisahkan DR-01 local/cloud evidence dan pastikan recoverable bytes/evidence, scheduler serta measured time menutup row. Jangan menggunakan local interval atau latest CAS snapshot sebagai bukti cloud historical recovery.
6. Bezakan operational fixed decision daripada business/account/deployment authorization dalam section14 dan setiap checkpoint.

Tiada pembetulan aplikasi atau dokumen sumber dilakukan dalam review ini. Semua cadangan acceptance di atas masih perlu dilaksanakan dan dijalankan sebelum mana-mana capability dilabel verified.
