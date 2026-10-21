<!-- COMMERCE-GROWTH-HISTORY-20261021:BEGIN -->
> **Konteks semasa 21 Oktober 2026:** badan bertarikh/mockup/proposal ini dikekalkan untuk provenance. Untuk pembangunan seterusnya, [Commerce & Growth](../design/commerce-growth.md) dan [handover](../prompts/COMMERCE-GROWTH-HANDOVER-20261021.md) memperincikan mandat public store setiap Agent/Stokis + private workspace, direct signup, server-bound store/referrer/fulfiller dan referral pelanggan satu peringkat dua hala. Contoh kadar, wallet, hierarki referral, empat role source atau arahan agent lama di bawah tidak meluluskan perubahan polisi/privilege atau menggantikan kontrak semasa. CG subcriteria memerlukan bukti di bawah ledger85; tiada status aplikasi dinaik taraf melalui nota sejarah ini.
<!-- COMMERCE-GROWTH-HISTORY-20261021:END -->

# DOKUMEN SERAHAN RASMI GITHUB COPILOT (FRONTEND HANDOFF v2.3 - REVISION 4)

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Tarikh**: 19 Oktober 2026  
> **Integrator & Pengeluar**: AGY Backend Owner & A2UI Contracts Specialist  
> **Penerima**: GitHub Copilot (Frontend Owner)  
> **Status**: RATIFIKASI REVISION 4 (Penyelarasan Penuh A2UI Fixed Schema, Emitter Props Alignment, Typed HITL & Execution Receipt, Scoped State Projection)  
> **Baseline Commit SHA**: `e43d258`  
> **Handoff Revision 4 Commit SHA**: `integrate/blueprint-v23` tip  
> **Branch Integrasi**: `integrate/blueprint-v23`  

---

## 1. Lokasi Worktree & Git Setup

Semua kerja pembinaan frontend oleh GitHub Copilot MESTI dilaksanakan di worktree khusus berikut:

- **Lokasi Worktree**: `D:\ABANGCOLEK-WORKTREES\copilot-frontend`
- **Branch Kerja**: `work/copilot-frontend-v23`
- **Asas Commit (Base SHA)**: `e43d258`
- **Trunk Integrasi**: `D:\ABANGCOLEK-PLATFORM` (`integrate/blueprint-v23`)

> [!IMPORTANT]
> Jangan lakukan `git reset --hard` atau `git clean -fd`. Segala integrasi ke trunk disatukan oleh AGY Integrator melalui pengesahan commit terkawal. Subagent AGY memelihara semua kerja frontend dalam worktree tersebut.

---

## 2. Kawasan Pemilikan Fail (File Ownership & Strict Boundaries)

### A. Fail & Direktori Milik Copilot (Boleh Diubah)
1. `src/features/copilot/` (Semua komponen dan renderer Generative UI)
   - `cards/` (GUI-01 Display Only: Kad Ringkasan JEV, Margin, Pesanan, Komisen, Loyalty, Tracking)
   - `interactive/` (GUI-02 Interactive Pickers & Inputs: `MarginSimulatorForm.tsx`)
   - `tool-rendering/` (GUI-03 Status Alat: `ToolStatusView.tsx`)
   - `state-rendering/` (GUI-04 Filter & Workflow State Projections: `ScopedStateView.tsx`)
   - `mcp-apps/` (GUI-05 Read-Only First-Party Operations Brief Component: `OperationsBriefApp.tsx`)
   - `declarative/` (GUI-06 A2UI Fixed Schema Form Renderer: `A2UIFixedRenderer.tsx`)
   - `components/` (GUI-07 Shared UI Elements & Adapters: `CopilotSurfaceCard.tsx`)
2. `src/features/pet/` (Sistem Pembantu Maskot Pet Companion)
   - `PetAvatar.tsx`, `PetCompanion.tsx`, `petdex.ts`, `speechService.ts`, `pet-companion.css`
3. `src/features/workspaces/CopilotWorkspace.tsx`
4. `src/features/flows/` (Komponen borang interaktif pengalaman pelanggan)
5. Suite ujian frontend dan komponen: `tests/frontend/` atau `*.test.tsx`.

### B. Fail Terlindung (PROTECTED - Hak Milik Mutlak AGY Backend)
Fail-fail berikut TIDAK BOLEH diubahsuai oleh Copilot tanpa persetujuan AGY Integrator:
- `server/` (Semua fail backend, autoriti kewangan, lejar, auth, store, migration)
- `shared/` (Kontrak platform, dealer, onboarding, growth, copilot-contracts)
- `api/` (`platform.ts`, `platform-worker.ts`)
- `tests/platform/` (Suite ujian integriti autoriti platform)
- Root `package.json`, `bun.lockb`, `tsconfig.json` (Hanya diuruskan oleh AGY Integrator)

---

## 3. Status Sebenar Kebergantungan & Protokol Runtime (Terkini: Revision 4)

> [!NOTE]
> **Status Kemajuan Backend Terkini (OBSERVED & VERIFIED)**:
> 1. **CopilotKit v2 Runtime & Same-Origin Fetch Bridge**:
>    - Endpoint aktif: `GET /api/platform/copilot/v2` (dan alias `/copilot/v2`, `/v2`, `/copilotkit/v2`) serta `POST /api/platform/copilot/v2`.
>    - Menyokong respons JSON dan penstriman Server-Sent Events (SSE) dengan framing acara standard: `start`, `text_delta`, `a2ui`, `gen_ui`, `hitl_prompt`, `done`, `error`.
>    - Sandaran percuma mutlak: Urutan model `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> `nvidia/nemotron-3-super-120b-a12b:free`. Sifar kos awan berbayar.
>    - Pet Companion dan Workspace disatukan di bawah ejen tunggal `abangcolek_ops`.
> 2. **Google ADK Python Bridge** (`agents/google-adk/app.py` Port 8030):
>    - Beroperasi secara tempatan dengan 3 specialist: `commerce_reader` (read-only), `qc_jev_reviewer` (LOCAL_RULES, tiada skor rekaan), `marketing_drafter` (Margin >= 25%).
>    - Dilindungi fallback tempatan jika servis Python luar talian. Lulus 5/5 ujian kontrak.
> 3. **Skema A2UI Kanonikal Dwi-Medan (`component` dan `componentName`)**:
>    - Ditakrifkan dalam `shared/copilot-contracts.ts` dan disokong oleh `A2UIFixedRenderer.tsx`:
>      ```typescript
>      export interface A2UIFixedSchema<TProps = Record<string, any>> {
>        schemaVersion: 'a2ui.v1';
>        component: A2UIComponentName;
>        componentName?: A2UIComponentName;
>        props: TProps;
>        provenance: A2UIProvenance;
>        actions?: A2UIAction[];
>      }
>      ```
>    - Allowlist 8 komponen rasmi: `OperationsBriefCard`, `RefundImpactPanel`, `JevAssessmentCard`, `MarginSimulator`, `MarginSummaryCard`, `OrderTrackingBadge`, `OrderTrackingCard`, `CommissionCard`.
> 4. **Penyelarasan Props Emitter 4 Kad Komponen**:
>    - `JevAssessmentCard`: Tiada `confidenceScore`. Props rasmi: `issueClass`, `rootCause`, `sopAction`, `evaluationState`, `evidencePhotoRequired`.
>    - `MarginSummaryCard` / `MarginSimulator`: Mengandungi integer Sen tunai (`requiredContributionSen` / `minMarginSen`) dan ambang peratusan (`requiredMarginPct` / `minMarginPercent`) secara konsisten.
>    - `OrderTrackingCard` / `OrderTrackingBadge`: Bebas daripada kebocoran medan dalaman. Props rasmi: `orderId`, `stage`, `trackingTokenRedactedHash`, `expiryDaysRemaining`.
>    - `OperationsBriefCard`: Memancarkan `briefDate` (YYYY-MM-DD) dan senarai `metrics`.
> 5. **Kontrak HITL & ExecutionReceipt Kanonikal**:
>    - Status rasmi: `pending_approval`, `approved`, `rejected`, `expired`, `stale`, `failed`, `succeeded`.
>    - `HitlActionRequest` lengkap dengan `entity`, `amountSen`, `revision`, `reason`, `expiry`, dan `executionReceipt`.
>    - `ExecutionReceipt` membuktikan kejayaan mutasi lejar secara atomik (`receiptId`, `preRevision`, `postRevision`, `status: 'succeeded'`, `journalEntryRef`, `auditLogId`).
> 6. **Unjuran Client-State Selamat (`ScopedStateProjection`)**:
>    - Mematuhi `DISALLOWED_CLIENT_STATE_TOKENS` untuk menapis keluar semua medan sensitif autoriti/peranan.
> 7. **Persekitaran QA Terasing**:
>    - URL Pelayan Ujian: `http://127.0.0.1:3010` disokong lekapan memori / SQLite terasing (`var/lib/qa/*.sqlite`).
>    - Tiada interaksi dengan pangkalan data Supabase pengeluaran semasa ujian e2e.

### Format Payload Acara A2UI SSE (Revision 4):
```http
event: a2ui
data: {"schemaVersion":"a2ui.v1","component":"OperationsBriefCard","componentName":"OperationsBriefCard","props":{"title":"Taklimat Operasi AbangColek Sovereign GrowthOS","briefDate":"2026-10-19","metrics":[{"label":"Pesanan Menunggu","value":"14"},{"label":"Status AI","value":"Zero-Cost Active"}]},"provenance":{"source":"local_authoritative","timestamp":"2026-10-19T13:40:00.000Z","revision":1}}
```

---

## 4. Spesifikasi Kontrak 7 Pendekatan Generative UI (GUI-01..07)

### GUI-01: Display Only (`JevAssessmentCard`)
- **Tujuan**: Paparan penilaian isu kualiti produk tanpa keupayaan mutasi terus.
- **Props Schema**:
  ```typescript
  export interface JevAssessmentCardProps {
    issueClass: 'LEAKAGE' | 'CAP_DEFECT' | 'TASTE_ANOMALY' | 'LABEL_MISPRINT';
    rootCause: 'UNDETERMINED' | 'SUPPLIER_BATCH_CONTAMINATION' | 'PACKAGING_CRIMP_FAILURE';
    sopAction: string;
    evaluationState: 'reviewed' | 'pending_quarantine';
    evidencePhotoRequired: boolean;
  }
  ```
  *(PERATURAN MUTLAK: Tiada nilai skor keyakinan / confidence float rekaan. Sebarang tahap risiko dinyatakan melalui kategori bukti kualitatif).*

### GUI-02: Interactive (`MarginSimulator` & `MarginSimulatorForm`)
- **Tujuan**: Simulasi margin sumbangan kempen promosi.
- **Props Schema**:
  ```typescript
  export interface MarginSimulatorProps {
    contributionSen: number;
    contributionMarginPct: number;
    requiredContributionSen: number; // minMarginSen (integer Sen threshold)
    requiredMarginPct: number; // minMarginPercent (percentage threshold)
    status: 'PASSED' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN';
    minMarginSen?: number;
    minMarginPercent?: number;
  }
  ```
  *(Autoriti kewangan kekal pada Bun Backend: P0 pemisahan ketat antara sumbangan tunai Sen/RM dan peratusan margin %).*

### GUI-03: Tool Rendering (`ToolStatusView`)
- **Tujuan**: Memaparkan status pelaksanaan alat secara telus tanpa menyembunyikan ralat.
- **Props Schema**:
  ```typescript
  export interface ToolStatusViewProps {
    toolName?: string;
    state?: 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown' | 'partial' | 'unknown_outcome';
    executionId?: string;
    errorMessage?: string;
  }
  ```

### GUI-04: State Rendering (`ScopedStateView` & `OrderTrackingBadge`)
- **Tujuan**: Visualisasi unjuran pesanan dan status penjejakan token selamat.
- **Props Schema**:
  ```typescript
  export interface OrderTrackingProjectionProps {
    orderId: string;
    stage: 'draft' | 'accepted' | 'packing' | 'dispatched' | 'received';
    trackingTokenRedactedHash: string;
    expiryDaysRemaining: number;
  }
  ```

### GUI-05: MCP Apps (`OperationsBriefApp`)
- **Tujuan**: Antara muka pihak pertama (read-only) untuk taklimat operasi harian.
- **Props Schema**:
  ```typescript
  export interface OperationsBriefCardProps {
    title: string;
    briefDate: string; // YYYY-MM-DD
    metrics: Array<{ label: string; value: string }>;
    readOnlyNotice?: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED';
  }
  ```

### GUI-06: A2UI Fixed Schema (`A2UIFixedRenderer` & `RefundImpactPanel`)
- **Tujuan**: Paparan deklaratif skema tetap untuk semakan impak pulangan wang.
- **Props Schema**:
  ```typescript
  export interface RefundImpactPanelProps {
    issueClass: 'LEAKAGE' | 'CAP_DEFECT' | 'TASTE_ANOMALY' | 'LABEL_MISPRINT';
    rootCause: 'UNDETERMINED' | 'SUPPLIER_BATCH_CONTAMINATION' | 'PACKAGING_CRIMP_FAILURE';
    hitlRequired: true;
    estimatedImpactSen?: number;
    sopAction?: string;
  }
  ```

### GUI-07: Your Components (`CopilotSurfaceCard` & `CopilotWorkspace`)
- **Tujuan**: Status runtime, tema aplikasi, dan navigasi peranan.
- **Props Schema**:
  ```typescript
  export interface CopilotSurfaceCardProps {
    title: string;
    description?: string;
    children: React.ReactNode;
  }
  ```

---

## 5. Fixtures Beku untuk Ujian & Pembangunan Frontend (Frozen Fixtures)

Copilot boleh menggunakan fixtures ini terus dalam komponen frontend tanpa menunggu sambungan backend:

```typescript
// 1. Fixture GUI-01 (JEV Kualiti Kanonikal)
export const JEV_CARD_FIXTURE: JevAssessmentCardProps = {
  issueClass: 'LEAKAGE',
  rootCause: 'UNDETERMINED',
  sopAction: 'Kuarantin batch di cawangan & minta bukti foto penutup botol',
  evaluationState: 'reviewed',
  evidencePhotoRequired: true,
};

// 2. Fixture GUI-02 (Margin Simulator Pass)
export const MARGIN_PASS_FIXTURE: MarginSimulatorProps = {
  contributionSen: 2800,
  contributionMarginPct: 28.5,
  requiredContributionSen: 2000,
  requiredMarginPct: 25.0,
  status: 'PASSED',
};

// 3. Fixture GUI-02 (Margin Failed Cash Threshold)
export const MARGIN_FAIL_FIXTURE: MarginSimulatorProps = {
  contributionSen: 800,
  contributionMarginPct: 12.0,
  requiredContributionSen: 2000,
  requiredMarginPct: 25.0,
  status: 'INSUFFICIENT_CASH_MARGIN',
};

// 4. Fixture GUI-05 (Operations Brief Pihak Pertama)
export const OPERATIONS_BRIEF_FIXTURE: OperationsBriefCardProps = {
  title: 'Taklimat Operasi AbangColek Sovereign GrowthOS',
  briefDate: '2026-10-19',
  metrics: [
    { label: 'Pesanan Menunggu', value: '14' },
    { label: 'Status AI', value: 'Zero-Cost Active' },
  ],
  readOnlyNotice: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED',
};
```

---

## 6. Arahan Pengesahan & Ujian (Verification Protocol)

Semua kod frontend yang dibina dalam worktree `D:\ABANGCOLEK-WORKTREES\copilot-frontend` disahkan melalui:

```powershell
# 1. Semakan taip TypeScript
bunx tsc --noEmit

# 2. Ujian suite frontend (32 ujian unit melepasi pengesahan)
bun test tests/frontend

# 3. Ujian browser UI terasing (Playwright Copilot suite)
bunx playwright test --config tests/playwright.copilot.config.ts

# 4. Binaan pengeluaran Vite
bun run build
```

---

## 7. Status Keputusan & Penutupan Permintaan

Semua 6 permintaan dalam `docs/handover/COPILOT-DEPENDENCY-REQUESTS.md` telah dijawab dan diratifikasikan secara rasmi. Tiada isu penghalang antara muka yang tinggal. Integrasi frontend ke runtime `/copilot/v2` kini boleh diteruskan dengan yakin mengikut spesifikasi Revision 4 ini.
