# DOKUMEN SERAHAN RASMI GITHUB COPILOT (FRONTEND HANDOFF v2.3)

> **Tarikh**: 19 Oktober 2026  
> **Integrator & Pengeluar**: AGY Backend Owner & Integration Lead  
> **Penerima**: GitHub Copilot (Frontend Owner)  
> **Status**: RATIFIED & FROZEN (Fasa 00 & Fasa 04)  
> **Baseline Commit SHA**: `e43d258`  
> **Trunk Branch**: `integrate/blueprint-v23`  

---

## 1. Lokasi Worktree & Git Setup

Semua kerja frontend oleh GitHub Copilot MESTI dilaksanakan secara eksklusif dalam worktree terasing berikut:

- **Lokasi Worktree**: `D:\ABANGCOLEK-WORKTREES\copilot-frontend`
- **Branch Kerja**: `work/copilot-frontend-v23`
- **Asas Commit (Base SHA)**: `e43d258`
- **Integrator Trunk**: `D:\ABANGCOLEK-PLATFORM` (`integrate/blueprint-v23`)

> [!IMPORTANT]
> Jangan lakukan sebarang operasi `git reset`, `git clean -fd`, atau push terus ke `main`. Segala integrasi ke trunk akan diuruskan oleh AGY Integrator melalui cherry-pick atau patch integration yang disahkan.

---

## 2. Kawasan Pemilikan Fail (File Ownership & Boundaries)

### A. Fail & Direktori Eksklusif Milik Copilot (Boleh Diubah)
Copilot memiliki autoriti penuh untuk membina, mengubahsuai, dan menguji komponen UI berikut:
1. `src/features/copilot/` (Semua komponen dan renderer Generative UI)
   - `cards/` (GUI-01 Display Only: Kad Ringkasan, Margin, Komisen)
   - `interactive/` (GUI-02 Interactive Pickers & Inputs)
   - `tool-rendering/` (GUI-03 Status Alat: Running/Success/Failed/Unknown)
   - `state-rendering/` (GUI-04 Filter & Workflow State Projections)
   - `mcp-apps/` (GUI-05 Read-Only First-Party Operations Brief)
   - `declarative/` (GUI-06 A2UI Fixed Schema forms)
   - `components/` (GUI-07 Shared UI Elements & Hooks)
2. `src/features/pet/` (Sistem Pembantu Maskot Pet Companion)
   - `PetAvatar.tsx`, `PetCompanion.tsx`, `petdex.ts`, `speechService.ts`, `pet-companion.css`
3. `src/features/workspaces/CopilotWorkspace.tsx`
4. `src/features/flows/` (Komponen borang interaktif & rendering pengalaman pelanggan)
5. Suite ujian frontend dan komponen: `tests/frontend/` atau komponen spesifik `.test.tsx`.

### B. Fail Terlindung (PROTECTED - TIDAK BOLEH DISENTUH COPILOT)
Fail-fail berikut adalah hak milik mutlak AGY Backend & Integrator. Sebarang pengubahsuaian oleh Copilot akan ditolak semasa integrasi:
- `server/` (Semua fail backend, otoriti kewangan, lejar, auth, store, migration)
- `shared/` (Kontrak platform, dealer, onboarding, growth — sebarang perubahan memerlukan semakan AGY)
- `api/` (`platform.ts`, `platform-worker.ts` - Vercel entry points)
- `tests/platform/` (Suite ujian integriti autoriti platform)
- `package.json`, `bun.lockb`, `tsconfig.json` (Konfigurasi teras pin)

---

## 3. Spesifikasi Kontrak Runtime CopilotKit & ADK (/v2)

### Endpoint API Pelayan
- **Chat Endpoint**: `POST /api/platform/copilot/chat`
- **Hitl Endpoint**: `GET /api/platform/copilot/hitl` dan `POST /api/platform/copilot/hitl/:id/decide`
- **Active Providers Endpoint**: `GET /api/platform/copilot/providers` dan `POST /api/platform/copilot/providers/switch`

### Protokol Streaming SSE (Server-Sent Events)
Header: `Accept: text/event-stream`  
Format Chunk:
```text
event: start
data: {"model":"gemini-3.6-flash","provider":"gemini_free"}

event: gen_ui
data: {"name":"JevAssessmentCard","props":{"issueClass":"LEAKAGE","confidence":0.96,"rootCause":"UNDETERMINED","sopAction":"Kuarantin batch di cawangan"}}

event: text_delta
data: {"text":"Penilaian JEV mendapati..."}

event: done
data: {"status":"complete"}
```

---

## 4. Spesifikasi 7 Pendekatan Generative UI (GUI-01..07)

| ID | Nama Komponen | Props Kontrak Rasmi | Keperluan Integriti |
| :--- | :--- | :--- | :--- |
| **GUI-01** | `JevAssessmentCard` | `{ issueClass: string, confidence: number, rootCause: string, sopAction: string }` | Paparan sahaja. Tiada mutasi. Keyakinan (confidence) mesti mengikut nilai sebenar evaluator. |
| **GUI-02** | `MarginSimulator` | `{ contributionMarginPct: number, requiredMarginPct: number, status: 'PASSED' \| 'FAILED' }` | Simulasi interaktif; pengesahan mutlak kekal pada pelayan Bun (P0 separation: RM vs %). |
| **GUI-03** | `ToolStatusBadge` | `{ toolName: string, state: 'queued' \| 'running' \| 'succeeded' \| 'failed' \| 'unknown', executionId: string }` | Menolak status 'success' palsu sekiranya terdapat ralat API. |
| **GUI-04** | `OrderTrackingBadge` | `{ endpoint: string, security: string }` | Token keselamatan mesti ditapis (redacted SHA hash). |
| **GUI-05** | `OperationsBriefApp` | `{ title: string, sections: Array<{ label: string, value: string }>, generatedAt: string }` | Aplikasi MCP pihak pertama (read-only). Tiada proxy arbitrary tool. |
| **GUI-06** | `A2UIFixedForm` | `{ schemaId: 'a2ui-fixed-v1', fields: Array<{ key: string, type: 'text' \| 'number' \| 'select', label: string }> }` | Skema tetap (fixed schema). Secondary dynamic schema inference dilarang sama sekali. |
| **GUI-07** | `CopilotWorkspaceCard` | `{ workspaceId: string, role: 'founder' \| 'dealer' \| 'staff', activePetId?: string }` | Mengasingkan role dan konteks sesi secara terjamin. |

---

## 5. Status Ralat, Denied, Loading & Insufficient-Data Fixtures

Copilot MESTI mengendalikan semua keadaan berikut dengan anggun (graceful degradation):

```typescript
// Fixture 1: Loading State
export const LOADING_FIXTURE = {
  isLoading: true,
  status: 'Memproses arahan melalui enjin Google ADK...',
};

// Fixture 2: Denied / Insufficient Permission State
export const DENIED_FIXTURE = {
  ok: false,
  code: 'AUTH_REQUIRED',
  message: 'Sesi log masuk diperlukan untuk mengakses keupayaan Copilot ini.',
};

// Fixture 3: Insufficient Margin Pass State (409)
export const MARGIN_FAILED_FIXTURE = {
  ok: false,
  code: 'INSUFFICIENT_CASH_MARGIN',
  message: 'Margin sumbangan tunai berada di bawah ambang minima yang dibenarkan.',
};

// Fixture 4: Remote Transport Blocked / Offline Sovereign Fallback
export const OFFLINE_SOVEREIGN_FIXTURE = {
  ok: true,
  data: {
    reply: 'Arahan operasi Copilot ADK telah disahkan dan diproses mengikut protokol sovereign tanpa sebarang kos pengkomputeran berbayar.',
    providerUsed: 'gemini_free',
    modelUsed: 'gemini-3.6-flash',
  }
};
```

---

## 6. Arahan Pengesahan & Ujian (Verification Protocol)

Semua kod frontend yang ditulis oleh Copilot mesti lulus ujian berikut sebelum serahan:
1. **Pemeriksaan Taip & Lint**:
   ```powershell
   bun run lint
   ```
2. **Binaan Pengeluaran Frontend**:
   ```powershell
   bun run build
   ```
3. **Ujian Komponen**:
   ```powershell
   bun test
   ```

---

## 7. Saluran Permintaan Kebergantungan (Dependency Request)

Sekiranya GitHub Copilot memerlukan endpoint atau sambungan kontrak baru dari backend, wujudkan tiket permintaan di:
`docs/handover/COPILOT-DEPENDENCY-REQUESTS.md` mengikut format:
- `Feature ID` (cth: GUI-02)
- `Endpoint / Function Needed`
- `Proposed Request & Response Schema`
- `Justification`

AGY Backend Owner akan menilai, meluluskan, dan melaksanakan kontrak tersebut dalam laluan backend.
