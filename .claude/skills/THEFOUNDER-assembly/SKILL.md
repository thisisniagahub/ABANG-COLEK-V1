---
name: THEFOUNDER-assembly
description: >-
  The orchestrator of the founder pack. Knows the whole chain - judge the
  idea, learn the truth, secure the money, build the identity, build the
  product, go to market, open, operate, measure, grow - finds where the user
  stands right now, and hands off to the exact next skill with the right
  inputs. Also runs the chain end to end for users who want to be driven. Use
  when the user says "run the founder pack", "what should I do next", "where
  am I in the process", "orchestrate the pack", "start to finish", or when it
  is unclear which skill owns the current problem.
argument-hint: "<where you are now, or leave blank to be placed on the chain>"
---

# THEFOUNDER-assembly

Twenty-seven skills, one chain. Nobody remembers the order - this skill does.
It reads what exists in `THEFOUNDER/`, places the user on the chain, and hands
off to exactly one next skill with exactly the inputs that skill needs.

What the user typed after `/THEFOUNDER-assembly`: `$ARGUMENTS`.

## The chain

```
STAGE 0 JUDGE      council          - the board tears the idea apart
STAGE 1 TRUTH      battlefield      - who else sells this, what gap is left
                   crowd            - would simulated buyers actually buy
                   pulse            - what real users of the nearest app hate
STAGE 2 MONEY      numbers          - does one unit make money
                   pricetag         - what price will they pay
                   magnet           - the offer too good to refuse
                   runway           - how long the cash survives
STAGE 3 IDENTITY   identity         - name, look, voice, tagline
STAGE 4 BUILD      xray             - map the app you are rebuilding (if cloning)
                   blueprint        - stack, schema, build order
                   interface        - design tokens for the new UI
                   rebuild          - screens, flow by flow
                   backend          - auth, data, payments, integrations
                   trial            - test every flow, kill the S1/S2 bugs
                   parity           - score it against the original
                   rebrand          - strip the original, sweep clean
STAGE 5 MARKET     megaphone        - positioning, channels, first ten hooks
                   storefront       - landing page, pricing page, store listing
STAGE 6 OPEN       opening          - dated launch plan and run sheet
                   ship             - preflight, production, DNS, go
STAGE 7 OPERATE    workshop         - day-one routines, suppliers, SOPs
STAGE 8 MEASURE    radar            - the five numbers, one weekly decision
STAGE 9 GROW       flywheel         - the loop that compounds
                   -> back to STAGE 1 with what the radar saw
META               skill-creator    - extend the pack without clashes
```

## Step 0: place the user

List which `THEFOUNDER/` files exist. The highest completed stage is the one
whose output files exist and pass their own bar. Tell the user: **you are
here**, in one line, with the evidence (which file proved it).

## Step 1: hand off

Name exactly one next skill and why it is next - which of its inputs already
exist and which are missing. If two stages are genuinely parallel (commonly
STAGE 2 money and STAGE 4 build), say which to start and why, and start only
one. The chain is walked one skill at a time; parallelism is the user's call,
never the default.

## Step 2: run end to end (only on request)

If the user asked for the full run ("start to finish"), walk the chain
stage by stage: invoke the next skill, wait for its output files, verify they
exist and are complete, then continue. After each stage, one line of status.
Stop and ask when a stage fails its own bar - a chain that runs on broken
outputs builds a broken business on schedule.

## The fence

- Never skips a stage silently; jumping is allowed only when the user says so
  explicitly, and the skipped stage is named in the handoff.
- Never runs two sibling skills' work itself - it hands off, it does not
  imitate.
- Never declares a stage complete because the user is impatient; the output
  files decide.
