---
name: THEFOUNDER-skill-creator
description: >-
  The house standard for creating, reviewing and extending THEFOUNDER-branded
  skills. Enforces the naming, frontmatter, output-folder, anti-clash and
  efficiency rules every new skill in the founder pack must follow, and gates
  a new skill before it is installed. Use when the user says "create a new
  THEFOUNDER skill", "make a skill for X", "add a skill to the founder pack",
  "skill guideline", "review my new skill", or wants to extend THEFOUNDER with
  a new capability.
argument-hint: "<what the new skill should do, or a SKILL.md to review>"
---

# THEFOUNDER-skill-creator

The forge. Turns an idea for a new capability into a skill that reads, writes
and behaves exactly like the other twenty-six in the pack. A skill that breaks
these rules is a skill that will be picked at the wrong moment, fight a
sibling, or rot — so the gate below is not optional.

## The rules, before anything else

- **One capability per skill.** If it needs "and" in its name, it is two
  skills.
- **Extend, do not duplicate.** Before writing anything, read the current pack
  (`.claude/skills/THEFOUNDER-*`). If an existing skill already covers the
  capability — even partially — the default is to extend that skill, not to
  mint a sibling that fights it for the same triggers.
- **The namespace is the shield.** Every THEFOUNDER skill is `THEFOUNDER-<name>`
  and lives in a folder of the same name in the project's `.claude/skills/`.
  This prefix keeps the pack out of collision with any globally installed
  skill (skill-scout, skill-stocktake, ponytail, and so on).

## Step 1: the clash gate (run this first)

Skill agents pick a skill by its **description**, not its name. Two skills
clash when their trigger phrases overlap — the agent then guesses, and a
guess is how the wrong expert runs. So:

1. List the installed pack and its trigger domains:

   Founder chain (idea -> operate):

   | skill | owns the trigger domain |
   | --- | --- |
   | THEFOUNDER-council | judging a business idea |
   | THEFOUNDER-battlefield | competitor maps, market gaps |
   | THEFOUNDER-crowd | simulated buyers, demand validation |
   | THEFOUNDER-pulse | real user reviews of an existing app, linked quotes |
   | THEFOUNDER-numbers | unit economics, margins, break-even, startup cost |
   | THEFOUNDER-pricetag | price points, ladders, sensitivity |
   | THEFOUNDER-magnet | pricing offers, guarantees, bonuses |
   | THEFOUNDER-runway | cash runway, burn, when and how much to raise |
   | THEFOUNDER-identity | naming, identity, look, voice, tagline |
   | THEFOUNDER-megaphone | positioning, channels, ads, content |
   | THEFOUNDER-opening | launch plans, checklists, go-live dates |
   | THEFOUNDER-workshop | operations, suppliers, SOPs, permits |
   | THEFOUNDER-radar | the five metrics, weekly measurement verdict |
   | THEFOUNDER-flywheel | growth loops, referral, retention mechanics |
   | THEFOUNDER-masterplan | business plans, compiled verdicts |

   Build chain (clean-room clone of an existing app):

   | skill | owns the trigger domain |
   | --- | --- |
   | THEFOUNDER-xray | mapping how an existing app works, feature matrix |
   | THEFOUNDER-blueprint | stack, database schema, API, build order |
   | THEFOUNDER-interface | design tokens, UI component specs |
   | THEFOUNDER-rebuild | building screens and flows |
   | THEFOUNDER-backend | auth, database, payments, integrations |
   | THEFOUNDER-trial | test plans, e2e specs, bug logs |
   | THEFOUNDER-parity | parity score against the original |
   | THEFOUNDER-rebrand | stripping the original's marks, sweep gate |
   | THEFOUNDER-storefront | landing page copy, pricing page copy, store listing |
   | THEFOUNDER-ship | preflight, production, DNS, deploy |

   Meta layer:

   | skill | owns the trigger domain |
   | --- | --- |
   | THEFOUNDER-assembly | orchestrating the chain, "what is next" |
   | THEFOUNDER-skill-creator | creating or changing pack skills |

   The full map with fences and handoffs lives in `CHAIN.md` next to this
   pack's README; keep the two in sync when rows change.

2. Ask: which row would an agent pick for the new skill's triggers? If any
   existing row answers, the new skill must either take a **disjoint** slice
   (and say so in its description: "not X — use THEFOUNDER-x for that") or the
   work goes into the existing skill instead.
3. Record the verdict in the skill file itself (see the fence below), so the
   next creator does not re-litigate it.

A new skill passes the gate only when no trigger phrase in its description
also appears in a sibling's description.

## Step 2: the shape (non-negotiable)

```markdown
---
name: THEFOUNDER-<kebab-name>
description: >-
  One paragraph, second person, ends with trigger phrases.
  Format: what it does, how it does it in one line, then
  'Use when the user says "...", "...", or ...'. No feature
  the skill does not actually have. No trigger a sibling owns.
argument-hint: "<what the user types after the command>"
---

# THEFOUNDER-<kebab-name>

The rule about what this skill refuses to do, before anything else.

## Step 0: inputs
## Step 1..N: the work
## The fence: what it never does
```

Hard rules:

- Folder name **equals** the `name:` field, exactly.
- The description is the only thing the agent sees when choosing. Write it
  for the chooser, not the user.
- Trigger phrases are literal quotes of what a user would type, three to six
  of them, none shared with a sibling.
- The fence section is mandatory: every pack skill states what it will not
  do and which sibling owns that instead.
- Supporting files (templates, lenses, scripts) sit next to `SKILL.md` and
  are referenced by path. No skill reaches outside `.claude/skills/` for its
  own files.

## Step 3: the output contract

- All work product goes to `THEFOUNDER/` in the user's project — never into
  the skill folder, never into the repo root.
- A skill reads its inputs from `THEFOUNDER/` (starting with
  `THEFOUNDER/idea.md`) and its siblings' outputs from the same tree. It
  never depends on conversation memory of what a sibling wrote: if the file
  is missing, it says so and writes or asks for the minimum it needs.
- Every file a skill writes is one a stranger could audit: claims trace to
  sources, computed numbers carry their inputs.

## Step 4: the efficiency bar

A pack skill is run by an agent with a step budget. Respect it:

- **Minimum files.** `SKILL.md` plus at most what the work cannot survive
  without. A template is a file; an example is not, unless the agent cannot
  guess the format.
- **Stdlib-only scripts.** Any script ships with zero `pip install` and runs
  on Python 3.8+. A script that needs a dependency is a design failure.
- **No tool sprawl.** If the job is reading and writing markdown, the skill
  needs no script at all. Scripts exist only for what an LLM does badly:
  exact counting, sorting, diffing, format checking.
- **Self-contained steps.** Each step names its inputs, outputs and failure
  mode in one place, so a fresh agent can run the skill cold.

## Step 5: the install gate

A skill is installed only when all are true:

1. Clash gate passed and the verdict is written in the fence.
2. Frontmatter parses: name equals folder, description present, trigger
   phrases present.
3. The pack cross-references it the way it cross-references siblings (any
   skill that should hand work to it now names it).
4. The skill has been run once end to end on a real input before it is
   declared done. A skill never exercised is a skill not finished.

## The fence: what this skill never does

- It never writes a general (non-THEFOUNDER) skill — use the harness's own
  skill tooling for that.
- It never edits an existing sibling's behaviour without saying which
  triggers move and checking none now collide.
- It never installs a skill that failed the gate, and it never relaxes a
  gate to get a skill through.
