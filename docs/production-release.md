# Production runtime and release verification

Production project: `niaga-hub-pro/abang-colek-v1`, repository `thisisniagahub/ABANG-COLEK-V1`, domain `https://abangcolek.gangniaga.my`.

## Required configuration

Apply `supabase/sql/platform-runtime.sql` to Supabase project `yeszjvcnjxumujxinahz` using an administrator connection. It creates private runtime tables, service-role RPCs and the private evidence bucket. It does not import the local operational database or create business accounts, products or stock.

Set these Vercel Production environment variables, then redeploy:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | `https://yeszjvcnjxumujxinahz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only project credential; never prefix with `VITE_` |
| `PLATFORM_WORKSPACE_ID` | Stable persistence namespace, default `business` |
| `PLATFORM_ALLOWED_ORIGINS` | Exact comma-separated HTTPS origins; default production domain |
| `PLATFORM_BOOTSTRAP_TOKEN` | Strong private token for provisioning the first founder, if the remote database has no founder |
| `VITE_SUPABASE_URL` | Optional legacy client integration URL, compiled into frontend |
| `VITE_SUPABASE_ANON_KEY` | Optional publishable/anon key, compiled into frontend; never use service role |

Canonical email/password login uses the platform session and memberships. Google OAuth cannot establish that session yet and is explicitly unavailable in the login UI. A publishable Supabase key alone does not enable canonical Google login.

## Persistence boundaries

The compatibility runtime runs the existing Bun/SQLite domain code against a fresh temporary database per request. Supabase stores the authoritative snapshot with revision-based compare-and-swap; responses and cookies are released only after commit. Confirmed GET/HEAD conflicts retry at most four times. Mutations are never automatically replayed. An uncertain commit checks its unique receipt; unavailable storage fails closed rather than initializing empty business data.

Public HTML builds also read this authoritative snapshot when both server-side Supabase environment variables are configured. The build uses a temporary read-only SQLite copy and publishes only the existing approved catalogue projection. A failed cloud read or incomplete cloud configuration fails the build; it does not fall back to a local catalogue. Unconfigured local builds retain the checkout database behavior. Product publication after a deployment still requires a rebuild to refresh prerendered HTML and metadata.

This is a bounded compatibility backend: the entire snapshot must remain below **16 MiB**. It is not a normalized PostgreSQL migration and is unsuitable for high write concurrency without redesign. Commit receipts are retained for 24 hours and pruned on subsequent commits. Private evidence is stored separately, with scoped immutable paths and content hash checks. Orphan files from failed metadata commits require an operational cleanup process that preserves uncertain outcomes.

Hosted requests are limited to **4,000,000 bytes including multipart overhead** and a 10-second body deadline. Local evidence validation allows 10 MiB; Vercel's function request boundary is smaller. Export responses must also fit the hosting provider's response limits. Large evidence/export workflows need a separately reviewed direct upload/download design.

This function does not start the local job worker. Background jobs, scheduled automation, WhatsApp delivery, AI providers and external publishing require their actual configured transports and a verified worker/cron deployment. Their unavailable states must not be presented as successful execution.

## Release gates

1. Run `bun run lint`, `bun run test:platform`, `bun run build` without placeholder cloud keys.
2. Start `bun run qa:server`; run Vite on port 3001 with `PLATFORM_API_TARGET=http://127.0.0.1:3011`. Run `PLATFORM_TEST_URL=http://127.0.0.1:3001 bun run test:e2e` using the shell's environment syntax. This uses isolated QA data, not the business database.
3. Review explicitly staged files and scan for secrets. Push `main` without force. The existing Vercel Git integration must deploy that exact SHA.
4. Verify the served favicon, rendered landing/login/workspace, JSON `/api/platform/catalogue`, expected unauthenticated session response, canonical login, cross-request persistence, private evidence downloads and negative anon/authenticated Storage access.
5. Check deployment logs and GitHub checks separately. GitHub Actions account billing blocks are external failures and must be reported; a Vercel Ready status or root HTTP 200 alone is insufficient.

Do not call production fully functional until SQL execution, server environment, deployment routing and the live acceptance gates have been verified.

The Vercel Git integration is the canonical automatic deployment path for pushes to `main`. The GitHub workflow always runs its install, lint, platform tests and build; it additionally deploys through the CLI only when the optional `VERCEL_TOKEN` repository secret is configured. Without that secret it emits an explicit notice and leaves deployment verification to the Git integration. A successful validation workflow does not assert that Vercel deployed successfully; GitHub account billing failures also remain separate external blockers.
