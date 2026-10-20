# JEV × TypeSafe System One — native provider boundari

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Status: **adapter native wujud dalam repo, panggilan live TIDAK berlaku.** Native kekal
kunci sehingga kelayakan, terma, pengendalian data, had kos dan quota dibuktikan
([docs/research/2026-10-19-free-model-policy.md](../research/2026-10-19-free-model-policy.md)).

## Kontrak

| Item | Nilai |
|---|---|
| Source | `server/platform/jev/typesafeProvider.ts`, `server/platform/jev/questionRegistry.ts`, `server/platform/jev/evaluations.ts` |
| Kontrak | `shared/jev-contracts.ts` (`JevNativeAssessment`, `JevNativeProviderReceipt`, `JevNativeThresholds`) |
| Endpoint | `POST https://api.typesafe.ai/v1/systemone` (dokumentasi rasmi: https://docs.typesafe.ai/api/system-one) |
| Model alias | `jev-latest` (boleh override; jawapan sentiasa datang daripada model sebenar yang menjawab) |
| Primitif | `choice`, `score`, `noul` — sejajar dengan `JevQuestion` |
| Surface API | `POST /api/platform/jev/native-assessments`, `GET /api/platform/jev/native-assessments` |
| Skop | founder atau developer sahaja (scop evaluator), revision check wajib |

## Gate (semua mesti lulus serentak)

| Env | Reason code bila gagal |
|---|---|
| `TYPESAFE_API_KEY` | `TYPESAFE_CREDENTIALS_MISSING` |
| `TYPESAFE_NATIVE_ENABLED=true` | `TYPESAFE_NATIVE_DISABLED` |
| `TYPESAFE_TERMS_ACCEPTED=true` | `TYPESAFE_TERMS_NOT_ACCEPTED` |
| `TYPESAFE_DATA_HANDLING_APPROVED=true` | `TYPESAFE_DATA_HANDLING_NOT_APPROVED` |

Bila gate tertutup, `evaluateWithTypeSafe` **tidak menghantar request**. Jawapan
 ialah `UNAVAILABLE` dengan reason code, bukan tekaan. Tiada paid fallback.

## Pemetaan soalan

- Satu request System One bagi satu pack; semua soalan dihantar sekali (System One
  menilai secara selari).
- `choice` membawa glossary deskripsi setiap option; option tanpa deskripsi hanya
  dibaca daripada nama — itu sebabnya glossary wujud.
- `score` kekal sebagai senarai aras tersusun; skor jawapan ialah purata berbobot
  aras dan tidak keluar daripada `[0, aras-1]`.
- `noul` membawa criteria `{true, false}`: apa yangaksud "ya" dan "tidak".
- **Soalan terikat fakta tidak pernah dihantar kepada model.** `order_exception.paymentVerified`,
  `order_exception.canonicalPriceKnown`, `qc.evidenceComplete` dan `qc.sopCurrent`
  dibaca daripada `state.facts` yang dibina server (provenance `SERVER_FACT`).
  Model tidak mengesahkan ledger, harga kanonik atau versi SOP.

## Ambang dan abstention

| Ambang | Env | Lalai | Kesan |
|---|---|---|---|
| Confidence minimum (choice/score) | `TYPESAFE_MIN_CONFIDENCE` | 0.6 | Di bawah ambang → jawapan tidak dipaparkan, dicatat dalam `observations` |
| Noul "ya" jelas | `TYPESAFE_NOUL_YES_THRESHOLD` | 0.8 | `noul > 0.8` → ya jelas |
| Noul "tidak" jelas | `TYPESAFE_NOUL_NO_THRESHOLD` | 0.2 | `noul < 0.2` → tidak jelas |

Noul berhampiran 0.5 bermaksud ya/tidak sama-sama berkemungkinan — ia bukan
"separuh keyakinan" dan tidak dibaca sebagai keputusan.

Status assessment native:

| Status | Maksud |
|---|---|
| `NATIVE_JUDGMENT` | Semua soalan model melepasi validasi dan ambang |
| `PARTIAL_JUDGMENT` | Ada soalan yang dikunci; jawapan yang yakin dikembalikan, bakanya dalam `observations` |
| `ABSTAIN` | Tiada jawapan yang layak; `validationErrors` menyenaraikan sebab |
| `INVALID` | Request tidak boleh dibina |
| `UNAVAILABLE` | Gate tertutup atau provider gagal; `abstentionReasons` menyenaraikan reason code |

## Kuasa

Setiap assessment native keluar dengan `policy.outcome = 'REVIEW_REQUIRED'` dan
reason codes `NATIVE_PROVIDER_DOMAIN_UNVERIFIED`,
`AUTHORITATIVE_POLICY_AND_APPROVAL_REQUIRED` serta kod dasar mengikut pack
(contoh `NO_AUTOMATIC_REFUND`, `NO_AUTOMATIC_QC_RELEASE`). Model tidak boleh
melepaskan wang, stok, penerbitan atau emel. `policyEngine.evaluateExecutionPolicy`
kekal satu-satunya laluan kebenaran bagi tindakan.

## Transport: fetch sendiri dan bukan SDK

SDK rasmi JavaScript TypeSafe ialah `@typesafe-ai/sdk` dengan `client.systemOne({ state, questions })`
(https://docs.typesafe.ai/sdk/javascript). Adapter ini memanggil endpoint HTTP
secara terus sebab:

- Tiada dependency baharu diluluskan; SDK memerlukan preflight dependency/license
  yang belum dibuat dalam repo ini.
- Adapter memerlukan gate kelayakan, label transport (`live`/`fixture`), pemetaan
  kegagalan kepada reason code dan receipt yang konsisten dengan provider adapters yang sedia ada dalam platform.
- SDK rasmi memampatkan badan request (zstd) dan memerlukan Node 22.15+; runtime
  platform ialah Bun.

Nota: contoh SDK dalam bahagian "Historical research retained" pada
[JEV.md](../../JEV.md) menggunakan `client.predict(...)` — itu **bukan** API
semasa. API semasa ialah `systemOne` dengan soalan `choice`/`score`/`noul`.

## Bukti

- `tests/jev/typesafe-provider.test.ts` — pemetaan request, interpretasi respons,
  penolakan taburan/choice/score yang tidak konsisten, ambang confidence dan noul,
  fakta server, gate tertutup (tiada network), pemetaan kegagalan provider
  (429/timeout), dan penolakan endpoint bukan-https.
- `tests/jev/native-assessment-api.test.ts` — surface HTTP: 401 tanpa sesi,
  403 tanpa scop evaluator, `UNAVAILABLE` + reason code semasa gate tertutup,
  senarai assessment tersimpan, `nativeMode.status = 'DISABLED'`.

Tiada panggilan live dijalankan. Tiada receipt provider sebenar wujud dalam repo,
sehingga `nativeAvailable` kekal `false` sehingga satu receipt live direkam.
