# THEFOUNDER-trial

> Tests the build by clicking through every flow: a test plan from the flows, Playwright specs for happy paths and edge cases, and bugs logged by severity until no S1 or S2 is open. Use when the user says "test it for bugs", "write the e2e tests", "click through the flows", "is it stable", or before any ship.

## Trigger phrases

- `test it for bugs`
- `write the e2e tests`
- `click through the flows`
- `is it stable`

## Apa yang skill ini tidak buat (the fence)

- Never marks a bug fixed without a failing test written first.
- Never loosens, skips or deletes a test to get green.

## Fail dalam skill ini

bug-report.md, e2e.example.spec.ts, SKILL.md, test-plan.md

## Keserasian

Skill ini ialah markdown + YAML frontmatter tulen — boleh dijalankan oleh
Claude Code, Kilo, Codex, Cursor, Gemini CLI dan mana-mana agent yang membaca
SKILL.md. Pasang dengan: `npx thefounder init`