import { describe, expect, test } from 'bun:test';
import { canOpenWorkspace, getNavigation, getNavigationGroups as groupsFor, resolveRoute } from '../../src/features/platform/routes';

describe('grouped workspace navigation', () => {
  test('Founder can find all twenty-one destinations once across the seven work areas', () => {
    const groups = groupsFor('founder');
    expect(groups.map(group => group.label)).toEqual(['Hari ini', 'Jualan & rangkaian', 'Operasi & kewangan', 'Pelanggan & kualiti', 'Pertumbuhan', 'Ilmu & laporan', 'Pentadbiran']);
    const items = groups.flatMap(group => group.items);
    expect(items.map(item => item.id).sort()).toEqual(['overview', 'orders', 'inventory', 'cases', 'jev', 'dealers', 'copilot', 'marketing', 'automations', 'plugins', 'tasks', 'documents', 'knowledge', 'calendar', 'finance', 'qc', 'shifts', 'reports', 'people', 'settings', 'legacy'].sort());
    expect(new Set(items.map(item => item.path)).size).toBe(21);
    expect(new Set(groups.map(group => group.id)).size).toBe(7);
    expect(groups.every(group => group.items.length > 0)).toBe(true);
  });

  for (const role of ['founder', 'customer', 'staff', 'developer'] as const) {
    test(`${role} grouping preserves every existing URL, label and workspace capability`, () => {
      const grouped = groupsFor(role).flatMap(group => group.items);
      expect(grouped.length).toBe(getNavigation(role).length);
      expect(new Set(grouped.map(item => item.id)).size).toBe(grouped.length);
      expect([...grouped].sort((a, b) => a.id.localeCompare(b.id))).toEqual(getNavigation(role).sort((a, b) => a.id.localeCompare(b.id)));
      expect(grouped.every(item => item.path.startsWith(`/${role}/`) && typeof item.requiredCapability === 'string' && item.requiredCapability.length > 0)).toBe(true);
    });
  }
});


describe('workspace URL boundaries', () => {
  test('public content and authenticated flow URLs resolve independently', () => {
    expect(resolveRoute('/products').kind).toBe('public');
    expect(resolveRoute('/flows/buy').kind).toBe('flow');
  });
  test('deep order URL carries customer role and entity without mounting founder', () => {
    expect(resolveRoute('/customer/orders/ORD-123')).toMatchObject({ kind: 'workspace', role: 'customer', entityId: 'ORD-123' });
    expect(canOpenWorkspace('founder', ['customer'])).toBe(false);
  });
  test('unknown workspace sections and malformed encoded paths stay not-found', () => {
    expect(resolveRoute('/founder/arbitrary-secret').kind).toBe('not_found');
    expect(resolveRoute('/customer/orders/%zz').kind).toBe('not_found');
    expect(resolveRoute('//founder/overview').kind).toBe('not_found');
  });
  test('dealer space remains a scoped customer experience', () => {
    expect(resolveRoute('/customer/business').role).toBe('customer');
    expect(getNavigation('customer').some(item => item.path.startsWith('/founder'))).toBe(false);
    expect(getNavigation('staff').some(item => item.id === 'tasks')).toBe(true);
  });
  test('canonical membership permits only explicitly granted role', () => {
    expect(canOpenWorkspace('staff', ['customer', 'staff'])).toBe(true);
    expect(canOpenWorkspace('developer', ['founder'])).toBe(false);
  });
  test('prototype property names cannot become workspace roles', () => {
    expect(resolveRoute('/__proto__/overview').kind).toBe('not_found');
    expect(resolveRoute('/constructor/overview').kind).toBe('not_found');
  });
  test('published product URLs use a bounded public identifier', () => {
    expect(resolveRoute('/products/sku-a')).toMatchObject({ kind: 'public', entityId: 'sku-a' });
    expect(resolveRoute('/products/sku-a/extra').kind).toBe('not_found');
    expect(resolveRoute('/products/%2Ffounder').kind).toBe('not_found');
  });
});
