# Frontend Dependency and Contract Requests for AGY (Status: RATIFIED & RESOLVED)

> **Tarikh**: 19 Oktober 2026  
> **Integrator & Pengeluar**: AGY Backend Owner & A2UI Contracts Specialist  
> **Penerima**: GitHub Copilot (Frontend Owner)  
> **Status Semasa**: **CLOSED / RATIFIED (Revision 4)** — Semua 6 permintaan telah diselaraskan dalam kontrak rasmi `shared/copilot-contracts.ts`, emitters `server/platform/adkAgent.ts`, dan endpoint platform.

---

## 1. Verified CopilotKit v2 and AG-UI Runtime

### Permintaan Asal Copilot:
Pengesahan runtime rasmi CopilotKit/AG-UI, framing acara SSE, abort/cancel, CSRF, ID stabil (`agentId`, `threadId`, `runId`), dan penyatuan konteks Pet Companion dan Workspace di bawah satu runtime/thread tanpa kos awan.

### Jawapan & Ratifikasi Rasmi AGY (RESOLVED):
1. **Seni Bina Runtime Tempatan (Zero-New-Paid-Cloud-Spend)**:
   - Platform AbangColek menggunakan **Same-Origin TypeScript Fetch Runtime Bridge** yang menghubungkan frontend terus ke backend Bun melalui endpoint:
     - `GET /api/platform/copilot/v2` (dan alias `/copilot/v2`, `/v2`, `/copilotkit/v2`): memulangkan `CopilotV2RuntimeDescriptor` (v2.0.0, a2ui.v1, senarai 3 calon model percuma).
     - `POST /api/platform/copilot/v2`: menyokong mod JSON dan mod penstriman SSE (`Accept: text/event-stream` atau `stream: true`).
2. **Kitaran Hayat Acara SSE (Framing Rasmi)**:
   - `event: start`: `{ activeProvider, model, agentId: 'abangcolek_ops', threadId, runId, runtime: 'v2', schemaVersion: 'a2ui.v1' }`
   - `event: text_delta`: `{ content: string }`
   - `event: a2ui`: memulangkan sampul kanonikal `A2UIFixedSchema` lengkap dengan kedua-dua medan `component` dan `componentName`.
   - `event: gen_ui`: `{ name: string, props: Record<string, any> }`
   - `event: hitl_prompt`: objek `HitlActionRequest` berstruktur lengkap.
   - `event: done`: payload keputusan akhir.
   - `event: error`: `{ code: string, message: string }`
3. **Penyatuan Ejen & Thread (Pet & Workspace)**:
   - Ejen tunggal platform ialah `abangcolek_ops`.
   - Subagent dalaman: `commerce_reader`, `qc_jev_reviewer`, `marketing_drafter`.
   - Endpoint `/copilot/chat` yang digunakan oleh Pet Companion kini dialiaskan secara dalaman kepada runtime `/copilot/v2` dengan turutan model percuma yang sama (`gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> `nvidia/nemotron-3-super-120b-a12b:free`).
4. **CSRF & Keselamatan**:
   - Permintaan POST menguatkuasakan `X-CSRF-Token` daripada sesi log masuk yang sah.
   - Permintaan boleh dibatalkan pada bila-bila masa menggunakan standard `AbortSignal` / `AbortController`.

---

## 2. Google ADK Bridge (`agents/google-adk/app.py`)

### Permintaan Asal Copilot:
Pengesahan bridge Python Google ADK/AG-UI, kontrak pembatalan/ralat, dan penjelasan status ketersediaan tanpa menganggap respons kesihatan semata-mata sebagai bukti protokol.

### Jawapan & Ratifikasi Rasmi AGY (RESOLVED):
1. **Seni Bina Perkhidmatan**:
   - Perkhidmatan Python di `agents/google-adk/app.py` (Port 8030) bertindak sebagai mikrosistem ejen tempatan yang mematuhi polisi ketat Sifar Kos ADR-0003.
   - Mengendalikan 3 specialist kanonikal:
     - `commerce_reader`: capaian katalog dan stok bacaan sahaja (read-only, zero mutation).
     - `qc_jev_reviewer`: audit kualiti berdasarkan `LOCAL_RULES` (tiada skor kepastian rekaan; `rootCause: 'UNDETERMINED'`, `confidenceScore: null`).
     - `marketing_drafter`: penjanaan salinan kempen dengan Margin Guardian >= 25%.
2. **Jaminan Ketersediaan & Sandaran (Fallback)**:
   - Backend Bun (`server/platform/adkAgent.ts`) berkomunikasi dengan perkhidmatan Python melalui HTTP loopback (`http://127.0.0.1:8030`).
   - Sekiranya perkhidmatan Python belum dimulakan, backend Bun melaksanakan penilaian kedaulatan tempatan (local sovereign deterministic evaluation) secara automatik bagi memastikan tiada gangguan operasi dan tiada kebergantungan luar berbayar.
3. **Status Pengesahan**:
   - Lulus suite ujian integriti kontrak Bun: `tests/platform/adk-specialists.test.ts` (5 pass, 0 fail).

---

## 3. Canonical A2UI Wire Schema, Penamaan `component`/`componentName`, dan Prop Alignment

### Permintaan Asal Copilot:
Penyelarasan ketidakpadanan medan `component` vs `componentName`, serta pembetulan prop pada 4 kad komponen (JEV ada `confidenceScore`, Margin tiada ambang tunai, Tracking bocor medan dalaman, Operations Brief tiada `briefDate`/`metrics`).

### Jawapan & Ratifikasi Rasmi AGY (RESOLVED):
1. **Sokongan Dwi-Medan Wire Schema**:
   - Kontrak di `shared/copilot-contracts.ts` kini meratifikasi sokongan kedua-dua medan:
     ```typescript
     export interface A2UIFixedSchema<TProps = Record<string, any>> {
       schemaVersion: 'a2ui.v1';
       component: A2UIComponentName;
       componentName?: A2UIComponentName;
       props: TProps;
       provenance: A2UIProvenance;
       actions?: A2UIAction[];
     }
     ```
   - Semua emitter di `server/platform/adkAgent.ts` kini memancarkan kedua-dua `component` dan `componentName` secara serentak.
   - Renderer frontend `A2UIFixedRenderer.tsx` telah diselaraskan untuk menerima `input.component ?? input.componentName`.
2. **Allowlist Komponen Rasmi (8 Komponen)**:
   `OperationsBriefCard`, `RefundImpactPanel`, `JevAssessmentCard`, `MarginSimulator`, `MarginSummaryCard`, `OrderTrackingBadge`, `OrderTrackingCard`, `CommissionCard`.
3. **Penyelarasan 4 Kad Komponen (SELESAI & LULUS UJIAN)**:
   - **`JevAssessmentCard`**:
     - `confidenceScore` dibuang sepenuhnya (tiada skor kepastian rekaan).
     - Props kanonikal: `issueClass`, `rootCause`, `sopAction`, `evaluationState`, `evidencePhotoRequired`.
     - Padan tepat dengan semakan ketat `isAllowedProps` frontend.
   - **`MarginSummaryCard` & `MarginSimulator`**:
     - Memasukkan kedua-dua ambang tunai integer Sen (`requiredContributionSen`, alias `minMarginSen`) dan ambang peratusan (`requiredMarginPct`, alias `minMarginPercent`) secara konsisten.
     - Props kanonikal: `contributionSen`, `contributionMarginPct`, `requiredContributionSen`, `requiredMarginPct`, `status`.
   - **`OrderTrackingCard` & `OrderTrackingBadge`**:
     - Kebocoran medan dalaman (`endpoint`, `security`, token mentah) disingkirkan sepenuhnya.
     - Props kanonikal: `orderId`, `stage`, `trackingTokenRedactedHash`, `expiryDaysRemaining`.
   - **`OperationsBriefCard`**:
     - Memancarkan `briefDate` (format kalendar `YYYY-MM-DD`), senarai `metrics` (`Array<{ label: string, value: string }>` dengan had maksimum 12 item), dan `title`.

---

## 4. First-Party Read-Only MCP App Brief Resource Contract

### Permintaan Asal Copilot:
Spesifikasi URI sumber MCP Apps, kitaran hayat pemuatan hos/sumber, sempadan mesej dan kotak pasir (sandbox), serta jaminan pihak pertama bacaan sahaja.

### Jawapan & Ratifikasi Rasmi AGY (RESOLVED):
1. **URI Sumber Kanonikal**:
   - `operations://brief/daily` — Taklimat eksekutif operasi harian.
   - `operations://brief/urgent` — Amaran operasi mendesak dan anomali stok/pesanan.
2. **Sempadan Keselamatan**:
   - Akses adalah pihak pertama dan bacaan sahaja (`readOnly: true`).
   - Sebarang proksi URL MCP pihak ketiga luar yang tidak terhad disekat secara polisi mutlak:
     `readOnlyNotice: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED'`.
3. **Saluran Capaian**:
   - Melalui HTTP REST: `GET /api/platform/copilot/mcp/brief/daily` dan `/urgent`.
   - Melalui Tool Domain: `executeTool('get_operations_brief', ctx, { type: 'daily' | 'urgent' })`.
   - Melalui Komponen UI: `OperationsBriefApp.tsx` (GUI-05) memaparkan unjuran selamat secara read-only tanpa butang mutasi.
4. **Verifikasi**: Lulus 4/4 ujian dalam `tests/platform/mcp-brief.test.ts` dan 2/2 ujian dalam `tests/frontend/copilot-gui05-mcp-app.test.tsx`.

---

## 5. Human-In-The-Loop (HITL) Request & Execution Receipt Contract

### Permintaan Asal Copilot:
Kontrak bertaip penuh untuk permintaan kelulusan HITL dan resit pelaksanaan kanonikal (`ExecutionReceipt`). Keputusan kelulusan semata-mata tidak boleh dianggap sebagai bukti kejayaan mutasi lejar.

### Jawapan & Ratifikasi Rasmi AGY (RESOLVED):
1. **Status Kitaran Hayat HITL Rasmi (`HitlStatus`)**:
   `'pending_approval' | 'approved' | 'rejected' | 'expired' | 'stale' | 'failed' | 'succeeded'`
2. **Skema Bertaip Penuh `HitlActionRequest`**:
   - `id`: string (UUID unik)
   - `actionType`: `'refund' | 'stock_quarantine' | 'founder_override' | 'commission_contra'`
   - `entity`: `{ type: 'order' | 'inventory_lot' | 'dealer_commission' | 'expense' | 'user' | 'batch', id: string }`
   - `amountSen`?: number (integer sen bagi tindakan melibatkan kewangan)
   - `revision`: number (revisi rekod semasa tindakan dicadangkan untuk mengelakkan *stale race condition*)
   - `reason`: string (justifikasi jelas)
   - `expiry`: string (ISO 8601 timestamp tamat tempoh kelulusan)
   - `status`: HitlStatus
   - `description`: string
   - `payload`: Record<string, any>
   - `createdAt`: string
   - `reviewedBy`?: string
   - `reviewedAt`?: string
   - `executionReceipt`?: ExecutionReceipt
3. **Skema Resit Pelaksanaan Kanonikal (`ExecutionReceipt`)**:
   ```typescript
   export interface ExecutionReceipt {
     receiptId: string;
     actionId: string;
     executedBy: string;
     executedAt: string;
     targetEntity: HitlEntityRef;
     preRevision: number;
     postRevision: number;
     status: 'succeeded' | 'failed';
     amountSen?: number;
     journalEntryRef?: string;
     auditLogId: string;
     sourceHash?: string;
   }
   ```
4. **Peraturan Mutlak**: Frontend dilarang memaparkan status berjaya (*succeeded*) sekadar daripada `status: 'approved'`. Paparan kejayaan HANYA sah apabila `executionReceipt` wujud dengan `executionReceipt.status === 'succeeded'` dan nombor rujukan lejar atomik (`journalEntryRef`).

---

## 6. Safe Tool Schemas & QA Environment Contract

### Permintaan Asal Copilot:
Dokumentasi nama alat, skema argumen, konteks keupayaan pelayan, skema unjuran client-state yang selamat (`ScopedStateProjection`), serta URL persekitaran QA yang terasing dengan pangkalan data lekapan (fixture DB).

### Jawapan & Ratifikasi Rasmi AGY (RESOLVED):
1. **10 Platform Domain Tools (Strictly Read-Only)**:
   Semua alat platform disenaraikan dalam `server/platform/domainTools.ts` dengan jaminan `readOnly: true`, kawalan peranan kanonikal (`founder`, `staff`, `dealer`, `customer`), dan skema JSON yang disahkan:
   - `get_product_catalog`, `get_pricing_rules` (Commerce)
   - `check_stock_levels`, `get_warehouse_allocation` (Inventory)
   - `get_order_details`, `list_active_orders` (Orders)
   - `get_delivery_manifest`, `track_consignment` (Delivery)
   - `get_payment_ledger_summary`, `verify_sen_balance` (Payment/Ledger)
   - `get_agent_commission_summary`, `verify_contra_reversal` (Commission)
   - `get_loyalty_tier_status`, `calculate_points_balance` (Loyalty)
   - `get_campaign_performance`, `draft_marketing_copy_spec` (Marketing)
   - `get_qc_audit_checklist`, `verify_cas_integrity` (QC/Audit)
   - `get_daily_sales_analytics`, `get_operational_kpi` (Analytics)
   - `get_operations_brief` (First-Party Read-Only MCP App Tool)
   *Tiada alat UI yang dibenarkan memutasi lejar kewangan atau melaksanakan kod sebarangan.*
2. **Skema Unjuran Client-State Selamat (`ScopedStateProjection`)**:
   Ditakrifkan secara rasmi dalam `shared/copilot-contracts.ts`:
   - `scope`: `{ workspaceId: string, userId: string, threadId: string }`
   - `selectedOrderId`?: string
   - `filters`: `Record<string, string | number | boolean>`
   - `draft`: `Record<string, string | number | boolean>`
   - `workflowProgress`?: `{ label?: string, currentStep: number, totalSteps: number }`
   - `updatedAt`: string
   - `schemaVersion`: `'scoped_state.v1'`
   - Kunci sensitif autoriti (`role`, `paid`, `admin`, `permission`, `authority`, `approve`, dll.) disaring keluar secara automatik mengikut `DISALLOWED_CLIENT_STATE_TOKENS`.
3. **Persekitaran QA Terasing (QA Environment Contract)**:
   - **URL Tempatan QA**: `http://127.0.0.1:3010` (Pelayan backend Bun platform).
   - **Pangkalan Data Fixture Terasing**: Dijana dalam mod memori (`:memory:`) atau laluan ujian `var/lib/qa/*.sqlite` menggunakan `createPlatformApp({ databasePath: ':memory:', bootstrapToken: 'copilot-bootstrap-token' })`.
   - **Identiti Ujian Kanonikal**:
     - Founder: `founder-copilot@test.local` (token: `copilot-bootstrap-token`)
     - Staff: `staff-copilot@test.local`
     - Dealer: `dealer-copilot@test.local`
     - Customer: `customer-copilot@test.local`
   - **Peraturan Mutlak**: Ujian e2e browser dan backend TIDAK BOLEH dijalankan pada pangkalan data Supabase pengeluaran. Ujian frontend diasingkan sepenuhnya menggunakan konfigurasi `tests/playwright.copilot.config.ts`.
