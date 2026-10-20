import { expect, test, type CDPSession, type Page } from '@playwright/test';

interface TouchReceipt {
  kind: string;
  trusted: boolean;
  cancelable: boolean;
  prevented: boolean;
  connected: boolean;
  scene: string | undefined;
}

async function idle(page: Page) {
  await expect(page.locator('.ac-world-journey')).toHaveAttribute('data-phase', 'idle');
}

async function swipe(page: Page, cdp: CDPSession, x: number, y: number, dx: number, dy: number) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (const fraction of [.2, .45, .7, 1]) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * fraction, y: y + dy * fraction, id: 1 }] });
    await page.evaluate(() => new Promise<void>(resolve => window.requestAnimationFrame(() => resolve())));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function observeTouches(page: Page) {
  await page.evaluate(() => {
    const receipt: TouchReceipt[] = [];
    (window as unknown as { emonsTouches: TouchReceipt[] }).emonsTouches = receipt;
    for (const kind of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
      // Bubble-phase observation records the hero's actual prevention after its handler runs.
      window.addEventListener(kind, event => receipt.push({ kind, trusted: event.isTrusted, cancelable: event.cancelable, prevented: event.defaultPrevented, connected: event.target instanceof Node && event.target.isConnected, scene: document.querySelector<HTMLElement>('.ac-world-journey')?.dataset.scene }), { passive: true });
    }
  });
}

test.describe('Emons native mobile touch experience', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });

  test('product-image swipe retains its target through transition and can reverse', async ({ page, context }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('.ac-world-journey')).toHaveAttribute('data-motion', 'scene');
    expect(await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))).toEqual({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Bab 6: Pesanan', exact: true }).tap();
    await idle(page);
    await observeTouches(page);
    const photo = await page.locator('.ac-world-product-photo img').elementHandle();
    expect(photo).not.toBeNull();
    expect(await photo!.evaluate(image => image === document.elementFromPoint(312, 500))).toBe(true);
    const cdp = await context.newCDPSession(page);
    try {
      await swipe(page, cdp, 312, 500, 0, 180);
      await expect(page.locator('.ac-world-journey')).toHaveAttribute('data-scene', 'jerux');
      await idle(page);
      const forward = await page.evaluate(() => ({ scrollY: window.scrollY, touches: (window as unknown as { emonsTouches: TouchReceipt[] }).emonsTouches }));
      const originalTargetConnected = await photo!.evaluate(image => image.isConnected);
      await testInfo.attach('native-forward-touch-receipt', { body: JSON.stringify({ originalTargetConnected, ...forward }), contentType: 'application/json' });
      await testInfo.attach('mobile-after-forward', { body: await page.screenshot(), contentType: 'image/png' });
      expect.soft(forward.scrollY).toBe(0);
      expect.soft(originalTargetConnected).toBe(true);
      expect.soft(forward.touches.filter(event => event.kind === 'touchmove')).toHaveLength(4);
      expect.soft(forward.touches.filter(event => event.kind === 'touchend')).toHaveLength(1);
      expect.soft(forward.touches.every(event => event.trusted && event.connected)).toBe(true);
      expect.soft(forward.touches.filter(event => event.kind === 'touchmove').every(event => event.prevented)).toBe(true);
      await expect(page.locator('.ac-world-product-photo')).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('.ac-world-product-photo')).toHaveCSS('opacity', '0');
      await expect(page.locator('.ac-world-product-photo')).toHaveCSS('pointer-events', 'none');
      await expect(page.locator('.ac-world-product-photo a')).toHaveAttribute('tabindex', '-1');
      await swipe(page, cdp, 312, 400, 0, -180);
      await expect(page.locator('.ac-world-journey')).toHaveAttribute('data-scene', 'pesanan');
      await idle(page);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      expect(await page.locator('.ac-world-product-photo img').evaluate((image, original) => image === original, photo)).toBe(true);
      await expect(page.locator('.ac-world-product-photo')).toHaveAttribute('aria-hidden', 'false');
      await expect(page.locator('.ac-world-product-photo')).toHaveCSS('opacity', '1');
      const touches = await page.evaluate(() => (window as unknown as { emonsTouches: TouchReceipt[] }).emonsTouches);
      expect(touches.filter(event => event.kind === 'touchend')).toHaveLength(2);
      expect(touches.filter(event => event.kind === 'touchmove')).toHaveLength(8);
      expect(touches.every(event => event.trusted && event.connected)).toBe(true);
      await testInfo.attach('native-forward-reverse-touch-receipt', { body: JSON.stringify(touches), contentType: 'application/json' });
    } finally {
      await cdp.detach();
    }
  });

  test('horizontal swipes preserve the chapter and the last chapter releases vertical scrolling', async ({ page, context }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('.ac-world-journey')).toHaveAttribute('data-motion', 'scene');
    await observeTouches(page);
    const cdp = await context.newCDPSession(page);
    try {
      await swipe(page, cdp, 100, 500, 120, -20);
      await expect(page.locator('.ac-world-journey')).toHaveAttribute('data-scene', 'dunia');
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await page.getByRole('button', { name: 'Bab 6: Pesanan', exact: true }).tap();
      await idle(page);
      await swipe(page, cdp, 312, 500, 0, -180);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
      await expect(page.locator('.ac-world-journey')).toHaveAttribute('data-scene', 'pesanan');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
      const touches = await page.evaluate(() => (window as unknown as { emonsTouches: TouchReceipt[] }).emonsTouches);
      expect(touches.some(event => event.kind === 'touchmove' && event.trusted)).toBe(true);
      await testInfo.attach('horizontal-and-native-exit-touch-receipt', { body: JSON.stringify(touches), contentType: 'application/json' });
    } finally {
      await cdp.detach();
    }
  });

  test('scene controls and photo attribution have usable tap targets without overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ac-world-journey')).toHaveAttribute('data-motion', 'scene');
    const buttons = await page.locator('.ac-world-journey button:visible').all();
    for (const button of buttons) {
      const bounds = await button.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: 'Bab 6: Pesanan', exact: true }).tap();
    await idle(page);
    const attribution = await page.locator('.ac-world-product-photo a').boundingBox();
    expect(attribution).not.toBeNull();
    expect(attribution!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
});

test.describe('Emons fresh short mobile viewport', () => {
  test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });

  test('static content permits trusted native touch scrolling without overflow', async ({ page, context }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('.ac-world-journey')).toHaveAttribute('data-motion', 'static');
    expect(await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))).toEqual({ width: 320, height: 640 });
    await expect(page.getByRole('button', { name: 'Paparan tanpa animasi', exact: true })).toBeDisabled();
    await expect(page.locator('.ac-world-animation')).toHaveCount(0);
    await observeTouches(page);
    const cdp = await context.newCDPSession(page);
    try {
      await swipe(page, cdp, 270, 500, 0, -180);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
      const touches = await page.evaluate(() => (window as unknown as { emonsTouches: TouchReceipt[] }).emonsTouches);
      expect(touches.some(event => event.kind === 'touchmove' && event.trusted)).toBe(true);
      expect(touches.every(event => !event.prevented)).toBe(true);
      await testInfo.attach('short-mobile-native-touch-receipt', { body: JSON.stringify(touches), contentType: 'application/json' });
    } finally {
      await cdp.detach();
    }
  });
});
