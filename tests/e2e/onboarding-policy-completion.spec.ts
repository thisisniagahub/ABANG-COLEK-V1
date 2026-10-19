import { expect, test } from '@playwright/test';
import { login } from './fixtures';

test('onboarding requires manual policy approval and loads canonical settings version', async ({ page }) => {
  await login(page, 'founder');
  await page.goto('/founder/inventory');
  await expect(page.getByText(/Versi tetapan semasa:/)).toBeVisible();
  await expect(page.getByLabel('Luluskan lokasi ini')).not.toBeChecked();
  await expect(page.getByLabel('Luluskan terma pengedar ini')).not.toBeChecked();
  await expect(page.getByLabel('Alamat lokasi')).toHaveValue('');
  await expect(page.getByLabel('Waktu operasi lokasi')).toHaveValue('');
  await expect(page.getByLabel('Tarikh pengesahan lokasi')).toHaveValue('');
  await expect(page.getByLabel('Peraturan pemulangan pengedar')).toHaveValue('');
});
