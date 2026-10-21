/**
 * ArtCraft Fasa 1 — Recon live untuk parity audit emons.de.
 *
 * Kepingan: hanya permukaan yang P1 landing ABANGCOLEK perlukan
 * (chapters/kategori, hotspot+dialog, fokus, media/motion, CTA, input model).
 * Setiap claim mesti ada Evidence ID yang menunjuk ke output sebenar.
 *
 * Output: var/log/rea-emons-20261021/ (JSON + PNG)
 * Usage: bun scripts/rea-emons-recon.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = 'var/log/rea-emons-20261021';
const TARGET = process.env.REA_TARGET ?? 'https://www.emons.de/en';
mkdirSync(OUT, { recursive: true });

const evidence: Record<string, unknown> = {};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const consoleErrors: string[] = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(2500);

// Buang banner cookie supaya recon mencapai hero sebenar (emons.de sendiri
// letakkan banner cookie dalam laluan fokus — lihat E-004).
const acceptCookies = page.getByRole('button', { name: /accept all cookies/i });
await acceptCookies.click({ timeout: 6000 }).catch(() => undefined);
await page.waitForTimeout(1200);
evidence['E-000 cookie banner'] = {
  accepted: await acceptCookies.isVisible().catch(() => false),
  firstFocusable: await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    return active ? active.tagName.toLowerCase() : 'none';
  }),
};

evidence['E-001 page'] = {
  url: page.url(),
  title: await page.title(),
  h1: await page.locator('h1').allInnerTexts(),
  h2: await page.locator('h2').allInnerTexts(),
  sections: await page.locator('section').evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: (node as HTMLElement).id || null,
      ariaLabel: node.getAttribute('aria-label'),
      className: (node as HTMLElement).className || null,
    })),
  ),
  landmarks: await page
    .getByRole('region')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')))
    .catch(() => []),
};

const controlNames = await page
  .locator('a, button')
  .evaluateAll((nodes) =>
    nodes.slice(0, 120).map((node) => ({
      tag: node.tagName.toLowerCase(),
      text: (node.textContent ?? '').trim().slice(0, 80),
      ariaLabel: node.getAttribute('aria-label'),
      href: node.getAttribute('href'),
      role: node.getAttribute('role'),
      ariaCurrent: node.getAttribute('aria-current'),
      ariaExpanded: node.getAttribute('aria-expanded'),
    })),
  );
evidence['E-002 controls'] = controlNames;

evidence['E-003 media'] = {
  videos: await page.locator('video').evaluateAll((nodes) =>
    nodes.map((node) => ({
      src: (node as HTMLVideoElement).currentSrc || node.getAttribute('src'),
      poster: node.getAttribute('poster'),
      autoplay: node.hasAttribute('autoplay'),
      muted: node.hasAttribute('muted'),
      loop: node.hasAttribute('loop'),
      playsInline: node.hasAttribute('playsinline'),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    })),
  ),
  images: await page.locator('img').evaluateAll((nodes) =>
    nodes.slice(0, 20).map((node) => ({
      src: node.getAttribute('src'),
      alt: node.getAttribute('alt'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height'),
    })),
  ),
};

// Dialog / focus behaviour
const dialogTriggers = page.locator('button[aria-haspopup="dialog"], [role="button"][aria-expanded]');
const triggerCount = await dialogTriggers.count();
let dialogEvidence: Record<string, unknown> = { triggerCount };
if (triggerCount > 0) {
  const first = dialogTriggers.first();
  dialogEvidence['trigger'] = {
    text: (await first.innerText()).trim().slice(0, 80),
    ariaLabel: await first.getAttribute('aria-label'),
    ariaExpanded: await first.getAttribute('aria-expanded'),
  };
  await first.click({ timeout: 8000 }).catch((error: unknown) => { dialogEvidence['clickError'] = String(error).slice(0, 200); });
  await page.waitForTimeout(400);
  const dialog = page.getByRole('dialog');
  dialogEvidence['dialog'] = {
    count: await dialog.count(),
    name: (await dialog.count()) ? await dialog.first().getAttribute('aria-label') : null,
    ariaLabelledBy: (await dialog.count()) ? await dialog.first().getAttribute('aria-labelledby') : null,
    text: (await dialog.count()) ? (await dialog.first().innerText()).slice(0, 400) : null,
  };
  // Focus order inside the dialog
  const focusOrder: string[] = [];
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press('Tab');
    focusOrder.push(
      await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active) return 'none';
        return `${active.tagName.toLowerCase()}:${(active.getAttribute('aria-label') ?? active.textContent ?? '').trim().slice(0, 40)}`;
      }),
    );
  }
  dialogEvidence['focusOrder'] = focusOrder;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  dialogEvidence['afterEscape'] = {
    dialogVisible: await dialog.isVisible().catch(() => false),
    focus: await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return active ? `${active.tagName.toLowerCase()}:${(active.getAttribute('aria-label') ?? active.textContent ?? '').trim().slice(0, 40)}` : 'none';
    }),
  };
}
evidence['E-004 dialog'] = dialogEvidence;

// E-009 — struktur lima bahagian hero emons.de (E-001 menunjukkan id
// hero_first..hero_fifth): tajuk, kawalan dan media bagi setiap bahagian.
evidence['E-009 hero sections'] = await page.evaluate(() => {
  const ids = ['hero_first', 'hero_second', 'hero_third', 'hero_fourth', 'hero_fifth'];
  return ids.map((id) => {
    const section = document.getElementById(id);
    if (!section) return { id, present: false };
    return {
      id,
      present: true,
      headings: Array.from(section.querySelectorAll('h1,h2,h3')).map((node) => (node.textContent ?? '').trim().slice(0, 90)),
      controls: Array.from(section.querySelectorAll('a,button')).map((node) => ({
        tag: node.tagName.toLowerCase(),
        text: (node.textContent ?? '').trim().slice(0, 60),
        ariaLabel: node.getAttribute('aria-label'),
        href: node.getAttribute('href'),
      })),
      media: Array.from(section.querySelectorAll('video,img')).map((node) => node.tagName.toLowerCase() + ':' + (node.getAttribute('src') ?? '').slice(0, 70)),
    };
  });
});

// Input model: does wheel advance a chapter (scroll hijack) or scroll the page?
const beforeScroll = await page.evaluate(() => window.scrollY);
await page.mouse.move(720, 450);
await page.mouse.wheel(0, 900);
await page.waitForTimeout(900);
const afterScroll = await page.evaluate(() => window.scrollY);
evidence['E-005 wheel'] = {
  beforeScroll,
  afterScroll,
  scrollDelta: afterScroll - beforeScroll,
  bodyOverflow: await page.evaluate(() => getComputedStyle(document.body).overflow),
  documentHeight: await page.evaluate(() => document.documentElement.scrollHeight),
  viewport: await page.evaluate(() => window.innerHeight),
};

// Skip link / focus release
evidence['E-006 skip'] = {
  skipLinks: await page.locator('a[href^="#"]').evaluateAll((nodes) =>
    nodes.map((node) => ({ href: node.getAttribute('href'), text: (node.textContent ?? '').trim().slice(0, 60) })),
  ),
};

// Mobile behaviour
const mobile = await browser.newContext({ viewport: { width: 320, height: 760 }, isMobile: true, hasTouch: true });
const mobilePage = await mobile.newPage();
await mobilePage.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await mobilePage.waitForTimeout(2000);
evidence['E-007 mobile'] = {
  scrollWidth: await mobilePage.evaluate(() => document.documentElement.scrollWidth),
  innerWidth: await mobilePage.evaluate(() => window.innerWidth),
  overflow: await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  h1: await mobilePage.locator('h1').allInnerTexts(),
  videoCount: await mobilePage.locator('video').count(),
  reducedMotion: await mobilePage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
};
await mobilePage.screenshot({ path: `${OUT}/emons-mobile-320.png`, fullPage: false });
await mobile.close();

await page.screenshot({ path: `${OUT}/emons-desktop-1440.png`, fullPage: false });
evidence['E-008 console'] = { errors: consoleErrors.slice(0, 20), count: consoleErrors.length };

writeFileSync(`${OUT}/emons-recon.json`, JSON.stringify(evidence, null, 2));
console.log(`RECON written to ${OUT}/emons-recon.json`);
await browser.close();
