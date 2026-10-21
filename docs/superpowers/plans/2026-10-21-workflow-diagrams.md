# Pelan atlas workflow ABANGCOLEK

Skop: menerangkan workflow blueprint sedia ada kepada pengguna; tiada perubahan fungsi aplikasi.

1. Sahkan taxonomy empat workspace melalui `shared/platform-contracts.ts` dan `src/features/platform/routes.ts`; semak dealer scope, reka bentuk workspace dan kontrak Copilot.
2. Hasilkan `docs/design/user-workflows.md` dengan diagram Mermaid: ekosistem, customer, founder, staff, dealer, developer, Copilot, pembayaran/refund, stok/QC dan growth/privacy.
3. Hasilkan `docs/design/workflow-atlas.html`, fail visual standalone dengan navigasi, aliran berarah, keputusan, label gate dan penerangan BM. Gunakan HTML/CSS tempatan tanpa dependency, API, credential atau framework baharu.
4. Bezakan diagram sasaran daripada status implementasi; empat workspace sebenar, dealer sebagai workflow berscope, AI sebagai pembantu dan backend sebagai authority.
5. Semak bebas HTML/dokumen, preview browser desktop/mobile, navigasi, overflow dan kejelasan label. Kekalkan perubahan pihak lain; tiada commit/push/deploy.

## Pembetulan mandat pengguna: Online Store Agent/Stokis

Setiap Agent/Stokis wajib menerima Online Store sendiri yang disediakan ABANGCOLEK. Kemas kini blueprint, prompt Kilo, diagram Mermaid dan atlas HTML: pendaftaran rakan niaga tidak memerlukan pembelian dahulu; pengaktifan menghasilkan workspace pengurusan private dan storefront public berasingan. Bezakan empat role kod semasa daripada sasaran Dealer Workspace. Rekod sebagai requirement wajib belum dibuktikan, tanpa mengubah source aplikasi atau tick ledger. Semak semula branch aktivasi, label source/sasaran, pautan dan paparan.
