import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowLeft, ArrowUpRight, Eye, EyeOff, Flame, ShieldCheck } from 'lucide-react';
import type { SessionData, WorkspaceRole } from '../../../shared/platform-contracts';
import type { PasswordRecoveryRequestResponse, PasswordRecoveryResetResponse } from '../../../shared/password-recovery-contracts';
import { api, jsonMutation, resetClientSession } from './client';
import { supabase } from '../../services/supabaseClient';
import BrandLogo from '../brand/BrandLogo';

export type LoginFormMode = 'login' | 'signup' | 'reset';

export interface LoginFormProps {
  mode?: LoginFormMode;
  setup?: boolean;
  onSuccess: () => Promise<void>;
  onNavigate: (path: string) => void;
  onForgotPassword?: () => void;
}

const roles: Record<WorkspaceRole, string> = {
  customer: 'Customer',
  staff: 'Staff',
  founder: 'Founder',
  developer: 'Developer',
};
const roleOrder: WorkspaceRole[] = ['founder', 'staff', 'developer', 'customer'];

export default function LoginForm({
  mode: initialMode,
  setup = false,
  onSuccess,
  onNavigate,
  onForgotPassword,
}: LoginFormProps) {
  const [mode, setMode] = useState<LoginFormMode>(
    setup ? 'signup' : initialMode ?? 'login'
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<'none' | 'requested' | 'completed'>('none');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const callbackStarted = useRef(false);

  useEffect(() => {
    setMode(setup ? 'signup' : initialMode ?? 'login');
    setError('');
    setRecoveryMode('none');
    setRecoveryMessage('');
    setPasswordVisible(false);
  }, [initialMode, setup]);

  useEffect(() => {
    if (!setup && supabase) {
      void api<{ google: boolean }>('/auth/providers')
        .then((value) => setGoogleAvailable(value.google))
        .catch(() => setGoogleAvailable(false));
    }
  }, [setup]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (setup || !query.has('code') || callbackStarted.current) return;
    callbackStarted.current = true;
    let pending = 0;
    try {
      pending = Number(sessionStorage.getItem('platform-google-pending'));
      sessionStorage.removeItem('platform-google-pending');
    } catch {
      /* Missing tab-bound state is rejected below. */
    }
    window.history.replaceState({}, '', window.location.pathname);
    if (!supabase || !pending || Date.now() - pending > 10 * 60_000 || pending > Date.now()) {
      setError('Sesi Google tidak sah atau telah tamat. Mulakan semula login Google.');
      return;
    }
    const client = supabase;
    setBusy(true);
    void (async () => {
      try {
        const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(query.get('code')!);
        if (exchangeError || !data.session) throw new Error('Sesi Google tidak dapat disahkan. Cuba semula.');
        resetClientSession();
        await api<SessionData>('/auth/google', jsonMutation({ accessToken: data.session.access_token }));
        await onSuccess();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Google login tidak dapat disahkan.');
      } finally {
        setBusy(false);
      }
    })();
  }, [setup, onSuccess]);

  async function googleLogin() {
    if (!supabase || !googleAvailable) return;
    setBusy(true);
    setError('');
    try {
      sessionStorage.setItem('platform-google-pending', String(Date.now()));
      const { error: providerError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (providerError) throw providerError;
    } catch {
      sessionStorage.removeItem('platform-google-pending');
      setError('Google login tidak dapat dimulakan. Cuba semula.');
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);

    try {
      if (recoveryMode === 'requested') {
        const email = String(form.get('email') ?? '').trim();
        const result = await api<PasswordRecoveryRequestResponse>(
          '/auth/password-recovery/request',
          jsonMutation({ email })
        );
        setRecoveryMode('completed');
        setRecoveryMessage(
          result.message || 'Jika akaun wujud, kod pemulihan telah dihantar ke emel tersebut.'
        );
        return;
      }

      if (mode === 'reset') {
        const credential = String(form.get('credential') ?? '').trim();
        const newPassword = String(form.get('password') ?? '');
        await api<PasswordRecoveryResetResponse>(
          '/auth/password-recovery/reset',
          jsonMutation({ credential, newPassword })
        );
        setRecoveryMode('completed');
        setRecoveryMessage('Kata laluan telah dikemas kini. Sila log masuk semula.');
        setMode('login');
        onNavigate('/login');
        return;
      }

      resetClientSession();
      const authPath = `/auth/${setup ? 'bootstrap' : mode}`;
      const authPayload = {
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        ...(mode === 'signup' || setup ? { name: String(form.get('name') ?? '').trim() } : {}),
        ...(setup ? { token: String(form.get('token') ?? '').trim() } : {}),
      };
      try {
        await api<SessionData>(authPath, jsonMutation(authPayload));
      } catch (firstErr: unknown) {
        const errCode = (firstErr as { code?: string })?.code;
        if (errCode === 'AUTHENTICATED_LOGIN_REQUIRES_LOGOUT') {
          try {
            await api<SessionData>('/session');
            await api('/auth/logout', jsonMutation({}));
          } catch {
            /* Best-effort logout before re-authenticating. */
          }
          resetClientSession();
          await api<SessionData>(authPath, jsonMutation(authPayload));
        } else {
          throw firstErr;
        }
      }
      await onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sesi tidak dapat dibuka.');
    } finally {
      setBusy(false);
    }
  }

  function handleKeyEvent(event: React.KeyboardEvent<HTMLInputElement>) {
    if (typeof event.getModifierState === 'function') {
      setCapsLock(event.getModifierState('CapsLock'));
    }
  }

  function handleForgotPassword() {
    onForgotPassword?.();
    setError('');
    setRecoveryMode('requested');
  }

  return (
    <main id="platform-main" className="platform-login">
      <div className="platform-login-story">
        <BrandLogo className="platform-login-logo" />
        <span className="platform-eyebrow">
          <Flame size={18} /> ABANGCOLEK PLATFORM
        </span>
        <h2>
          Satu bisnes.<br />
          Satu tempat<br />
          <em>untuk bergerak.</em>
        </h2>
        <p>Pesanan, pasukan, stokis dan marketing. Sambung kerja dengan konteks yang sama.</p>
        <div className="platform-role-chips">
          {roleOrder.map((role) => (
            <span key={role}>
              <ShieldCheck size={14} />
              {roles[role]}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="platform-auth-card">
        <button type="button" className="platform-text-button" onClick={() => onNavigate('/')}>
          <ArrowLeft size={16} />
          Halaman utama
        </button>
        <span className="platform-eyebrow">
          {setup ? 'OWNER PROVISIONING' : 'YOUR WORKSPACE'}
        </span>
        <h1>
          {setup
            ? 'Sediakan founder pertama'
            : recoveryMode === 'requested'
              ? 'Pulihkan akses akaun'
              : mode === 'reset'
                ? 'Tetapkan kata laluan baharu'
                : mode === 'login'
                  ? 'Masuk ke ABANGCOLEK'
                  : 'Buka akaun customer'}
        </h1>
        <p>
          {setup
            ? 'Token sekali guna dikeluarkan pada host. Founder tidak ditentukan melalui email atau pilihan role.'
            : 'Akses workspace mengikut membership yang disahkan server.'}
        </p>

        {recoveryMessage && (
          <p role="status" className="platform-notice">
            {recoveryMessage}
          </p>
        )}

        {(mode === 'signup' || setup) && recoveryMode !== 'requested' && (
          <label>
            Nama
            <input name="name" autoComplete="name" required maxLength={100} />
          </label>
        )}

        {mode !== 'reset' && (
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required maxLength={254} />
          </label>
        )}

        {mode === 'reset' && (
          <label>
            Kod pemulihan
            <input name="credential" type="text" autoComplete="one-time-code" required maxLength={256} />
          </label>
        )}

        {recoveryMode !== 'requested' && (
          <label>
            Password
            <input
              name="password"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={12}
              maxLength={128}
              required
              onKeyDown={handleKeyEvent}
              onKeyUp={handleKeyEvent}
            />
          </label>
        )}

        {recoveryMode !== 'requested' && (
          <button
            type="button"
            className="platform-text-button"
            onClick={() => setPasswordVisible((prev) => !prev)}
            aria-pressed={passwordVisible}
            aria-label={passwordVisible ? 'Sembunyikan kata laluan' : 'Tampilkan kata laluan'}
          >
            {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            {passwordVisible ? 'Sembunyikan kata laluan' : 'Tampilkan kata laluan'}
          </button>
        )}

        {capsLock && recoveryMode !== 'requested' && (
          <p id="caps-lock-warning" role="alert" className="platform-field-hint">
            <AlertTriangle size={14} /> Caps Lock aktif — semak huruf besar pada kata laluan anda.
          </p>
        )}

        {mode === 'signup' && recoveryMode !== 'requested' && (
          <p className="platform-field-hint">
            Gunakan sekurang-kurangnya 12 aksara. Akaun baharu hanya mendapat Customer Portal.
          </p>
        )}

        {setup && (
          <label>
            Token founder
            <input name="token" type="password" autoComplete="off" required maxLength={150} />
            <span className="platform-field-hint">
              Fail setempat: var/run/owner-bootstrap.token. Token tidak dihantar ke AI.
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="platform-alert">
            {error}
          </p>
        )}

        <button type="submit" className="platform-primary" disabled={busy}>
          {busy
            ? 'Mengesahkan sesi…'
            : setup
              ? 'Provision founder'
              : recoveryMode === 'requested'
                ? 'Hantar permintaan pemulihan'
                : mode === 'reset'
                  ? 'Simpan kata laluan baharu'
                  : mode === 'login'
                    ? 'Masuk workspace'
                    : 'Daftar customer'}
          <ArrowUpRight size={18} />
        </button>

        {!setup && mode === 'login' && recoveryMode !== 'requested' && (
          <button
            type="button"
            className="platform-text-button"
            onClick={handleForgotPassword}
          >
            Lupa kata laluan?
          </button>
        )}

        {!setup && recoveryMode === 'requested' && (
          <button
            type="button"
            className="platform-text-button"
            onClick={() => {
              setRecoveryMode('none');
              setError('');
            }}
          >
            Kembali ke log masuk
          </button>
        )}

        {!setup && !googleAvailable && (
          <p className="platform-field-hint">
            Google login belum tersedia untuk workspace ini. Gunakan email dan password.
          </p>
        )}

        {!setup && (
          <button
            type="button"
            className="platform-text-button"
            disabled={!googleAvailable || busy}
            onClick={() => void googleLogin()}
          >
            Teruskan dengan Google
          </button>
        )}

        {!setup && mode !== 'reset' && (
          <button
            type="button"
            className="platform-text-button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setRecoveryMode('none');
              setError('');
            }}
          >
            {mode === 'login' ? 'Belum ada akaun? Daftar customer' : 'Sudah ada akaun? Masuk'}
          </button>
        )}
      </form>
    </main>
  );
}
