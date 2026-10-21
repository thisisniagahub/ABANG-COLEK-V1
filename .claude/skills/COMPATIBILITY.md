# COMPATIBILITY.md — which agents can run this pack

The pack is **plain markdown + YAML frontmatter**. There is no lock-in: any
agent that can read a file can run any skill. The Python tools are
standard-library only (Python 3.8+, zero pip installs), so they run anywhere
Python runs.

## Install matrix

| Agent | Install command / path | Notes |
| --- | --- | --- |
| Claude Code (project) | `npx thefounder init --agent claude` → `.claude/skills/` | full plugin support via `.claude-plugin/` |
| Claude Code (global) | `npx thefounder init --global` → `~/.claude/skills/` | namespaced as `/thefounder:<skill>` if installed as plugin |
| Kilo (project) | `npx thefounder init --agent kilo` → `.kilo/skills/` | skills surface as slash commands |
| Kilo (global) | `npx thefounder init --agent kilo-global` → `~/.config/kilo/skills/` | |
| Codex / Cursor / Gemini CLI / any agent | `npx thefounder init --target <dir>` | paste or attach any `SKILL.md` at the top of a chat — the method runs even without the folder structure; you only lose the Python tools |
| Claude Code plugin marketplace | `/plugin marketplace add <repo>` then `/plugin install thefounder@thefounder` | uses `.claude-plugin/marketplace.json` |

## Harness-specific constructs (and their equivalents)

A few pack instructions name harness-specific capabilities. These are the
only constructs to translate when porting:

| Construct in SKILL.md | Claude Code / Kilo | Other agents |
| --- | --- | --- |
| Spawn a sub-agent | Agent/Task tool with a general-purpose subagent | run the sub-task inline, or use your harness's delegation tool; the brief file (`THEFOUNDER/board/brief.md`) is written to stand alone precisely so any mechanism works |
| Slash command `/THEFOUNDER-x` | native skill command | type the skill name and its trigger phrase instead |
| `npx thefounder ...` | any shell | any shell — the CLI is zero-dependency Node 18+ |

## Model compatibility

Skills address the model in plain second person with no provider-specific
prompt formats, no tool-call schemas, and no JSON mode requirements. The only
files a model must produce are markdown (and CSV/JSON templates where a
sibling reads them), which every current model writes. Verified structure
works for: Claude, GPT-family via Codex, Gemini, GLM, and open models through
any agent harness — the pack gates quality with tests, not with model
identity (`bun test tests/thefounder/`).

## What compatibility does NOT mean

- No guarantee any particular model follows the fences; the fences are
  instructions, and the test suite checks structure, not obedience.
- The Python tools behave identically everywhere (stdlib only), but engines
  like Playwright used by `THEFOUNDER-trial` examples are the user's own
  installs, not pack dependencies.
