---
name: THEFOUNDER-parity
description: >-
  Scores the finished build against the original: a weighted parity score over the feature matrix, a layout diff that ignores colour, and the honest missing list. Missing must-haves means not shippable, and it says so. Use when the user says "how close is it", "parity score", "what is missing", "compare my build with the original".
---

# THEFOUNDER-parity

Two tools in this folder, both standard-library Python, no installs:

```bash
python3 parity.py THEFOUNDER/clone/features.csv                         # feature parity + missing list
python3 imgdiff.py THEFOUNDER/clone/screens/S07.png THEFOUNDER/clone/clone-screens/S07.png --out diff-S07.png
python3 imgdiff.py a.png b.png --json > THEFOUNDER/clone/diffs/S07.json # for parity.py --visual
python3 parity.py THEFOUNDER/clone/features.csv --visual THEFOUNDER/clone/diffs/*.json --markdown > THEFOUNDER/clone/parity.md
```

## What parity means here

**Parity means it does the same job, not that it looks the same.** The
feature score is the number that matters: can a user do everything they could
do in the original. The layout score checks structure (is the information in
the same places, in the same hierarchy), because that is what makes a switcher
feel at home. It deliberately ignores colour, because THEFOUNDER-rebrand changes
every colour on purpose. Do not chase pixel parity with the original. Its
exact look is its trade dress, and it changes before launch.

## Step 1: feature parity

Make sure `THEFOUNDER/clone/features.csv` is current: every row's `clone` column is
`yes`, `partial` (with a note), `no`, or `skip` (with a reason). Then:

```bash
python3 parity.py THEFOUNDER/clone/features.csv
```

It weights must 3, should 2, could 1, counts partial as half, leaves out
`skip` rows and rows you added that the original does not have, and prints:
the score, must-haves done of total, each area weakest first, and the missing
list in build order. Must-haves not done means not shippable, and it says so.

## Step 2: layout diff

For each key screen, take two screenshots at the **same viewport** (1440x900
desktop, 390x844 mobile) in the **same state** (same data shape, same tab
open, logged in the same way). The original's come from public pages or the
user's own account, saved in `THEFOUNDER/clone/screens/`. The clone's go in
`THEFOUNDER/clone/clone-screens/`.

```bash
python3 imgdiff.py THEFOUNDER/clone/screens/S07.png THEFOUNDER/clone/clone-screens/S07.png --out THEFOUNDER/clone/diffs/S07.png
```

Layout mode (default) turns both into edge maps, cuts them into a grid, and
compares where things are, scoring only cells with something in them. It
reports the score (matches 90+, close 75+, partly 50+, different), the
regions that differ (in the original's pixel coordinates, biggest first), and
a height difference if the clone's page is much longer or shorter. Retina and
non-retina screenshots compare fine: both are scaled to the same width.

`--mode pixel` is exact comparison. Use it for your own regressions (clone
today against clone last week), not against the original.

## Step 3: behaviour diff

Walk each flow in both apps and compare what the scores cannot see: clicks to
finish the core flow, what happens on errors, what is remembered between
visits, what emails arrive. Fewer clicks than the original is a win. Write
each difference as: flow, original does, clone does, fix or keep.

## Step 4: the report

`THEFOUNDER/clone/parity.md`: overall score, feature score, layout score per screen,
missing features in build order, behaviour differences, and a verdict:

- **not shippable**: any must-have missing, or any open S1 bug
- **shippable**: all must-haves done, feature score 80+, no open S1 or S2
- **better than the original**: shippable, plus fixes from
  THEFOUNDER-pulse. This is the goal. A straight copy has no reason to exist.

Give honest numbers. A clone at 62% is at 62%.

## Output

`THEFOUNDER/clone/parity.md`, the diff images, and the top five things to build next.
Then `/THEFOUNDER-rebuild` for the gaps, or `/THEFOUNDER-pulse` if parity is
there.

## The fence

- Never scores features deliberately left out or newly added.
- Never calls the build shippable while a must-have is missing.

