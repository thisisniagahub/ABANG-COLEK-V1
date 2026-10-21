import { expect, test } from '@playwright/test';

const hero = '.ac-world-journey';
// Media fault injection must reach page.route rather than the production cache.
test.use({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });

test('six chapters navigate, map film correctly and release to catalogue', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(hero)).toHaveAttribute('data-scene', 'dunia');
  await expect(page.locator('.ac-world-chapters button')).toHaveCount(6);
  const video = page.locator('video.ac-world-film');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThanOrEqual(35.7);
  await page.getByRole('button', { name: 'Bab 2: Pilih buah', exact: true }).click();
  await expect(page.locator(hero)).toHaveAttribute('data-scene', 'pilih');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(6.9);
  for (const [index, label, scene] of [[3, 'Rasa & reaksi', 'rasa'], [4, 'Founder', 'founder'], [5, 'Dapatkan', 'jerux'], [6, 'Pesanan', 'pesanan']] as const) {
    await expect(page.locator(hero)).toHaveAttribute('data-phase', 'idle');
    await page.getByRole('button', { name: `Bab ${index}: ${label}`, exact: true }).click();
    await expect(page.locator(hero)).toHaveAttribute('data-scene', scene);
  }
  await page.getByRole('link', { name: 'Terus ke katalog', exact: true }).click();
  await expect(page.locator('#catalogue')).toBeInViewport();
  await expect(page.locator('#catalogue')).toBeFocused();
});

test('failed film and active still retain usable world fallback and dialog', async ({ page }) => {
  await page.route('**/assets/world/film.mp4', route => route.abort());
  await page.route('**/assets/world/scene-6-hero.webp', route => route.abort());
  await page.goto('/');
  const activeImage = page.locator('.ac-world-scene.is-active');
  await expect(activeImage).not.toHaveAttribute('src', '/assets/world/scene-6-hero.webp');
  await expect.poll(() => activeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  // Label hotspot Bab 01 = "Terokai dunia" (src/features/landing/WorldHotspot.tsx,
  // butiran[0]; reka bentuk: docs/design/landing-page.md §Bab 01).
  await page.getByRole('button', { name: 'Terokai dunia', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Terokai dunia', exact: true })).toBeFocused();
});

test('autoplay denial falls back to a still', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
  });
  await page.goto('/');
  await expect(page.locator('video.ac-world-film')).toHaveCount(0);
  await expect.poll(() => page.locator('.ac-world-scene.is-active').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
});

for (const width of [1440, 390, 320]) {
  test(`reduced motion exposes all chapters without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 640 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator(hero)).toHaveAttribute('data-motion', 'static');
    await expect(page.locator('.ac-world-copy[aria-hidden="false"]')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
