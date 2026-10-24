# Login System v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve login UX and add secure, enumeration-resistant password recovery through email and founder-assisted channels.

**Architecture:** Add a focused password-recovery service in the platform backend that owns hashed one-time credentials, expiry, attempt limits, delivery status, and session revocation after reset. Expose a small public recovery contract and founder-only queue endpoints, then connect them to a dedicated login/recovery UI and the existing founder People workspace.

**Tech Stack:** Bun, TypeScript, React 19, SQLite, native `fetch`, Resend HTTP API, existing `PlatformStore`/`Auth`/workspace patterns.

**Spec:** User-approved Login v2 design in the implementation conversation on 2026-10-24.

## Global Constraints

- Do not commit unless the user explicitly asks; this plan therefore contains verification steps but no commit steps.
- Server owns user, role, tenant, credential validity, password hashing, and session revocation; browser input never grants authority.
- Recovery request responses must not reveal whether an account exists.
- Password recovery credentials must never be stored in plaintext; store only salted hashes.
- Recovery credentials expire after 15 minutes and permit at most 5 failed verification attempts.
- A successful reset revokes every existing session for that user.
- New password policy is 12–128 characters, matching the existing frontend maximum.
- Do not add a new npm dependency; use native `fetch` for Resend.
- Preserve the existing rate-limit, CSRF, origin validation, HttpOnly/SameSite cookie, role, and tenancy controls.
- Use Bahasa Melayu for user-facing copy and code comments; comments must explain why, not what.
- Respect lanes: backend owns `server/**`, `api/**`, `shared/**`; frontend owns `src/**`; tests own `tests/**` and `scripts/**`.

## Review Focus

- Unknown email and known email must return the same public request response and status.
- Missing or unconfigured Resend credentials must not fabricate a sent email or block founder-assisted recovery.
- An expired, consumed, superseded, or wrong recovery credential must never change a password.
- Reset must revoke sessions on every device, including the session that initiated an authenticated password change.
- A founder must be able to recover a user without seeing or storing that user's current password.

---

### Task 1: Recovery Contract and Failing Acceptance Tests

**Files:**
- Create: `shared/password-recovery-contracts.ts`
- Create: `tests/platform/login-recovery-api.test.ts`

**Interfaces:**
- Produces: `PasswordRecoveryRequestView`, `PasswordRecoveryIssueCodeView`, `PasswordRecoveryRequestResponse`, `PasswordRecoveryResetResponse`, and shared status/email-delivery unions used by backend and frontend.

- [ ] **Step 1: Define the shared contract**

Create explicit TypeScript unions for request status (`pending`, `code_issued`, `completed`, `expired`) and email delivery status (`sent`, `failed`, `unavailable`). Public responses contain only `accepted` and a fixed message. Founder list items contain request ID, masked email, user display name, status, timestamps, email delivery status, and no credential hash.

- [ ] **Step 2: Write failing backend acceptance tests**

Cover: unknown/known email parity; email mailer receives a reset URL containing a credential; mailer failure is recorded honestly; founder-only request listing; founder-issued code is returned once and accepted by reset; wrong code increments attempts; sixth attempt is rejected; expired credential is rejected; consumed credential is rejected; reset revokes all sessions; customer/staff cannot list or issue founder recovery credentials; reset rejects unknown fields, short password, oversized password, and malformed credentials.

- [ ] **Step 3: Run the focused test and confirm RED**

Run: `bun test --isolate --timeout 15000 tests/platform/login-recovery-api.test.ts`

Expected: FAIL because recovery routes and shared types do not exist.

---

### Task 2: Backend Recovery Service and HTTP Contract

**Files:**
- Create: `server/platform/passwordRecovery.ts`
- Modify: `server/platform/auth.ts`
- Modify: `server/platform/app.ts`
- Modify: `server/index.ts`
- Modify: `api/platform.ts`
- Test: `tests/platform/login-recovery-api.test.ts`

**Interfaces:**
- Consumes: shared contracts from Task 1 and optional `PasswordRecoveryMailer` injected through `PlatformAppOptions`.
- Produces: `PasswordRecoveryMailer`, `createResendPasswordRecoveryMailer`, `PasswordRecoveryService`, and these routes:

  - `POST /auth/password-recovery/request` body `{ email }` → `202 { accepted: true, message: string }` for every valid input.
  - `POST /auth/password-recovery/reset` body `{ credential, newPassword }` → `200 { reset: true }` after a valid reset.
  - `GET /auth/password-recovery/requests` founder-only → request views.
  - `POST /auth/password-recovery/requests/:requestId/issue-code` founder-only → `{ credential, expiresAt }`, shown once.

- [ ] **Step 1: Implement the service with hashed credentials**

Create records in the existing canonical `records` store under kind `password_recovery_requests`. Each record owns user ID, masked email, status, expiry, attempt count, separate optional email/founder credential salts and hashes, email delivery status, timestamps, and revision. Use `crypto.randomBytes`/`randomInt`, `timingSafeEqual`, and the existing `PlatformStore` atomic operations.

- [ ] **Step 2: Implement password replacement in `Auth`**

Add an internal server-only method that validates the new password, derives a fresh scrypt hash with a new salt, updates `users.password_hash`, marks all sessions for that user revoked, and writes an audit event. It must not accept an actor/role from browser input.

- [ ] **Step 3: Implement the Resend mailer with native fetch**

Create `createResendPasswordRecoveryMailer({ apiKey, from, fetcher })`. POST to `https://api.resend.com/emails` with `Authorization: Bearer <apiKey>`, `Content-Type: application/json`, and `{ from, to: [email], subject, html }`. Require an HTTP success response and provider `id`; return a typed failure otherwise. Use a 10-second timeout and never log the API key or reset credential.

- [ ] **Step 4: Add public and founder routes**

Mount public recovery routes before authenticated-session resolution. Normalize the request email for rate-bucket identity without storing raw email in a bucket name. Apply dedicated global and per-account request/reset limits. Founder routes must call `auth.founder(actor)` and normal authenticated POST CSRF enforcement.

- [ ] **Step 5: Wire environment configuration**

Local server: construct the mailer only when both `RESEND_API_KEY` and `RESEND_FROM_EMAIL` exist. Production handler: construct it from the same environment variables. Missing configuration yields `unavailable`, not `sent`; founder-assisted recovery remains available.

- [ ] **Step 6: Run focused tests and confirm GREEN**

Run: `bun test --isolate --timeout 15000 tests/platform/login-recovery-api.test.ts`

Expected: PASS with zero failures.

- [ ] **Step 7: Run related security tests**

Run: `bun test --isolate --timeout 15000 tests/platform/host-security.test.ts tests/platform/backend-security.test.ts tests/platform/google-platform.test.ts`

Expected: PASS with zero failures.

---

### Task 3: Login UX and Public Recovery UI

**Files:**
- Create: `src/features/platform/LoginForm.tsx`
- Modify: `src/features/platform/AppRouter.tsx`
- Modify: `src/features/platform/routes.ts`
- Modify: `src/features/platform/platform-shell.css`
- Create: `tests/frontend/login-recovery-ui.test.ts`

**Interfaces:**
- Consumes: recovery routes and shared public/founder response shapes from Tasks 1–2.
- Produces: login, signup, recovery-request, and recovery-reset modes; public route `/reset-password`.

- [ ] **Step 1: Write failing frontend tests**

Assert route resolution for `/reset-password`; recovery request mode posts only email; reset mode requires credential, new password, and confirmation; mismatched confirmation is rejected locally; password visibility toggle changes input type and has an accessible label; Caps Lock produces an accessible warning; success messages never claim an email was sent unless the server explicitly confirms delivery.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `bun test --isolate --timeout 15000 tests/frontend/login-recovery-ui.test.ts`

Expected: FAIL because the recovery UI and route do not exist.

- [ ] **Step 3: Extract and improve the login form**

Move the existing login/signup/bootstrap form into `LoginForm.tsx` without changing current auth behavior. Add a show/hide password control, Caps Lock warning, explicit 12–128 character guidance, inline validation, busy-state protection, and a "Lupa kata laluan?" action.

- [ ] **Step 4: Implement request and reset modes**

Recovery request posts `{ email }` and always displays the fixed anti-enumeration message. Reset accepts a credential from the query string for email links or a founder-issued code, validates a 12–128 character new password and matching confirmation, posts `{ credential, newPassword }`, then returns the user to login with a success message.

- [ ] **Step 5: Register the public reset route**

Add `/reset-password` to `publicPaths`. Render the reset form for that route and preserve the existing login/signup/setup flows. Ensure the credential is removed from the visible URL after capture using `history.replaceState`.

- [ ] **Step 6: Style accessible states**

Use native buttons and inputs, visible focus, `aria-pressed` for password visibility, `aria-describedby` for hints/errors, and responsive layouts that work in light and dark themes.

- [ ] **Step 7: Run focused tests and confirm GREEN**

Run: `bun test --isolate --timeout 15000 tests/frontend/login-recovery-ui.test.ts`

Expected: PASS with zero failures.

---

### Task 4: Founder Recovery Queue

**Files:**
- Modify: `src/features/workspaces/business.tsx`
- Modify: `src/features/platform/platform-shell.css` only if existing workspace primitives cannot express the queue
- Test: `tests/frontend/login-recovery-ui.test.ts`

**Interfaces:**
- Consumes: founder-only request list and issue-code routes from Task 2.
- Produces: pending recovery requests shown in the existing founder `People & access` workspace.

- [ ] **Step 1: Add failing queue tests**

Assert pending requests render masked email, status, email delivery status, and expiry; the issue-code action calls the founder endpoint; the raw code is displayed once with a clear copy action; completed requests cannot issue another code; non-founder roles do not render the queue.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `bun test --isolate --timeout 15000 tests/frontend/login-recovery-ui.test.ts`

Expected: FAIL because the founder queue is absent.

- [ ] **Step 3: Implement the queue**

Load `/auth/password-recovery/requests` in `People`, show pending requests in a dedicated panel, and call `/auth/password-recovery/requests/:id/issue-code` through the existing authenticated mutation pattern. Keep the issued credential only in component state and clear it when the panel refreshes or the request completes.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `bun test --isolate --timeout 15000 tests/frontend/login-recovery-ui.test.ts`

Expected: PASS with zero failures.

---

### Task 5: Integration and Acceptance Verification

**Files:**
- Modify only files directly required by failures found in the relevant lane.

**Interfaces:**
- Consumes: all Tasks 1–4.
- Produces: evidence that the approved Login v2 behavior works end to end without regressing existing login/Google/bootstrap flows.

- [ ] **Step 1: Run lint**

Run: `bun run lint`

Expected: exit 0.

- [ ] **Step 2: Run build**

Run: `bun run build`

Expected: exit 0.

- [ ] **Step 3: Run related platform and frontend suites**

Run: `bun test --isolate --timeout 15000 tests/platform/login-recovery-api.test.ts tests/platform/host-security.test.ts tests/platform/backend-security.test.ts tests/platform/google-platform.test.ts tests/frontend/login-recovery-ui.test.ts`

Expected: zero failures.

- [ ] **Step 4: Run the full platform suite**

Run: `bun run test:platform`

Expected: zero failures.

- [ ] **Step 5: Run boundary and acceptance gates**

Run: `bun scripts/maintenance/check-boundaries.ts`

Expected: exit 0.

Run: `bun scripts/maintenance/verify-acceptance.ts`

Expected: exit 0, or an explicit unrelated pre-existing blocker with exact evidence.

- [ ] **Step 6: Inspect final worktree**

Run: `git status --short && git diff --stat && git diff --check`

Expected: only intended Login v2 files are changed; no whitespace errors; no commit created.
