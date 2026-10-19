# DOKUMEN SERAHAN RASMI GITHUB COPILOT (FRONTEND HANDOFF v2.3 - REVISION 3)

> **Tarikh**: 19 Oktober 2026  
> **Integrator & Pengeluar**: AGY Backend Owner & Integration Lead  
> **Penerima**: GitHub Copilot (Frontend Owner)  
> **Status**: RATIFIKASI REVISION 3 (Google ADK Python, Domain Tools, First-Party MCP App & /copilot/v2 Runtime AKTIF)  
> **Baseline Commit SHA**: `e43d258`  
> **Handoff Revision 3 Commit SHA**: `af43557`  
> **Branch Integrasi**: `integrate/blueprint-v23`  

---

## 1. Lokasi Worktree & Git Setup

Semua kerja pembinaan frontend oleh GitHub Copilot MESTI dilaksanakan di worktree khusus berikut:

- **Lokasi Worktree**: `D:\ABANGCOLEK-WORKTREES\copilot-frontend`
- **Branch Kerja**: `work/copilot-frontend-v23`
- **Asas Commit (Base SHA)**: `e43d258`
- **Trunk Integrasi**: `D:\ABANGCOLEK-PLATFORM` (`integrate/blueprint-v23`)

> [!IMPORTANT]
> Jangan lakukan `git reset --hard` atau `git clean -fd`. Segala integrasi ke trunk akan disatukan oleh AGY Integrator melalui pengesahan commit terkawal. Subagent AGY tidak akan menyentuh atau mengubahsuai sebarang fail frontend dalam worktree ini semasa Copilot sedang bekerja.

---

## 2. Kawasan Pemilikan Fail (File Ownership & Strict Boundaries)

### A. Fail & Direktori Milik Copilot (Boleh Diubah)
1. `src/features/copilot/` (Semua komponen dan renderer Generative UI)
   - `cards/` (GUI-01 Display Only: Kad Ringkasan, Margin, Komisen)
   - `interactive/` (GUI-02 Interactive Pickers & Inputs)
   - `tool-rendering/` (GUI-03 Status Alat: Running/Success/Failed/Unknown)
   - `state-rendering/` (GUI-04 Filter & Workflow State Projections)
   - `mcp-apps/` (GUI-05 Read-Only First-Party Operations Brief Component)
   - `declarative/` (GUI-06 A2UI Fixed Schema Form Renderer)
   - `components/` (GUI-07 Shared UI Elements & Adapters)
2. `src/features/pet/` (Sistem Pembantu Maskot Pet Companion)
   - `PetAvatar.tsx`, `PetCompanion.tsx`, `petdex.ts`, `speechService.ts`, `pet-companion.css`
3. `src/features/workspaces/CopilotWorkspace.tsx`
4. `src/features/flows/` (Komponen borang interaktif pengalaman pelanggan)
5. Suite ujian frontend dan komponen: `tests/frontend/` atau `*.test.tsx`.

### B. Fail Terlindung (PROTECTED - Hak Milik Mutlak AGY Backend)
Fail-fail berikut TIDAK BOLEH disentuh oleh Copilot:
- `server/` (Semua fail backend, autoriti kewangan, lejar, auth, store, migration)
- `shared/` (Kontrak platform, dealer, onboarding, growth — sebarang perubahan memerlukan persetujuan AGY)
- `api/` (`platform.ts`, `platform-worker.ts`)
- `tests/platform/` (Suite ujian integriti autoriti platform)
- Root `package.json`, `bun.lockb`, `tsconfig.json` (Hanya diuruskan oleh AGY Integrator)

---

## 3. Status Sebenar Kebergantungan & Protokol Runtime (Terkini: Revision 3)

> [!NOTE]
> **Status Kemajuan Backend Terkini (OBSERVED & VERIFIED)**:
> 1. **Perkhidmatan Python Google ADK** (`agents/google-adk/app.py` Port 8030) kini **AKTIF & WUJUD** dengan 3 specialists:
>    - `commerce_reader` (Katalog & stok read-only)
>    - `qc_jev_reviewer` (Audit kualiti berasaskan LOCAL_RULES tanpa skor kepastian rekaan)
>    - `marketing_drafter` (Kempen promosi dengan Margin Guardian >= 25%)
> 2. **CopilotKit v2 Runtime & A2UI SSE Endpoints** kini **AKTIF** pada:
>    - `POST /copilot/v2`, `GET /copilot/v2` (Streaming chunk dan event `a2ui`)
>    - `GET /copilot/tools` (10 Platform Domain Tools)
>    - `GET /copilot/mcp/brief/daily` & `/copilot/mcp/brief/urgent` (First-Party Read-Only MCP App)
> 3. **Skema A2UI Fixed Schema** (`a2ui.v1`) ditakrifkan dalam `shared/copilot-contracts.ts` merangkumi 6 komponen rasmi:
>    - `OperationsBriefCard`
>    - `RefundImpactPanel`
>    - `JevAssessmentCard`
>    - `MarginSimulator`
>    - `OrderTrackingBadge`
>    - `CommissionCard`
> 4. Copilot boleh menyambungkan komponen UI secara langsung kepada endpoint backend `/copilot/v2` atau terus menggunakan fixtures beku di bawah untuk pengasingan ujian unit (Pure Component Testing).

### Format Payload Acara A2UI SSE:
```http
event: a2ui
data: {"componentName":"OperationsBriefCard","props":{"title":"Taklimat Operasi Harian","briefDate":"2026-10-19","metrics":[{"label":"Pesanan Menunggu","value":"14"}]}}
```

---

## 4. Spesifikasi Kontrak 7 Pendekatan Generative UI (GUI-01..07)

Semua komponen adalah spesifikasi sasaran (placeholder/target contract). Jangan anggap komponen sudah selesai sebelum ujian integrasi dijalankan.

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
  *(PERATURAN MUTLAK: Tiada nilai skor keyakinan / confidence float rekaan seperti 0.96. Sebarang tahap risiko dinyatakan melalui kategori bukti kualitatif).*

### GUI-02: Interactive (`MarginSimulator`)
- **Tujuan**: Simulasi margin sumbangan kempen promosi.
- **Props Schema**:
  ```typescript
  export interface MarginSimulatorProps {
    contributionSen: number;
    contributionMarginPct: number;
    requiredContributionSen: number;
    requiredMarginPct: number;
    status: 'PASSED' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN';
    onSimulateClick?: (inputSen: number, discountPct: number) => void;
  }
  ```
  *(Autoriti kewangan kekal pada Bun Backend: P0 pemisahan ketat antara sumbangan tunai Sen/RM dan peratusan margin %).*

### GUI-03: Tool Rendering (`ToolStatusBadge`)
- **Tujuan**: Memaparkan status pelaksanaan alat (tool) secara jujur.
- **Props Schema**:
  ```typescript
  export interface ToolStatusBadgeProps {
    toolName: string;
    state: 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown';
    executionId: string;
    errorMessage?: string;
  }
  ```
  *(Status ralat separa atau gagal tidak boleh dilabel sebagai 'succeeded').*

### GUI-04: State Rendering (`OrderStateCard`)
- **Tujuan**: Visualisasi state pesanan dan status penjejakan token.
- **Props Schema**:
  ```typescript
  export interface OrderStateCardProps {
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
  export interface OperationsBriefAppProps {
    title: string;
    briefDate: string;
    metrics: Array<{ label: string; value: string }>;
    readOnlyNotice: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED';
  }
  ```

### GUI-06: A2UI Fixed Schema (`A2UIFixedForm`)
- **Tujuan**: Borang deklaratif skema tetap untuk semakan impak pulangan wang (Refund Impact).
- **Props Schema**:
  ```typescript
  export interface A2UIFixedFormProps {
    schemaId: 'a2ui-fixed-refund-impact-v1';
    title: string;
    fields: Array<{
      key: string;
      label: string;
      type: 'text' | 'number' | 'select';
      options?: string[];
      value: any;
    }>;
    onSubmitDraft: (formData: Record<string, any>) => void;
  }
  ```
  *(Dynamic schema injection dan auxiliary paid model calls disekat sepenuhnya).*

### GUI-07: Your Components (`CopilotWorkspaceCard`)
- **Tujuan**: Pengasingan peranan ruang kerja (Workspace Role Isolation) dan penyesuaian tema.
- **Props Schema**:
  ```typescript
  export interface CopilotWorkspaceCardProps {
    workspaceId: string;
    role: 'founder' | 'staff' | 'dealer' | 'customer'; // Canonical roles
    theme: 'light' | 'dark';
    activePetId?: string;
  }
  ```

---

## 5. Fixtures Beku untuk Ujian & Pembangunan Frontend (Frozen Fixtures)

Copilot boleh menggunakan fixtures ini terus dalam komponen frontend tanpa menunggu sambungan backend:

```typescript
// 1. Fixture GUI-01 (JEV Kualiti)
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
  contributionMarginPct: 28.0,
  requiredContributionSen: 2000,
  requiredMarginPct: 20.0,
  status: 'PASSED',
};

// 3. Fixture GUI-02 (Margin Failed 409)
export const MARGIN_FAIL_FIXTURE: MarginSimulatorProps = {
  contributionSen: 800,
  contributionMarginPct: 12.0,
  requiredContributionSen: 2000,
  requiredMarginPct: 20.0,
  status: 'INSUFFICIENT_CASH_MARGIN',
};

// 4. Fixture Error & Denied States
export const ERROR_STATES = {
  authRequired: { ok: false, code: 'AUTH_REQUIRED', message: 'Sesi log masuk diperlukan.' },
  insufficientRole: { ok: false, code: 'FORBIDDEN_ROLE', message: 'Peranan ini tidak dibenarkan mengakses alat ini.' },
  runtimeUnavailable: { ok: false, code: 'RUNTIME_UNAVAILABLE', message: 'Runtime CopilotKit sedang dimulakan.' },
};
```

---

## 6. Arahan Pengesahan & Ujian (Verification Protocol)

Semua kod frontend yang dibina dalam worktree `D:\ABANGCOLEK-WORKTREES\copilot-frontend` mesti lulus:
```powershell
# 1. Semakan taip TypeScript
bun run lint

# 2. Binaan pengeluaran Vite
bun run build

# 3. Ujian suite
bun test
```

---

## 7. Saluran Permintaan Kontrak Backend

Jika sebarang perubahan schema atau endpoint baru diperlukan, Copilot boleh mencipta fail permintaan di:
`docs/handover/COPILOT-DEPENDENCY-REQUESTS.md`
Backend Lead akan menilai dan menyediakan endpoint tersebut dalam laluan integrasi.
