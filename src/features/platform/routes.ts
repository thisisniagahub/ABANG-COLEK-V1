import type { NavigationItem, RouteMatch, WorkspaceRole } from '../../../shared/platform-contracts';

const publicPaths = new Set(['/', '/products', '/locations', '/become-dealer', '/help', '/login', '/setup', '/reset-password']);
const menus = {
  customer: [['overview', 'Ruang saya'], ['shop', 'Beli produk'], ['orders', 'Pesanan saya'], ['cases', 'Bantuan & aduan'], ['business', 'Ejen & stokis']],
  staff: [['overview', 'Hari ini'], ['tasks', 'Tugasan saya'], ['orders', 'Pesanan assigned'], ['cases', 'Khidmat pelanggan'], ['qc', 'Kawalan kualiti'], ['shifts', 'Shift & handoff'], ['documents', 'Dokumen'], ['knowledge', 'Panduan kerja']],
  founder: [['overview', 'Ringkasan bisnes'], ['orders', 'Pesanan & pembayaran'], ['inventory', 'Stok & batch'], ['cases', 'Quality & JEV'], ['jev', 'JEV review & evaluation'], ['dealers', 'Ejen & stokis'], ['copilot', 'AI Copilot'], ['marketing', 'Marketing studio'], ['automations', 'Automations'], ['plugins', 'Plugins / Connectors'], ['tasks', 'Tugasan'], ['documents', 'Dokumen'], ['knowledge', 'SOP & pengetahuan'], ['calendar', 'Kalendar operasi'], ['finance', 'Kewangan'], ['qc', 'Kawalan kualiti'], ['shifts', 'Shift & day-close'], ['reports', 'Laporan'], ['people', 'Pasukan & akses'], ['settings', 'Tetapan'], ['legacy', 'Workspace integrasi']],
  developer: [['overview', 'System overview'], ['health', 'Runtime & integrasi'], ['jobs', 'Automation jobs'], ['jev','JEV evaluation'], ['reports', 'Diagnostics'], ['settings', 'Readiness settings']],
} as const satisfies Record<WorkspaceRole, readonly (readonly [string, string])[]>;

export interface WorkspaceNavigationGroup {
  id: string;
  label: string;
  items: readonly NavigationItem[];
}

type NavigationGroups = {
  [Role in WorkspaceRole]: readonly {
    id: string;
    label: string;
    sections: readonly (typeof menus)[Role][number][0][];
  }[];
};

const navigationGroups: NavigationGroups = {
  founder: [
    { id: 'today', label: 'Hari ini', sections: ['overview', 'tasks', 'calendar'] },
    { id: 'sales', label: 'Jualan & rangkaian', sections: ['orders', 'dealers'] },
    { id: 'operations', label: 'Operasi & kewangan', sections: ['inventory', 'shifts', 'finance'] },
    { id: 'quality', label: 'Pelanggan & kualiti', sections: ['cases', 'jev', 'qc'] },
    { id: 'growth', label: 'Pertumbuhan', sections: ['copilot', 'marketing', 'automations', 'plugins'] },
    { id: 'knowledge', label: 'Ilmu & laporan', sections: ['documents', 'knowledge', 'reports'] },
    { id: 'administration', label: 'Pentadbiran', sections: ['people', 'settings', 'legacy'] },
  ],
  customer: [
    { id: 'personal', label: 'Ruang saya', sections: ['overview'] },
    { id: 'orders', label: 'Pesanan & rangkaian', sections: ['shop', 'orders', 'business'] },
    { id: 'support', label: 'Bantuan', sections: ['cases'] },
  ],
  staff: [
    { id: 'today', label: 'Hari ini', sections: ['overview', 'tasks', 'shifts'] },
    { id: 'operations', label: 'Operasi & pelanggan', sections: ['orders', 'cases', 'qc'] },
    { id: 'knowledge', label: 'Ilmu kerja', sections: ['documents', 'knowledge'] },
  ],
  developer: [
    { id: 'overview', label: 'System overview', sections: ['overview'] },
    { id: 'runtime', label: 'Runtime & automasi', sections: ['health', 'jobs'] },
    { id: 'evaluation', label: 'Evaluation & diagnostics', sections: ['jev', 'reports'] },
    { id: 'administration', label: 'Pentadbiran', sections: ['settings'] },
  ],
};
const entitySections = new Set(['orders', 'cases', 'tasks', 'documents', 'business', 'marketing','dealers','inventory','qc','shifts','finance']);

export function resolveRoute(pathname: string): RouteMatch {
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.length > 500) return { kind: 'not_found', path: pathname };
  let path: string;
  try { path = decodeURIComponent(pathname).replace(/\/$/, '') || '/'; }
  catch { return { kind: 'not_found', path: pathname }; }
  if (publicPaths.has(path)) return { kind: 'public', path };
  const parts = path.slice(1).split('/');
  if (parts.some(part => !/^[a-zA-Z0-9_-]+$/.test(part))) return { kind: 'not_found', path };
  if (parts[0] === 'products' && parts.length === 2) return { kind: 'public', path, entityId: parts[1] };
  if (parts[0] === 'kedai' && parts.length === 2 && parts[1]) return { kind: 'public', path, entityId: parts[1] };
  if (parts[0] === 'flows' && parts.length === 2) return { kind: 'flow', path, entityId: parts[1] };
  const role = parts[0] as WorkspaceRole;
  if (!Object.hasOwn(menus, role) || parts.length > 3) return { kind: 'not_found', path };
  const section = parts[1] ?? 'overview';
  if (!menus[role].some(item => item[0] === section) || (parts.length === 3 && !entitySections.has(section))) return { kind: 'not_found', path };
  return { kind: 'workspace', path: parts.length === 1 ? `/${role}/overview` : path, role, entityId: parts[2] };
}

export const sectionCapabilities: Record<WorkspaceRole, Record<string, string>> = {
  customer: {
    overview: 'own.read',
    shop: 'own.read',
    orders: 'own.read',
    cases: 'own.read',
    business: 'own.read',
  },
  staff: {
    overview: 'assigned.read',
    tasks: 'assigned.read',
    orders: 'assigned.read',
    cases: 'assigned.read',
    qc: 'assigned.read',
    shifts: 'assigned.read',
    documents: 'assigned.read',
    knowledge: 'assigned.read',
  },
  developer: {
    overview: 'runtime.read',
    health: 'runtime.read',
    jobs: 'runtime.read',
    jev: 'runtime.read',
    reports: 'runtime.read',
    settings: 'runtime.read',
  },
  founder: {
    overview: 'business.read',
    orders: 'business.read',
    inventory: 'business.read',
    cases: 'business.read',
    jev: 'business.read',
    dealers: 'business.read',
    copilot: 'business.read',
    marketing: 'business.read',
    automations: 'business.write',
    plugins: 'business.write',
    tasks: 'business.read',
    documents: 'business.read',
    knowledge: 'business.read',
    calendar: 'business.read',
    finance: 'business.read',
    qc: 'business.read',
    shifts: 'business.read',
    reports: 'business.read',
    people: 'people.grant',
    settings: 'business.write',
    legacy: 'business.read',
  },
};

export function canAccessSection(role: WorkspaceRole, section: string, capabilities: readonly string[]): boolean {
  const req = sectionCapabilities[role]?.[section];
  if (!req) return false;
  return capabilities.includes(req) || capabilities.includes(`workspace.${role}`);
}

export function getNavigation(role: WorkspaceRole): NavigationItem[] {
  return menus[role].map(([id, label]) => ({
    id,
    label,
    path: `/${role}/${id}`,
    requiredCapability: sectionCapabilities[role]?.[id] ?? `workspace.${role}`,
  }));
}

export function getNavigationGroups(role: WorkspaceRole): WorkspaceNavigationGroup[] {
  const items = getNavigation(role);
  return navigationGroups[role].map(group => ({
    id: group.id,
    label: group.label,
    items: items.filter(item => group.sections.some(section => section === item.id)),
  }));
}

export function canOpenWorkspace(role: WorkspaceRole, roles: WorkspaceRole[]): boolean { return roles.includes(role); }
