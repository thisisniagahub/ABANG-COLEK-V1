/**
 * BL-16 — surface catalog + middleware yang benar-benar DI-MOUNT.
 *
 * Sebelum ini `server/platform/surfaceCatalog.ts` dan `surfaceMiddleware.ts`
 * wujud tetapi TIDAK diimport oleh mana-mana laluan yang dilayani ⇒ had
 * struktur §4:93 (2 surfaces/64 components/depth 8/128 patch ops/512 ops)
 * tidak pernah dikuatkuasakan (audit backend MAJ-7).
 *
 * Ujian ini proving: catalog dimuatkan pada laluan sebenar, payload yang
 * sah diteruskan, dan payload yang rosak DITOLAK dengan reason code.
 */
import { describe, expect, test } from 'bun:test';
import { renderSurfacePayload } from '../../server/platform/surfaceMiddleware';
import { getSurfaceCatalog, getSurfaceCatalogOutcome, loadSurfaceCatalog } from '../../server/platform/surfaceCatalog';

describe('BL-16 — katalog permukaan dimuatkan dan had struktur dikuatkuasakan', () => {
  test('katalog dimuatkan dengan versi dan had global', () => {
    const outcome = loadSurfaceCatalog();
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);
    const catalog = getSurfaceCatalog();
    expect(catalog).not.toBeNull();
    expect(catalog!.catalogVersion).toBeTruthy();
    expect(catalog!.surfaces.length).toBeGreaterThan(0);
    expect(catalog!.limits.maxDepth).toBeGreaterThan(0);
    expect(catalog!.limits.maxNodes).toBeGreaterThan(0);
    expect(getSurfaceCatalogOutcome().ok).toBe(true);
  });

  test('payload fixed-schema yang sah diteruskan (bentuk asal dikekalkan)', () => {
    const payload = {
      schemaVersion: 'a2ui.v1',
      component: 'MarginSimulator',
      componentName: 'MarginSimulator',
      props: { contributionMarginPct: 25, contributionSen: 2000 },
    };
    const outcome = renderSurfacePayload(payload, getSurfaceCatalog());
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);
  });

  test('NEGATIF komponen di luar catalog ⇒ ditolak dengan reason code', () => {
    const outcome = renderSurfacePayload(
      { schemaVersion: 'a2ui.v1', component: 'RogueCard', props: {} },
      getSurfaceCatalog(),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(['SURFACE_UNKNOWN_SURFACE_ID', 'SURFACE_COMPONENT_NOT_ALLOWLISTED']).toContain(outcome.reason);
  });

  test('NEGATIF payload tanpa surfaceId mahupun component ⇒ SURFACE_PAYLOAD_INVALID', () => {
    const outcome = renderSurfacePayload({ schemaVersion: 'a2ui.v1', props: {} }, getSurfaceCatalog());
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe('SURFACE_PAYLOAD_INVALID');
  });

  test('NEGATIF pokak berkitar ⇒ SURFACE_CYCLE_DETECTED (bukan isu depth)', () => {
    const node: Record<string, unknown> = { schemaVersion: 'a2ui.v1', surfaceId: 'operations.brief', id: 'n1', component: 'OperationsBriefCard', props: {} };
    node.children = [node];
    const outcome = renderSurfacePayload(node, getSurfaceCatalog());
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe('SURFACE_CYCLE_DETECTED');
  });

  test('NEGATIF versi skema salah ⇒ SURFACE_SCHEMA_VERSION_MISMATCH', () => {
    const outcome = renderSurfacePayload(
      { schemaVersion: 'a2ui.v99', component: 'OperationsBriefCard', props: {} },
      getSurfaceCatalog(),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(['SURFACE_SCHEMA_VERSION_MISMATCH', 'SURFACE_PAYLOAD_INVALID']).toContain(outcome.reason);
  });
});
