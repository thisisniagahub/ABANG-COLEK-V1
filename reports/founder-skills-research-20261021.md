# Research: Founder-Skills di GitHub untuk ABANGCOLEK-PLATFORM

Tarikh: 21 Oktober 2026 · Sumber: web live (GitHub + direktori skills), bukan ingatan model.
Objektif: kenal pasti skill pack GitHub yang boleh membuatkan ABANGCOLEK lebih advanced dan lebih effisien untuk founder.

## Konteks kesesuaian

- ABANGCOLEK ialah platform commerce/founder (CopilotKit v2, monolit modular, margin dalam sen integer, acceptance ledger 85 requirement).
- Harness semasa sudah menyokong format SKILL.md (bukti: Ponytail diinstall sebagai skill global; `.agents/skills/` dan `.claude/skills/` sudah wujud).
- Aturan rumah AGENTS.md — **"jangan fabrikati, mark missing as missing"** — adalah penapis utama memilih pack: pack yang memaksa evidence dan menolak metrik rekaan selari dengan budaya repo.

## Senarai penuh kandidat (disusun ikut kepentingan)

| # | Repo | Stars | Skills | Fokus | Kesesuaian ABANGCOLEK |
|---|---|---|---|---|---|
| 1 | [emotixco/claude-skills-founder](https://github.com/emotixco/claude-skills-founder) | ~600 | 13 | Validate idea, competitor matrix, pricing, pitch deck, GTM, metrics dashboard | **Tertinggi.** Filosofi anti-fabrikasi (output `[placeholders]`, "Estimate/Not found" instead of guessing) — selari dengan aturan rumah repo. Skill saling membaca output dalam `founder/` folder. |
| 2 | [ognjengt/founder-skills](https://github.com/ognjengt/founder-skills) | ~461 | 15–20 | Marketing copy, CRO optimization (13 prinsip), GTM plan, PRD generator, Product Hunt launch, SOP creator, pricing strategist | **Tinggi.** CRO + landing page optimization terus relevan untuk `abangcolek.gangniaga.my` yang sudah ada browser tests landing/commerce. Install: `npx skills add ognjengt/founder-skills`. |
| 3 | [mfwarren/entrepreneur-claude-skills](https://github.com/mfwarren/entrepreneur-claude-skills) | ~71 | 24–25 | Unit economics (CAC/LTV/payback), financial modeling, offer creation (Hormozi), SOP builder, hiring, decision frameworks | **Tinggi.** Ditulis founder sebenar (CTO Psychedelic Water). Unit economics + margin contribution sepadan dengan disiplin "wang = integer sen". |
| 4 | [ferdinandobons/startup-skill](https://github.com/ferdinandobons/startup-skill) | ~1,205 | 4 | Competitive intelligence dengan web data sebenar (battle cards, pricing landscape, feature matrix), pitch | **Tinggi untuk risaran kompetitor** — guna data web live, bukan anggaran. |
| 5 | [agentdynarq/founder-skills](https://github.com/agentdynarq/founder-skills) | baru | 11 | Founder OS: investor update, MVP cut, customer discovery (Mom Test), cold outreach, launch plan | **Sederhana-tinggi.** Menolak metrik fabrikasi dan vote rings; bagus untuk disiplin. 1 commit sahaja — risiko maintenance. |
| 6 | [Hayatelin/founder-skills](https://github.com/Hayatelin/founder-skills) | baru | 10 | Outcome-based pricing, growth experiments (ICE), MVP spec, cold outreach, fundraising narrative | **Sederhana.** Pendekatan 2026 (vertical AI, outcome pricing) relevan untuk edge monetisasi platform. |
| 7 | [GTM-Strategist/gtm-strategist-skills](https://github.com/GTM-Strategist/gtm-strategist-skills) | — | 12 | Metodologi GTM penuh (100 task, 9 fasa) oleh Maja Voje | **Sederhana.** Berat untuk hari-hari; bagus bila nak rancang pelancaran serius. Output bersambung antara fasa. |
| 8 | [AIDevGTM/gtm-cofounder](https://github.com/AIDevGTM/gtm-cofounder) | ~49 | 18 | Founder-brief pattern (satu interview, semua skill baca), pricing, first 50 users, beyond-the-wrapper positioning | **Sederhana.** Corak `founder-brief.md` yang dibaca semua skill ialah idea arkitektur yang baik. |
| 9 | [firatcand/founder-skills](https://github.com/firatcand/founder-skills) | — | ~14 | GTM B2B SaaS, pricing, PLG, SEO/AEO, data analysis, devops | **Sederhana.** Penulis 3x founder (platform OSS → Fortune 100 → acquisition). |
| 10 | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | ~5,200 | 380+ | Mega-library: marketing, business ops, C-level personas, research stack, productivity | **Rujukan sahaja.** Overlap besar dengan skills ECC yang sudah diinstall; jangan install penuh — cherry-pick sahaja. |

## Cadangan tindakan (minimum, YAGNI)

1. **Install 2 pack sahaja dahulu** — `emotixco/claude-skills-founder` + `ognjengt/founder-skills` (~28 skills gabungan) ke `.claude/skills/` (project-level). Ini meliputi: pricing, CRO, GTM, competitor, pitch, metrics — tanpa membazir konteks.
2. **Cherry-pick dari mfwarren**: `unit-economics`, `financial-modeling`, `sop-builder` sahaja — padan dengan disiplin kewangan integer-sen dan SOP operasi.
3. **Guna `ferdinandobons/startup-skill` (startup-competitors)** bila nak buat analisa kompetitor sebenar dengan web data.
4. **Sebelum install mana-mana skill, baca SKILL.md** — sesetengah skill boleh lari kod di mesin (amaran Skills Directory). Audit sekilas untuk arahan meragukan; jangan blind-trust skill luar.
5. **Jangan install mega-library** (alirezarezvani dsb.) secara penuh — konteks agent akan dipenuhi description skills dan melambatkan routing.

## Arahan install (rujukan)

```bash
# project-level (disyorkan, terkawal dalam repo)
npx -y skills add emotixco/claude-skills-founder --agent claude-code
npx -y skills add ognjengt/founder-skills --agent claude-code
npx -y skills add mfwarren/entrepreneur-claude-skills --skill unit-economics
npx -y skills add mfwarren/entrepreneur-claude-skills --skill financial-modeling
npx -y skills add mfwarren/entrepreneur-claude-skills --skill sop-builder
npx -y skills add ferdinandobons/startup-skill --skill startup-competitors
```

Semua pack di atas berlesen MIT dan mematuhi spec Agent Skills (SKILL.md) — serasi dengan Kilo Code/Claude Code yang sudah digunakan repo ini.

## Apa yang TIDAK diketahui (bukan fabrikasi)

- Angka stars/sebahagian tarikh update adalah snapshot carian 21 Okt 2026 dan boleh berubah.
- Keserasian sebenar dengan Kilo Code perlu diuji selepas install (Kilo membaca `.claude/skills/` dan `.agents/skills/`); tiada ujian dilakukan dalam research ini.
- Tiada audit kandungan penuh setiap SKILL.md dilakukan — ia gate berasingan sebelum pemasangan.
