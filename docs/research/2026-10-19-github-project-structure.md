# Research GitHub — Struktur ABANGCOLEK

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Alignment 19 Oktober 2026:** Research/reference di bawah [master blueprint v2.4](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md). Pilihan pelaksanaan telah ditetapkan dalam [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md); perbandingan alternatif dalam kajian ini bukan permintaan kepada agent untuk memilih semula stack. Tiada migrasi disahkan oleh research ini.

Tarikh: 19 Oktober 2026. Skop: sumber primer GitHub, dokumentasi maintainer dan pemeriksaan struktur source tempatan. Hasil: cadangan reka bentuk, bukan migrasi yang sudah dilaksanakan.

## 1. Maksud proven dalam kajian ini

Kriteria: pola kelihatan dalam source/dokumentasi projek aktif, ada pemisahan tanggungjawab yang boleh diperiksa, dan sesuai dengan masalah ABANGCOLEK. Bilangan stars bukan bukti keberkesanan seni bina. Kajian ini tidak mengaudit deployment pelanggan, metrik insiden atau semua test suite upstream. Bulletproof React ialah rujukan seni bina; Medusa ialah platform commerce; Hono dan dua projek agent ialah framework/toolkit. Kekuatan bukti mereka tidak sama.

Metadata branch dan SHA diambil melalui GitHub API. Kelima-lima repo dilaporkan tidak archived pada semakan. Pin ini menjadikan rujukan boleh diperiksa semula walaupun branch berubah.

| Projek | Pin yang diperiksa | Tarikh commit UTC | Peranan bukti |
|---|---|---|---|
| alan2207/bulletproof-react | `9506629ed003a561c6627735480cce4994244bb4` | 2026-05-14 | Panduan struktur frontend |
| medusajs/medusa | `906433ac6b1d5ec3cc23f88c8297d29fa87427fd` | 2026-10-16 | Organisasi commerce berskala besar |
| CopilotKit/CopilotKit | `7b446f86e823e8af4695e78f7a61e800844a9373` | 2026-10-17 | Sempadan frontend/runtime/agent |
| honojs/hono | `5ca49b0720755c585c9a9835f0a479ceea36fb52` | 2026-10-17 | Adapter mengikut runtime |
| google/adk-js | `401dfee84d0d43b6486de6e601affb66082cec12` | 2026-10-18 | Pemisahan subsistem agent |

### Bulletproof React

[Panduan struktur](https://github.com/alan2207/bulletproof-react/blob/9506629ed003a561c6627735480cce4994244bb4/docs/project-structure.md) mengelompokkan kod mengikut feature dan membezakan composition aplikasi daripada komponen shared. Ia menyarankan subfolder mengikut keperluan, direct imports dan kawalan dependency antara feature.

Adaptasi ABANGCOLEK: pindahkan shell platform ke `src/app/`, pecahkan workspace besar mengikut kemampuan bisnes, dan kekalkan UI generik dalam `src/components/`. Jangan jana semua subfolder untuk feature kecil. Rujukan ini menyokong disiplin struktur; ia tidak membuktikan prestasi atau keselamatan aplikasi kita.

### Medusa

[Peta codebase maintainer](https://github.com/medusajs/medusa/blob/906433ac6b1d5ec3cc23f88c8297d29fa87427fd/CLAUDE.md) memisahkan modules commerce, framework, workflows, providers dan integration tests. [Dokumentasi seni bina](https://docs.medusajs.com/learn/introduction/architecture) menerangkan lapisan HTTP, workflow, module dan datastore.

Adaptasi ABANGCOLEK: letakkan peraturan domain dalam modules, koordinasi rentas domain dalam application workflows, dan integrasi luar dalam adapters. Saiz monorepo Medusa tidak diperlukan untuk aplikasi ini. Jangan salin framework, database atau dependency infrastrukturnya sebagai sebahagian pemindahan folder. Arahan upstream ialah bahan kajian, bukan arahan yang mengatasi workflow repo ini.

### CopilotKit

[Architecture guide](https://github.com/CopilotKit/CopilotKit/blob/7b446f86e823e8af4695e78f7a61e800844a9373/dev-docs/architecture/ARCHITECTURE.md) membezakan frontend, runtime dan agent serta protokol event di antaranya.

Adaptasi ABANGCOLEK: asingkan komponen chat daripada orchestration server, model provider dan tool execution. Kewujudan folder atau SSE custom belum membuktikan keserasian protokol atau integrasi SDK. Restructure tidak memasang CopilotKit secara automatik.

### Hono

[Source adapters](https://github.com/honojs/hono/tree/5ca49b0720755c585c9a9835f0a479ceea36fb52/src/adapter) mempunyai sasaran berasingan termasuk Bun dan Vercel; [README](https://github.com/honojs/hono/blob/5ca49b0720755c585c9a9835f0a479ceea36fb52/README.md) menerangkan runtime berasaskan Web Standards. Nama direktori adapter turut disahkan melalui GitHub Contents API apabila paparan tree web gagal dimuatkan.

Adaptasi ABANGCOLEK: entry point deployment nipis dan konfigurasi lifecycle tempatan/cloud yang eksplisit. Jangan anggap timer, disk atau stream mempunyai jaminan sama pada kedua-duanya. Hono tidak perlu dipasang untuk menerapkan pemisahan ini.

### Google ADK TypeScript

[Source core](https://github.com/google/adk-js/tree/401dfee84d0d43b6486de6e601affb66082cec12/core/src) memisahkan agents, runner, models, sessions, memory, tools dan telemetry. [README](https://github.com/google/adk-js/blob/401dfee84d0d43b6486de6e601affb66082cec12/README.md) menunjukkan SDK rasmi dan contoh penggunaan.

Adaptasi ABANGCOLEK: model access, sesi, tools dan polisi agent perlu mempunyai tanggungjawab jelas. Gunakan folder hanya apabila implementasinya wujud; nama `adkAgent.ts` sahaja bukan bukti SDK digunakan. Sokongan Bun, persistence dan hosting aplikasi masih perlu diuji jika SDK dipilih.

## 2. Pilihan seni bina

| Pilihan | Kelebihan | Kos / batas | Keputusan |
|---|---|---|---|
| A. Kemas docs/media sahaja | Risiko migrasi paling rendah | `workspaces/` dan `platform/` kekal mencampur tanggungjawab | Fasa awal sahaja |
| B. Satu aplikasi dengan frontend feature dan backend domain modules | Sempadan jelas, satu toolchain, migrasi beransur | Perlu dependency rules dan pemetaan transaksi | Disyorkan |
| C. Workspaces `apps/*` + `packages/*` | Sesuai untuk beberapa aplikasi/pakej dengan lifecycle berbeza | Build graph, package exports dan deploy config bertambah | Tangguh sehingga ada pengguna pakej/aplikasi bebas sebenar |

Keputusan B ialah inferens kejuruteraan berdasarkan source tempatan dan pola upstream. Ia bukan salinan struktur mana-mana repo atau jaminan hasil production.

## 3. Masalah tempatan yang struktur baharu perlu selesaikan

- `src/features/platform/` mencampur shell, navigation dan HTTP client; feature workspace bergantung padanya.
- `src/features/workspaces/` mengumpulkan commerce, marketing, operasi, business, Copilot dan UI shared.
- `server/platform/app.ts` menggabungkan composition, routing dan banyak domain.
- `server/platform/commerce.ts` menyentuh catalogue, order, inventory, payment, tracking dan loyalty.
- Agent, provider router, backup dan persistence berada bersebelahan dengan domain services tanpa sempadan jelas.
- Kontrak besar rentas domain meningkatkan coupling; pemisahan mesti mengekalkan satu definisi berautoriti.
- Media, eksport dan handover bertindih di root/dokumentasi.

## 4. Penunjuk kejayaan yang boleh dibuktikan

1. Semua fail dipindahkan mempunyai manifest asal/destinasi dan hash yang sepadan kecuali reference edits yang dinyatakan.
2. Kod frontend tidak mengimport backend atau mengandungi server secrets.
3. Kod shared tidak mengimport frontend/backend, SQLite atau SDK provider.
4. Feature tidak mengimport internals feature lain; composition rentas feature berlaku di app.
5. Domain module tidak bergantung kepada HTTP handler atau vendor SDK; adapter hanya dipasang di composition root.
6. Workflow checkout/refund mengekalkan satu unit transaksi dan durable commit yang sama.
7. Discovery test, entry point Vercel, runtime tempatan dan aset public kekal sah.
8. Fail legacy yang masih mempunyai caller tidak diarkibkan secara membuta tuli.
9. Keputusan lint/build/test dibandingkan dengan baseline; isu sedia ada dilaporkan berasingan.

Pemeriksaan dependency baharu perlu mempunyai ujian negatif: import terlarang sengaja disuntik ke fixture dan checker mesti menolaknya. Folder cantik tanpa enforcement tidak memenuhi tujuan kajian ini.
