# Laporan Penerokaan Seni Bina & Kod Sedia Ada (Codebase & Architecture Exploration)
**Platform ABANGCOLEK v2.4 (Liurleleh House Malaysia)**  
**Ejen:** `explorer_1` (`teamwork_preview_explorer`)  
**Tarikh:** 20 Oktober 2026  
**Status Integriti:** READ-ONLY Exploration  

---

## 1. Ringkasan Eksekutif (Executive Summary)

Penerokaan teknikal menyeluruh telah dilaksanakan ke atas seluruh repositori `d:\ABANGCOLEK-PLATFORM` berpandukan Master Blueprint v2.4, ADR-0003, `docs/prompts/CONTINUE-AGY-20261020.md`, dan `PROJECT-CHECKLIST.md`.

### Status Asas (Baseline Status)
| Dimensi | Status Semasa | Bukti Kanonikal |
|---|---|---|
| **Kompilasi Pengeluaran (Build)** | **LULUS (Exit Code 0)** | `vite build && bun scripts/prerender-public.ts` lulus dalam 10.02s. Bundle terhasil di `dist/assets/`. |
| **Ujian Domain Integriti Kewangan & HITL** | **LULUS (Exit Code 0)** | 23 ujian lulus merentas 3 fail (`financial-integrity-v24.test.ts`, `hitl-execution-v24.test.ts`, `growth-margin.test.ts`). Resit SHA-256 tersimpan di `C:\Users\megat\Scripts\agy-quality-state\`. |
| **Ujian Penyelarasan Bayaran (PAY-01/02)** | **LULUS (Exit Code 0)** | 8 ujian lulus di `tests/platform/payment-reconciliation-v24.test.ts` (dedupe receipt, late paid review, no oversell STK-01). |
| **Ujian Penguntukan Balik (PAY-03)** | **LULUS di Bun (Exit 0), Ralat Linter TS** | 9 ujian lulus di Bun runtime, tetapi gagal kompilasi `tsc` (`bun run lint`). |
| **Pemeriksaan Linter TypeScript (`tsc --noEmit`)** | **GAGAL (Exit Code 2)** | `tests/platform/refund-allocation-v24.test.ts:10:28: error TS2305: Module '"../../shared/platform-contracts"' has no exported member 'PaymentRecord'.` |

---

## 2. Struktur Kod & Susun Atur Fail (Codebase Layout)

### 2.1 Konfigurasi Akar & Pengurus Pakej
- **Pengurus Pakej:** `bun@1.4.2` (`package.json:48`).
- **Skrip Utama (`package.json`):**
  - `"dev"`: `bun scripts/dev.ts`
  - `"dev:ui"`: `vite --port=3000 --strictPort`
  - `"server"`: `bun server/index.ts` (bind ke loopback port 3010)
  - `"build"`: `vite build && bun scripts/prerender-public.ts`
  - `"lint"`: `tsc --noEmit && tsc --noEmit -p tsconfig.platform.json`
  - `"test:platform"`: `bun test ./tests/jev ./tests/platform ./tests/dashboard-model.test.ts`
- **Konfigurasi TypeScript:**
  - `tsconfig.json`: Sasaran ES2022, module bundler, path alias `"@/*": ["./src/*"]`.
  - `tsconfig.platform.json`: Mod strict, jenis Bun & Node, merangkumi `server/**/*.ts`, `shared/**/*.ts`, `scripts/**/*.ts`, `tests/platform/**/*.ts`, `tests/jev/**/*.ts`, `api/**/*.ts`.
- **Konfigurasi Vite (`vite.config.ts`):**
  - Baris 21: `proxy: { '/api/platform': { target: process.env.PLATFORM_API_TARGET ?? 'http://127.0.0.1:3010', changeOrigin: false } }`
  - **Pemerhatian Kritikal:** Vite hanya proksi laluan berawalan `/api/platform` ke backend port 3010.

### 2.2 Susun Atur `server/` (Semasa vs Sasaran Fasa 01)
- **Keadaan Semasa `server/`:**
  - `server/index.ts`: Pelayan tempatan Bun.serve (port 3010, `idleTimeout: 15`, `maxRequestBodySize: 11MB`), mengendalikan pendaftaran bootstrap token dan kitaran daemon `app.jobs.claimJob()`.
  - `server/runtime-config.ts` & `server/runtime-identity.ts`: Konfigurasi pengesahan runtime dan hash identiti checkout.
  - `server/automation/`: Mengandungi penyelarasan worker (`cloudWorker.ts`).
  - `server/platform/`: Mengandungi **30 fail monolit** (termasuk `app.ts`, `commerce.ts`, `dealers.ts`, `loyalty.ts`, `marginGuardian.ts`, `domainTools.ts`, `adkAgent.ts`, `freeModelRouter.ts`, `supabasePersistence.ts`, `paymentReconciliation.ts`).
- **Sasaran Struktur Modular Monolith (Fasa 01):**
  - Mengikut `docs/prompts/01-structure.md` dan `docs/design/repository-structure.md`:
    - `adkAgent.ts` -> `server/agents/copilot/agent.ts`
    - `freeModelRouter.ts` -> `server/agents/providers/model-router.ts`
    - `domainTools.ts` -> `server/agents/tools/registry.ts`
    - `marginGuardian.ts` -> `server/modules/marketing/margin-guardian.ts`
    - `loyalty.ts` -> `server/modules/loyalty/service.ts`
    - `supabasePersistence.ts` -> `server/infrastructure/persistence/supabase-snapshot.ts`
    - Sandaran -> `server/infrastructure/backups/`
    - Routing & Bootstrap -> `server/bootstrap/`, `server/http/app.ts`, `server/http/routes/`
    - Aliran transaksi silang modul -> `server/application/`
  - **Pemerhatian Semasa:** Folder sasaran `server/modules/`, `server/application/`, `server/agents/` **belum diwujudkan** bagi mengekalkan kestabilan laluan sehingga fasa migrasi 01 bermula.

### 2.3 Arkib Media Resolusi Tinggi & Aset Akar (High-Resolution Media Assets)
Pemerhatian pada folder akar menunjukkan fail media mentah yang amat besar:
1. `PRODUCT LLH-20261017T020159Z-1-001` (Folder diekstrak) dan `.zip` sepadan bersaiz **595,183,102 bait (~595 MB)**.
   - Mengandungi 50 fail foto kamera DSLR mentah (contoh: `DSC00686.JPG` 17.3MB, `DSC02825.JPG` 21.5MB, `NO LOGO.jpg` 63.1MB), logo syarikat, dan dokumen SSM PDF (`SSM TFJ WORLDWIDE 1.pdf`).
2. `Product Photo-20261017T020223Z-1-001` (Folder diekstrak) dan `.zip` sepadan bersaiz **32,406,085 bait (~32.4 MB)**.
3. `outputs/` dan `manus-slides/`.
- **Sasaran Fasa 01:** Memindahkan arkib ini ke `references/media/product-2026-10-17/`, `reports/external/outputs/`, dan `references/presentations/manus/` tanpa menjejaskan hash SHA-256 dan mengasingkannya daripada repositori pengeluaran git.

---

## 3. Seni Bina & Kedudukan Endpoint CopilotKit

### 3.1 Perbandingan Endpoint `/api/platform/copilot/v2` vs `/api/copilot`
Dalam `server/platform/app.ts`:
- **Baris 353-354:**
  ```ts
  const url = new URL(request.url), path = url.pathname.replace(/^\/api\/platform/, '');
  if (!url.pathname.startsWith('/api/platform/') && !url.pathname.startsWith('/v2') && !url.pathname.startsWith('/copilotkit/v2')) fail('NOT_FOUND', 404);
  ```
- **Laluan GET `/copilot/v2` (Baris 191-202):**
  Mengembalikan deskriptor runtime tetap (`CopilotV2RuntimeDescriptor`):
  ```json
  {
    "version": "2.0.0",
    "runtime": "copilotkit-v2-agui",
    "schema": "a2ui.v1",
    "activeProvider": "gemini_free",
    "candidateModels": [...],
    "allowlistedComponents": ["OperationsBriefCard", "RefundImpactPanel", "JevAssessmentCard", "MarginSimulator", ...],
    "paidFallbackAllowed": false
  }
  ```
- **Laluan POST `/copilot/v2` (Baris 454-511):**
  Menyokong laluan `path === '/copilot/chat' || path === '/copilot/v2' || path === '/v2' || path === '/copilotkit/v2'`.
  Memeriksa auth operational, membaca `message`/`messages`, `history`, dan menyokong `text/event-stream` (SSE).

### 3.2 Analisis Percanggahan (Discrepancy Analysis)
1. **Laluan `/api/copilot` Ditolak:** Jika klien memanggil `/api/copilot`, `url.pathname.startsWith('/api/platform/')` menghasilkan `false` dan terus ditolak dengan status **404 NOT_FOUND**.
2. **Sekatan Proksi Vite:** `vite.config.ts:21` hanya memproksi `/api/platform`. Jika pelayar cuba memanggil `/v2` atau `/copilotkit/v2` secara langsung pada port 3000, Vite tidak akan memproksinya ke port 3010. Maka, **satu-satunya laluan yang berfungsi dari frontend ialah `/api/platform/copilot/v2`**.
3. **Protokol Streaming Semasa:**
   - Dalam `server/platform/app.ts:468-506`, respons distrim menggunakan `ReadableStream` dengan dialek kustom:
     - `event: start`
     - `event: a2ui`
     - `event: gen_ui`
     - `event: hitl_prompt`
     - `event: text_delta` (dipecah daripada perkataan teks `result.reply.split(/(\s+)/)`)
     - `event: done`
   - Ini adalah pelaksanaan interim. Fasa 02 memerlukan pemasangan rasmi runtime `@copilotkit/runtime` Fetch v2 bersama penyambung `HttpAgent`.

---

## 4. Perkhidmatan Python Google ADK (`agents/google-adk/`)

### 4.1 Susun Atur Perkhidmatan
- **Lokasi:** `d:\ABANGCOLEK-PLATFORM\agents\google-adk\`
- **Komponen:**
  - `app.py`: Aplikasi FastAPI Python 3.12 (Port default 8030).
  - `requirements.txt`: `fastapi==0.115.6`, `uvicorn==0.34.0`, `pydantic==2.10.4`, `httpx==0.28.1`, `pytest==8.3.4`.
  - `specialists/commerce_reader.py`: Membaca katalog dan stok runcit secara read-only.
  - `specialists/qc_jev_reviewer.py`: Menilai aduan kualiti (kebocoran) berasaskan LOCAL_RULES. Menguatkuasakan bahawa punca adalah `UNDETERMINED` dan `confidenceScore` adalah **`None` (tiada skor keyakinan rekaan)**.
  - `specialists/marketing_drafter.py`: Merangka kempen pemasaran tertakluk kepada syarat margin sumbangan minimum >= 25.0%.
  - `tests/test_agents.py`: Ujian unit FastAPI TestClient mengesahkan endpoint `/health` dan ketiga-tiga specialist.

### 4.2 Jurang Integrasi (Integration Gap)
- Walaupun perkhidmatan FastAPI di port 8030 telah lengkap dengan spesifikasi specialist, fail `server/platform/app.ts` pada masa ini **tidak membuat panggilan HTTP loopback ke port 8030**.
- Sebaliknya, `server/platform/app.ts:68` memulakan kelas TypeScript `GoogleAdkAgent` dari `server/platform/adkAgent.ts`.
- Pelaksanaan `HttpAgent` rasmi CopilotKit Fetch v2 yang memajukan mesej ke `http://127.0.0.1:8030/agent/abangcolek_ops` dijadualkan dalam Fasa 02.

---

## 5. Registri Alatan & Kawalan Privasi/Keselamatan (`server/platform/domainTools.ts`)

### 5.1 Status Semasa Registri Alatan
- Fail: `server/platform/domainTools.ts` (858 baris).
- **Jumlah Alatan Sedia Ada:** **21 alatan berkanun + 1 First-Party MCP App** merentas 10 domain:
  1. *Commerce:* `get_product_catalog`, `get_pricing_rules`
  2. *Inventory:* `check_stock_levels`, `get_warehouse_allocation`
  3. *Orders:* `get_order_details`, `list_active_orders`
  4. *Delivery/Dispatch:* `get_delivery_manifest`, `track_consignment`
  5. *Payment/Ledger:* `get_payment_ledger_summary`, `verify_sen_balance`
  6. *Commission:* `get_agent_commission_summary`, `verify_contra_reversal`
  7. *Loyalty:* `get_loyalty_tier_status`, `calculate_points_balance`
  8. *Marketing:* `get_campaign_performance`, `draft_marketing_copy_spec`
  9. *QC/Audit:* `get_qc_audit_checklist`, `verify_cas_integrity`
  10. *Analytics:* `get_daily_sales_analytics`, `get_operational_kpi`
  11. *First-Party MCP App:* `get_operations_brief` (diimport daripada `./mcp/operationsBrief.ts`)

### 5.2 Kawalan Keselamatan & Privasi
- **Pengesahan Peranan Kanonikal (`getActorCanonicalRole`):** `founder`, `staff`, `dealer`, `customer`.
- **Sifar Mutasi Tanpa HITL:** Baris 206–210 menolak keras alatan yang tidak bertanda `readOnly: true`.
- **Validasi Skema Ketat (`validateInput`):** Menyemak jenis data (`number`, `string`, `boolean`), sempadan minimum/maksimum, dan enum allowlist.
- **Validasi Komponen A2UI:** Sebarang output alatan yang memulangkan metadata visual disahkan melalui `validateA2UIComponent`.

### 5.3 Jurang Fasa 03B
- Mandat Fasa 03B memerlukan **32 Advanced Logical Tools** yang dikategorikan kepada kelas Q (Query), S (Simulation), D (Draft), C (Command), dan X (External Reconcile) dengan had bajet 6 alatan per sesi dan pengasingan skop data (PD-01 & SEC-02).

---

## 6. Generative UI & Komponen A2UI Fixed Schema

### 6.1 7 Pendekatan Rendering (`src/features/copilot/`)
Direktori `src/features/copilot/` telah distrukturkan mengikut 7 pendekatan:
1. `cards/`: Komponen kad visual teras (`JevAssessmentCard.tsx`, `MarginSummaryCard.tsx`, `OrderSummaryCard.tsx`, `OrderTrackingCard.tsx`, `CommissionSummaryCard.tsx`, `LoyaltyLedgerCard.tsx`).
2. `components/`: Kad permukaan umum (`CopilotSurfaceCard.tsx`) dan penyesuai alatan (`frontendToolAdapters.ts`).
3. `declarative/`: Renderer kanonikal berasaskan skema (`A2UIFixedRenderer.tsx`).
4. `interactive/`: Borang interaktif (`MarginSimulatorForm.tsx`).
5. `mcp-apps/`: Aplikasi MCP pihak pertama (`OperationsBriefApp.tsx`).
6. `state-rendering/`: Unjuran keadaan selamat (`ScopedStateView.tsx`).
7. `tool-rendering/`: Visualisasi status pelaksanaan alatan (`ToolStatusView.tsx`).

### 6.2 Enam Komponen Kanonikal dalam `A2UIFixedRenderer.tsx`
`src/features/copilot/declarative/A2UIFixedRenderer.tsx` memproses sampul A2UI dengan kawalan ketat:
- Had saiz payload maksimum: 16,384 bait.
- Had kedalaman nod AST: 8 peringkat, maksimum 256 nod.
- Perlindungan Prototype Pollution: Menolak kunci `__proto__`, `prototype`, dan `constructor`.
- Punca Provenans Sah: `local_authoritative`, `canonical_evaluator`, `jev_local_rules`, `database`.
- **Komponen yang disokong:**
  1. `OperationsBriefCard` -> Merender `OperationsBriefApp` (title, briefDate, metrics).
  2. `RefundImpactPanel` -> Merender panel impak bayaran balik bersama butang kelulusan HITL.
  3. `JevAssessmentCard` -> Merender kad aduan kualiti (isu botol bocor, QC).
  4. `MarginSimulator` -> Merender `MarginSummaryCard` (contributionSen, contributionMarginPct, status).
  5. `OrderTrackingBadge` -> Merender `TrackingProjection` (peringkat draft hingga received).
  6. `CommissionCard` -> Merender `CommissionSummaryCard` (pembahagian komisen dan lejar kontra).

---

## 7. Matriks Pengesahan & Bukti Empirikal (Empirical Evidence Matrix)

| Arahan / Fail Ujian | Skop Ujian | Hasil Ujian | Exit Code | Bukti / Catatan |
|---|---|---|---|---|
| `bun test tests/platform/financial-integrity-v24.test.ts tests/platform/hitl-execution-v24.test.ts tests/platform/growth-margin.test.ts` | FIN-01 (Margin 24.996% reject, BigInt Sen), CPK-06 (HITL expiry, EXECUTOR_UNAVAILABLE, zero fake receipts) | **23 pass, 0 fail (129 assertions)** | **0** | Stabil; resit di `C:\Users\megat\Scripts\agy-quality-state\`. |
| `bun test tests/platform/payment-reconciliation-v24.test.ts` | PAY-01 & PAY-02 (Dedupe receipt, late paid review, no double stock resurrection) | **8 pass, 0 fail (44 assertions)** | **0** | Masa pelaksanaan 82ms. |
| `bun test tests/platform/refund-allocation-v24.test.ts` | PAY-03 (Largest remainder allocation, zero drift reversal, full atomic rollback) | **9 pass, 0 fail (43 assertions)** | **0** | Lulus di bawah Bun runtime (66ms). |
| `bun run build` | Kompilasi pengeluaran Vite & penjanaan fail HTML statik | **LULUS** | **0** | `dist/assets/` terhasil dalam 10.02s. |
| `bun run lint` | Pemeriksaan jenis TypeScript `tsc --noEmit` & `tsconfig.platform.json` | **GAGAL** | **2** | `tests/platform/refund-allocation-v24.test.ts:10:28: error TS2305: Module '"../../shared/platform-contracts"' has no exported member 'PaymentRecord'.` |

### Penemuan Khusus Ralat Linter (TS2305)
- Diperhatikan bahawa fail `tests/platform/refund-allocation-v24.test.ts` baris 10 mengimport `PaymentRecord` daripada `../../shared/platform-contracts`.
- Namun, dalam fail `shared/platform-contracts.ts`, jenis `PaymentRecord` tidak dieksport (hanya `PaymentState` dieksport di baris 12).
- Sebaliknya, `PaymentRecord` didefinisikan dalam `server/platform/commerce.ts:83`:
  ```ts
  export interface PaymentRecord { id: string; orderId: string; amountSen: number; method: 'cash' | 'bank'; reference: string; state: 'confirmed' | 'refunded'; confirmedBy: string; createdAt: string; }
  ```
- **Cadangan Tindakan untuk Pasukan Pembangun:** Eksportkan `PaymentRecord` dari `shared/platform-contracts.ts` atau kemas kini laluan import dalam fail ujian tersebut untuk menyelesaikan ralat linter.

---

## 8. Kesimpulan & Penilaian Sedia Ada (Readiness Assessment)

1. **Fasa 03A (Integriti Kewangan & HITL):** Enjin pengiraan margin sumbangan, lejar komisen, kitaran kelulusan HITL, dan penyelarasan bayaran Billplz telah mempunyai liputan ujian unit yang teguh (23 + 8 + 9 = 40 ujian domain lulus).
2. **Fasa 01 (Struktur Monolith):** Struktur sedia ada masih berada di `server/platform/` (30 fail) dan belum dipindahkan ke `server/modules/`, `server/application/`, dan `server/agents/tools/`. Pemindahan selamat arkib media besar (595MB) sedia untuk dijadualkan.
3. **Fasa 02 (CopilotKit & ADK):** Endpoint `/api/platform/copilot/v2` sedia ada mengembalikan deskriptor runtime dan memproses mesej, namun masih menggunakan ejen TypeScript tempatan dan dialek streaming ad-hoc. Integrasi rasmi CopilotKit Fetch v2 bersama penyambung `HttpAgent` ke FastAPI port 8030 adalah langkah utama fasa ini.
4. **Fasa 03B (32 Alatan & 10 Modul):** 21 alatan merentas 10 modul telah tersedia dengan kawalan keselamatan `readOnly` dan peranan kanonikal; baki 11 alatan dan skema bajet 6 alatan per sesi perlu ditambah.
5. **Fasa 04 (Generative UI):** Komponen Generative UI kanonikal dan renderer `A2UIFixedRenderer` telah lengkap dan diselaraskan dengan skema selamat A2UI v1.
