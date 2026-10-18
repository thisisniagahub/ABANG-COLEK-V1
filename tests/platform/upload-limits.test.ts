import { expect, test } from 'bun:test';
import { MAX_EVIDENCE_FILE_BYTES, MAX_PLATFORM_REQUEST_BYTES, evidenceFileSizeAllowed } from '../../shared/upload-limits';

test('rejects files outside the advertised upload boundary before sending them', () => {
  expect(MAX_PLATFORM_REQUEST_BYTES).toBe(4_000_000);
  expect(MAX_EVIDENCE_FILE_BYTES).toBe(3_800_000);
  expect(evidenceFileSizeAllowed(MAX_EVIDENCE_FILE_BYTES)).toBe(true);
  for (const size of [0, -1, NaN, Infinity, 1.5, MAX_EVIDENCE_FILE_BYTES + 1, 5_000_000]) {
    expect(evidenceFileSizeAllowed(size)).toBe(false);
  }
});

test('the accepted file plus normal multipart metadata fits the production request cap', async () => {
  const form = new FormData();
  form.append('entityId', 'order-' + 'a'.repeat(120));
  form.append('file', new File([new Uint8Array(MAX_EVIDENCE_FILE_BYTES)], 'receipt.pdf', { type: 'application/pdf' }));
  const request = new Request('https://example.com/api/platform/evidence/upload', { method: 'POST', body: form });
  expect((await request.arrayBuffer()).byteLength).toBeLessThan(MAX_PLATFORM_REQUEST_BYTES);
});
