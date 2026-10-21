# THEFOUNDER-xray

> Reverse-engineers any existing app into a build map: screen inventory, user flows, components, inferred data model and a feature matrix, from public pages, store listings, help docs and the user's own account only. The first step of the build chain. Not market research - THEFOUNDER-battlefield owns that; not simulated buyers - THEFOUNDER-crowd owns that. Use when the user says "clone this app", "reverse engineer X", "map how X works", "what screens does X have", "I want my own version of X", or pastes an app URL to rebuild.

## Trigger phrases

- `clone this app`
- `reverse engineer X`
- `map how X works`
- `what screens does X have`
- `I want my own version of X`

## Apa yang skill ini tidak buat (the fence)

- Never logs into an account that is not the user's, never scrapes behind a login, never reads the target's source code, bundles or private APIs.
- Market sizing and competitor maps belong to THEFOUNDER-battlefield; simulated buyers belong to THEFOUNDER-crowd.

## Fail dalam skill ini

features.csv, recon-map.md, SKILL.md

## Keserasian

Skill ini ialah markdown + YAML frontmatter tulen — boleh dijalankan oleh
Claude Code, Kilo, Codex, Cursor, Gemini CLI dan mana-mana agent yang membaca
SKILL.md. Pasang dengan: `npx thefounder init`