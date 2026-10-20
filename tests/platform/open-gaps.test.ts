/**
 * OPEN ACCEPTANCE GAPS — the ten requirements that are NOT yet closed.
 *
 * Every item below is a `test.todo`, NOT a failing test. The suite stays
 * green: a todo is an explicit, searchable statement of an unmet contract.
 * A todo becomes a real test the moment the implementation lands — the body
 * states the EXACT assertion that must then hold, so the conversion is
 * mechanical and cannot quietly drift.
 *
 * Each body names:
 *   1. the requirement ID,
 *   2. the exact assertion(s) that must hold once the gap is closed,
 *   3. a one-line reason the gap is still open today.
 *
 * Referenced implementation sites (as of this revision):
 *   - ADV-07  server/agents/tools/capabilities/commerce.ts:290-317 (preview_refund)
 *   - PAY-01  server/ (no HMAC / X-Signature anywhere)
 *   - PAY-02  server/platform/commerce.ts:299 (PAYMENT_NOT_VERIFIED)
 *   - SEC-01  server/platform/commerce.ts:194 (creation-time expiry)
 *   - AI-03   src/features/copilot/agui/aguiRunState.ts:9, src/features/copilot/tool-rendering/ToolStatusView.ts:9
 *   - OFF-01  server/platform/ (no entity-revision conflict on reconnect)
 *   - DR-01   server/platform/backupScheduler.ts:7 (DEFAULT_RPO_HOURS), :281 (checkRpoStatus)
 *   - PD-01   server/platform/ (publish blocked outright; no dispatch path to gate)
 *   - EXT-07  tests/platform/ext-07-attachments.test.ts:94-95
 *   - CPK-10  tests/platform/copilot-adk-bridge.test.ts:45-70, agents/google-adk/tests/test_agents.py
 */

import { describe, test } from 'bun:test';

describe('OPEN ACCEPTANCE GAPS — requirements that are not yet closed', () => {
  test.todo('ADV-07 — preview_refund carries a preview reference, the order revision and an expiry', () => {
    // Requirement: ADV-07 (pre-baca refund / preflight refund).
    // Must hold once closed:
    //   expect(typeof result.preview.referenceHash).toBe('string');
    //   expect(result.preview.referenceHash.length).toBeGreaterThan(0);
    //   expect(result.preview.orderRevision).toBeGreaterThan(0);
    //   expect(Date.parse(result.preview.expiresAt)).toBeGreaterThan(Date.now());
    // Reason: the preview_refund result in
    // server/agents/tools/capabilities/commerce.ts:290-317 carries no preview
    // reference hash, no order revision and no expiry, so a preview cannot be
    // bound to the entity state it was computed from.
  });

  test.todo('PAY-01 — a payment callback route exists and rejects an invalid or missing HMAC X-Signature', () => {
    // Requirement: PAY-01 (callback pembayaran disahkan).
    // Must hold once closed:
    //   expect(paymentCallbackRoute).toBeDefined();
    //   const res = await request(callbackUrl, { headers: { 'X-Signature': 'sha256=deadbeef' } });
    //   expect(res.status).toBe(401);
    //   expect(order.paymentState).not.toBe('verified');
    //   const resNoSig = await request(callbackUrl, {});
    //   expect(resNoSig.status).toBe(401);
    // Reason: there is NO payment callback route and NO HMAC / `X-Signature`
    // verification anywhere under server/, so a forged callback would be
    // accepted if the route existed.
  });

  test.todo('PAY-02 — a success-redirect route exists and never marks a payment verified', () => {
    // Requirement: PAY-02 (redirect selepas pembayaran).
    // Must hold once closed:
    //   expect(successRedirectRoute).toBeDefined();
    //   const res = await request(successRedirectUrl);
    //   expect(res.status).toBe(200);
    //   expect(order.paymentState).not.toBe('verified');
    //   expect(order.paymentState).toBe('awaiting_verification');
    // Reason: the redirect route does not exist, and the only place that can
    // flip a payment to `verified` is server/platform/commerce.ts:299, which
    // fails with PAYMENT_NOT_VERIFIED — a client-side redirect must never be
    // able to satisfy that check on its own.
  });

  test.todo('SEC-01 — the tracking token is revocable and its expiry runs from HANDOVER, not creation', () => {
    // Requirement: SEC-01 (token penjejakan).
    // Must hold once closed:
    //   revokeTrackingToken(token);
    //   expect(await resolveTracking(token)).toMatchObject({ ok: false, code: 'TRACKING_TOKEN_REVOKED' });
    //   expect(Date.parse(order.trackingTokenExpiresAt))
    //     .toBeGreaterThanOrEqual(Date.parse(order.handoverAt) + 14 * 24 * 3600_000);
    // Reason: server/platform/commerce.ts:194 stamps
    // `trackingTokenExpiresAt` from CREATION time, so a token issued days
    // before the handover expires during the handover window, and no
    // revocation path exists at all.
  });

  test.todo('AI-03 — an indeterminate executor outcome becomes server status unknown_outcome', () => {
    // Requirement: AI-03 (HITL / hasil tidak pasti).
    // Must hold once closed:
    //   const status = await runExecutorWithIndeterminateOutcome();
    //   expect(status).toBe('unknown_outcome');
    //   expect(status).not.toBe('succeeded');
    //   expect(execution.approvalStatus).not.toBe('approved');
    // Reason: the frontend already renders `unknown_outcome`
    // (src/features/copilot/agui/aguiRunState.ts:9 and
    // src/features/copilot/tool-rendering/ToolStatusView.ts:9) but the server
    // has no such state, so an indeterminate run can only be reported as
    // `succeeded` or silently rolled back to `approved`.
  });

  test.todo('OFF-01 — reconnect revalidates and the server compares entity revision before a retry', () => {
    // Requirement: OFF-01 (offline / reconnect).
    // Must hold once closed:
    //   const res = await reconnectWithStaleRevision(entityRevisionBeforeEdit);
    //   expect(res.status).toBe(409);
    //   expect(res.code).toBe('ENTITY_REVISION_CONFLICT');
    //   expect(retryAttempts).toBe(0); // no blind retry happened
    //   expect(revalidated).toBe(true);
    // Reason: reconnect does not revalidate the client state, and the server
    // compares no entity revision before the retry, so a stale offline
    // mutation is replayed blindly over a newer entity.
  });

  test.todo('DR-01 — restore completes inside a measured RTO and RPO compliance is asserted', () => {
    // Requirement: DR-01 (pemulihan disasters).
    // Must hold once closed:
    //   const rpo = scheduler.checkRpoStatus(asOf);
    //   expect(rpo.compliant).toBe(true);
    //   expect(rpo.hoursSinceSnapshot).toBeLessThanOrEqual(DEFAULT_RPO_HOURS);
    //   const started = Date.now();
    //   await restoreFromSnapshot(snapshotId);
    //   const rtoMs = Date.now() - started;
    //   expect(rtoMs).toBeLessThanOrEqual(MAX_MEASURED_RTO_MS);
    // Reason: server/platform/backupScheduler.ts exposes `DEFAULT_RPO_HOURS`
    // (:7) and `checkRpoStatus` (:281) but tests/** contains ZERO references
    // to RPO, so no RTO/RPO claim is measured anywhere.
  });

  test.todo('PD-01 — an opted-out user receives nothing at dispatch time', () => {
    // Requirement: PD-01 (pilihan pengguna / pematuhan).
    // Must hold once closed:
    //   await dispatchToOptedOutUser();
    //   expect(deliveredMessages).toEqual([]);
    //   expect(dispatchAttempts).toBe(0);
    //   expect(auditEntries.some((e) => e.action === 'DISPATCH_SUPPRESSED')).toBe(true);
    // Reason: publish is blocked outright today, so there is no dispatch path
    // at which an opt-out could be honoured — the gate does not exist yet.
  });

  test.todo('EXT-07 — the copilot route forwards attachmentIds and vision inference is available', () => {
    // Requirement: EXT-07 (lampiran / vision).
    // Must hold once closed:
    //   expect(toolCall.attachmentIds).toEqual(['att-1']);
    //   expect(reference.vision.available).toBe(true);
    //   expect(reference.vision.reasonCode).toBeUndefined();
    // Reason: tests/platform/ext-07-attachments.test.ts:94-95 currently
    // asserts `vision.available === false` and
    // `QUALIFIED_VISION_MODEL_REQUIRED`; that assertion encodes the missing
    // feature and MUST BE INVERTED when the feature lands.
  });

  test.todo('CPK-10 — the ADK delegation transcript is produced by the Python agent, not replayed from a fixture', () => {
    // Requirement: CPK-10 (delegasi ADK).
    // Must hold once closed:
    //   const transcript = await runAdkDelegationThroughPythonAgent();
    //   expect(transcript).toContain('TOOL_CALL_START');
    //   expect(transcript).not.toBe(REAL_AGUI_TRANSCRIPT);
    //   // and agents/google-adk/tests/test_agents.py must assert the same
    //   // transcript, and must be executed by an npm script and a CI job.
    // Reason: tests/platform/copilot-adk-bridge.test.ts:45-70 replays a
    // constant `REAL_AGUI_TRANSCRIPT`, agents/google-adk/tests/test_agents.py
    // has no such test, and that Python suite is run by no npm script and no
    // CI job — the delegation is therefore never executed.
  });
});
