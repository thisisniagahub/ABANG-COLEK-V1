# HANDOFF REPORT — Survey & Specification Mining (spec_miner_1)

- **Tarikh & Masa:** 20 Oktober 2026, Asia/Kuala_Lumpur
- **Penyerah:** spec_miner_1 (`teamwork_preview_spec_miner`)
- **Penerima:** orchestrator_1 (`69f0e8df-5db9-4eb4-aae4-75264c0674f4`)
- **Jenis Handoff:** Hard (Tugasan kajian & perlombongan spesifikasi selesai 100%)
- **Artifak Utama Dihasilkan:** `d:\ABANGCOLEK-PLATFORM\.agents\teamwork\spec_miner_1\spec_report.md`

---

## 1. Observation

1. **Permintaan Autoritatif Asal (`ORIGINAL_REQUEST.md`):**
   - Baris 12–32: Menetapkan skop merentas 5 fasa: R1 (Fasa 03A: Integriti Kewangan, Lejar, HITL), R2 (Fasa 01: Struktur Monolith Modular), R3 (Fasa 02: CopilotKit Runtime & Python Google ADK Free Bridge), R4 (Fasa 03B: Registri 32 Advanced Tools & 10 Modul), R5 (Fasa 04: 7 Generative UI Approaches & A2UI Fixed Schema).
   - Baris 36–40: Menetapkan kriteria penerimaan berasaskan ujian domain (`financial-integrity-v24.test.ts`, `hitl-execution-v24.test.ts`, `growth-margin.test.ts`), `bun run lint` exit code 0, `bun run build` lulus, sifar panggilan API berbayar, dan kemas kini atomik ke `PROJECT-CHECKLIST.md` serta `ACCEPTANCE-REGISTER.md`.

2. **Arahan Pelaksanaan & Keutamaan Fasa (`CONTINUE-AGY-20261020.md`):**
   - Baris 3: *"Tarikh: 20 Oktober 2026... gantikan Copilot CLI dengan AGY CLI kerana Copilot mencapai limit; fokus AGY sahaja... AGY ialah integrator dan pelaksana semua baki fasa, termasuk frontend, Python ADK, tools, review dan release."*
   - Baris 13: *"Fasa wajib: 00 -> 03A -> 01 -> 02 -> 03B -> 04 -> 05 -> 06."*
   - Baris 73: *"Fixed stack/pins/budgets/ports/candidate order/A2UI/MCP architecture kekal mengikut ADR/contract. No Next.js/framework migration, no LiteLLM substitution, no Dynamic A2UI, no paid application model/fallback/overflow, no arbitrary HTML/JS/generic SQL/shell/HTTP product tool. JEV kekal LOCAL_RULES..."*

3. **Keputusan Seni Bina ADR-0003 (`docs/decisions/0003-blueprint-v23-execution-contract.md`):**
   - Baris 7–26: Menetapkan pilihan tunggal: Modular Monolith React 19/Vite + Bun; autoriti komersial SQLite tempatan dan Supabase CAS awan; Runtime CopilotKit TypeScript `/v2` pada port `3020` dan perkhidmatan Python Google ADK pada port `8030`; Loopback ports: UI `3000`, API `3010`, Runtime `3020`, ADK `8030`.
   - Baris 21: Susunan model percuma: `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> OpenRouter `nvidia/nemotron-3-super-120b-a12b:free`.
   - Baris 50–56: Pembetulan MCP Major Boundary: Host MCP App menggunakan `@modelcontextprotocol/ext-apps@2.0.3` dan `@modelcontextprotocol/core`/`client`/`server@2.0.0` melalui sempadan HTTP wire, manakala runtime CopilotKit mengekalkan SDK v1 secara dalaman.

4. **Integriti Kewangan FIN-01 (`shared/growth-contracts.ts` & `tests/platform/financial-integrity-v24.test.ts`):**
   - `shared/growth-contracts.ts` baris 144–185: Menggunakan perbandingan tepat BigInt:
     `const isMarginPctPass = input.netSalesExTaxSen > 0 && contributionSenBig * 10000n >= netSalesSenBig * minimumMarginBps;`
   - `tests/platform/financial-integrity-v24.test.ts` baris 20–38: Membuktikan bahawa jualan RM 1,000.00 (100,000 sen) dengan kos RM 750.04 (75,004 sen) menghasilkan sumbangan 24,996 sen (24.996%), yang walaupun dibundar ke 25.00% pada paparan, **ditolak secara mutlak** (`isMarginPctPass: false`, `allowed: false`, `reasonCode: 'INSUFFICIENT_PERCENT_MARGIN'`).
   - Jualan bersumberkan 0 atau negatif ditolak kelayakan nisbahnya.

5. **Kitaran Hayat HITL & Resit Pelaksanaan (`server/platform/adkAgent.ts` & `tests/platform/hitl-execution-v24.test.ts`):**
   - `server/platform/adkAgent.ts` baris 145–152: `decideHitlAction` menetapkan `executionReceipt: undefined` dan `executionBlockedReason: approve ? 'EXECUTOR_UNAVAILABLE' : undefined`.
   - `tests/platform/hitl-execution-v24.test.ts` baris 97–123: Mengesahkan bahawa tindakan yang diluluskan founder tidak mencipta resit palsu (`expect(updated.executionReceipt).toBeUndefined()`) dan disekat dengan `EXECUTOR_UNAVAILABLE` sehingga ada executor fizikal.
   - Baris 160–205: Tindakan HITL yang telah luput (`expiry` lampau) ditolak dengan status 409 `HITL_EXPIRED` sebelum sebarang mutasi berlaku.

6. **Katalog 32 Alatan Lanjutan & 10 Modul (`docs/design/copilot-advanced-tools.md` & `03-domains-and-tools.md`):**
   - Menyenaraikan kesemua 32 keupayaan logikal (ADV-01 hingga ADV-32), pengelasan risiko ketat (Q - Query, S - Simulation, D - Draft/Proposal, C - Command, X - External effect), dan penolakan argumen tidak dikenali.
   - ADV-25 dihadkan kepada arahan kanonikal berdaftar berasaskan hash proposal yang sah. ADV-26 dibahagikan secara eksplisit kepada `inspect_action_receipt` (Q), `refresh_external_action_status` (X), dan `apply_verified_action_outcome` (C) bagi mengelakkan pertukaran risiko dinamik.

7. **Tujuh Pendekatan Generative UI (`docs/design/copilot-generative-ui-seven-approaches.md` & `04-ui-and-agents.md`):**
   - GUI-01: Kad paparan sahaja (`JevAssessmentCard`, `MarginSimulator`, `OrderTrackingBadge`, `CommissionCard`).
   - GUI-02: Borang interaktif callback (`MarginSimulationForm`, `PublishedProductPicker`, `ApprovalReview`).
   - GUI-03: Kitaran hidup alatan normalisasi SDK (queued, running, succeeded, failed, unknown_outcome).
   - GUI-04: Unjuran keadaan bersama (shared state) antara antaramuka dan ejen.
   - GUI-05: MCP App pertama baca-sahaja `abangcolek-operations-brief` (`ui://abangcolek/operations-brief/v1`) dalam iframe sandboxed.
   - GUI-06: A2UI Fixed Schema (`copilotkit://abangcolek-ops-v1`) untuk ringkasan operasi dan impak ganti rugi (`injectA2UITool: false`).
   - GUI-07: Penyesuaian komponen asli ABANGCOLEK dengan kesetaraan rentas antaramuka (WCAG AA, responsif 320px).
   - CPK-10: Delegasi ejen pakar (`commerce_reader`, `qc_jev_reviewer`, `marketing_drafter`) di bawah ejen induk `abangcolek_ops`.

---

## 2. Logic Chain

1. **Daripada Keutamaan Fasa (Observation 2):**
   - Memandangkan arahan menetapkan urutan mandatori `03A -> 01 -> 02 -> 03B -> 04`, fasa integriti kewangan (03A) menjadi prasyarat kritikal sebelum pemindahan struktur kod (01). Kegagalan pada lejar atau HITL akan mencemarkan integriti semasa penyusunan semula fail.
2. **Daripada Peraturan Integriti Kewangan (Observation 4 & 5):**
   - Logik kewangan ("Rules Own The Money") menolak sebarang pembundaran titik terapung (floating-point) dalam pengiraan keuntungan atau kelulusan kempen. Dengan menguatkuasakan `BigInt(contributionSen) * 10000n >= BigInt(netSalesSen) * BigInt(minimumMarginBps)`, sebarang jurang walaupun 1 sen (cth. 24.996%) disekat secara deterministik.
3. **Daripada Kitaran Hayat HITL (Observation 5):**
   - AI atau manusia yang meluluskan permintaan tidak boleh dianggap telah melaksanakannya. Pemisahan antara status kelulusan (`approved`) dan resit pelaksanaan fizikal (`executionReceipt`) menghalang resit rekaan (fabricated receipts) daripada muncul dalam pangkalan data sebelum mutasi pangkalan data berlaku secara sah.
4. **Daripada Batas Protokol Model & Alatan (Observation 3, 6, & 7):**
   - Penguatkuasaan had bajet (6 alatan, 3 panggilan model, 30s timeout) dan urutan model percuma menjamin sifar perbelanjaan awan baharu (Zero-New-Paid-Cloud-Spend). Pembatasan skema alatan menghalang sebarang cubaan prompt injection untuk memanggil arahan shell, SQL mentah, atau mutasi tidak sah.
5. **Daripada Sempadan Generative UI & MCP (Observation 3 & 7):**
   - Pengasingan MCP SDK v1 (pada CopilotKit runtime) dan MCP SDK/Apps v2 (pada Operations Brief Host) melalui wayar HTTP menyelesaikan percanggahan versi pakej tanpa memerlukan pengubahsuaian kod runtime pihak ketiga (`as any` cast).

---

## 3. Caveats

1. **Servis Python Google ADK Tempatan:**
   - Direktori `agents/google-adk/` memerlukan virtual environment Python 3.12 (`.venv`) dengan dependensi terkunci (`uv.lock` atau `requirements.txt`). Semasa fasa kajian ini, fail diperiksa secara statik tanpa melancarkan proses servis background Python untuk mematuhi mandat Read-Only.
2. **Ketersediaan Kuota Model Percuma Luaran:**
   - Ketersediaan endpoint luaran (Google AI Studio Gemini Free API dan OpenRouter Free Nemotron) bergantung kepada kuota langsung penyedia. Apabila kuota habis, sistem beralih secara automatik kepada penilaian aturan tempatan (`LOCAL_RULES`) tanpa kegagalan sistem.
3. **Penyambung Intelligence (CPK-02 & CPK-03):**
   - Kemampuan AG-UI Streams dan Automatic Learning kekal dilabelkan `blocked_external` sehingga akaun percuma/projek yang layak disahkan secara rasmi, mengikut ketetapan `PROJECT-CHECKLIST.md`.

---

## 4. Conclusion

Laporan pelombongan spesifikasi (`spec_report.md`) telah berjaya diekstrak secara komprehensif merentas kesemua 5 fasa:
- **97 entri ciri autoritatif** didokumentasikan dalam jadual `## Features Discovered` mengikut format piawai.
- **33 kes tepi dan sempadan kegagalan** didokumentasikan dalam jadual `## Edge Cases` dengan bukti fail dan baris kod yang tepat.
- Sempadan antara fasa, hierarki alatan, protokol model percuma, integriti integer sen BigInt, dan kitaran hayat HITL telah dirakamkan secara jelas dan bersedia untuk dijadikan rujukan kanonikal oleh sub-agent perancang dan pelaksana seterusnya.

---

## 5. Verification Method

Untuk mengesahkan secara bebas penemuan dalam laporan ini, jalankan arahan pengesahan domain berikut dari direktori root `d:\ABANGCOLEK-PLATFORM`:

1. **Ujian Integriti Kewangan (FIN-01):**
   ```powershell
   bun test tests/platform/financial-integrity-v24.test.ts
   ```
   *Jangkaan:* Lulus (menolak kes 24.996%, menolak jualan sifar, menolak kos negatif dan pecahan sen).

2. **Ujian Kitaran Hayat HITL & Resit (CPK-06):**
   ```powershell
   bun test tests/platform/hitl-execution-v24.test.ts
   ```
   *Jangkaan:* Lulus (kelulusan tanpa resit palsu, sekatan `EXECUTOR_UNAVAILABLE`, penolakan tindakan luput 409).

3. **Ujian Margin Pertumbuhan Sedia Ada:**
   ```powershell
   bun test tests/platform/growth-margin.test.ts
   ```
   *Jangkaan:* Lulus (kesemua senario margin sumbangan kanonikal).

4. **Pemeriksaan Fail Artifak:**
   - Periksa `d:\ABANGCOLEK-PLATFORM\.agents\teamwork\spec_miner_1\spec_report.md` untuk jadual lengkap penemuan ciri dan kes tepi.
   - Periksa `d:\ABANGCOLEK-PLATFORM\.agents\teamwork\spec_miner_1\BRIEFING.md` dan `progress.md`.
