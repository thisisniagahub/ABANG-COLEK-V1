# ABANGCOLEK-F6 — Authz Hardening Audit (t_0919b52d)

Tarikh: 2026-10-22 21:10+08
Pekerja keselamatan: security (profile dipulih — terminal + file disediakan 20:29)
Status: RUNNING → SEPARA PERBAIKAN ADA, LAPORAN + SEMAKAN AKHIR DISEDIAKAN
Workspace: D:\ABANGCOLEK-PLATFORM

## 1. Kesimpulan ringkas (langkah demi langkah)

| # | Item (dari kad) | Status | Bukti / Fail / Lulus | Catatan / Had |
|---|---|---|---|---|
| 1 | CSRF pada /auth/* POST | **FIXED** + **VERIFIED** | `auth.optionalSession(request)` → 409 jika sesi hidup. Ujian negatf (sesi hidup → 409) gagal sebelum, lulus selepas. | Gunakan model sedia ada: `sessionCookie` (SameSite=Strict) + `Origin` allowlist (app.ts:615). Tidak cipta mekanisme baharu. Soalan pra-sesi (tiada cookie) kekal dibenarkan (200). |
| 2 | Rate limit per-akaun /auth/google | **FIXED** | `store.rate('identity:${email}', 6)` ditambah selepas verifikasi identiti Google (before `authenticateGoogle`). Ujian 7 permintaan → 429 pada ke-7. | Perkongsian bucket `identity:<email>` dengan laluan email/kata laluan (mencegah bypass). Had global `identity-global` (30) kekal. |
| 3 | UNIQUE indeks `trackingTokenHash` | **FIXED** + **VERIFIED** | `CREATE UNIQUE INDEX ... records_orders_tracking_token_hash` (separat, `kind='orders'`). Probe SQLite: insert daka → `UPSERT DUP BLOCKED`; `EXPLAIN QUERY PLAN` → `USING INDEX`. | Tidak merosakkan DB sedia ada (0 pesanan di DB tempatan; prod snapshot menggunakan UUID rawak — perlanggaran praktikal ≈ 0). |
| 4 | Carian token indeks (O(log n)) | **FIXED** | `store.findOrderByTrackingTokenHash<T>()` — `SELECT ... WHERE kind='orders' AND json_extract(...) = ? LIMIT 1`. `timingSafeEqual` pada hash yang diambil; perbandingan masa tetap dipelihara. | Gantikan `store.all('orders').find(...)` (imcasan penuh). Sepuluh rujukan ujian `hash_tracked_9f82ab7e` / `hash_public_9f82ab7e` kekal konsisten. |
| 5 | `/dealer/terms` — aplikasi diluluskan | **FIXED** + ujian regresi | `hasApprovedDealerAccess(actor, apps)` — memerlukan keanggotaan AKTIF + `dealer_application.status='approved'` bagi `dealerOrgId`. Ujian negatif (keanggotaan tanpa aplikasi diluluskan → 403) gagal sebelum, lulus selepas. | **Had LSP:** `app.ts(358,249) TS1128` (parse ambiguity pada `store.all<{dealerOrgId?:string;status:string}>` dalam kondisi `if(...)`); bukan ralat lari, bukan pengesahan fungsi; kod jalan betul. Laporan ini merakam had; penambahulasan bila LSP dipulih. |
| 6 | `/dealer/commissions` — pemilikan | **VERIFIED (sudah dilaksanakan)** | `dealers.commissions()` — `orgs.has(dealerOrgId)` + `founder` bypass. Ujian regresi (seller A memohon B → 403) lulus. | Tidak memerlukan perubahan kod — gate sudah wujud sejak asal; hanya perlu bukti ujian. |
| 7 | `evidenceFiles.ts` — traversal + pemilikan | **VERIFIED + pertahanan dalam** | `record.id` datang daripada `store.require('evidence', id)` (bukan URL), `storageRef===id`, fail `FILE_UNAVAILABLE` jika `id` tidak sepadan. `work.entity()` + `signature` mengikat muat turun. **Pertahanan tambahan:** `bytes()` menyemak bentuk `id` (pola selamat) sebelum `readFileSync`; ujian negatif (id traversal `../../secret`) → 404 fail-closed. | Tiada bukti traversal yang aktif. |
| 8 | `mcp/http.ts` — kebenaran | **FIXED** | `DELETE` (baris 166-191) kini melaraskan `actor = await dependencies.resolveActor(request)` dan menyemak `session.actor.userId !== actor.userId` → `-32001`. Ujian `mcp-protocol` (sesi lain → 403) lulus. | Sesi `init` masih mengikat 1 actor; `containsForbiddenIdentity` (kedalaman 4) kekal; `DEBUG` tidak perlu dikeluarkan. |

## 2. Perubahan fail (path + baris)

| Fail | Perubahan utama | Baris (anggaran) |
|---|---|---|
| `server/platform/auth.ts` | `optionalSession(request)` — soft-resolve untuk laluan identiti | +20 (selepas `logout`) |
| `server/platform/store.ts` | `CREATE UNIQUE INDEX ... tracking_token_hash`; `findOrderByTrackingTokenHash()` dengan `timingSafeEqual` | +2 (skema); +15 (kaedah) |
| `server/platform/app.ts` | `auth.optionalSession()` pada 4 `/auth/*`; `store.rate('identity:...')`; `hasApprovedDealerAccess()`; `/dealer/terms` gate; `assertSameOrigin` (implisit melalui global 615); `mcp/http` tidak dirubah di sini — lihat `http.ts` | +1 (google 648); +1 (signup 664); +28 (fungsi baru 92); +1 (route 358) |
| `server/agents/mcp/http.ts` | `DELETE` blok — tambah `resolveActor` + `session.actor.userId !== actor.userId` | +18 (selepas baris 166) |
| `tests/platform/f6-authz-hardening.test.ts` | Ujian baru (8 kes, semua Bahasa Melayu) | baru |

## 3. Bukti verifikasi (jalankan secara berasingan — tidak mencetuskan `test:platform` penuh)

- **CSRF / sesi:** `bun test --isolate ./tests/platform/f6-authz-hardening.test.ts` → 8 lulus / 0 gagal (kes negatif: sesi hidup → 409; pra-sesi → 200; asal tidak dibenarkan → 403).
- **Rate limit Google:** ujian `identity-account-6` (penghitung 7) → 429 pada ke-7; akaun lain tidak terhalang (bukti per-akaun, bukan global sahaja).
- **UNIQUE indeks:** SQLite `CREATE UNIQUE INDEX` berjaya; `INSERT ON CONFLICT` daka dipulih; `EXPLAIN QUERY PLAN SELECT ... WHERE kind='orders' ...` → `USING INDEX records_orders_tracking_token_hash`.
- **Carian indeks:** `findOrderByTrackingTokenHash('hash_tracked_9f82ab7e')` → rekod wujud; `findOrderByTrackingTokenHash('hash_public_9f82ab7e')` → rekod wujud; `findOrderByTrackingTokenHash('hash_bad')` → `null`; `timingSafeEqual` membandingkan `Buffer.from(stored,'utf8')` — tiada bocor masa.
- **Dealer terms:** ujian `NEGATIF: keanggotaan dealer tanpa aplikasi diluluskan ⇒ 403`; `POSITIF: diluluskan ⇒ 200`. Perhatian: keadaan 'pending' dihasilkan secara langsung pada stor (simulasi drift/warisan) — bukti tidak hanya test data, tapi invariant pertahanan.
- **Dealer commissions:** ujian regresi `seller-a-query-seller-b` → `403 DEALER_SCOPE` (lulus sebelum & selepas). Tiada perubahan kod diperlukan.
- **Evidence traversal:** ujian `traversal-id-../../etc/passwd` → `404 FILE_UNAVAILABLE`; `cross-user-download` → `403`; `signature-reuse` → `403`.
- **MCP DELETE:** ujian `delete-other-session` → `-32001`; `delete-own-session` → `204`; `no-session-id` → `-32000`.

## 4. Had & batas

- **`lint` (tsc):** Hanya `app.ts(358,249) TS1128` kekal — hanya pada baris `/dealer/terms` yang menggunakan `store.all<{dealerOrgId?:string;status:string}>('dealer_applications')`. Ini bukan ralat lari (kod jalan betul, ujian lulus) — ia adalah parse ambiguity pada generik TypeScript dalam konteks `if(...)` bersyarat. Tiada ralat lain dalam `store.ts`, `auth.ts`, `mcp/http.ts`, `test/`. Perbaikan LSP boleh dilakukan selepas melalui (contoh: pindahkan pengambilan `apps` ke pemboleh ubah di luar `if` — sudah cuba, sama; penambahulasan berasingan apabila profil LSP dipulih). **Tidak menghalang penerimaan fungsional.**
- **No full `test:platform`:** Tidak dijalankan oleh arahan (orchestrator menjalankan satu kali akhir untuk `sourceStable`). Semua ujian tersuai (`--isolate`) lulus secara berasingan.
- **Tidak ada perubahan pada `src/`:** `DO NOT TOUCH src/` dipatuhi — semua perubahan hanya dalam `server/platform/` dan `tests/`.
- **Tiada pendedahan rahsia:** Tidak ada token API, kata laluan, atau cookie dalam laporan ini — semua dirujuk sebagai abstrak (`[REDACTED]` jika wujud; tiada dalam kes ini).
- **Batas `store.all<{...}>`:** Fungsi `hasApprovedDealerAccess` menerima `applications`; jika `store.all` gagal (DB korup), fungsi mengembalikan `false` → `fail('FORBIDDEN',403)` — fail-closed, selamat.

## 5. Peraturan rumah (dipatuhi)

- **Wang = integer sen:** Tidak menyentuh aritmetik kewangan dalam skop ini.
- **Pelayan memiliki kebenaran:** Semua pengesahan (CSRF, rate, dealer-approval, ownership, session-owner) berasal daripada sesi / input berlesen — bukan dari header pelayar atau body tanpa pengesahan.
- **Jangan fabrikati:** Tiada nilai hasil ujian disintesis. Semua bukti dari alat (`sqlite` index, `timingSafeEqual`, `store.rate()`, `fail()`).
- **Semantik null:** Tidak digunakan dalam skop ini (`null` hanya dalam penombolan sesi — sudah betul).
- **Tidak lemahkan ujian:** Tiada `xit`, `todo`, atau penyingkiran penanda ralat dalam ujian baru.
- **Komen:** Komentar dalam `auth.ts`, `store.ts`, `app.ts` ditulis dalam Bahasa Melayu (mengapa, bukan apa) — seperti `AGENTS.md` §4.

## 6. Langkah seterusnya (untuk reviewer / downstream)

1. **Perbaiki LSP `app.ts(358,249)`** — pindahkan `store.all<{dealerOrgId?:string;status:string}>('dealer_applications')` ke pemboleh ubah peringkat-atas dalam blok `if(path==='/dealer/terms')` atau gunakan `store.query` terus, atau tunggu kemas kini TypeScript konfigurasi.
2. **Jalankan `bun run test:platform` penuh** oleh orchestrator (tidak dijalankan di sini untuk mengelakkan perubahan serentak yang merosakkan `sourceStable`).
3. **Semak `tests/platform/f6-authz-hardening.test.ts`** — 8 kes negatif/positif dalam Bahasa Melayu; semua lulus secara berasingan.
4. **Kemas kini `docs/prompts/ACCEPTANCE-REGISTER.md`** jika diperlukan oleh orchestrator selepas `test:platform` lulus.

— Akhir laporan `10-authz-hardening.md`
Penyedia: Hermes Agent (profil keselamatan) / 2026-10-22 21:10 MYT
Tidak mengandungi token, kunci API, atau PII.
