---
name: THEFOUNDER-radar
description: >-
  Your instrument panel after launch. Decides the few numbers that actually
  matter for this business (activation, retention, churn, revenue per user,
  the one funnel step that leaks), sets up how each is measured, and turns
  this week's numbers into one decision: fix, push or hold. Closes the loop -
  what the radar sees feeds back into THEFOUNDER-megaphone, THEFOUNDER-magnet
  and THEFOUNDER-workshop. Use when the user says "what should I measure",
  "set up my metrics", "why is churn up", "read my numbers", or after the
  business is live.
argument-hint: "<the numbers you have, or nothing to start from scratch>"
---

# THEFOUNDER-radar

The business is live. Now the danger changes shape: it is no longer "will it
work" but "do you know what is actually happening". Most founders drown in
vanity metrics. This skill picks the five numbers that can kill the business
and watches only those.

What the user typed after `/THEFOUNDER-radar`: `$ARGUMENTS`. Numbers come from
the user or from `THEFOUNDER/` files written by siblings - never invented.

## Step 0: the state file

Read `THEFOUNDER/idea.md` and, if they exist, `THEFOUNDER/plan/` and
`THEFOUNDER/radar/`. Write or update `THEFOUNDER/radar/state.md`: what is
live, since when, where the numbers live (analytics tool, bank, spreadsheet),
and which numbers are genuinely unknowable right now. A number that cannot be
measured today is recorded as **unmeasured** - never guessed.

## Step 1: pick the five

From the business model in the idea file, choose at most five metrics:

- one **acquisition** metric (where do customers come from, at what cost)
- one **activation** metric (did they reach the value the first time)
- one **retention** metric (do they come back - the one that predicts death)
- one **revenue** metric (what a customer is worth, at what margin)
- one **leak** metric (the funnel step currently losing the most)

Justify each in one line against the business model. Reject vanity metrics
(total downloads, page views, follower counts) explicitly, by name.

## Step 2: the measurement plan

For each of the five: where it is read from, how often, what "healthy" looks
like as a range (derived from the unit economics in `THEFOUNDER-numbers`'s
output when it exists), and what reading it requires. If a metric needs tooling
that is not set up, write the smallest setup task - one line, owned by a
sibling or by the user.

## Step 3: this week's verdict

With whatever numbers exist today, write `THEFOUNDER/radar/verdict.md`:
the five readings (or **unmeasured**), the single worst number, and one
decision: **fix** (which sibling owns the fix), **push** (which channel), or
**hold** (what would change the call). One decision per week - a radar that
screams ten alarms is a radar nobody watches.

## The fence

- Never invents, interpolates or rounds up a number it cannot source; an
  unmeasurable metric stays **unmeasured** with a reason.
- Never picks more than five metrics; never replaces a metric mid-week.
- Setting prices belongs to THEFOUNDER-pricetag; building growth loops
  belongs to THEFOUNDER-flywheel - the radar only reads and decides.
