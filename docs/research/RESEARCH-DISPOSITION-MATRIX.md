
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** MATRIKS KEPUTUSAN SEJARAH — label APPROVED/ADOPTED dan topologi local-only di bawah ialah keputusan asal 4 Oktober, bukan authority deployment semasa atau bukti provider aktif. Blueprint mengatasi andaian local-only; runtime tempatan dan cloud CAS dibezakan. Hermes/Postiz/native JEV memerlukan bukti integrasi tersendiri.
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# ABANGCOLEK PLATFORM — RESEARCH DISPOSITION MATRIX (E05)

**Document ID**: `AC-RES-DISPOSITION-001`  
**Version**: `1.0.0`  
**Effective Date**: `2026-10-04`  
**Review Status**: `APPROVED (Architectural Baseline)`  
**Governing Policies**: Zero-New-Spend Invariant, Local Monolith Priority, Bounded Self-Contained Automation.

---

## 1. Executive Summary

During previous exploratory cycles, five external AI and automation research inputs were identified. This matrix formally evaluates each candidate technology against **ABANGCOLEK's operational reality**: an F&B enterprise with localized retail, direct WhatsApp commerce, an ejen/stokis wholesale tier, and a strict **Zero-New-Spend** hosting constraint (Bun v1.4.2 + SQLite monolith on local host infrastructure).

Every candidate is assigned an authoritative disposition:
- **ADOPTED**: Integrated directly into native local platform code or adapter layer.
- **ADAPTED**: Core design concept repurposed into native zero-spend platform contracts.
- **DEFERRED**: Conceptually viable, but paused pending explicit owner API credentials or external key provisioning without ongoing subscription cost.
- **REJECTED**: Incompatible with Zero-New-Spend, disproportionate operational burden, or unaligned with core commercial operations.

---

## 2. Evaluation Criteria & Scoring Weights

| Dimension | Weight | Description | Pass Criteria |
| :--- | :---: | :--- | :--- |
| **Zero-New-Spend** | 35% | Absolute ban on recurring SaaS fees, cloud credit burn, or mandatory paid APIs. | 100% free / local executable. |
| **Domain Fit** | 30% | Relevance to Sambal Colek retail, dealer restocking, halal compliance, and customer cases. | Directly serves commerce or ops. |
| **Operational Simplicity** | 20% | Host memory footprint (<500MB), no heavy daemons, clean SQLite/Bun integration. | Low host friction & WAL safe. |
| **Governance & Safety** | 15% | Bounded execution, JEV alignment, audit trails, no uncontrolled external actions. | Deterministic & auditable. |

---

## 3. Candidate Research Stream Dispositions

### Stream 1: Hermes Agent (NousResearch)
- **Candidate Focus**: Autonomous multi-step agent with function calling, tool use, and reasoning.
- **Evaluation**:
  - *Cost*: Uses existing local LLM endpoints (Ollama / local server) or local adapter. Zero marginal spend.
  - *Domain Fit*: High. Acts as task orchestrator, support case message drafter, and policy compliance auditor.
  - *Architecture Impact*: Integrated via `server/automation/runtimeTransports.ts` (`LocalHermesTransport`) and `adapters.ts` (`HermesAdapter`) with strict timeout (15s) and bounded retry.
- **Disposition**: **ADOPTED**
- **Technical Rationale**: Provides structured reasoning without SaaS lock-in. Integrated into `E02` runtime injection with fallback to local rule-based JEV.

---

### Stream 2: DeepSeek Harness (DSH)
- **Candidate Focus**: High-throughput reasoning harness, local model routing, and prompt optimization.
- **Evaluation**:
  - *Cost*: Supports local GGUF/Ollama model weights without ongoing cloud fees.
  - *Domain Fit*: Medium-High. Beneficial for batch analysis of inventory anomalies and marketing copy generation.
  - *Architecture Impact*: Rather than running an independent multi-process harness alongside the platform server, the prompt structuring and JEV evaluation patterns were adapted directly into TypeScript (`server/platform/jev/` and `shared/jev-contracts.ts`).
- **Disposition**: **ADAPTED**
- **Technical Rationale**: Running external multi-process Python/Rust daemons adds unnecessary memory and port overhead on the host. Adapting the reasoning contracts natively into Bun TypeScript delivers 100% of the value at zero RAM bloat.

---

### Stream 3: Postiz / Social Automation Engine
- **Candidate Focus**: Omnichannel social marketing publisher (Instagram, Facebook, TikTok, X).
- **Evaluation**:
  - *Cost*: Self-hostable open-source container or local adapter. Zero-spend when running local transport.
  - *Domain Fit*: High. ABANGCOLEK relies on social brand visibility and campaign coordination for sambal drops.
  - *Architecture Impact*: Implemented in `server/automation/adapters.ts` via `PostizPublisherAdapter` and `LocalPostizTransport`, with idempotency keys, publish receipt generation, and manual fallback export.
- **Disposition**: **ADOPTED**
- **Technical Rationale**: Direct fit for marketing operations (E03). Supports both headless mock verification and real local REST transport when Postiz service is present.

---

### Stream 4: OpenAI Dots / Canvas Ideation
- **Candidate Focus**: Interactive canvas-style visual node drafting, freeform workflow nodes, and live workspace canvases.
- **Evaluation**:
  - *Cost*: Cloud-hosted proprietary interface requiring active ChatGPT Plus/Team subscription and proprietary API.
  - *Domain Fit*: Low-Medium. ABANGCOLEK staff and founders require structured tabular and step-by-step forms (orders, shifts, QC, restocks), not freeform infinite canvases.
  - *Architecture Impact*: High client complexity. Introduces heavy canvas dependencies and proprietary protocols.
- **Disposition**: **REJECTED**
- **Technical Rationale**: Violates Zero-New-Spend policy (proprietary OpenAI subscription). Unnecessary complexity for structured F&B commerce workflows which are already solved cleanly by `AppRouter.tsx` and modular workspace views.

---

### Stream 5: Meta Muse (Creative Suite & Ad AI)
- **Candidate Focus**: Meta proprietary creative visual copy and generative video engine for Ads Manager.
- **Evaluation**:
  - *Cost*: Requires enterprise Meta Business Suite ad spend and paid API tier.
  - *Domain Fit*: Medium. Generative ad concepts are useful, but marketing is currently driven by local community events, TikTok drops, and WhatsApp broadcasts.
  - *Architecture Impact*: Would require complex OAuth with Meta Graph API and external billing.
- **Disposition**: **DEFERRED**
- **Technical Rationale**: Deferred until the business founder explicitly determines that paid Meta Ad spend is justified and provides validated Meta Business Suite credentials. In the interim, marketing campaigns are generated via local prompt templates and published via Postiz / WhatsApp.

---

## 4. Summary Matrix

| Research Stream | Candidate Tech | Evaluated By | Score (1-100) | Disposition | Primary Execution Path |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Hermes** | NousResearch Agent | Architecture Swarm | **94** | **ADOPTED** | `server/automation/adapters.ts` (Native `LocalHermesTransport`) |
| **DeepSeek Harness**| DSH Local Engine | Architecture Swarm | **88** | **ADAPTED** | `server/platform/jev/` (Native TypeScript evaluation) |
| **Postiz** | Social Publisher | Architecture Swarm | **91** | **ADOPTED** | `server/automation/automation.ts` (`PostizPublisherAdapter`) |
| **OpenAI Dots** | Canvas Ideation | Architecture Swarm | **32** | **REJECTED** | Replaced by structured Workspace views & JEV reports |
| **Meta Muse** | Meta Creative Ad AI | Architecture Swarm | **58** | **DEFERRED** | Pending owner ad budget & Graph API keys |

---

## 5. Review & Re-evaluation Cadence

1. **Trigger for Re-evaluation**:
   - Founder decides to activate paid Meta ads -> Re-evaluate Meta Muse.
   - Significant local hardware upgrade -> Re-evaluate running full DSH cluster locally.
2. **Immutability of Zero-Spend Principle**:
   - Any re-evaluation MUST adhere to the Zero-New-Spend mandate unless written sign-off is provided by the enterprise owner.
