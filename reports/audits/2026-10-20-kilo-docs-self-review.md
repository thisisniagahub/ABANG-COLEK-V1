# Self-Review Against Official Kilo Docs — 2026-10-20

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../docs/CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Purpose: audit my own operating assumptions against `https://kilo.ai/docs/` so that
nothing I claim about the harness is a guess. Every row below cites a docs page
fetched on 2026-10-20.

Pages read in full:
- `/docs/code-with-ai` (index)
- `/docs/code-with-ai/agents/using-agents`
- `/docs/code-with-ai/agents/goals`
- `/docs/code-with-ai/agents/model-selection`
- `/docs/customize/custom-subagents`
- `/docs/customize/agent-permissions`

---

## 1. Claims I made to the user that were CORRECT (verified)

| Claim I made | Docs confirmation |
|---|---|
| Switching to `ask`/`plan` removes write capability | `using-agents`: `ask` = "Read-only tools (`read`, `glob`, `grep`, `list`), read-only bash commands … All write operations are blocked." `plan` = "Read-only tools plus restricted file editing (plan files in `.kilo/plans/` only)." |
| All 8 subagents run the same model as the parent | `custom-subagents`: "If not set, subagents inherit the model of the invoking primary agent." `model-selection`: "the subagent **inherits the parent agent's model** by default." |
| Switching model via `/models` is different from switching agent | `model-selection`: "Use the model selector … or type `/models` to open the model picker." Agent switching is a separate control. |
| I was right not to self-select a model for subagents | `model-selection`: "Overrides require your explicit request; the agent does not choose a different model on its own based on task complexity, cost, or latency. Invalid selections fail instead of silently falling back." |

## 2. Claims that were IMPRECISE — corrected

| I said | Docs say | Correction |
|---|---|---|
| "Switch agent with `tab` / `shift+tab`" (from the `kilo-config` skill) | `using-agents`: "**Slash commands:** type `/agents` … **Keyboard shortcut:** press `Cmd+.` (macOS) or `Ctrl+.` (Windows/Linux) to cycle through available agents." `model-selection`: "Press **Shift+Tab** in the prompt input to cycle to the next **reasoning effort variant**." | The skill's keybinding table is out of date. `Ctrl+.` cycles agents; `Shift+Tab` cycles reasoning variant. The skill also says "Cycle agent `tab`/`shift+tab`" — wrong. |
| "The `reviewer` subagent type is available" | `custom-subagents`: "Kilo Code includes **two** built-in subagents: `general`, `explore`" and "The VSCode extension and CLI **do not include a built-in Review agent**." | **This build's Task tool does expose `reviewer` and `tdd`** (verified by successful invocation), so the docs page is behind this build. I must not cite the docs as endorsing them. |
| "`orchestrator` is a current agent" | `using-agents`: "**orchestrator (Deprecated)** … will be removed in a future release." | Deprecated; `code`/`plan`/`debug` support subagents natively. |
| Nothing — I had not checked whether goal execution is verified | `goals`: "**Complete (model-reported)** means the model reported success. **Kilo does not independently verify the result.**" | My final `goal_report` is a *model claim*. The machine-derived evidence file, not the report, is the proof. This must be stated explicitly in the final handover. |

## 3. Things I did NOT know before reading the docs (material)

| Capability | Docs text | Why it matters here |
|---|---|---|
| **Per-agent `permission` with path-glob ceilings** | `agent-permissions`: `edit: { "*": deny, "server/**": allow }`; "File tools … resolve the input path first, then check permissions against the path relative to the current worktree."; "**the last matching rule wins**"; "The matcher normalizes Windows backslashes to forward slashes before matching. On Windows, matching is case-insensitive." | My file-ownership discipline across 13 writers was enforced **by instruction only**. It held (audit found zero cross-lane writes), but it was never mechanically enforced. Now it can be. |
| **`permission.task` delegation allowlist** | `custom-subagents`: `permission: { task: { "*": "deny", "code-reviewer": "allow" } }` | Lets me bound which subagents exist at all, and stop a writer from fanning out. |
| **Custom subagents in `.kilo/agents/*.md`** | `custom-subagents`: filename becomes the agent name; `mode: subagent`; `prompt` = markdown body; `steps` = max agentic iterations; `temperature`; `permission`; `hidden` | A fixed, reusable roster with one consistent house-rules prompt — exactly the "consistent delegation" requirement. |
| **Config precedence** | `custom-subagents`: built-in → global config → project config → global agent md → project agent md. | Project `.kilo/agents/*.md` beats global. |
| **`subagent_model` / `memory_model` / `agent.compaction.model` / `small_model` keys** | `model-selection` | I can pin the subagent model independently of my session model, so a future `/models` switch does not silently change 13 workers' brains. |
| **Goal auto-pause and auto-block triggers** | `goals`: "Kilo pauses an active goal when … **You run a shell command.** … A permission request or tool call is rejected, **which marks the goal blocked instead of paused.**" | Operational risk for the rest of this run: a denied tool call can **block** the goal. I must not let tool errors/permission denials happen on the root worker. |
| **`question` is unavailable during an active goal** | `goals`: "The `question` tool is unavailable during active goal execution, including delegated work." | Matches the brief's "jangan ulang interview". |
| **Only the root goal worker may `goal_report`** | `goals`: "Only the root goal worker can call `goal_report`. Delegated workers return their findings to the root." | My role is correct. |
| **Kilo Swarm board** | `custom-subagents`: a delegated child "can … communicate through its result, shared files, or the **Kilo Swarm** board." | The board I have been using (`board_read` / `board_post`) is the documented coordination channel. |
| **Checkpoints** | `/docs/code-with-ai/features/checkpoints` — "Save and restore working states" | Relevant: this working tree is extremely dirty (≈93k insertions in the local branch). |
| **`kilo-auto/free`, `kilo-auto/efficient`, `kilo-auto/small`** | `model-selection` | A zero-cost model tier that is not tied to one specific free model. |
| **`vscode://kilocode.kilo-code/kilocode/switch?model=…&agent=…`** | `model-selection` | The user can switch model+agent in one link without a picker. |

---

## 4. Concrete actions taken as a result of this review

### 4.1 Project-level permission ceiling — `.kilo/kilo.json` (created)
The entire execution strategy depends on the dirty working tree surviving. Until now
that was enforced only by 13 separate prompt instructions. It is now enforced by the
harness for every agent, present and future:

```json
{ "permission": { "bash": {
  "*": "allow",
  "git reset*": "deny",  "git checkout*": "deny", "git restore*": "deny",
  "git clean*": "deny",  "git stash*": "deny",
  "git push --force*": "deny", "git push -f*": "deny",
  "git commit --amend*": "deny", "git branch -D*": "deny",
  "git update-ref -d*": "deny",
  "rm -rf *PRODUCT LLH*": "deny", "rm -rf *Product Photo*": "deny",
  "Remove-Item -Recurse *PRODUCT LLH*": "deny",
  "Remove-Item -Recurse *Product Photo*": "deny"
}}}
```
Broad `*` first, denies after — the documented "last matching rule wins" order.
The two product-media paths are additionally protected because they are
**gitignored** (a deletion there would leave no git provenance at all).

**Ordering is load-bearing, and JSON has no comments — so it is recorded here.**
Per `https://kilo.ai/docs/code-with-ai/platforms/cli#permissions`: *"Rules are
evaluated by pattern match, with the last matching rule winning. A common
pattern is to put the catch-all `"*"` rule first, and more specific rules after
it."* In `.kilo/kilo.json` the broad `"*": "allow"` is therefore **first** and
every `deny` follows it. That is the only order in which the denies can win;
moving `"*": "allow"` to the end would silently re-allow every denied command.

**Scope of this project-level floor (stated plainly, not a blanket claim).**
This file is the floor for every agent, present and future. It denies the
destructive-git set and the two gitignored product-media paths, and
`external_directory` is denied here so no path-taking tool can leave the
workspace. It does **not** deny file-mutating shell commands such as
`node -e`, `rm` or `Set-Content` — the project-level floor is deliberately
narrower than the four agent definitions, because the primary orchestrator
legitimately needs a broader shell than a lane writer does. The file-mutating
denies live in the per-agent files (see 4.2.1).

The file now also sets `"external_directory": "deny"` (added 2026-10-20); the
snippet above shows the `bash` map only.

### 4.2 Fixed subagent roster with mechanical blast-radius ceilings — `.kilo/agents/`
Four agent definitions, each with an enforced edit ceiling and one shared
house-rules prompt, so delegation stops being improvised per-wave:

| File | Edit ceiling | Role |
|---|---|---|
| `abangcolek-writer-backend.md` | `server/**`, `api/**`, `shared/**` | backend implementation |
| `abangcolek-writer-frontend.md` | `src/**` | frontend implementation |
| `abangcolek-writer-tests.md` | `tests/**`, `scripts/**` | acceptance-test contract |
| `abangcolek-auditor.md` | **deny all writes** | adversarial read-only audit |

Shared house rules embedded in every one: never fabricate; never weaken a test;
never fabricate provenance; money is integer sen; the server owns authority;
report exact commands + exit codes + real counts; the orchestrator is the single
writer for the ledger.

`task: deny` on the writers prevents unbounded fan-out. `edit: deny` on the
auditor made read-only a harness guarantee **for the edit tool only** — that
sentence overstated what the permission system guarantees, and 4.2.1 below
states exactly what is and is not guaranteed.

### 4.2.1 What the permission ceiling actually guarantees — corrected

An independent adversarial review found that 4.2 **overclaimed**. This
subsection is the correction, verified against the official docs on
2026-10-20. It also qualifies the *"Now it can be [mechanically enforced]"*
line in section 3: the mechanical enforcement applies to the edit-group tools
and to a shell deny list — not to the filesystem.

#### Doc citations relied on (all fetched 2026-10-20)

- `https://kilo.ai/docs/customize/agent-permissions`
  - *"Agent permissions decide whether a tool call is allowed, asks for approval, or is denied."*
  - *"Permission rules are evaluated in config order. When more than one rule matches the requested permission and target pattern, the last matching rule wins."* / *"Put broad fallbacks first and exceptions after them."*
  - *"File tools such as `read`, `edit`, and `write` resolve the input path first, then check permissions against the path relative to the current worktree."*
  - *"The `bash` permission is checked against parsed shell command patterns. If a shell block contains multiple parsed commands, each relevant command must be permitted. A single denied command rejects the request."*
  - *"Built-in read-only agents include additional shell restrictions for write-like patterns such as output redirection, command substitution, pipes, and command chains. If you create your own read-only agent, prefer an explicit deny fallback and allow only the commands you trust."*
  - *"The matcher normalizes Windows backslashes to forward slashes before matching. On Windows, matching is case-insensitive."*
- `https://kilo.ai/docs/code-with-ai/platforms/cli#permissions`
  - *"Rules are evaluated by pattern match, with the last matching rule winning. A common pattern is to put the catch-all `"*"` rule first, and more specific rules after it."*
  - *"`*` matches zero or more of any character"*, *"`?` matches exactly one character"*, *"All other characters match literally."*
  - *"Use `external_directory` to allow tool calls that touch paths outside the working directory where Kilo was started. This applies to any tool that takes a path as input."*
- `https://kilo.ai/docs/automate/tools` — the Edit Group is `edit`, `write` **and**
  `apply_patch`: three separate tools, so denying only `edit` leaves file
  creation and patching open.

#### What the ceiling DOES guarantee

1. **The file-mutating tools are path-restricted.** For the three writers the
   harness restricts all three edit-group tools (`edit`, `write`,
   `apply_patch`) to that writer's own paths — `server/**`, `api/**`,
   `shared/**` for the backend writer; `src/**` for the frontend writer;
   `tests/**`, `scripts/**` for the test writer. For the auditor all three are
   denied outright. These are tool-call gates on the path input, resolved
   relative to the current worktree.
2. **Specific destructive commands are denied by pattern.** `git reset`,
   `git checkout`, `git switch`, `git restore`, `git clean`, `git stash`,
   `git push --force` / `git push -f`, `git commit --amend`, `git branch -D`,
   `git update-ref -d`; and, in the writers, `git mv` / `git rm` / `git apply` /
   `git am` / `git rebase` / `git cherry-pick` — these move or delete files and
   would otherwise bypass the file-tool path ceiling. The file-mutating shell
   commands are denied too (`rm`, `Remove-Item`, `Move-Item`, `Rename-Item`,
   `Copy-Item`, `Set-Content`, `Add-Content`, `Out-File`, `New-Item`,
   `node -e`, `python`, `tee`, `touch`, `mkdir`, `cp`, `mv`, `del`, `curl`,
   `wget`, `Invoke-WebRequest`, `Invoke-RestMethod`, `pwsh`, `powershell`,
   `cmd`, `sh -c`, `bash -c`). The auditor's shell is a **read-only
   allowlist**: catch-all deny first, the specific allows after it — the exact
   shape the docs recommend for a custom read-only agent.
3. **Out-of-workspace paths are blocked.** `external_directory: deny` is set at
   project level and in all four agent files, so no path-taking tool can reach
   outside the workspace. One harness-managed exception is disclosed rather
   than hidden: a built-in default re-allows
   `C:\Users\megat\.local\share\kilo\tool-output\*` (where Kilo spills
   oversized tool output) and it lands *after* the agent's own deny, so
   last-match-wins keeps it allowed. It is not project source.

#### What it does NOT guarantee

1. **The shell is not path-scoped and not sandboxed.** Permission rules are
   pattern matches on tool inputs that gate tool calls; they are not
   filesystem isolation. The previous `abangcolek-auditor.md` had
   `edit: deny` together with `bash: { "*": allow }`, so it could still run
   `node -e "fs.writeFileSync(...)"`. **That auditor was not read-only.**
   It is read-only now because the shell is an allowlist and the
   file-mutating commands are denied — that is a guarantee about which
   commands may be proposed, not an isolation guarantee about what the machine
   can do.
2. **A permitted command that executes project code can have side effects.**
   `bun test`, `bun run lint`, `bun run build` and
   `bun scripts/maintenance/check-boundaries.ts` run the repository's own code;
   `bun run build` genuinely regenerates the gitignored `dist/` output. This is
   an observed side effect of running the project's own gate — not a file write
   by the agent — and it is stated in each agent's prompt rather than papered
   over.
3. **The extra restrictions of Kilo's built-in read-only agents are not
   available to a custom agent.** The docs state that built-in read-only agents
   add extra restrictions on output redirection, command substitution, pipes
   and command chains; a custom agent has only pattern rules. The mitigation
   available to it is the documented *"each relevant command must be permitted.
   A single denied command rejects the request"* behaviour — which is why
   `cat x | Out-File y` is rejected even though `cat` alone is allowed.
4. **Rule order is load-bearing.** Because the last matching rule wins, the
   catch-all must come first and the specific exceptions after it. The four
   agent files carry this in comments; `.kilo/kilo.json` cannot, so the
   ordering is recorded in 4.1 above.

#### Honest status of the cross-lane discipline

It was **observed** to hold: across the 13 writers dispatched in this project,
the audit found **no cross-lane writes**. It is enforced by the **ownership
brief** (the exact paths the orchestrator assigns to each writer) plus the
**audit** that checks it. It is **not proven impossible by construction**.
The earlier description of a "blast-radius ceiling" for the writers overstated
it: the path ceiling is a guarantee about the edit-group tools, and for the
shell it is a guarantee about a deny list — not about the filesystem.

### 4.3 Known limitation of 4.2 — stated plainly
**A custom agent type is NOT invocable in the current session.** Verified by probe:
`task(subagent_type: "abangcolek-auditor")` → `Unknown agent type: abangcolek-auditor
is not a valid agent type`. The agent registry is loaded at session start, so the
four new definitions become selectable **after a session restart**. Until then the
in-flight writers continue under the built-in types (`general`, `explore`,
`reviewer`, `tdd`) with ownership enforced by instruction — which the audit shows
held for all 13 writers dispatched so far.

The `.kilo/kilo.json` permission ceiling has the same restart caveat, but it
protects every future session, which is where the remaining risk lives.

---

## 5. Corrections I will apply in the final handover

1. The goal `complete` report is a **model claim**. The proof is
   `reports/implementation/acceptance-verification.json` (machine-derived: exit
   codes, pass/fail counts, git commit, dirty flag) plus per-ID evidence files.
2. Any row that cannot be closed will be reported as `BLOCKED_EXTERNAL` /
   `IMPLEMENTATION_INCOMPLETE` with the exact external evidence, never as done.
3. No row will be ticked on a document claim; only on a real command result and an
   independent audit.
