<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PROMPT PROTOTAIP — superseded sebagai arahan implementasi. Gunakan prompt pelaksanaan canonical di bawah. Angka, produk, badge VERIFIED, evidence ID dan confidence dalam contoh ialah ilustrasi reka bentuk sehingga disokong data canonical; jangan terbitkan sebagai fakta bisnes atau kejayaan JEV.
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Stitch Screen Specification: JEV Social Intelligence & Viral Evidence Radar
**File:** `abang_colek_jev_social_intelligence.md`  
**Target:** Google Stitch AI UI/UX Engine (`https://stitch.withgoogle.com/`)  
**Design Philosophy:** Dark Epistemological Cyber-Radar / High Contrast Media Forensic  
**Platform:** ABANGCOLEK (Liurleleh House Malaysia)

---

## High-Level Vision
A forensic intelligence and viral social monitoring dashboard for analyzing public video and social claims about Abang Colek across TikTok, Instagram Reels, and YouTube Shorts. Unites audio hash provenance, comment sentiment clustering, and JEV System-1 epistemological classification (e.g. distinguishing verified facts from viral rumors or unverified quality claims).

---

## Visual Theme & Design Tokens
- **Theme Archetype:** Cybernetic Forensic Investigation & Media Radar.
- **Color Palette:**
  - `Canvas`: Deep Onyx `#0D0E11`.
  - `Card Background`: Dark Graphite `#15181E` with subtle indigo/cyan glowing borders `#242B35`.
  - `Epistemological Badges`:
    - `VERIFIED`: Radiant Emerald `#059669`.
    - `UNDETERMINED / UNPROVEN`: Amber Warning `#D97706`.
    - `REFUTED / FAKE`: Neon Red `#DC2626`.
- **Typography:** Technical monospace font for hashes, timestamps, and JSON epistemology records.

---

## Screen Layout & Component Structure

### 1. Viral Radar Header & Capture Statistics
- Verified Evidence Records: `146 Unique Captures` (Run: `run_20260929_232947_093fd01c`).
- Social Platforms Monitored: TikTok (82 videos), Instagram (44 posts), Facebook (13 posts).
- JEV Epistemological Decisions: `445 Decisions Evaluated` (Lineage Errors: `0`).

### 2. Video Capture Feed & Media Provenance Cards
Each video entry displays:
- Embedded video preview frame with soundwave audio waveform graphic.
- Source handle: `@abangcolek_official`, `@foodie_malaysia`, `@foodhunter_kl`.
- SHA-256 Media Hash & Capture Timestamp (e.g., `sha256:8f2a...c01e`).
- Audio Fingerprint Match: `"Kasi Lagi-Lagi" (Official Abang Colek Theme Song) — 99.4% Match`.
- View Count & Engagement Velocity: `420K Views`, `28.4K Likes`, `1,290 Shares`.

### 3. JEV Epistemological Claim Analyzer
- Extraction of verbal & textual claims from the video:
  - Claim A: *"Kuah colek ini dibuat tanpa cuka tiruan, 100% asam jawa asli."* ➔ Classification: `INGREDIENT_AUTHENTICITY`, Verdict: `VERIFIED (Evidence ID: #EVD-ING-04)`.
  - Claim B: *"Cawangan baharu dibuka di Johor Bahru minggu depan."* ➔ Classification: `BRANCH_EXPANSION`, Verdict: `UNDETERMINED (Belum diumumkan HQ)`.

### 4. Sentiment & Consumer Emotion Radar
- Live sentiment distribution: 88% Positive, 9% Neutral, 3% Quality/Packaging Feedback.
- Frequent Keyword Bubble Cloud: `Pekat Melekat`, `Pedas Manis`, `Tak Kedekut`, `Cili Padi Rangup`, `Tumpah Botol`.

---

## Exact Stitch Prompt (Copy-Paste Ready)
```text
Design a dark-themed cybernetic Social Intelligence & Media Evidence Radar dashboard for "Abang Colek", analyzing viral social media trends across TikTok and Instagram.

Style:
- Cyber forensic aesthetic: Dark Onyx background (#0D0E11), Graphite card containers (#15181E) with 1px neon subtle borders (#242B35).
- Accent Colors: Emerald Green (#059669) for "VERIFIED", Amber (#D97706) for "UNDETERMINED", and Electric Cyan (#06B6D4) for data streams.
- Monospace counters and audio waveforms.

Include:
1. Intelligence Stats Bar: Total Captured Records (146), Viral Videos Monitored (139), and Evaluated Decisions (445 with 0 lineage errors).
2. Social Video Evidence Stream: Video cards featuring thumbnail preview with audio waveform overlay, TikTok/IG source handle, view counts (420K), and verifiable SHA-256 capture hash.
3. JEV Epistemological Claim Triage: A breakdown analyzing extracted statements from viral videos, showing credibility status badges ("VERIFIED" vs "UNDETERMINED") and supporting evidence lineage links.
4. Sentiment Analysis & Keyword Cloud: Visual breakdown of public sentiment (88% positive) with top viral tags like "Pekat Melekat", "Liur Leleh", and "Mangga Rangup".
```
