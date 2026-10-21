# THEFOUNDER — the complete founder pack

27 Claude/Kilo skills that take a business from **a one-line idea** to **a
live, growing product** — and a meta-skill that keeps the pack itself clean.

Free to use. Two lineages, one pack:

- **The founder chain** (12 skills): judge the idea, learn the truth, secure
  the money, build the identity, market, launch, operate, measure, grow.
- **The build chain** (11 skills): reverse-engineer any app clean-room style,
  rebuild it, test it, score it against the original, rebrand it, list it and
  ship it — adapted from [Jakeschincariol/replica-skill](https://github.com/Jakeschincariol/replica-skill) (MIT).
- **The meta layer** (4 skills): the orchestrator, the skill-creator gate,
  and the skills that complete the cycle (radar, flywheel, runway).

## The chain in one line

```
council -> battlefield/crowd/pulse -> numbers/pricetag/magnet/runway
        -> identity -> xray/blueprint/interface/rebuild/backend/trial/parity/rebrand
        -> megaphone/storefront -> opening/ship -> workshop -> radar -> flywheel -> back to truth
```

Full map with every skill's exact role: [CHAIN.md](CHAIN.md).
Turn the pack into agents: [SUB-AGENTS.md](SUB-AGENTS.md).

## Install

Copy every folder into your project's `.claude/skills/` (project-local) or
`~/.claude/skills/` (global). Or as a plugin:

```
/plugin marketplace add <this-repo>
/plugin install thefounder@thefounder
```

No Python dependencies anywhere in the pack; scripts are standard-library
only and run on Python 3.8+.

## The rules the pack lives by

1. **Every skill owns one trigger domain.** The registry in
   THEFOUNDER-skill-creator is the source of truth; no two skills share a
   trigger phrase.
2. **Every skill states its fence** — what it refuses to do and which sibling
   owns that instead.
3. **Every claim traces to a source.** No invented numbers, reviews or
   balances; unknowns are recorded as unmeasured or unverified, never zero.
4. **All work product lives in `THEFOUNDER/`** in the user's project, one
   subtree per skill, auditable by a stranger.

## License

MIT. Credit for the build chain's design: Jake Schincariol's replica-skill.
