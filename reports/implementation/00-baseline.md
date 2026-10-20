# Phase00 baseline — actual outcomes

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../docs/CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

20 October 2026, Asia/Kuala_Lumpur. Integration lane D:/ABANGCOLEK-WORKTREES/multi-cli-integration-20261020 on60311aad5a1695eb2804e830488a3133e182397f. Original dirty app/worktree changes preserved; selected26documentation files copied,137source/test hashes inventoried. Dependency directory junction points to existing D:/ABANGCOLEK-OS/node_modules; no installation or lock mutation.

| Command | Actual result | Evidence |
|---|---|---|
| bun --version |1.4.2| actual stdout |
| bun run lint | exit0 | external control baseline-lint logs/exit |
| bun run build | exit0 | external control baseline-build logs/exit |
| bun run test:platform | exit1:416pass,3fail,2624assertions,419tests/88files,121.38s | external control baseline-platform logs/exit |
| bun run test:e2e --list | exit0:53tests/16files; discovery only | external control baseline-e2e-list logs/exit |

## Failures preserved

- `tests/platform/backend-workspaces.test.ts`: (fail) task outcomes, private documents, calendar ownership, shift handoff and source-safe CSV are enforced [5123.60ms]
- `tests/platform/backend-workspaces.test.ts`: (fail) campaign asset bundle is a real private archive of approved revision and files [6595.59ms]
- `tests/platform/backup-restore.test.ts`: (fail) durable snapshot restores records and hashed evidence into a fresh directory only [10637.88ms]

All3failures are5000ms timeouts; not yet attributed to code or environment. Focused rerun unchanged source required; do not increase timeout or claim baseline green. Nonintersecting technical03A can proceed after independent baseline review; dependent integration gates remain open.

## Original/worktree protection and reconciliation

Root integrate/blueprint-v23 remains60311aa; release main e736856. Existing agy-backend/copilot-frontend a9cdbea dirty, interrupted copilot-completion e736856 with deletions untouched. New integration and4named CLI lanes created from60311aa; none represents all original dirty frontend content. Landing release commits have not yet been merged; normal dependency-reviewed reconciliation is required before release. No original user file restored/deleted; no bulk copy of frontend/backend source.

Listener inventory found only127.0.0.1:3002 among3000/3002/3010/3020/8030, owned by existing Bun process34432; runtime identity not re-certified, so no restart/data mutation allowed. No production probes/provider calls/DB writes were part of this baseline run.

## External executors

All4real CLIs have been invoked: AGY timed out without final response despite exit0/statusSUCCESS; Hermes native startup pending/budget exceeded under diagnosis; Kilo local uv_spawnENOMEM failure; Copilot returned readonly observations but cannot execute commands because not granted a terminal. These are not4successful implementation tasks. See00-capability-availability and external control receipts.

## Next

Independent readonly baseline review; unchanged focused timeout reruns; then03A exact margin technical red/green implementation. Unknowncommercial/model/Intelligence gates remain disabled and independent synthetic work continues.

## Focused timeout rerun — unchanged source

`bun test ./tests/platform/backend-workspaces.test.ts ./tests/platform/backup-restore.test.ts` exited0:8pass,0fail,65assertions,2files,2.60s. Original full-suite416pass/3timeout outcome is preserved. No timeout raised/sourcechanged. This points to a load-sensitive occurrence but is not a replacement full-suitegreen. Exact exit/log artifacts under external control.
