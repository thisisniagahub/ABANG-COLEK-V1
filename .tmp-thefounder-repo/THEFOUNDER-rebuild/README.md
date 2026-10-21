# THEFOUNDER-rebuild

> Builds the app screen by screen from the xray map and the interface tokens: shell first, then the core flow end to end, then every screen in all its states, ticking off the feature matrix as it goes. Use when the user says "build the clone", "rebuild the screens", "implement the core flow", "keep building", or when the build map is ready.

## Trigger phrases

- `build the clone`
- `rebuild the screens`
- `implement the core flow`
- `keep building`

## Apa yang skill ini tidak buat (the fence)

- Never invents features that are not in the feature matrix without flagging them as additions.
- Never fakes or wires the data layer - THEFOUNDER-backend owns that.

## Fail dalam skill ini

SKILL.md

## Keserasian

Skill ini ialah markdown + YAML frontmatter tulen — boleh dijalankan oleh
Claude Code, Kilo, Codex, Cursor, Gemini CLI dan mana-mana agent yang membaca
SKILL.md. Pasang dengan: `npx thefounder init`