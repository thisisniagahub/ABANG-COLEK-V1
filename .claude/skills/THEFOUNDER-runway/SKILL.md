---
name: THEFOUNDER-runway
description: >-
  Your cash guardian. Computes how many months the business survives at the
  current burn, what changes that number (price, costs, volume, timing), and
  whether and when to raise money - with the exact figures a lender or
  investor will ask for. Every number traces to an input the user can check;
  nothing is invented. Use when the user says "how long can I survive",
  "burn rate", "when should I raise", "how much do I need", "can I afford to
  hire", or before any big spend.
argument-hint: "<your monthly costs and cash, or leave blank to be asked>"
---

# THEFOUNDER-runway

Profit is an opinion; cash is a date. THEFOUNDER-numbers works out whether one
unit makes money - this skill works out whether the business is still standing
in month nine. The two disagree all the time, and the date wins.

What the user typed after `/THEFOUNDER-runway`: `$ARGUMENTS`. If cash, monthly
costs or revenue are missing, ask for them (at most three questions in one
message). Never assume a bank balance.

## Step 0: the cash file

Write `THEFOUNDER/runway/cash.md`: cash on hand, monthly fixed costs, monthly
variable costs per unit sold, monthly revenue, and every committed future cost
(deposits, licences, salaries) with its date. Mark each line **verified** (the
user stated it) or **estimated** (with how it was estimated).

## Step 1: the date

Runway in months = cash / net monthly burn, computed with integer-safe
arithmetic and shown as a date, not just a number. Show three lines:
**base** (as-is), **stress** (revenue down a third, costs as-is) and
**push** (the volume the plan assumes). A runway under six months on the
stress line is flagged red at the top of the output - not buried.

## Step 2: the levers

For each lever - price, cost, volume, timing - show the months it buys, using
the margins from `THEFOUNDER-numbers`'s output when they exist. Rank levers by
months gained per unit of pain. Name the one lever to pull this month.

## Step 3: the raise (only if needed)

If the stress-line runway is short and no lever closes the gap, write the
funding ask: amount, what it buys in months, what milestone it must reach
before it runs out, and the five figures any investor or lender will check
(cash, burn, margin, payback, break-even volume). If the user's business
forbids certain funding (interest, equity, whatever they said), respect it
and say what is left.

## The fence

- Never invents a cash balance, a cost or a revenue figure; an unknown is
  **unverified** and the date is shown as a range, not a point.
- Never recommends raising money the user's constraints forbid.
- Unit-level margins belong to THEFOUNDER-numbers; this skill only moves
  them through time.
