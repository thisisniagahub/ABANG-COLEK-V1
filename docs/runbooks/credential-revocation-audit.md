# Runbook Revokasi & Audit Keselamatan Kredensial ABANGCOLEK (B01)

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

**Diselaraskan:** 19 Oktober 2026
**Status:** READY_FOR_OWNER_EXECUTION
**Klasifikasi:** KESELAMATAN & AKSES
**Objektif:** Menyediakan arahan langkah-demi-langkah bagi pemilik akaun untuk membatalkan (revoke), memutarkan (rotate), dan mengaudit kredensial yang terdedah dalam sesi terdahulu tanpa mendedahkan sebarang nilai rahsia dalam git/dokumentasi.

---

## 1. Prinsip Keselamatan Utama (Zero-Leak Policy)
1. **Dilarang Menyalin Rahsia**: Jangan sekali-kali menampal nilai API key, service role secret, atau token sebenar ke dalam chat, fail Markdown, atau log terminal.
2. **Topeng Pengecam (Masked Identifiers)**: Gunakan hanya 4 aksara awal atau akhir (contoh: `AIzaSy...4x9Q`, `sbp_...91fa`) untuk merujuk kunci yang terlibat.
3. **Pemisahan Kunci**: Bezakan antara kunci awam (publishable/anon key) dengan kunci rahsia pelayan (service role / private secret).

---

## 2. Senarai Akaun & Kredensial Terlibat

### A. Supabase API & Service Role Key
*   **Perkhidmatan**: Cloud authoritative snapshot CAS dan private evidence; akses lama diaudit berasingan
*   **Tindakan Pemilik**:
    1. Log masuk ke [Supabase Dashboard](https://supabase.com/dashboard).
    2. Pilih projek semasa `yeszjvcnjxumujxinahz`; jangan menggunakan project lama hanya berdasarkan nama paparan. Audit project lama secara berasingan jika credentialnya turut terdedah.
    3. Buka bahagian API keys dan kenal pasti jenis kunci sebenar: modern secret berbeza daripada legacy JWT service-role; jangan menganggap semua jenis mempunyai prosedur rotate yang sama.
    4. Ikut dokumentasi/dashboard semasa untuk revoke/rotate jenis yang terlibat; stage replacement dalam secret store server sahaja, sahkan dependency, kemudian revoke lama mengikut incident plan. Jika compromise aktif, utamakan revocation dan nyatakan downtime.
    5. Sahkan service-only RPC, RLS/grants dan private bucket policies menggunakan negative anon/authenticated tests. RLS enabled sahaja tidak membuktikan policy selamat.
    6. Tukar database password hanya jika terlibat; semak consumers dan jangan melaporkan selesai tanpa receipt.
### B. Google AI Studio / Gemini API Key
*   **Perkhidmatan**: Pembantu AI Founder & Ekstraksi Warisan
*   **Tindakan Pemilik**:
    1. Buka [Google AI Studio - Get API Key](https://aistudio.google.com/app/apikey).
    2. Kenal pasti kunci yang dijana pada atau sebelum Oktober 2026.
    3. Klik ikon tong sampah / **Delete Key** untuk memadamkan kunci lama.
    4. Klik **Create API Key** untuk menjana kunci baharu khusus untuk projek ABANGCOLEK.
    5. Tetapkan had kuota (quota alerts) dan sekatan API (API restrictions) dalam Google Cloud Console jika dipautkan ke akaun pengebilan.

### C. GitHub Repository Access & Webhooks
*   **Perkhidmatan**: Repositori Kod Sumber `thisisniagahub/ABANG-COLEK-V1`
*   **Tindakan Pemilik**:
    1. Pergi ke **Settings** ➔ **Secrets and variables** ➔ **Actions**.
    2. Semak senarai rahsia repositori. Padam sebarang rahsia yang tidak lagi digunakan.
    3. Jika terdapat Personal Access Token (PAT) peribadi yang pernah digunakan dalam persekitaran tempatan, batalkan di [GitHub Personal Access Tokens](https://github.com/settings/tokens).

---

## 3. Templat Resit Pengesahan Pemilik (Audit Receipt)

Selepas pemilik melengkapkan langkah di atas, salin dan lengkapkan resit berikut (simpan dalam `var/log/credential-rotation-receipt.json` atau berikan pengesahan):

```json
{
  "taskId": "B01",
  "status": "ROTATION_CONFIRMED",
  "executedBy": "OWNER",
  "executedAt": "2026-10-04TXX:XX:XX+08:00",
  "rotations": [
    {
      "provider": "Supabase",
      "keyType": "service_role_secret",
      "oldKeyMasked": "eyJhb...skrceeo",
      "newKeyMasked": "eyJhb...[NEW]",
      "action": "REVOKED_AND_ROTATED",
      "rlsVerified": true
    },
    {
      "provider": "Google AI Studio",
      "keyType": "gemini_api_key",
      "oldKeyMasked": "AIzaSy...[OLD]",
      "newKeyMasked": "AIzaSy...[NEW]",
      "action": "REVOKED_AND_ROTATED"
    }
  ],
  "accessAuditOutcome": "NO_UNAUTHORIZED_USAGE_OBSERVED"
}
```

## 4. Current production dan AI scope

Vercel project ialah `niaga-hub-pro/abang-colek-v1`; audit `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY`, bootstrap/cron tokens dan provider secret references mengikut apa yang benar-benar digunakan. Tiada nilai dimasukkan dalam prompt, MCP arguments yang dilog, Git atau browser. Publishable key bukan server secret.

[Blueprint v2.4](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [free-only policy](../research/2026-10-19-free-model-policy.md) memerlukan provider/account eligibility berasingan selepas rotation. Key baharu tidak memberi kebenaran paid fallback. Skill/MCP availability bukan bukti account connected. Jangan memasang integration atau rotate kunci hanya untuk menutup checklist.

Status B01 belum dibuktikan selesai melalui runbook ini. Audit receipt contoh bukan actual receipt; isi tarikh sebenar, masked identifiers sahaja, successful replacement/old-key rejection dan limitations. Jangan melaporkan tiada unauthorized usage jika access logs belum diperiksa. Tiada rotation/audit account dijalankan melalui alignment Markdown ini.
