# Deep Research: Founder-Skill Packs — Perbandingan Side-by-Side + Kaji Prompt

Tarikh: 21 Okt 2026. Sumber: README + **SKILL.md sebenar** setiap pack (dibaca penuh, bukan ringkasan). Sambungan kepada `reports/founder-skills-research-20261021.md`.

Objektif pengguna: founder-skill yang **lengkap untuk run company** — bukan sekadar idea validation.

---

## 1. Perbandingan side-by-side

| Kriteria | **Jakeschincariol/founder-skill** (1.2k★) | emotixco/claude-skills-founder (~600★) | agentdynarq/founder-skills | ognjengt/founder-skills (~461★) | mfwarren/entrepreneur-claude-skills (~71★) | GTM-Strategist/gtm-strategist-skills |
|---|---|---|---|---|---|---|
| Bilangan skill | 11 | 13 | 11 | 15+ | 24 | 12 (100 task) |
| **Liputan "run company"** | **Paling penuh**: board, competitors, consumer panel, pricing, offer, CFO, marketing, brand, ops, launch, business plan | Validation → GTM → fundraising. **Tiada CFO/ops/hiring** | Founder OS: + **hiring-kit**, **investor-update**, **metrics-review**. Tiada CFO numerik | Marketing-heavy. Ada sop-creator | + unit-economics, financial-modeling, hiring, decision-frameworks | GTM sahaja (12 fasa, paling dalam untuk GTM) |
| **Disiplin bukti (anti-fabrikasi)** | **Tertinggi.** 4 tool Python stdlib: nombor **dikira, bukan direka**. "Missing field is an error, never a guess" | Sangat tinggi: `[placeholders]`, "Estimate/Not found", setiap harga kompetitor ada link. Ada folder `evals/` yang mengujijanji | Tinggi: "numbers before narrative", tolak metrik fabrikasi & vote rings | Sederhana: tiada mekanisme sourcing yang dipaksakan | Baik: "never create offers with fake or inflated value numbers" | Baik (outputs/ dirujung antara fasa) |
| **Kualiti prompt engineering** | **Tersusun**: Step 0–3 eksplisit, brief sub-agent mesti berdiri sendiri, kekalkan perselisihan board, PASS ialah hasil | Sangat baik: 5 soalan fatal, scorecard 7 dimensi dengan rubrik, verdict build/pivot/kill, had perkataan | Padat (<100 baris/skill), guardrail jelas | Baik: enforcement baca references/ dulu (BLOCKING requirement), quality checklist self-verify | Baik: workflow berperingkat, jadual output tetap | Terbaik untuk kesinambungan fasa (output fasa 1 jadi input fasa 2) |
| **Tool deterministik** | **Ya — satu-satunya**: `unit_economics.py`, `van_westendorp.py` (price research), `panel.py` (100 buyer cards, seeded), `compile.py` (verdict dikira). Python 3.8+ stdlib, tiada network | Tidak (penuh prompt) | Tidak | Tidak | Tidak | Tidak |
| **Kesinambungan state** | `founder/` folder — setiap skill baca output skill lain | `founder/` + `founder/facts.md` | rujukan silang (launch-plan ← landing-copy) | `FOUNDER_CONTEXT.md` | tiada state kongsi | `outputs/` + `my-gtm-context.md` |
| **Maintenance** | 1 commit (baru, viral 1.2k★/150 fork), ada `tests/` | aktif 5 hari lalu, v2.1.4, ada evals | 1 commit (risiko) | aktif Mei 2026 | aktif 7 bulan lalu | aktif 2026-03 |
| Lesen | MIT | MIT | MIT | MIT | MIT | MIT |
| Kelemahan utama | Tiada fundraising/investor/hiring; panel simulated (bias agreeable — diakui sendiri) | Tiada CFO/ops | Unproven, 1 commit | Kurang rigor bukti | Kurang fresko, tiada state kongsi | Terlalu berat untuk kerja harian |

---

## 2. Kaji prompt (temuan dari SKILL.md sebenar)

### 2.1 Jakeschincariol/founder-skill — prompt terkuat untuk "run company"

**`founder-board` (SKILL.md penuh dibaca):**
- Persona: 3 board members sebagai sub-agent, setiap satu apply satu framework terbitan (Hormozi $100M Offers / Thiel Zero to One / Isaacson Steve Jobs) — dengan **penjaga integriti**: "never speak as them, never quote them".
- Step 0 menulis `founder/idea.md` dengan skema tetap (what/who/price/how/budget); **maksimum 3 soalan, sekali mesej** — mengelak soalan tanpa henti.
- "Do not invent a budget, a market size or a competitor" — fabrikasi dilarang eksplisit.
- Chair summary **menyimpan perselisihan board**: "A board that agrees on everything was not doing its job."
- "A PASS is a result, not a failure" — outcome bertipe, bukan dimalukan.

**`founder-cfo` (SKILL.md penuh dibaca):**
- Nombor datang dari **tool Python, bukan model**: contribution, break-even/unit hari, margin pada plan volume, tahun 1 bulan demi bulan, cash needed, payback, 3 what-if (price −10%, volume −20%, cost +15%).
- Hierarki sumber: (1) quote/invoice pengguna, (2) harga awam boleh-semak + link ke `founder/cfo-sources.md`, (3) anggaran **ditanda sebagai anggaran**.
- "The ramp is where plans lie" — bulan 1 hampir tak pernah = plan volume; guna buy rate panel untuk sanity-check.
- **Kesesuaian dengan ABANGCOLEK**: ini identik dengan aturan rumah AGENTS.md §3.3–3.4 ("jangan fabrikati", "tidak dikira ≠ sifar"). Tool deterministic + error on missing field ialah corak yang sama dengan JEV null-semantics repo ini.

### 2.2 emotixco — prompt terbaik untuk stress-test idea

`validate-idea`: persona "blunt startup advisor", 5 soalan fatal (siapa pelanggan & bayar hari ini? kenapa belum sesiapa bina? kelebihan distribusi? feature vs business? founder boleh bina?), scorecard 7 dimensi /35 dengan rubrik (28–35 build, <14 kill), 3 eksperimen validasi <2 minggu/<$200, verdict build/pivot/kill. Output ≤1,500 kata. **Nilai tambah**: satu-satunya pack dengan `evals/` — mereka sendiri ukur plugin vs plain Claude (jujur: pada Opus 5, 8/10 kes sama; nilai sebenar pada Haiku & update `facts.md`).

### 2.3 mfwarren offer-creation — framework Hormozi yang paling lengkap

Value equation (Dream Outcome × Likelihood) / (Time Delay × Effort), value stack 10:1, 5 jenis guarantee, formula nama offer, **constraints anti-inflasi**: "every value claim must be defensible; guarantees must be ones the user can actually honor".

### 2.4 agentdynarq pricing-strategy — prompt paling condong tegas

"Pricing is a hypothesis to test like any other"; value metric dulu, 3 tier, "Recommend a specific price with reasoning. 'It depends' is not an output of this skill." Grandfather on raises.

### 2.5 ognjengt cro-optimization — paling bagus untuk landing page

Maksakan baca 3 fail references (prinsip, patterns ClickUp/Stripe/Apple, audit framework) sebelum analisa + quality checklist self-verification ("If ANY check fails → revise before presenting"). Lebih enforcement mekanikal berbanding rigor bukti.

---

## 3. Cadangan: Founder Skill Pack LENGKAP untuk run company

Kombinasi terkurasi ~19 skill — backbone `founder-skill`, digap dengan 2 pack kecil:

### A. Backbone — `Jakeschincariol/founder-skill` (11 skill, semua)
Kitaran penuh: `board → competitors → consumer → pricing → offer → cfo → marketing → brand → ops → launch → plan`. Ini sahaja sudah hampir menutup "run company" — satu-satunya pack yang outputnya ialah **business plan dengan verdict dikira** (Profitable / Not yet / Incomplete), bukan ditulis.

### B. Gap-fill: orang & pelabur — dari `agentdynarq/founder-skills` (3 skill)
- `investor-update` — backbone tiada investor; monthly numbers-first update.
- `hiring-kit` — backbone tiada hiring; JD outcomes-based + interview loop.
- `metrics-review` — ritual mingguan north-star (CFO backbone ialah one-shot, ini ritel).

### C. Gap-fill: fundraising — dari `emotixco/claude-skills-founder` (3 skill)
- `validate-idea` — pre-flight stress test sebelum board.
- `pitch-deck` + `fundraise-prep` — bila nak raise.

### D. Optional (cherry-pick kemudian)
- `ognjengt/cro-optimization` — audit landing page production.
- `mfwarren/decision-frameworks` — kerangka keputusan mingguan.
- `GTM-Strategist` — hanya bila nak rancang pelancaran serius 90 hari.

### Arahan install

```bash
# 1. Backbone (project-level, .claude/skills/)
git clone https://github.com/Jakeschincariol/founder-skill.git "$env:TEMP\founder-skill"
Copy-Item -Recurse "$env:TEMP\founder-skill\skills\founder-*" ".claude/skills/"

# 2. Gap-fill people & investors
npx -y skills add agentdynarq/founder-skills --skill investor-update
npx -y skills add agentdynarq/founder-skills --skill hiring-kit
npx -y skills add agentdynarq/founder-skills --skill metrics-review

# 3. Gap-fill fundraising
npx -y skills add emotixco/claude-skills-founder --skill validate-idea
npx -y skills add emotixco/claude-skills-founder --skill pitch-deck
npx -y skills add emotixco/claude-skills-founder --skill fundraise-prep
```

Syarat: Python 3.8+ untuk 4 tool backbone (stdlib sahaja, tiada pip). Cadangan: **audit SKILL.md setiap skill sebelum dipasang** (gate keselamatan berasingan, belum dilakukan dalam research ini).

### Guna dalam repo ABANGCOLEK
- Semua state masuk `founder/` — serasi dengan konvensyen `reports/` (evidence kekal): salin `founder/business-plan.md` + `founder/cfo.md` ke `reports/` bila nak kekalkan sebagai bukti.
- Bahasa: SKILL.md luar ini English — output boleh diarah dalam Bahasa Melayu per sesi ("run founder-cfo, output dalam BM").

## 4. Yang TIDAK diketahui (bukan fabrikasi)

- Angka stars = snapshot 21 Okt 2026.
- Tiada pemasangan atau ujian runtime dilakukan; kompatibiliti sebenar dengan Kilo Code perlu disahkan selepas install.
- Tiada audit kandungan penuh semua SKILL.md (baru 6 dibaca penuh: board, cfo, validate-idea, cro-optimization, offer-creation, pricing-strategy).
