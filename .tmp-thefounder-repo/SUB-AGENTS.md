# SUB-AGENTS.md — convert the pack into powerful agents

A skill is a playbook; an agent is a player. The pack converts into agents by
**stage**, not by skill: one agent per stage, loaded with the skills of that
stage, with hard handoff rules. This keeps the agent count at ten regardless
of how much the pack grows.

## The pattern

Every agent file is the same shape — paste into `.kilo/agents/<name>.md`
(Kilo) or `.claude/agents/<name>.md` (Claude Code):

```markdown
---
name: THEFOUNDER-<stage>
description: <one paragraph - when this agent takes over, and when it hands off>
tools: <the tool list the stage needs, nothing more>
---

You are the <stage> player of the THEFOUNDER pack.

Load and follow these skills in order: <skill list>.
Inputs you read: <THEFOUNDER/ paths>.
Outputs you write: <THEFOUNDER/ paths>.
You hand off when: <exact condition> -> hand to THEFOUNDER-<next-stage>.
You refuse to: <the union of the fences of your skills>.
```

## The ten stage agents

| Agent | Skills it loads | Hands off to |
| --- | --- | --- |
| THEFOUNDER-judge | council | scout |
| THEFOUNDER-scout | battlefield, crowd, pulse | banker |
| THEFOUNDER-banker | numbers, pricetag, magnet, runway | designer |
| THEFOUNDER-designer | identity | builder (or planner for non-clone businesses) |
| THEFOUNDER-builder | xray, blueprint, interface, rebuild, backend, trial, parity, rebrand | marketer |
| THEFOUNDER-marketer | megaphone, storefront | opener |
| THEFOUNDER-opener | opening, ship | operator |
| THEFOUNDER-operator | workshop | analyst |
| THEFOUNDER-analyst | radar | grower (and feeds scout) |
| THEFOUNDER-grower | flywheel | analyst |

The orchestrator (`THEFOUNDER-assembly`) is the **only** agent allowed to
spawn and sequence the others; run it as the primary agent and let it
delegate. That is the whole multi-agent topology: one conductor, ten players,
one chain.

## Rules that make the agents powerful (and safe)

1. **Minimal tools per agent.** The banker needs no browser; the builder
   needs no review scraper. Fewer tools, fewer wrong turns.
2. **Handoff is a file, not a feeling.** An agent hands off only when its
   stage's output files exist and pass the skill's own bar.
3. **The fences travel.** Each agent's refusal list is the union of its
   skills' fences — copy them verbatim.
4. **One conductor.** Never run two stage agents at the top level; the
   orchestrator sequences them and owns the state in `THEFOUNDER/`.
5. **Budgets.** Give each agent an explicit step budget in its file; the
   orchestrator splits long stages into re-runnable chunks so a killed agent
   never leaves half-written state.

## Quick conversion checklist

- [ ] Copy the ten templates above into `.kilo/agents/` with real frontmatter
- [ ] Set `THEFOUNDER-assembly` as the primary agent; all others `subagent`
- [ ] Add each agent's `tools:` line from the stage's real needs
- [ ] Run one stage end to end before enabling the full chain
