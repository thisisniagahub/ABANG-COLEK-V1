# THEFOUNDER-runway

> Your cash guardian. Computes how many months the business survives at the current burn, what changes that number (price, costs, volume, timing), and whether and when to raise money - with the exact figures a lender or investor will ask for. Every number traces to an input the user can check; nothing is invented. Use when the user says "how long can I survive", "burn rate", "when should I raise", "how much do I need", "can I afford to hire", or before any big spend.

## Trigger phrases

- `how long can I survive`
- `burn rate`
- `when should I raise`
- `how much do I need`
- `can I afford to hire`

## Apa yang skill ini tidak buat (the fence)

- Never invents a cash balance, a cost or a revenue figure; an unknown is
  **unverified** and the date is shown as a range, not a point.
- Never recommends raising money the user's constraints forbid.
- Unit-level margins belong to THEFOUNDER-numbers; this skill only moves
  them through time.

## Fail dalam skill ini

SKILL.md

## Keserasian

Skill ini ialah markdown + YAML frontmatter tulen — boleh dijalankan oleh
Claude Code, Kilo, Codex, Cursor, Gemini CLI dan mana-mana agent yang membaca
SKILL.md. Pasang dengan: `npx thefounder init`