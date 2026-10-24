import { describe, expect, test } from 'bun:test';
import { harness } from './test-harness-helper';

describe('PC-01..03 Password Recovery & Anti-Enumeration Flow', () => {
  test('request recovery is public, anti-enumerating, founder can issue one-time code, and reset revokes active sessions', async () => {
    const { call, user } = harness('pw-recovery-bootstrap-token');
    const founder = await user('founder-pw', true);
    const customer = await user('customer-pw', false);

    // 1. Public request for unknown email returns 202 with anti-enumeration response and stores no record
    const unknownReq = await call('/auth/password-recovery/request', {
      email: 'nobody@example.test',
    });
    expect(unknownReq.status).toBe(202);
    expect(unknownReq.body.ok).toBe(true);
    expect(unknownReq.body.data.accepted).toBe(true);

    // 2. Public request for registered customer returns identical 202 response
    const knownReq = await call('/auth/password-recovery/request', {
      email: 'customer-pw@example.test',
    });
    expect(knownReq.status).toBe(202);
    expect(knownReq.body.ok).toBe(true);
    expect(knownReq.body.data).toEqual(unknownReq.body.data);

    // 3. Non-founder cannot list recovery requests
    const forbiddenList = await call('/auth/password-recovery/requests', undefined, customer);
    expect(forbiddenList.status).toBe(403);

    // 4. Founder lists recovery requests — only the real user's request is queued
    const listRes = await call('/auth/password-recovery/requests', undefined, founder);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    const item = listRes.body.data[0];
    expect(item.status).toBe('pending');
    expect(item.maskedEmail).toBe('cu***@example.test');

    // 5. Founder issues one-time recovery code
    const issueRes = await call(
      `/auth/password-recovery/requests/${item.requestId}/issue-code`,
      { expectedRevision: item.revision },
      founder
    );
    expect(issueRes.status).toBe(200);
    expect(typeof issueRes.body.data.credential).toBe('string');
    const issuedCode = issueRes.body.data.credential as string;

    // 6. Password reset with short password fails validation
    const shortReset = await call('/auth/password-recovery/reset', {
      credential: issuedCode,
      newPassword: 'short',
    });
    expect(shortReset.status).toBe(400);
    expect(shortReset.body.code).toBe('PASSWORD_LENGTH');

    // 7. Password reset with valid credential succeeds without requiring session/CSRF
    const newPassword = 'my brand new strong password 456';
    const resetRes = await call('/auth/password-recovery/reset', {
      credential: issuedCode,
      newPassword,
    });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.data).toEqual({ reset: true });

    // 8. Replaying the same recovery credential fails
    const replayRes = await call('/auth/password-recovery/reset', {
      credential: issuedCode,
      newPassword: 'another strong password 789',
    });
    expect(replayRes.status).toBe(400);
    expect(replayRes.body.code).toBe('INVALID_CREDENTIAL');

    // 9. Customer's previous active session is immediately revoked
    const oldSessionCheck = await call('/session', undefined, customer);
    expect(oldSessionCheck.status).toBe(401);

    // 10. Customer can log in with the new password, and old password fails
    const oldLogin = await call('/auth/login', {
      email: 'customer-pw@example.test',
      password: 'a strong local password 123',
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await call('/auth/login', {
      email: 'customer-pw@example.test',
      password: newPassword,
    });
    expect(newLogin.status).toBe(200);
  });
});
