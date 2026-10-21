# THEFOUNDER-parity

> Scores the finished build against the original: a weighted parity score over the feature matrix, a layout diff that ignores colour, and the honest missing list. Missing must-haves means not shippable, and it says so. Use when the user says "how close is it", "parity score", "what is missing", "compare my build with the original".

## Trigger phrases

- `how close is it`
- `parity score`
- `what is missing`
- `compare my build with the original`

## Apa yang skill ini tidak buat (the fence)

- Never scores features deliberately left out or newly added.
- Never calls the build shippable while a must-have is missing.

## Fail dalam skill ini

imgdiff.py, parity.py, SKILL.md

## Keserasian

Skill ini ialah markdown + YAML frontmatter tulen — boleh dijalankan oleh
Claude Code, Kilo, Codex, Cursor, Gemini CLI dan mana-mana agent yang membaca
SKILL.md. Pasang dengan: `npx thefounder init`