/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EXT-06 — the microphone indicator.
 *
 * The user can always see whether the microphone is live, and can revoke it
 * with one click. The component is presentational: the state comes from the
 * `MicrophonePermissionMonitor`.
 */

import React from 'react';
import { Mic, MicOff, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MicrophoneIndicatorState } from './microphonePermission';

export interface MicPermissionIndicatorProps {
  state: MicrophoneIndicatorState;
  onRevoke: () => void;
  className?: string;
}

export const MicPermissionIndicator: React.FC<MicPermissionIndicatorProps> = ({ state, onRevoke, className }) => {
  const live = state.capturing;
  return (
    <div
      role="status"
      aria-live="polite"
      data-mic-state={state.permission}
      data-mic-capturing={live ? 'true' : 'false'}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold',
        live
          ? 'border-rose-300 bg-rose-50 text-rose-700'
          : state.permission === 'denied'
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-[var(--ui-border)] bg-[var(--ui-soft)] text-[var(--ui-muted)]',
        className,
      )}
    >
      {live ? (
        <Mic size={13} className="shrink-0 animate-pulse" aria-hidden="true" />
      ) : state.permission === 'denied' ? (
        <ShieldAlert size={13} className="shrink-0" aria-hidden="true" />
      ) : (
        <MicOff size={13} className="shrink-0" aria-hidden="true" />
      )}
      <span className="truncate" title={state.note}>
        {live ? 'Mikrofon AKTIF' : state.permission === 'denied' ? 'Mikrofon dimatikan' : 'Mikrofon tidak aktif'}
      </span>
      <button
        type="button"
        onClick={onRevoke}
        className="ml-1 shrink-0 rounded-lg border border-current/30 px-1.5 py-0.5 text-[10px] font-bold hover:brightness-95"
        title="Matikan mikrofon sekarang"
      >
        Matikan
      </button>
    </div>
  );
};

export default MicPermissionIndicator;
