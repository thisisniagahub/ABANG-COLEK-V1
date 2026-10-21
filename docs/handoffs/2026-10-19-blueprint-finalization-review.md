<!-- COMMERCE-GROWTH-HISTORY-20261021:BEGIN -->
> **Konteks semasa 21 Oktober 2026:** badan bertarikh/mockup/proposal ini dikekalkan untuk provenance. Untuk pembangunan seterusnya, [Commerce & Growth](../design/commerce-growth.md) dan [handover](../prompts/COMMERCE-GROWTH-HANDOVER-20261021.md) memperincikan mandat public store setiap Agent/Stokis + private workspace, direct signup, server-bound store/referrer/fulfiller dan referral pelanggan satu peringkat dua hala. Contoh kadar, wallet, hierarki referral, empat role source atau arahan agent lama di bawah tidak meluluskan perubahan polisi/privilege atau menggantikan kontrak semasa. CG subcriteria memerlukan bukti di bawah ledger85; tiada status aplikasi dinaik taraf melalui nota sejarah ini.
<!-- COMMERCE-GROWTH-HISTORY-20261021:END -->


<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** REKOD SEJARAH / RUJUKAN — pemerhatian, metrik ujian, status deployment, harga/model dan cadangan di bawah terikat kepada tarikh serta skop asal. Ia bukan checklist execution semasa atau pengesahan bahawa dapatan masih benar. Kekalkan bukti asal; revalidate sebelum mendakwa fixed, connected atau production-ready.
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# ABANGCOLEK — Cadangan Pemuktamadan Blueprint v2.2

Tarikh: 19 Oktober 2026
Status: Cadangan keputusan untuk review; bukan pengesahan production atau pelaksanaan siap.

## Asas semakan

- Master blueprint v2.1 dalam repository.
- Chat Antigravity `80abddbc-37fb-472e-ac65-d96784cc5832`: database SQLite dibuka read-only, ringkasan perbualan step 1958, sampel mesej dan status akhir, serta artefak perbandingan, senarai semak dan prompt draft.
- Source semasa termasuk persistence, Copilot, model router, tracking dan scheduler.
- Tidak semua 2,207 step chat ditafsir satu demi satu. Dakwaan test count, uptime, kos provider dan kejayaan production dalam chat tidak dianggap bukti semasa.
- Tiada test suite, panggilan inference berbayar atau deployment dijalankan dalam review ini.

## Keputusan produk yang dicadangkan

1. Kekalkan React/Vite, Bun dan domain services semasa. Jangan migrasi framework semata-mata untuk Copilot.
2. Bezakan runtime tempatan SQLite daripada runtime Vercel dengan Supabase snapshot CAS yang menjadi authoritative commit. CAS bukan sandaran sejarah.
3. Pulihkan kemampuan operasi agent ABANGCOLEK-OS melalui tool canonical berizin. Audit pertindihan agent lama dan Copilot baharu sebelum memilih adapter; jangan aktifkan tindakan legacy berasaskan localStorage.
4. Kekalkan AI sebagai pembaca, penganalisis dan pencipta draf. Tindakan kewangan/stok memerlukan command deterministik, authorization, approval jika diwajibkan, idempotency dan audit.
5. Gunakan polisi tiada caj inference baharu. Provider/model hanya boleh dipanggil jika diaktifkan dan kelayakan kos akaun/model telah disahkan; label `free` atau nama class tidak menjamin kos sifar. Jika tidak tersedia, pulangkan unavailable atau fallback tempatan yang dilabel dengan tepat.
6. Pet ialah entry point pilihan kepada Copilot yang sama. Voice memerlukan tindakan pengguna, kawalan mute/stop, fallback teks dan pendedahan pemprosesan audio yang tepat. Desktop companion tidak menjadi dependency web production.
7. Pisahkan komisen jualan ejen, margin wholesale, referral pelanggan dan mata loyalty. Setiap satu mempunyai asas perolehan, liabiliti, reversal serta kelayakan sendiri.
8. Mulakan loyalty dengan peraturan mudah dan versioned. Tangguhkan tier kompleks, autonomous learning yang mengubah polisi dan peluasan multi-tenant sehingga operasi teras terbukti.

## Blocker sebelum blueprint dianggap final

| Keutamaan | Masalah | Syarat penutupan |
|---|---|---|
| P0 | Kad margin/JEV mengandungi angka tetap; fallback boleh mendakwa tindakan berlaku | Semua nilai operasi datang daripada domain query/evaluator; data tidak cukup menghasilkan `insufficient_data`; fallback tidak mendakwa mutasi yang tiada receipt |
| P0 | Identiti provider fallback mengelirukan | Respons membezakan `live_model`, `local_rules`, `unavailable`; provider/model hanya dilaporkan sebagai digunakan apabila panggilan sebenar berjaya |
| P0 | Seni bina single-host bercanggah dengan deployment CAS | ADR menerangkan authority, concurrency, commit, retry, side effects, lifecycle jobs dan recovery bagi kedua-dua runtime |
| P0 | Status acceptance melampaui bukti | Setiap status disertakan source, nama test, arahan, commit, tarikh, keputusan dan batas environment |
| P1 | Nama ADK/CopilotKit/AG-UI dianggap integrasi lengkap | Buktikan dependencies, penggunaan SDK/protokol dan perjalanan E2E, atau label implementasi sebagai custom Copilot/SSE |
| P1 | HITL approval mungkin hanya mengubah status | Bezakan proposed, approved, executing, succeeded, failed dan unknown outcome; kejayaan memerlukan receipt domain dan transaksi yang durable |
| P1 | Model failover tanpa deadline dan polisi data yang jelas | Deadline keseluruhan/per-provider, abort, limit input/history/output, allowlist role, redaction, retry terbatas dan provider yang dibenarkan |
| P1 | State machine berupa rantai linear | Jadual transition bercabang dengan event, guard, effect dan terminal state; asingkan payment daripada refund |
| P1 | Reversal komisen penuh untuk partial refund | Per-line allocation, versi kadar asal, cumulative cap, rounding dan dedupe refund; semak source sedia ada sebelum menambah mekanisme kedua |
| P1 | Timer backup tempatan dianggap jaminan production | Job luaran yang sesuai dengan runtime, storage durable, backup history, pemantauan gagal dan restore drill berukur termasuk evidence |
| P1 | Offline queue tidak mempunyai kontrak jelas | Draf tidak dianggap order diterima; reprice/revalidate, perubahan harga dipersetujui, retry idempotent dan pengasingan akaun |

## Kontrak minimum Copilot

- Client hanya menghantar user turns yang dibenarkan; server membina system instruction dan mengambil rekod berizin.
- Nama, input dan output tool mempunyai schema; authorization diperiksa pada server setiap kali.
- Generative UI menggunakan discriminated union dan data canonical; tiada confidence atau margin rekaan.
- Mutation proposal menyimpan entity ID, versi, parameter, pelulus, tempoh sah dan idempotency key.
- Approval tidak sama dengan execution. Execution menyemak semula role, versi entiti dan polisi, kemudian menghasilkan receipt atau outcome tidak pasti yang boleh direconcile.
- SSE perlu diuji melalui hosting sebenar dan kontrak durable commit. Jangan melaporkan kelulusan/tindakan berjaya sebelum commit disahkan.
- Tiada penyimpanan atau paparan reasoning dalaman; log hanya tindakan, ringkasan, sumber data, outcome dan metadata penggunaan yang diperlukan.
- Memory hanya rekod berizin dengan provenance, retention dan pemadaman. Peraturan kewangan tidak berubah hasil pembelajaran automatik.

## Format bukti acceptance

Gunakan status `proposed`, `implemented`, `tests_present`, `verified_local`, `verified_preview`, `verified_production`, atau `blocked_external`.

Setiap rekod: ID, requirement, source path, test path/nama, command, commit, environment, masa, keputusan, artifact dan batas bukti. Test count lama tidak dipindahkan sebagai keputusan semasa. `Not tested` tidak sama dengan `failed`.

## Urutan pelaksanaan yang dicadangkan

1. Rekod baseline worktree/commit, hentikan pertindihan pemilikan fail dan betulkan status bukti.
2. Tutup data rekaan Copilot, fallback attribution, sempadan input dan deadline provider.
3. Selaraskan authority runtime, durable commit, streaming, side effects dan job backup.
4. Finalkan transition, margin, komisen/refund dan kontrak loyalty/referral.
5. Selesaikan E2E Copilot, storefront, tracking, checkout, refund dan cross-role access; failure injection termasuk quota, timeout dan CAS conflict.
6. Verify preview, secrets/config, migration dan restore; release production berperingkat dengan rollback yang diuji.
7. Aktifkan kempen/referral hanya selepas polisi operasi, kos dan semakan perundangan yang diperlukan selesai.

## Struktur master blueprint v2.2

1. Tujuan, pengguna dan skop MVP.
2. Status semasa yang dibuktikan dan perkara di luar skop.
3. ADR seni bina serta authority data setiap runtime.
4. Kontrak domain, wang integer sen, transition dan append-only event/adjustment.
5. Copilot, tool registry, approval, provider/cost policy dan fallback.
6. Customer/storefront, dealer, loyalty/referral serta Pet/voice.
7. Security, consent, data retention dan batas integrasi luar.
8. Jobs, backup, monitoring dan recovery.
9. Acceptance evidence matrix, rollout dan rollback.
10. Open decisions, pemilik deliverable dan dependency luar.

Blueprint boleh dimuktamadkan sebagai spesifikasi selepas keputusan ini jelas. Status production mesti kekal berasingan dan bergantung kepada bukti pelaksanaan.
