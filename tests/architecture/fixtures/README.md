# Architecture boundary fixtures

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../../docs/CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Committed synthetic trees that each contain exactly one genuine violation of a
rule enforced by `scripts/maintenance/check-boundaries.ts`.

They exist because the previous architecture test never drove the checker: it
evaluated `LEGACY_EXCEPTIONS.some(...)` against a made-up path, which proves
nothing about the detector. Every fixture below is scanned by the checker in
`tests/architecture/dependency-boundaries.test.ts` and the test asserts that the
checker **reports** the violation (rule, file, line) — not that the path is
absent from an exception list.

Each fixture directory is a self-contained repository root:

* `src/` — client layer
* `shared/` — shared contracts
* `server/` — server layer
* `tsconfig.json` — supplies `baseUrl` / `paths` so alias resolution can be exercised

Rules: a fixture tree is analysed with the same code path as the real
repository. `checkDependencyBoundaries(<fixture dir>)` walks the fixture's
`src/`, `shared/` and `server/` roots exactly as it walks the real tree.

Do not "fix" a fixture by making it legal — a fixture that stops violating its
rule is a broken test.
