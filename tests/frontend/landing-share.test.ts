import { expect, test } from 'bun:test';
import { shareProductChoice, resolveShareProduct } from '../../src/features/landing/GengColekShare';

test('selection follows async catalogue and falls back when selected product disappears', () => {
  const first = { id: 'mangga', availableQuantity: 2 };
  const next = { id: 'nenas', availableQuantity: 1 };
  expect(resolveShareProduct(null, null)).toBeNull();
  expect(resolveShareProduct([first], null)).toBe(first);
  expect(resolveShareProduct([next], first.id)).toBe(next);
  expect(resolveShareProduct([{ ...first, availableQuantity: 0 }], first.id)).toBeNull();
});

test('cancelled native share stays neutral and never copies', async () => {
  let copies = 0;
  expect(await shareProductChoice({ text: 'Jerux', url: 'https://example.com' }, {
    share: async () => { throw new DOMException('cancel', 'AbortError'); },
    clipboard: { writeText: async () => { copies++; } },
  })).toBe('idle');
  expect(copies).toBe(0);
});

test('unsupported or failed native sharing falls back to clipboard', async () => {
  const copied: string[] = [];
  const clipboard = { writeText: async (text: string) => { copied.push(text); } };
  const payload = { text: 'Jerux', url: 'https://example.com' };
  expect(await shareProductChoice(payload, { clipboard })).toBe('copied');
  expect(await shareProductChoice(payload, { share: async () => { throw new Error('unsupported'); }, clipboard })).toBe('copied');
  expect(copied).toEqual(['Jerux https://example.com', 'Jerux https://example.com']);
});

test('clipboard unavailable or denied produces actionable error state', async () => {
  expect(await shareProductChoice({}, {})).toBe('error');
  expect(await shareProductChoice({}, { clipboard: { writeText: async () => { throw new Error('denied'); } } })).toBe('error');
});
