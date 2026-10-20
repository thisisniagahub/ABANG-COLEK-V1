/**
 * ABANGCOLEK Sovereign GrowthOS — EXT-06 processing-location disclosure
 *
 * The UI must state WHERE the voice input is processed. This repository has
 * no external STT/TTS service configured: the browser Web Speech API does the
 * transcription and the synthesis. The transcript itself is untrusted input
 * and is never an approval.
 */

export type VoiceProcessingMode = 'browser' | 'server' | 'external';

export interface VoiceProcessingLocation {
  stage: 'transcription' | 'synthesis' | 'agent_reasoning';
  mode: VoiceProcessingMode;
  locality: 'local' | 'remote';
  label: string;
  note: string;
}

export const VOICE_PROCESSING_LOCATIONS: VoiceProcessingLocation[] = [
  {
    stage: 'transcription',
    mode: 'browser',
    locality: 'local',
    label: 'Web Speech API pelayar',
    note: 'Transkripsi dijalankan oleh pelayar (API Web Speech). Tiada perkhidmatan STT luaran dikonfigurasi.',
  },
  {
    stage: 'synthesis',
    mode: 'browser',
    locality: 'local',
    label: 'Web Speech API pelayar',
    note: 'Sintesis suara dijalankan oleh pelayar. Tiada perkhidmatan TTS luaran dikonfigurasi.',
  },
  {
    stage: 'agent_reasoning',
    mode: 'server',
    locality: 'remote',
    label: 'Pelayan platform (Copilot runtime)',
    note: 'Transkripsi dihantar ke pelayan platform sebagai mesej copilot biasa.',
  },
];

/** The external gate that keeps an external voice model switched off. */
export const EXTERNAL_VOICE_GATE = {
  available: false as const,
  reasonCode: 'EXTERNAL_STT_TTS_NOT_CONFIGURED',
  reason:
    'Perkhidmatan STT/TTS luaran mesti lulus gate kos dan privasi; tiada konfigurasi, jadi ciri dilumpuhkan secara eksplisit.',
};

/** The disclosure text rendered next to the microphone control. */
export function processingLocationDisclosure(): string {
  const parts = VOICE_PROCESSING_LOCATIONS.map((location) => `${location.label} — ${location.note}`);
  parts.push(
    'Transkripsi suara ialah input TIDAK DIPERCAYAI: ia tidak boleh meluluskan refund atau sebarang mutasi tanpa pengesahan manusia.',
  );
  return parts.join(' ');
}
