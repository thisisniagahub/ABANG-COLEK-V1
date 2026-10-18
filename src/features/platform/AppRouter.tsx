import { Component, Suspense, createContext, lazy, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronRight, CircleHelp, Flame, Menu, Moon, ShieldCheck, Sun } from 'lucide-react';
import type { SessionData, WorkspaceRole } from '../../../shared/platform-contracts';
import { useWorkspaceTheme } from '../theme/useWorkspaceTheme';
import '../theme/workspace-theme.css';
import { setJevHistoryScope } from '../../services/jevEngine';
import { api, jsonMutation, resetClientSession, resetPendingOperations } from './client';
import { canAccessSection, canOpenWorkspace, getNavigation, resolveRoute } from './routes';
import { purgeUserCache } from './offlineDrafts';

import './platform-shell.css';
import { WorkspaceNavigation } from './WorkspaceNavigation';
import BrandLogo from '../brand/BrandLogo';


const LandingPage = lazy(() => import('../landing/LandingPage'));
const Workspaces = lazy(() => import('../workspaces/WorkspaceContent').then(module => ({ default: module.WorkspaceContent })));
const FlowRenderer = lazy(() => import('../flows/FlowRenderer'));
const IntegrationWorkspace = lazy(() => import('./IntegrationWorkspace'));
const roles: Record<WorkspaceRole, string> = { customer: 'Customer', staff: 'Staff', founder: 'Founder', developer: 'Developer' };
const roleOrder: WorkspaceRole[] = ['founder', 'staff', 'developer', 'customer'];
type AuthContextValue = { session: SessionData | null; refreshSession: () => Promise<void> };
const AuthContext = createContext<AuthContextValue>({ session: null, refreshSession: async () => {} });
export const usePlatformSession = () => useContext(AuthContext);

export class PlatformErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="platform-recovery"><ShieldCheck size={32} /><h1>Ruang kerja tidak dapat dibuka</h1><p>Tiada tindakan ditandakan selesai. Muat semula dan semak rekod sebelum submit semula.</p><button onClick={() => window.location.reload()}>Muat semula</button></main> : this.props.children; }
}

function LoginForm({ setup, onSuccess, onNavigate }: { setup: boolean; onSuccess: () => Promise<void>; onNavigate: (path: string) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>(setup ? 'signup' : 'login');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      resetClientSession();
      await api<SessionData>(`/auth/${setup ? 'bootstrap' : mode}`, jsonMutation({ email: String(form.get('email') ?? '').trim(), password: String(form.get('password') ?? ''), ...(mode === 'signup' || setup ? { name: String(form.get('name') ?? '').trim() } : {}), ...(setup ? { token: String(form.get('token') ?? '').trim() } : {}) }));
      await onSuccess();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sesi tidak dapat dibuka.'); }
    finally { setBusy(false); }
  }
  return <main id="platform-main" className="platform-login">
    <div className="platform-login-story"><BrandLogo className="platform-login-logo" /><span className="platform-eyebrow"><Flame size={18} /> ABANGCOLEK PLATFORM</span><h2>Satu bisnes.<br />Satu tempat<br /><em>untuk bergerak.</em></h2><p>Pesanan, pasukan, stokis dan marketing. Sambung kerja dengan konteks yang sama.</p><div className="platform-role-chips">{roleOrder.map(role => <span key={role}><ShieldCheck size={14} />{roles[role]}</span>)}</div></div>
    <form onSubmit={submit} className="platform-auth-card"><button type="button" className="platform-text-button" onClick={() => onNavigate('/')}><ArrowLeft size={16} />Halaman utama</button><span className="platform-eyebrow">{setup ? 'OWNER PROVISIONING' : 'YOUR WORKSPACE'}</span><h1>{setup ? 'Sediakan founder pertama' : mode === 'login' ? 'Masuk ke ABANGCOLEK' : 'Buka akaun customer'}</h1><p>{setup ? 'Token sekali guna dikeluarkan pada host. Founder tidak ditentukan melalui email atau pilihan role.' : 'Akses workspace mengikut membership yang disahkan server.'}</p>
      {(mode === 'signup' || setup) && <label>Nama<input name="name" autoComplete="name" required maxLength={100} /></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={12} maxLength={128} required /></label>
      {mode === 'signup' && <p className="platform-field-hint">Gunakan sekurang-kurangnya 12 aksara. Akaun baharu hanya mendapat Customer Portal.</p>}
      {setup && <label>Token founder<input name="token" type="password" autoComplete="off" required maxLength={150} /><span className="platform-field-hint">Fail setempat: var/run/owner-bootstrap.token. Token tidak dihantar ke AI.</span></label>}
      {error && <p role="alert" className="platform-alert">{error}</p>}
      <button type="submit" className="platform-primary" disabled={busy}>{busy ? 'Mengesahkan sesi…' : setup ? 'Provision founder' : mode === 'login' ? 'Masuk workspace' : 'Daftar customer'}<ArrowUpRight size={18} /></button>
      {!setup && <p className="platform-field-hint">Google login belum tersedia untuk workspace ini. Gunakan email dan password.</p>}
      {!setup && <button type="button" className="platform-text-button" disabled>Teruskan dengan Google</button>}
      {!setup && <button type="button" className="platform-text-button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? 'Belum ada akaun? Daftar customer' : 'Sudah ada akaun? Masuk'}</button>}
    </form>
  </main>;
}

export default function AppRouter() {
  const { theme, toggleTheme } = useWorkspaceTheme();
  const [path, setPath] = useState(() => window.location.pathname);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true); const [sessionError, setSessionError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false); const [online, setOnline] = useState(navigator.onLine);
  const previousUser = useRef<string | null>(null);
  const sessionGeneration = useRef(0);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const route = resolveRoute(path);
  const navigate = useCallback((target: string) => { window.history.pushState({}, '', target); setPath(window.location.pathname); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const refreshSession = useCallback(async () => {
    const generation = ++sessionGeneration.current;
    try { const value = await api<SessionData>('/session'); if (generation === sessionGeneration.current) { setSession(value); setSessionError(''); } }
    catch (reason) { if (generation === sessionGeneration.current) { setSession(null); setSessionError(reason instanceof Error ? reason.message : 'Sesi tidak tersedia.'); } }
    finally { if (generation === sessionGeneration.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => { setMobile(query.matches); if (!query.matches) setMenuOpen(false); };
    query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { void refreshSession(); const pop = () => { setPath(window.location.pathname); setMenuOpen(false); }; window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop); }, [refreshSession]);
  useEffect(() => {
    const nextUser = session?.user.id ?? null;
    if (nextUser && previousUser.current && previousUser.current !== nextUser) { resetPendingOperations(); for (const storage of [localStorage, sessionStorage]) { try { purgeUserCache(storage, previousUser.current); } catch { /* Private persistence is optional; sessions still change. */ } } }
    // An expired session closes the workspace but preserves an opted-in draft for reauthentication.
    if (nextUser) previousUser.current = nextUser;
    setJevHistoryScope(nextUser, session?.memberships.find(value => value.status === 'active')?.workspaceId ?? null);
  }, [session]);
  useEffect(() => {
    const network = () => setOnline(navigator.onLine);
    window.addEventListener('online', network); window.addEventListener('offline', network);
    const focus = () => { void refreshSession(); };
    window.addEventListener('focus', focus);
    return () => { window.removeEventListener('online', network); window.removeEventListener('offline', network); window.removeEventListener('focus', focus); };
  }, [refreshSession]);
  const activeRoles = session?.memberships.filter(member => member.status === 'active').map(member => member.role) ?? [];
  const defaultRole = roleOrder.find(role => activeRoles.includes(role));
  async function logout() {
    try {
      await api('/auth/logout', jsonMutation({})); sessionGeneration.current++; resetClientSession();
      if(previousUser.current)for(const storage of [localStorage,sessionStorage]){try{purgeUserCache(storage,previousUser.current);}catch{/* Server logout remains authoritative. */}}
      previousUser.current=null;setSession(null);setJevHistoryScope(null);navigate('/login');
    }
    catch (reason) { setSessionError(reason instanceof Error ? reason.message : 'Log keluar belum disahkan.'); }
  }
  async function loginSuccess() {
    const generation = ++sessionGeneration.current;
    const fresh = await api<SessionData>('/session');
    if (generation !== sessionGeneration.current) return;
    setSession(fresh); setSessionError('');
    const granted = fresh.memberships.filter(member => member.status === 'active').map(member => member.role);
    const destination = resolveRoute(path);
    if ((destination.kind === 'workspace' && destination.role && granted.includes(destination.role)) || destination.kind === 'flow') return;
    const role = roleOrder.find(value => granted.includes(value)); navigate(role ? `/${role}/overview` : '/');
  }
  function publicView() {
    if (route.path === '/setup') return <LoginForm setup onSuccess={loginSuccess} onNavigate={navigate} />;
    if (route.path === '/login') return <LoginForm setup={false} onSuccess={loginSuccess} onNavigate={navigate} />;
    const publicViews: Record<string, 'products' | 'locations' | 'become-dealer' | 'help'> = { '/products': 'products', '/locations': 'locations', '/become-dealer': 'become-dealer', '/help': 'help' };
    const view = route.entityId ? 'products' : publicViews[route.path] ?? 'home';
    return <LandingPage onNavigate={navigate} view={view} productId={route.entityId} theme={theme} onToggleTheme={toggleTheme} />;
  }
  let content: ReactNode;
  if (route.kind === 'not_found') content = <main className="platform-recovery"><CircleHelp size={36} /><h1>Halaman tidak ditemui</h1><p>Pautan ini tidak sepadan dengan ruang kerja yang tersedia.</p><button className="platform-primary" onClick={() => navigate('/')}>Kembali ke halaman utama</button></main>;
  else if (route.kind === 'public') content = publicView();
  else if (loading) content = <main className="platform-recovery" aria-busy="true"><p>Mengesahkan akses workspace…</p></main>;
  else if (!session) content = <LoginForm setup={false} onSuccess={loginSuccess} onNavigate={navigate} />;
  else if (route.kind === 'flow') content = <div className="platform-flow-shell"><header><button onClick={() => navigate(defaultRole ? `/${defaultRole}/overview` : '/')}><ArrowLeft size={18} />Workspace</button><span><Flame size={18} />ABANGCOLEK FLOWS</span><button onClick={toggleTheme} aria-label="Tukar tema">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button></header><FlowRenderer key={JSON.stringify([session.user.id,session.memberships])} slug={route.entityId!} onNavigate={navigate} /></div>;
  else if (route.role && !canOpenWorkspace(route.role, activeRoles)) content = <main className="platform-recovery"><ShieldCheck size={36} /><h1>Akses workspace belum diberikan</h1><p>Pilihan URL tidak menukar role. Hubungi founder untuk membership yang diperlukan.</p><button className="platform-primary" onClick={() => navigate(defaultRole ? `/${defaultRole}/overview` : '/')}>Buka workspace saya</button></main>;
  else if (route.role) {
    const role = route.role; const section = route.path.split('/')[2] ?? 'overview';
    if (!canAccessSection(role, section, session.capabilities)) {
      content = <main className="platform-recovery"><ShieldCheck size={36} /><h1>Akses bahagian ini tidak dibenarkan</h1><p>Akaun anda tidak mempunyai capability yang diperlukan untuk membuka bahagian ini.</p><button className="platform-primary" onClick={() => navigate(`/${role}/overview`)}>Buka ringkasan workspace</button></main>;
    } else {
      const navigation = getNavigation(role); const current = navigation.find(item => item.id === section);
      content = <div key={JSON.stringify([session.user.id,session.memberships])} className="platform-workspace">
        <WorkspaceNavigation role={role} roleLabel={roles[role]} section={section} user={session.user} theme={theme} mobile={mobile} open={menuOpen} openerRef={menuToggle} onClose={closeMenu} onNavigate={navigate} onToggleTheme={toggleTheme} onLogout={() => { void logout(); }} />
        <div className="platform-workspace-body" inert={mobile && menuOpen}><header className="platform-topbar"><div><button ref={menuToggle} className="platform-menu-toggle" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="workspace-navigation" aria-label="Buka navigasi"><Menu size={21} /></button><span>{roles[role]} <ChevronRight size={14} /> <strong>{current?.label ?? section}</strong></span></div><div><span className="platform-saved"><span />Local workspace</span><label className="platform-role-select"><span className="sr-only">Tukar workspace</span><select value={role} onChange={event => navigate(`/${event.target.value}/overview`)}>{roleOrder.filter(item => activeRoles.includes(item)).map(item => <option key={item} value={item}>{roles[item]}</option>)}</select></label></div></header><main id="platform-main" className="platform-main">{section === 'legacy' ? <IntegrationWorkspace onNavigate={navigate} /> : <Workspaces key={`${role}:${section}:${route.entityId??''}`} entityId={route.entityId} role={role} section={section} onNavigate={navigate} onChanged={() => { void refreshSession(); }} />}</main></div>
      </div>;
    }
  }

  return <AuthContext.Provider value={{ session, refreshSession }}><div data-theme={theme} className="app-shell platform-app"><a className="platform-skip" href="#platform-main" inert={mobile && menuOpen}>Langkau ke kandungan</a>{!online && <div role="status" className="platform-network-banner">Offline — perubahan belum diterima server. Sambung semula sebelum mengesahkan tindakan.</div>}{sessionError && route.kind !== 'public' && <div role="status" className="platform-network-banner">{sessionError}</div>}<Suspense fallback={<main className="platform-recovery" aria-busy="true"><p>Membuka workspace…</p></main>}>{content}</Suspense></div></AuthContext.Provider>;
}
