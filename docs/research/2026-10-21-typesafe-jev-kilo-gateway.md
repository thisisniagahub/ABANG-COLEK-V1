# TypeSafe Jev — laluan native melalui Kilo AI Gateway (research note)

**Tarikh:** 21 Oktober 2026 · **Status:** RESEARCH_REFERENCE — **tiada kodTempoh dalam repo ini** · **Pemilik capability:** belum ada

> Nota ini menyimpan penemuan supaya ia tidak hilang. Ia **tidak** mengaktifkan fungsi, tidak menambah dependency, dan tidak membuktikan mana-mana panggilan live. Laporan sesi penuh: [JEV-TYPESAFE-SESSION-REPORT-2026-10-21.md](../JEV-TYPESAFE-SESSION-REPORT-2026-10-21.md).

---

## 1. Dua jalan ke Jev sebenar

| Laluan | Endpoint | Kunci | Model | Akaun berasingan perlu? | Kos |
|---|---|---|---|---|---|
| TypeSafe terus | `POST https://api.typesafe.ai/v1/systemone` | `TYPESAFE_API_KEY` | `jev-latest` | Ya — akaun TypeSafe | Bayaran TypeSafe |
| **Kilo AI Gateway** | `POST https://ai-gateway.kilo.ai/api/v1/systemone` | `KILO_API_KEY` | `typesafe/jev-1.13` (dipin) | **Tidak** — gateway isi credential TypeSafe sendiri | Baki akaun Kilo, harga upstream tanpa markup |

SDK rasmi TypeSafe (`@typesafe-ai/sdk`) boleh diarah ke gateway dengan `baseURL: "https://ai-gateway.kilo.ai/api"` — SDK tambah `/v1/systemone`.

## 2. Blokir sebenar hari ini

Probe model `TypeSafe: Jev Router` (provider `kilo` dalam registry Kilo) melalui Kilo:

```
Add credits to continue, or switch to a free model
```

Ini HTTP **402 Insufficient balance** pada akaun Kilo — bukan model hilang, bukan akaun TypeSafe hilang, bukan wire format salah. HTTP 402 hanya perlu `POST /api/v1/credits` (dashboard `app.kilo.ai`).

## 3. Kontrak System One (yang perlu dipatuhi)

- Request: `{ model, state, questions }`; `state` boleh objek berstruktur; `questions` ialah peta `id → { type, instructions, criteria? }`.
- Primitif: `choice` (criteria = map pilihan), `score` (criteria = senarai aras tersusun), `noul` (criteria `{true,false}`).
- Respons: `{ model, answers: { id: { type, ... } }, usage: { input_tokens, output_tokens } }`.
- `choice` perlu taburan yang jumlah kepada 1 dan pilihan = argmax; `score` perlu skor = purata berbobot aras; `noul` ialah nilai 0..1.
- Skor/confidence ≠ kebenaran; tiada jaminan kalibrasi domain.

## 4. Aliran%"using data as-is" untuk JEV semasa

Repo ini **sudah** ada laluan JEV yang berfungsi dan zero-spend: `server/platform/jev/{assessment,questionRegistry,policyEngine,evaluations}.ts` + `tests/jev/evaluation-benchmark.test.ts` (E01, golden held-out, zero spend) + `src/services/jevEngine.ts` + `JevAssessmentCard` + `agents/google-adk/specialists/qc_jev_reviewer.py`.

Skill `skills/jev-core/{jev-mcp,jev-codex-router,typesafe-mcp}` ialah **stub dokumentasi** (27 baris, tiada implementasi, claim tanpa sumber) — jangan anggap ia laluan Jev yang berfungsi.

## 5. Kalau capability native diaktifkan semula (semua gate mesti lulus)

1. `KILO_API_KEY` (atau `TYPESAFE_API_KEY`) tersedia **server-side** sahaja.
2. Terma vendor + dasar pengendalian data diluluskan untuk data sokongan/customer.
3. **Kelulusan perbelanjaan** — dasar `docs/research/2026-10-19-free-model-policy.md` (zero-new-paid-spend) masih terpakai; gateway membillah baki Kilo.
4. Adapter server-side ( Systemic One request + pengesahan respons + reason codes + cooldown 402/429 + bajet harian).
5. Kalibrasi ambang atas korpus sebenar (default 0.6/0.8/0.2 bukan data domain).
6. Native **tidak pernah** melepas wang/stok/penerbitan — `policyEngine` kekal satu-satunya laluan kebenaran.

## 6. Rujukan

- TypeSafe: https://docs.typesafe.ai/api/system-one · https://docs.typesafe.ai/primitives · https://docs.typesafe.ai/sdk/javascript · https://docs.typesafe.ai/introduction/coding-agents
- Kilo Gateway: https://kilo.ai/docs/gateway/api-reference · https://kilo.ai/docs/gateway/usage-and-billing
