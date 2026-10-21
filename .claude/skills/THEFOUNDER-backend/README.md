# THEFOUNDER-backend

> Wires the data layer of the build: sign up and auth, database, payments, email and third-party integrations through their official APIs with the user's own keys. Use when the user says "wire up auth", "add payments", "connect the database", "the data is still fake", or once screens exist but do not persist.

## Trigger phrases

- `wire up auth`
- `add payments`
- `connect the database`
- `the data is still fake`

## Apa yang skill ini tidak buat (the fence)

- Never uses API keys it was not given, never wires payments to an account other than the user's.
- Never rewrites screens - THEFOUNDER-rebuild owns them.

## Fail dalam skill ini

SKILL.md

## Keserasian

Skill ini ialah markdown + YAML frontmatter tulen — boleh dijalankan oleh
Claude Code, Kilo, Codex, Cursor, Gemini CLI dan mana-mana agent yang membaca
SKILL.md. Pasang dengan: `npx thefounder init`