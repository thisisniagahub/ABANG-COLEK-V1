# THEFOUNDER-crowd

> The consumer panel. Spins up a swarm of buyer sub-agents (default 100, --quick for 20) trained on the user's target customer, each with a different income, age, buying behaviour and objection, shows every one the same pitch, and runs the business through 100 buyer scenarios to see who buys, who doesn't, and why. Tallies the answers into buy rates by segment, the reasons people pass in their own words, what would flip a no, and price answers for THEFOUNDER-pricetag. Use when the user says "would people buy this", "test it on customers", "run the consumer panel", "simulate buyers", "who is my customer", or "validate demand".

## Trigger phrases

- `would people buy this`
- `test it on customers`
- `run the consumer panel`
- `simulate buyers`
- `who is my customer`
- `validate demand`

## Apa yang skill ini tidak buat (the fence)

Lihat SKILL.md (rantai pengasas tidak mewajibkan fence).

## Fail dalam skill ini

customer.example.json, panel.py, pitch.example.md, SKILL.md

## Keserasian

Skill ini ialah markdown + YAML frontmatter tulen — boleh dijalankan oleh
Claude Code, Kilo, Codex, Cursor, Gemini CLI dan mana-mana agent yang membaca
SKILL.md. Pasang dengan: `npx thefounder init`