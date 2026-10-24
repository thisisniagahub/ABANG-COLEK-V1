import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';
import type { WorkspaceRole } from '../../shared/platform-contracts';

export function fixture() { return JSON.parse(readFileSync(resolve('var/run/e2e-fixture.json'), 'utf8')) as Record<WorkspaceRole, { email: string; password: string; userId: string }> & { productId: string; origin: string }; }

/**
 * Sesi log masuk mengikut peranan, dikongsi merentas fail spec.
 *
 * SEBAB (akar 29 kegagalan e2e dalam audit 21 Okt 2026): platform
 * mengehadkan 6 percubaan log masuk / 60 saat bagi setiap akaun. Setiap spec
 * memanggil `login()` sekali, jadi 30 spec bermakna 30 percubaan pada 4 akaun
 * yang sama; selepas 6 percubaan akaun dikunci (429) dan SEMUA spec selepas itu
 * gagal pada langkah pertama, bukan pada assertenya.
 *
 * Fix: SATU percubaan HTTP bagi setiap peranan, dan cookie sesi yang sah
 * (dari Set-Cookie server) disimpan ke disk supaya worker yang dibina semula
 * tidak perlu log masuk semula. Cookie tetap datang daripada server.
 */
const sessionDir = resolve('var/run');

function sessionPath(role: WorkspaceRole): string {
  return resolve(sessionDir, `e2e-session-${role}.txt`);
}

function readSession(role: WorkspaceRole, userId: string): string | null {
  try {
    const raw = readFileSync(sessionPath(role), 'utf8').trim();
    if (!raw) return null;
    const [cachedUserId, token] = raw.split(':');
    if (cachedUserId === userId && token) return token;
    return null;
  } catch {
    return null;
  }
}

function writeSession(role: WorkspaceRole, userId: string, value: string): void {
  try {
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(sessionPath(role), `${userId}:${value}`);
  } catch {
    // Cache hanya optimum; jika tidak boleh ditulis, suite masih
    // berfungsi — ia cuma akan log masuk semula.
  }
}

export async function login(page: Page, role: WorkspaceRole) {
  const account = fixture()[role];
  await page.context().clearCookies();
  const cached = readSession(role, account.userId);
  let usable = false;
  if (cached) {
    await page.context().addCookies([
      { name: 'platform_session', value: cached, url: fixture().origin, httpOnly: true, sameSite: 'Strict' },
    ]);
    const probe = await page.request.get('/api/platform/session', { headers: { Origin: fixture().origin } });
    usable = probe.ok();
  }
  if (!usable) {
    await page.context().clearCookies();
    const response = await page.request.post('/api/platform/auth/login', { headers: { Origin: fixture().origin }, data: { email: account.email, password: account.password } });
    expect(response.ok()).toBe(true);
    const setCookie = response.headers()['set-cookie'] ?? '';
    const match = /platform_session=([^;]+)/.exec(setCookie);
    expect(match).not.toBeNull();
    writeSession(role, account.userId, match![1]);
  }
  await page.goto(`/${role}/overview`);
  await expect(page.getByLabel('Navigasi ruang kerja')).toBeVisible();
}
