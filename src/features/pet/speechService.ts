/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Zero-Cost Speech-To-Text (STT) & Text-To-Speech (TTS) Service using Web Speech API
 */

export interface SpeechRecognitionResultPayload {
  transcript: string;
  isFinal: boolean;
}

export type PetMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'alert';

class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) this.ctx = new AudioContextClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playChime(type: 'wake' | 'success' | 'send' | 'error') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'wake') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'send') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // AudioContext fallback ignored
    }
  }
}

export const sfx = new SoundEffects();

export class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private ttsMuted = false;
  private preferredLang = 'ms-MY';
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.initRecognition();
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer Malay (ms-MY / ms) or Indonesian (id-ID) as Malay-friendly fallback
      const malayVoice = voices.find(v => v.lang.startsWith('ms') || v.lang.startsWith('ms-MY')) ||
                         voices.find(v => v.lang.startsWith('id') || v.lang.startsWith('id-ID')) ||
                         voices.find(v => v.name.toLowerCase().includes('malay')) ||
                         null;
      if (malayVoice) this.selectedVoice = malayVoice;
    };
    load();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = this.preferredLang;
    }
  }

  isSttSupported(): boolean {
    return this.recognition !== null;
  }

  isTtsSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  setLanguage(lang: 'ms-MY' | 'en-US' | 'en-MY') {
    this.preferredLang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  getLanguage(): string {
    return this.preferredLang;
  }

  setMuted(muted: boolean) {
    this.ttsMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  isMuted(): boolean {
    return this.ttsMuted;
  }

  startListening(
    onResult: (payload: SpeechRecognitionResultPayload) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ): boolean {
    if (!this.recognition) {
      onError('Pengecaman suara (STT) tidak disokong pada pelayar ini.');
      return false;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Stop previous instance cleanly
      }
    }

    sfx.playChime('wake');
    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      onResult({
        transcript: finalTranscript || interimTranscript,
        isFinal: Boolean(finalTranscript),
      });
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      sfx.playChime('error');
      const err = event.error === 'not-allowed'
        ? 'Akses mikrofon tidak dibenarkan. Sila benarkan kebenaran mikrofon pelayar.'
        : `Ralat suara: ${event.error || 'Gagal mendengar'}`;
      onError(err);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
      return true;
    } catch {
      this.isListening = false;
      onError('Tidak dapat memulakan mikrofon.');
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Silent catch
      }
      this.isListening = false;
    }
  }

  speak(text: string, onStart?: () => void, onEnd?: () => void) {
    if (this.ttsMuted || !this.isTtsSupported()) {
      onEnd?.();
      return;
    }

    // Clean markdown syntax or URLs before speaking for clean audio
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // link text
      .replace(/[*#_`~>]/g, '')               // markdown formatting
      .replace(/http\S+/g, '')                // links
      .slice(0, 320);                         // limit spoken chunk for snappy pet responses

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = this.preferredLang;
    utterance.rate = 1.05; // natural energetic tempo
    utterance.pitch = 1.1; // friendly slightly cheerful pet pitch

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = () => {
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechService = new SpeechService();

