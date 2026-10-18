import { readFileSync } from 'node:fs';
import { expect, test } from 'bun:test';

const landingCss = readFileSync(new URL('../src/features/landing/landing.css', import.meta.url), 'utf8');
const worldCss = readFileSync(new URL('../src/features/landing/scroll-world.css', import.meta.url), 'utf8');
const worldSvg = readFileSync(new URL('../src/features/landing/AnimatedColekWorld.tsx', import.meta.url), 'utf8');

function luminance(hex: string): number {
  const channels = hex.replace('#', '').match(/.{2}/g)!.map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test('landing declares the approved logo-derived color tokens', () => {
  expect(landingCss).toContain('--ac-brand-gold: #f2ae12;');
  expect(landingCss).toContain('--ac-brand-red: #dc1d3f;');
  expect(landingCss).toContain('--ac-brand-ink: #000000;');
  expect(landingCss).toContain('--ac-brand-white: #fffffd;');
  expect(landingCss).toContain('--ac-brand-leaf: #488420;');
});

test('approved text and CTA color pairings meet WCAG AA contrast for normal text', () => {
  expect(contrast('#000000', '#f2ae12')).toBeGreaterThanOrEqual(4.5);
  expect(contrast('#fffffd', '#dc1d3f')).toBeGreaterThanOrEqual(4.5);
  expect(contrast('#fffffd', '#488420')).toBeGreaterThanOrEqual(4.5);
});

test('landing theme no longer uses the legacy lime and lavender accent literals', () => {
  const legacyAccents = /#(?:cfff5e|8c7dff|7361df|b8a9ff|b6a8ff|c6b3f5|6552ac|393540|615079|796d8c|aaa0bc)/i;
  for (const source of [landingCss, worldCss, worldSvg]) {
    expect(source).not.toMatch(legacyAccents);
  }
});
