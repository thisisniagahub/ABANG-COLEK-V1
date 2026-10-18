import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures';

const founderGroups = ['Hari ini', 'Jualan & rangkaian', 'Operasi & kewangan', 'Pelanggan & kualiti', 'Pertumbuhan', 'Ilmu & laporan', 'Pentadbiran'];

async function openMobileNavigation(page: Page) {
  await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigasi ruang kerja', exact: true });
  await expect(drawer).toBeVisible();
  return drawer;
}

test('Founder navigation groups twenty destinations and marks the current parent on deep URLs', async ({ page }) => {
  await login(page, 'founder');
  const navigation = page.getByRole('navigation', { name: 'Menu Founder workspace', exact: true });
  for (const name of founderGroups) await expect(navigation.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(navigation.getByRole('link')).toHaveCount(20);
  await expect(navigation.getByRole('link', { name: 'Tetapan', exact: true })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Workspace integrasi', exact: true })).toBeVisible();
  await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute('href', '/founder/overview');
  await page.goto('/founder/orders/QA-navigation-missing');
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute('href', '/founder/orders');
  await navigation.getByRole('link', { name: 'JEV review & evaluation', exact: true }).click();
  await expect(page).toHaveURL(/\/founder\/jev$/);
  await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute('href', '/founder/jev');
  await page.goto('/founder');
  await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute('href', '/founder/overview');
});

test('mobile navigation isolates background, traps both Tab directions and restores focus on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'founder');
  const opener = page.getByRole('button', { name: 'Buka navigasi', exact: true });
  await expect(page.getByLabel('Navigasi ruang kerja')).toHaveAttribute('inert', '');
  const drawer = await openMobileNavigation(page);
  await expect(opener).toHaveAttribute('aria-controls', 'workspace-navigation');
  await expect(drawer).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('.platform-workspace-body')).toHaveAttribute('inert', '');
  const close = drawer.getByRole('button', { name: 'Tutup navigasi', exact: true });
  await expect(close).toBeFocused();
  await close.press('Shift+Tab');
  const brand = drawer.getByRole('link', { name: /ABANGCOLEK/ });
  await expect(brand).toBeFocused();
  await brand.press('Shift+Tab');
  const logout = drawer.getByRole('button', { name: 'Log keluar', exact: true });
  await expect(logout).toBeFocused();
  await logout.press('Tab');
  await expect(brand).toBeFocused();
  const controls = drawer.locator('a[href], button:not([disabled])');
  for (let index = 0; index < await controls.count() + 2; index++) {
    await page.keyboard.press('Tab');
    expect(await drawer.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Navigasi ruang kerja')).toHaveAttribute('inert', '');
  await expect(page.locator('.platform-workspace-body')).not.toHaveAttribute('inert', '');
  await expect(opener).toBeFocused();
});

test('mobile navigation closes from its close control, backdrop and selected destination', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await login(page, 'founder');
  const opener = page.getByRole('button', { name: 'Buka navigasi', exact: true });
  let drawer = await openMobileNavigation(page);
  await drawer.getByRole('button', { name: 'Tutup navigasi', exact: true }).click();
  await expect(opener).toBeFocused();
  await openMobileNavigation(page);
  await page.locator('.platform-scrim').click({ position: { x: 310, y: 350 } });
  await expect(opener).toBeFocused();
  drawer = await openMobileNavigation(page);
  await drawer.getByRole('link', { name: 'Stok & batch', exact: true }).click();
  await expect(page).toHaveURL(/\/founder\/inventory$/);
  await expect(page.getByLabel('Navigasi ruang kerja')).toHaveAttribute('inert', '');
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const theme of ['dark', 'light'] as const) {
  test(`${theme} mobile navigation has readable groups, 44px targets and retains bottom clearance`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('abangcolek-workspace-theme', value), theme);
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, 'founder');
    const drawer = await openMobileNavigation(page);
    const sizes = await drawer.locator('a[href],button').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      // Translated drawer coordinates can differ by a few floating-point ulps.
      return { width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100 };
    }));
    expect(sizes.every(size => size.width >= 44 && size.height >= 44)).toBe(true);
    for (const name of founderGroups) await expect(drawer.getByRole('heading', { name, exact: true })).toBeAttached();
    await drawer.getByRole('link', { name: 'Workspace integrasi', exact: true }).scrollIntoViewIfNeeded();
    await expect(drawer.getByRole('link', { name: 'Workspace integrasi', exact: true })).toBeInViewport();
    await page.keyboard.press('Escape');
    expect(await page.locator('#platform-main').evaluate(element => parseFloat(getComputedStyle(element).paddingBottom))).toBeGreaterThanOrEqual(140);
  });
}
