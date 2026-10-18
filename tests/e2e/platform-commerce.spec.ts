import { test, expect } from '@playwright/test';
import { fixture, login } from './fixtures';

test('customer guided order creates one persisted receipt and remains private', async ({ page, browser }) => {
  await login(page, 'customer');
  await page.goto('/flows/order');
  await page.getByRole('button', { name: 'Mulakan flow' }).click();
  await page.getByRole('combobox', { name: 'Produk', exact: true }).selectOption(fixture().productId);
  await page.getByLabel('Kuantiti', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Teruskan', exact: true }).click();
  await page.getByLabel('Pickup', { exact: true }).check();
  await page.getByRole('button', { name: 'Teruskan', exact: true }).click();
  await page.getByLabel('Maklumat penerimaan', { exact: true }).fill('QA customer pickup contact');
  await page.getByRole('button', { name: 'Teruskan', exact: true }).click();
  await page.getByRole('button', { name: 'Sahkan semakan server', exact: true }).click();
  await page.getByRole('button', { name: 'Hantar permintaan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Permintaan telah diterima.' })).toBeVisible();
  const orderId = await page.locator('.flow-receipt strong').innerText();
  const own = await page.request.get(`/api/platform/orders/${orderId}`);
  expect(own.ok()).toBe(true);
  expect((await own.json()).data).toMatchObject({ amountSen: 2800, paymentState: 'pending', fulfilmentStatus: 'requested' });
  await page.reload();
  await page.goto('/customer/orders');
  await expect(page.getByRole('button', { name: new RegExp(orderId) })).toBeVisible();
  const outsider = await browser.newContext();
  const denied = await outsider.request.get(`${fixture().origin}/api/platform/orders/${orderId}`);
  expect(denied.status()).toBe(401);
  await outsider.close();
});

// These checks use catalogue responses only; orders remain canonical server operations.
test('stale cart can be reduced and removed after catalogue stock or packs change', async ({ page }) => {
  await login(page, 'customer');
  await page.route('**/api/platform/catalogue', async route => route.fulfill({ json: { ok: true, data: [{ id: 'stale', name: 'Stale cart QA', description: '', priceSen: 100, currency: 'MYR', packSize: 2, availableQuantity: 4, publishedVersion: 1 }] } }));
  await page.goto('/customer/shop?cart='+encodeURIComponent(JSON.stringify([{productId:'stale',quantity:10}])));
  await page.getByRole('button',{name:'Kurangkan Stale cart QA'}).click();
  await expect(page.locator('.xp-cart-row')).toContainText('4');
  await expect(page.getByRole('button',{name:'Teruskan ke checkout'})).toBeEnabled();
  await page.getByRole('button',{name:'Buang Stale cart QA'}).click();
  await expect(page.getByText('Troli masih kosong')).toBeVisible();
  await page.goto('/customer/shop?cart='+encodeURIComponent(JSON.stringify([{productId:'stale',quantity:3}])));
  await page.getByRole('button',{name:'Kurangkan Stale cart QA'}).click();
  await expect(page.getByRole('button',{name:'Teruskan ke checkout'})).toBeEnabled();
});

test('catalogue pagination preserves current flow selection and quantity', async ({ page }) => {
  await login(page, 'customer');
  const product = (id: string) => ({id,name:id,description:'',priceSen:100,currency:'MYR',packSize:1,availableQuantity:100,publishedVersion:1});
  await page.route('**/api/platform/catalogue*', async route => {
    const second = new URL(route.request().url()).searchParams.has('offset');
    await route.fulfill({ headers: second ? {} : {'X-Next-Offset':'2'}, json:{ok:true,data:second?[product('page-two')]:[product('first'),product('selected')]}});
  });
  await page.goto('/flows/order');
  await page.getByRole('button',{name:'Mulakan flow'}).click();
  await page.getByRole('combobox',{name:'Produk',exact:true}).selectOption('selected');
  await page.getByLabel('Kuantiti',{exact:true}).fill('4');
  await page.getByRole('button',{name:'Muat lagi produk'}).click();
  await expect(page.getByRole('combobox',{name:'Produk',exact:true}).locator('option[value="page-two"]')).toHaveCount(1);
  await expect(page.getByRole('combobox',{name:'Produk',exact:true})).toHaveValue('selected');
  await expect(page.getByLabel('Kuantiti',{exact:true})).toHaveValue('4');
});

test('switching flow modes preserves unsaved product, quantity and contact details', async ({ page }) => {
  await login(page, 'customer');
  await page.goto('/flows/order');
  await page.getByRole('button',{name:'Mulakan flow'}).click();
  await page.getByRole('combobox',{name:'Produk',exact:true}).selectOption(fixture().productId);
  await page.getByLabel('Kuantiti',{exact:true}).fill('4');
  await page.getByRole('button',{name:'Paparan form',exact:true}).click();
  await expect(page.getByLabel('Kuantiti',{exact:true})).toHaveValue('4');
  await page.getByLabel('Kuantiti',{exact:true}).fill('3');
  await page.getByLabel('Maklumat penerimaan',{exact:true}).fill('Unsaved pickup contact');
  await page.getByLabel('Pickup atau penghantaran',{exact:true}).selectOption('pickup');
  await page.getByRole('button',{name:'Paparan perbualan',exact:true}).click();
  await expect(page.getByLabel('Kuantiti',{exact:true})).toHaveValue('3');
  await page.getByRole('button',{name:'Paparan form',exact:true}).click();
  await expect(page.getByLabel('Maklumat penerimaan',{exact:true})).toHaveValue('Unsaved pickup contact');
  await page.getByRole('button',{name:'Paparan perbualan',exact:true}).click();
  await page.getByRole('button',{name:'Teruskan',exact:true}).click();
  await expect(page.getByLabel('Pickup',{exact:true})).toBeChecked();
  await page.getByRole('button',{name:'Teruskan',exact:true}).click();
  await expect(page.getByLabel('Maklumat penerimaan',{exact:true})).toHaveValue('Unsaved pickup contact');
});

test('expired quote is replaced before order submission', async ({ page }) => {
  await login(page, 'customer');
  await page.route('**/api/platform/flow-sessions/*/review', async route => {
    const response=await route.fetch();const body=await response.json();
    if(body.ok&&body.data.reviewQuote)body.data.reviewQuote.expiresAt='2000-01-01T00:00:00.000Z';
    await route.fulfill({response,json:body});
  });
  await page.goto('/flows/order');
  await page.getByRole('button',{name:'Mulakan flow'}).click();
  await page.getByRole('combobox',{name:'Produk',exact:true}).selectOption(fixture().productId);
  await page.getByLabel('Kuantiti',{exact:true}).fill('1');
  await page.getByRole('button',{name:'Teruskan',exact:true}).click();
  await page.getByLabel('Pickup',{exact:true}).check();
  await page.getByRole('button',{name:'Teruskan',exact:true}).click();
  await page.getByLabel('Maklumat penerimaan',{exact:true}).fill('Quote refresh QA');
  await page.getByRole('button',{name:'Teruskan',exact:true}).click();
  await page.getByRole('button',{name:'Sahkan semakan server',exact:true}).click();
  await expect(page.getByRole('button',{name:'Semak harga semula',exact:true})).toBeVisible();
  const replacement=page.waitForResponse(response=>response.url().includes('/flow-sessions/')&&response.url().endsWith('/form'));
  await page.getByRole('button',{name:'Semak harga semula',exact:true}).click();
  expect((await replacement).ok()).toBe(true);
  await expect(page.getByRole('button',{name:'Hantar permintaan',exact:true})).toBeVisible();
});
