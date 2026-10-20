/**
 * ABANGCOLEK Sovereign GrowthOS — EXT-06 microphone permission indicator
 *
 * The user must always be able to SEE that the microphone is active and to
 * REVOKE it. This module owns that state:
 *
 *  - `probe()` reads the browser's microphone permission when the browser
 *    exposes the Permissions API;
 *  - `markActive()` / `markInactive()` track the live capture state;
 *  - `revoke()` stops the capture and clears the active flag.
 *
 * The state is observable so a UI can render an honest indicator. It is
 * local-only: nothing is sent anywhere.
 */

export type MicrophonePermissionState =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported'
  | 'active'
  | 'inactive';

export interface MicrophoneIndicatorState {
  permission: MicrophonePermissionState;
  /** True while the microphone is actually capturing. */
  capturing: boolean;
  /** ISO instant of the last state change. */
  changedAt: string;
  note: string;
}

export interface MicrophoneProbeScope {
  navigator?: {
    permissions?: {
      query?: (descriptor: { name: string }) => Promise<{ state: string }>;
    };
    mediaDevices?: { getUserMedia?: unknown };
  };
}

type Listener = (state: MicrophoneIndicatorState) => void;

export class MicrophonePermissionMonitor {
  private state: MicrophoneIndicatorState = {
    permission: 'unknown',
    capturing: false,
    changedAt: new Date().toISOString(),
    note: 'Status mikrofon belum disahkan.',
  };
  private listeners: Listener[] = [];

  getState(): MicrophoneIndicatorState {
    return { ...this.state };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((entry) => entry !== listener);
    };
  }

  /**
   * Reads the browser's microphone permission. A browser without the
   * Permissions API (or without getUserMedia) reports `unsupported` — the
   * capture still has to ask the user at the first use.
   */
  async probe(scope: MicrophoneProbeScope = globalThis as MicrophoneProbeScope): Promise<MicrophoneIndicatorState> {
    const permissions = scope.navigator?.permissions;
    if (!permissions?.query || !scope.navigator?.mediaDevices?.getUserMedia) {
      return this.set({
        permission: 'unsupported',
        capturing: false,
        note: 'Pelayar tidak mendedahkan API kebenaran mikrofon; kebenaran akan diminta semasa penggunaan pertama.',
      });
    }
    try {
      const status = await permissions.query({ name: 'microphone' });
      const state = status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt';
      return this.set({
        permission: state,
        capturing: false,
        note:
          state === 'denied'
            ? 'Kebenaran mikrofon ditolak oleh pelayar.'
            : state === 'granted'
              ? 'Kebenaran mikrofon telah diberikan.'
              : 'Kebenaran mikrofon akan diminta semasa penggunaan pertama.',
      });
    } catch {
      return this.set({
        permission: 'unknown',
        capturing: false,
        note: 'Status kebenaran mikrofon tidak dapat disahkan oleh pelayar.',
      });
    }
  }

  /** The capture started. */
  markActive(): MicrophoneIndicatorState {
    return this.set({
      permission: 'active',
      capturing: true,
      note: 'Mikrofon AKTIF — audio dihantar ke API Web Speech pelayar.',
    });
  }

  /** The capture stopped. */
  markInactive(): MicrophoneIndicatorState {
    return this.set({
      permission: this.state.permission === 'active' ? 'granted' : this.state.permission,
      capturing: false,
      note: 'Mikrofon tidak aktif.',
    });
  }

  /**
   * Revokes the microphone. The caller must also stop the recognition
   * engine; this only owns the indicator state.
   */
  revoke(): MicrophoneIndicatorState {
    return this.set({
      permission: 'denied',
      capturing: false,
      note: 'Mikrofon telah dimatikan oleh pengguna.',
    });
  }

  private set(next: Partial<MicrophoneIndicatorState>): MicrophoneIndicatorState {
    this.state = {
      ...this.state,
      ...next,
      changedAt: new Date().toISOString(),
    };
    for (const listener of this.listeners) listener(this.getState());
    return this.getState();
  }
}

export const microphoneMonitor = new MicrophonePermissionMonitor();
