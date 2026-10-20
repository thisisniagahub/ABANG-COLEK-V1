/**
 * EXT-06 — voice: the shared controller, the microphone indicator state and
 * the processing-location disclosure.
 *
 * The rules under test:
 *  - the Pet and the Copilot surface share ONE run/thread identity;
 *  - a voice transcript is untrusted input;
 *  - the user can see that the microphone is active and can revoke it;
 *  - the UI discloses WHERE the voice is processed, and no external STT/TTS
 *    service is claimed.
 */

import { describe, expect, test } from 'bun:test';
import {
  CopilotRunController,
  copilotRunController,
} from '../../src/features/intelligence/copilotRunController';
import {
  MicrophonePermissionMonitor,
  type MicrophoneProbeScope,
} from '../../src/features/pet/microphonePermission';
import {
  VOICE_PROCESSING_LOCATIONS,
  EXTERNAL_VOICE_GATE,
  processingLocationDisclosure,
} from '../../src/features/pet/processingLocation';

describe('EXT-06 — shared copilot run identity', () => {
  test('the Pet and the Copilot surface share one thread', () => {
    const controller = new CopilotRunController();
    const petRun = controller.beginRun({ surface: 'pet', inputTrust: 'untrusted' });
    const copilotRun = controller.beginRun({ surface: 'copilot' });
    expect(copilotRun.threadId).toBe(petRun.threadId);
    expect(copilotRun.runId).not.toBe(petRun.runId);
    expect(controller.getThreadId()).toBe(petRun.threadId);
  });

  test('a voice run is marked as untrusted input', () => {
    const controller = new CopilotRunController();
    const identity = controller.beginRun({ surface: 'pet', inputTrust: 'untrusted' });
    expect(identity.inputTrust).toBe('untrusted');
    expect(identity.surface).toBe('pet');
  });

  test('the request body carries the shared thread and run ids', () => {
    const controller = new CopilotRunController();
    const body = controller.attachIdentity(
      { message: 'Semak pesanan' },
      { surface: 'pet', inputTrust: 'untrusted' },
    );
    expect(body.threadId).toBe(controller.getThreadId() ?? '');
    expect(body.runId).toBe(controller.getIdentity()?.runId ?? '');
    expect(body.message).toBe('Semak pesanan');
  });

  test('the process-wide controller is a single shared instance', () => {
    expect(copilotRunController).toBeInstanceOf(CopilotRunController);
    const thread = copilotRunController.ensureThread();
    expect(copilotRunController.ensureThread()).toBe(thread);
  });
});

describe('EXT-06 — microphone indicator', () => {
  test('the probe reads a granted microphone permission', async () => {
    const monitor = new MicrophonePermissionMonitor();
    const scope: MicrophoneProbeScope = {
      navigator: {
        permissions: { query: async () => ({ state: 'granted' }) },
        mediaDevices: { getUserMedia: () => undefined },
      },
    };
    const state = await monitor.probe(scope);
    expect(state.permission).toBe('granted');
    expect(state.capturing).toBe(false);
  });

  test('a browser without the permissions API reports unsupported', async () => {
    const monitor = new MicrophonePermissionMonitor();
    const state = await monitor.probe({ navigator: {} });
    expect(state.permission).toBe('unsupported');
  });

  test('the indicator shows the live capture and the user can revoke it', () => {
    const monitor = new MicrophonePermissionMonitor();
    const seen: string[] = [];
    monitor.subscribe((state) => seen.push(state.permission));
    monitor.markActive();
    expect(monitor.getState().capturing).toBe(true);
    expect(monitor.getState().permission).toBe('active');
    monitor.markInactive();
    expect(monitor.getState().capturing).toBe(false);
    const revoked = monitor.revoke();
    expect(revoked.capturing).toBe(false);
    expect(revoked.permission).toBe('denied');
    expect(seen).toContain('active');
  });
});

describe('EXT-06 — processing location disclosure', () => {
  test('the disclosure names the browser Web Speech API and claims no external service', () => {
    const disclosure = processingLocationDisclosure();
    expect(disclosure).toContain('Web Speech API pelayar');
    expect(disclosure).toContain('Tiada perkhidmatan STT luaran dikonfigurasi');
    expect(disclosure).toContain('Tiada perkhidmatan TTS luaran dikonfigurasi');
  });

  test('the disclosure states that a transcript is untrusted input', () => {
    expect(processingLocationDisclosure()).toContain('TIDAK DIPERCAYAI');
  });

  test('the external voice gate is explicitly unavailable', () => {
    expect(EXTERNAL_VOICE_GATE.available).toBe(false);
    expect(EXTERNAL_VOICE_GATE.reasonCode).toBe('EXTERNAL_STT_TTS_NOT_CONFIGURED');
  });

  test('every declared processing location states its mode and locality', () => {
    for (const location of VOICE_PROCESSING_LOCATIONS) {
      expect(['browser', 'server', 'external']).toContain(location.mode);
      expect(['local', 'remote']).toContain(location.locality);
      expect(location.note.length).toBeGreaterThan(0);
    }
  });
});
