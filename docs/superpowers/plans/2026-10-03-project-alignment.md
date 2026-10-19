<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

<!-- ABANGCOLEK_DOC_AUTHORITY_V1 -->
> **HISTORICAL_PLAN — context diselaraskan 3 Oktober 2026.** Kandungan/metadata asal di bawah ialah bukti atau cadangan pada tarikh asal, bukan current runtime/authorization/release proof. Gunakan [Source of Truth](../../ABANGCOLEK-SOURCE-OF-TRUTH.md) dan [handover A–Z](../../handover/AGENT-HANDOVER-A-Z.md) untuk keputusan semasa. Server3000/3010 STOPPED pada snapshot20:25MYT; data kekal OS; Emons goal PAUSED. Native provider/benchmark/cost/complete claims perlu verifikasi sendiri.

# Pelan sintesis dan alignment ABANGCOLEK

Tarikh: 2026-10-03. Status: LOCAL_ALIGNMENT_VERIFIED — documentation/config alignment complete; runtime cutover, remote CI, production and paused hero remain separate gates.

## Skop

Jadikan checkout PLATFORM dan repo `thisidowgnut-source/ABANGCOLEK-PLATFORM` rujukan source untuk kerja seterusnya. Selaraskan dokumentasi dengan source yang dibaca. Kekalkan data/runtime aktif OS sehingga cutover dengan backup dan pengesahan selesai. Goal hero Emons kekal paused; alignment ini tidak menutupnya.

## Pelaksanaan

1. Audit entrypoint, roles, modules, legacy dan provider melalui subagents read-only.
2. Sahkan runtime aktif, lokasi data dan source drift sebelum menentukan cutover.
3. Sediakan `docs/ABANGCOLEK-SOURCE-OF-TRUTH.md`, `docs/PROJECT-ALIGNMENT-BACKLOG.md` dan `docs/README.md`.
4. Tulis semula README utama dan kemas kini runbook agar source PLATFORM dan runtime/data OS tidak bercampur tanpa penjelasan.
5. Buang UTF-8 BOM daripada package.json tanpa mengubah nilai JSON; pin Bun kepada versi packageManager yang tersedia; masukkan test:platform sebelum build dalam CI.
6. Tanda dokumen status lama sebagai snapshot sejarah melalui banner rujukan ke dokumen utama. Research asal dipelihara.
7. Jalankan strict JSON parse, lint, suite platform dan build. Rekod output semasa dan batasnya; jangan mendakwa CI remote atau production lulus tanpa run baharu.
8. Review diff, semak pautan dokumentasi dan laporan akhir. Tiada commit/push/deploy dalam skop alignment ini.

## Ownership

- Root: semua perubahan fail dan dokumen, verifikasi serta keputusan scope.
- Architecture agent: source/role/provider inventory read-only.
- Runtime agent: listener/source/data/drift evidence read-only.
- Reviewer: semak perubahan dan ketepatan dakwaan sebelum completion.

## Acceptance

- Satu entry dokumentasi utama; tiada native-provider atau latency claim tanpa bukti.
- Source, runtime, data dan production status dinyatakan berasingan.
- Setiap open task mempunyai ID, owner role, dependency dan acceptance evidence.
- API/database/worker deployment gap tidak ditutup melalui frontend build sahaja.
- Tiada data production/credential dipindahkan, dicetak atau direka.
- Runtime logs berada dalam var/log, bukan root.

## Rollback

Perubahan dokumentasi/config boleh direvert mengikut diff. BOM removal mengekalkan objek JSON yang sama. Tiada database migration atau runtime restart dibuat oleh pelan ini; rollback data tidak diperlukan.
