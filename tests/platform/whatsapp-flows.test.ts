import { describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { createPlatformApp } from '../../server/platform/app';
import { createDefaultWhatsAppTransport, LocalWhatsAppTransport } from '../../server/automation/runtimeTransports';
import { unlinkSync } from 'node:fs';

function cleanup(dbPath: string) {
  for (const ext of ['', '-wal', '-shm']) {
    try { unlinkSync(dbPath + ext); } catch { /* ignore */ }
  }
}

async function createTestContext(testId: string, withTransport = true) {
  const testDb = `var/lib/qa/whatsapp-flows-${testId}.sqlite`;
  cleanup(testDb);

  const transport = withTransport ? createDefaultWhatsAppTransport() : undefined;

  const app = createPlatformApp({
    databasePath: testDb,
    bootstrapToken: 'test-bootstrap-token-wa',
    origin: 'http://localhost:3000',
    whatsappTransport: transport,
  });

  // Bootstrap founder
  const bootRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify({
      email: `founder-wa-${testId}@test.local`,
      password: 'password123456',
      name: 'Founder WhatsApp Test',
      token: 'test-bootstrap-token-wa',
    }),
  }));
  expect(bootRes.status).toBe(200);
  const bootData = await bootRes.json() as { data: { user: { id: string }; csrfToken: string } };
  const founderCookie = bootRes.headers.get('set-cookie')!;
  const founderCsrf = bootData.data.csrfToken;

  return { app, founderCookie, founderCsrf, testDb, transport };
}

describe('E04: Native WhatsApp & Web-Guided Flows Parity', () => {
  test('without transport injection, health reports unavailable and execution fails closed', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('no-transport', false);

    const healthRes = await app.fetch(new Request('http://localhost:3000/api/platform/health', {
      headers: { 'Cookie': founderCookie },
    }));
    expect(healthRes.status).toBe(200);
    const health = await healthRes.json() as { data: { component: string; status: string; reasonCode: string }[] };
    const waComponent = health.data.find(c => c.component === 'native_whatsapp');
    expect(waComponent?.status).toBe('unavailable');
    expect(waComponent?.reasonCode).toBe('FEATURE_DISABLED');

    // Outbound send fails closed
    const sendRes = await app.fetch(new Request('http://localhost:3000/api/platform/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-send-closed',
      },
      body: JSON.stringify({
        to: '+60123456789',
        templateName: 'order_confirmation',
        parameters: { orderId: 'ord-123' },
      }),
    }));
    expect(sendRes.status).toBe(409);

    cleanup(testDb);
  });

  test('verifies Meta webhook hub challenge verification', async () => {
    const { app, testDb, transport } = await createTestContext('hub-verify', true);
    const secret = (transport as LocalWhatsAppTransport).webhookSecret;

    // Valid challenge
    const validUrl = `http://localhost:3000/api/platform/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(secret)}&hub.challenge=test_challenge_12345`;
    const validRes = await app.fetch(new Request(validUrl));
    expect(validRes.status).toBe(200);
    expect(await validRes.text()).toBe('test_challenge_12345');

    // Invalid token rejected
    const badUrl = `http://localhost:3000/api/platform/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong-secret&hub.challenge=test_challenge_12345`;
    const badRes = await app.fetch(new Request(badUrl));
    expect(badRes.status).toBe(403);

    cleanup(testDb);
  });

  test('processes signed Meta webhook, handles status updates, and prevents replay attacks', async () => {
    const { app, testDb, transport } = await createTestContext('webhook-process', true);
    const secret = (transport as LocalWhatsAppTransport).webhookSecret;

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '60123456789', phone_number_id: 'local-phone-60123456789' },
                statuses: [
                  {
                    id: 'wamid.HBgLMjYwMTAwMDEwMDIx',
                    status: 'delivered',
                    timestamp: '1728000000',
                    recipient_id: '60123456789',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const rawPayload = JSON.stringify(payload);
    const signature = 'sha256=' + createHmac('sha256', secret).update(rawPayload).digest('hex');

    // 1. Unsigned request fails with 401
    const unsignedRes = await app.fetch(new Request('http://localhost:3000/api/platform/whatsapp/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: rawPayload,
    }));
    expect(unsignedRes.status).toBe(401);

    // 2. Valid signature succeeds
    const signedRes = await app.fetch(new Request('http://localhost:3000/api/platform/whatsapp/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'x-hub-signature-256': signature,
      },
      body: rawPayload,
    }));
    expect(signedRes.status).toBe(200);
    const signedData = (await signedRes.json() as any).data;
    expect(signedData.processed).toBe(1);
    expect(signedData.duplicate).toBe(0);

    // 3. Replay of same payload is detected as duplicate
    const replayRes = await app.fetch(new Request('http://localhost:3000/api/platform/whatsapp/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'x-hub-signature-256': signature,
      },
      body: rawPayload,
    }));
    expect(replayRes.status).toBe(200);
    const replayData = (await replayRes.json() as any).data;
    expect(replayData.processed).toBe(0);
    expect(replayData.duplicate).toBe(1);

    cleanup(testDb);
  });

  test('validates recipient E.164 phone format, approved template, and masks customer data in receipts', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('send-validation', true);

    // 1. Invalid phone format rejected
    const badPhoneRes = await app.fetch(new Request('http://localhost:3000/api/platform/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-bad-phone',
      },
      body: JSON.stringify({
        to: '0123456789', // Missing international E.164 + prefix
        templateName: 'order_confirmation',
        parameters: { orderId: 'ord-001' },
      }),
    }));
    expect(badPhoneRes.status).toBe(400);
    expect((await badPhoneRes.json() as any).code).toBe('INVALID_PHONE_NUMBER');

    // 2. Unapproved template rejected
    const badTemplateRes = await app.fetch(new Request('http://localhost:3000/api/platform/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-bad-template',
      },
      body: JSON.stringify({
        to: '+60123456789',
        templateName: 'unapproved_marketing_blast',
        parameters: {},
      }),
    }));
    expect(badTemplateRes.status).toBe(400);
    expect((await badTemplateRes.json() as any).code).toBe('TEMPLATE_NOT_APPROVED');

    // 3. Approved template with E.164 phone succeeds and masks recipient
    const sendRes = await app.fetch(new Request('http://localhost:3000/api/platform/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-send-ok-001',
      },
      body: JSON.stringify({
        to: '+60123456789',
        templateName: 'order_confirmation',
        parameters: { orderId: 'ord-001' },
      }),
    }));
    expect(sendRes.status).toBe(200);
    const receipt = (await sendRes.json() as any).data;
    expect(receipt.status).toBe('sent');
    expect(receipt.maskedRecipient).toBe('+601*****789');
    expect(receipt.recipientHash).toBeDefined();
    // Raw phone number is NOT in the receipt
    expect(receipt.to).toBeUndefined();

    // 4. Idempotent replay returns same receipt
    const replayRes = await app.fetch(new Request('http://localhost:3000/api/platform/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-send-ok-001',
      },
      body: JSON.stringify({
        to: '+60123456789',
        templateName: 'order_confirmation',
        parameters: { orderId: 'ord-001' },
      }),
    }));
    expect(replayRes.status).toBe(200);
    expect((await replayRes.json() as any).data.id).toBe(receipt.id);

    cleanup(testDb);
  });

  test('web-guided flows provide full parity for all 5 canonical business intents', async () => {
    const { app, testDb } = await createTestContext('flow-parity', true);

    const flowsRes = await app.fetch(new Request('http://localhost:3000/api/platform/flows'));
    expect(flowsRes.status).toBe(200);
    const flows = (await flowsRes.json() as any).data;

    const intents = flows.map((f: any) => f.intent);
    expect(intents).toContain('order');
    expect(intents).toContain('complaint');
    expect(intents).toContain('dealer_application');
    expect(intents).toContain('restock');
    expect(intents).toContain('stock_receipt');

    for (const flow of flows) {
      expect(flow.nodes.some((n: any) => n.kind === 'review')).toBe(true);
      expect(flow.nodes.some((n: any) => n.kind === 'receipt')).toBe(true);
      expect(flow.status).toBe('published');
    }

    cleanup(testDb);
  });
});

 test('webhook verifies the original signed bytes without browser Origin', async () => {
   const { app, testDb, transport } = await createTestContext('raw-webhook');
   try {
     const raw = '{ "entry": [] }\n';
     const signature = 'sha256=' + createHmac('sha256', transport!.webhookSecret).update(raw).digest('hex');
     const response = await app.fetch(new Request('http://localhost:3010/api/platform/whatsapp/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature }, body: raw }));
     expect(response.status).toBe(200);
     const invalid = await app.fetch(new Request('http://localhost:3010/api/platform/whatsapp/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'wrong' }, body: raw }));
     expect(invalid.status).toBe(403);
   } finally { app.close(); cleanup(testDb); }
 });
