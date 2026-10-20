/**
 * Preload untuk `bun test` (lihat `bunfig.toml`).
 *
 * Suite ujian dijalankan OFFLINE: panggilan provider live dilumpuhkan.
 * Sebab:
 * 1. Kuatuasa free tier luar (Gemini: 20 permintaan/hari) bukan OWN platform —
 *    ujian yang memanggilnya secara langsung memakan kuota produksi dan gagal
 *    secara rawak apabila kuota itu habis.
 * 2. Ujian yang bergantung pada provider luar TIDAK mengesahkan apa-apa
 *    tentang platform; ia hanya bergantung pada keadaan akaun orang lain.
 *
 * Bukti live provider adalah gate berasingan (lihat
 * `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md`), bukan sebahagian suite unit.
 */
process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS = '1';
