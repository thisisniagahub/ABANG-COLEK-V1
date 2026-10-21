# THEFOUNDER-ship

> Runs the preflight (tests green, parity acceptable, sweep clean, listing linted), sets up production, produces the DNS records for the user's domain, and ships the build when the user says go. The launch plan belongs to THEFOUNDER-opening; this skill executes the deploy. Use when the user says "put it live", "ship it", "deploy to my domain", "go live today".

## Trigger phrases

- `put it live`
- `ship it`
- `deploy to my domain`
- `go live today`

## Apa yang skill ini tidak buat (the fence)

- Never ships with a dirty sweep or an open S1/S2 bug.
- Never touches DNS for a domain it does not control; go requires the user's explicit yes.

## Fail dalam skill ini

preflight.md, SKILL.md

## Keserasian

Skill ini ialah markdown + YAML frontmatter tulen — boleh dijalankan oleh
Claude Code, Kilo, Codex, Cursor, Gemini CLI dan mana-mana agent yang membaca
SKILL.md. Pasang dengan: `npx thefounder init`