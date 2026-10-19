/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PetCompanion — Upgraded with Hermes Charm Features (Draggable, Radial Orbit Menu, Petting, Petdex Skins)
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Send, 
  Sparkles, 
  Loader2,
  Globe,
  Heart,
  Moon,
  Sun,
  Activity,
  Compass
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PetAvatar, type ExtendedPetMood } from './PetAvatar';
import { speechService, sfx } from './speechService';
import { PETDEX_CATALOG, type PetdexEntry } from './petdex';
import { currentCsrfToken } from '../platform/client';
import './pet-companion.css';

interface PetCompanionProps {
  onNavigate?: (path: string) => void;
}

export const PetCompanion: React.FC<PetCompanionProps> = ({ onNavigate }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [radialOpen, setRadialOpen] = useState(false);
  const [activePetId, setActivePetId] = useState<string>('colek');
  const [mood, setMood] = useState<ExtendedPetMood>('idle');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(speechService.isMuted());
  const [lang, setLang] = useState<'ms-MY' | 'en-US'>('ms-MY');
  const [ambientText, setAmbientText] = useState<string | null>(null);

  // Position for draggable pet widget (default bottom-right)
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth - 300 : 800,
    y: typeof window !== 'undefined' ? window.innerHeight - 90 : 600,
  });
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  const activePet: PetdexEntry = PETDEX_CATALOG[activePetId] || PETDEX_CATALOG.colek;

  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string; time: string }[]>([
    {
      role: 'bot',
      text: `Salam Bro Megat! Saya **${activePet.name}** (${activePet.subtitle}). Sistem pembantu suara aktif! Tekan mikrofon atau taip arahan untuk semakan operasi, botol bocor, margin, atau kargo bas!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<Array<{ role: string; content: string }>>([]);

  // Periodically cycle ambient remarks from Petdex
  useEffect(() => {
    const timer = setInterval(() => {
      if (mood === 'idle' && !drawerOpen && !radialOpen) {
        const pool = activePet.ambientGreetings;
        const randomGreeting = pool[Math.floor(Math.random() * pool.length)];
        setAmbientText(randomGreeting);
        setTimeout(() => setAmbientText(null), 5000);
      }
    }, 28000);
    return () => clearInterval(timer);
  }, [activePet, mood, drawerOpen, radialOpen]);

  // Global Keyboard Shortcut: Ctrl+J or Alt+C toggles Pet Drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'j') || (e.altKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        setDrawerOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Update mood based on voice & process state
  useEffect(() => {
    if (isListening) {
      setMood('listening');
    } else if (isProcessing) {
      setMood('thinking');
    } else if (mood !== 'sleeping' && mood !== 'happy') {
      setMood('idle');
    }
  }, [isListening, isProcessing]);

  // Draggable logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (radialOpen) setRadialOpen(false);
    isDragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = moveEvent.clientX - dragStart.current.mouseX;
      const dy = moveEvent.clientY - dragStart.current.mouseY;
      const newX = Math.max(10, Math.min(window.innerWidth - 260, dragStart.current.posX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, dragStart.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRadialOpen(prev => !prev);
    sfx.playChime('wake');
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    speechService.setMuted(next);
  };

  const toggleLanguage = () => {
    const next = lang === 'ms-MY' ? 'en-US' : 'ms-MY';
    setLang(next);
    speechService.setLanguage(next);
  };

  // Petting interaction (Charm feature)
  const triggerPetting = () => {
    setMood('happy');
    sfx.playChime('success');
    setAmbientText('💖 *Purrr!* Sayang Bro Megat!');
    setTimeout(() => {
      setMood('idle');
      setAmbientText(null);
    }, 2500);
  };

  // Toggle sleep/wake (Charm feature)
  const toggleSleep = () => {
    if (mood === 'sleeping') {
      setMood('idle');
      sfx.playChime('wake');
      setAmbientText('Selamat pagi! Sedia sambung kerja.');
    } else {
      setMood('sleeping');
      sfx.playChime('send');
      setAmbientText('Zzz... Si Colek rehat sebentar.');
    }
    setRadialOpen(false);
    setTimeout(() => setAmbientText(null), 3500);
  };

  // Switch Petdex Skin
  const switchPetSkin = (petId: string) => {
    setActivePetId(petId);
    sfx.playChime('wake');
    const newPet = PETDEX_CATALOG[petId] || PETDEX_CATALOG.colek;
    setAmbientText(`Bertukar kepada ${newPet.name}!`);
    setTimeout(() => setAmbientText(null), 3000);
  };

  // Start or Stop Speech-To-Text (STT)
  const toggleListening = () => {
    if (radialOpen) setRadialOpen(false);
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      const ok = speechService.startListening(
        payload => {
          setInputText(payload.transcript);
          if (payload.isFinal) {
            setIsListening(false);
            if (payload.transcript.trim()) {
              void handleSendMessage(payload.transcript);
            }
          }
        },
        err => {
          setIsListening(false);
          setAmbientText(err);
          setTimeout(() => setAmbientText(null), 3000);
        },
        () => {
          setIsListening(false);
        }
      );
      if (!ok) setIsListening(false);
    }
  };

  // Send message to Google ADK Copilot Agent (/api/platform/copilot/chat)
  const handleSendMessage = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query || isProcessing) return;

    if (radialOpen) setRadialOpen(false);
    setInputText('');
    sfx.playChime('send');

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: query, time: userTime }]);

    setIsProcessing(true);
    setDrawerOpen(true);

    try {
      let botResponseAccumulator = '';
      const response = await fetch('/api/platform/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(currentCsrfToken() ? { 'X-CSRF-Token': currentCsrfToken() } : {})
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          message: query,
          history: chatHistoryRef.current,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Ralat pelayan platform HTTP ${response.status}`);
      }

      if (response.headers.get('content-type')?.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              try {
                const parsed = JSON.parse(dataStr);
                if (currentEvent === 'text_delta' && parsed.content) {
                  botResponseAccumulator += parsed.content;
                } else if (currentEvent === 'done' && parsed.reply) {
                  botResponseAccumulator = parsed.reply;
                }
              } catch {
                // Ignore parse errors on partial stream lines
              }
            }
          }
        }
      } else {
        const resData = await response.json();
        botResponseAccumulator = resData.data?.reply || resData.reply || '';
      }

      const finalReply = botResponseAccumulator || 'Tindakan telah diselaraskan oleh ADK Copilot.';
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages(prev => [...prev, { role: 'bot', text: finalReply, time: botTime }]);
      chatHistoryRef.current.push(
        { role: 'user', content: query },
        { role: 'assistant', content: finalReply }
      );
      sfx.playChime('success');

      // Speak response using TTS in Bahasa Melayu
      speechService.speak(
        finalReply,
        () => {
          setMood('speaking');
        },
        () => {
          setMood('idle');
        }
      );
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Maaf, berlaku ralat memproses arahan.';
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: `⚠️ **Ralat Operasi:** ${errText}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      sfx.playChime('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* 1. Master Floating Pet Trigger (Draggable across the whole desktop/screen) */}
      <div 
        className="pet-companion-root" 
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        {/* Ambient Speech Bubble */}
        {ambientText && (
          <div className="pet-ambient-bubble">
            {ambientText}
          </div>
        )}

        {/* Pure Transparent Hermes Charm Mascot (No Box, No Background) */}
        <div 
          className="pet-charm-wrapper group" 
          onMouseDown={handleMouseDown}
          onContextMenu={handleContextMenu}
          onClick={() => {
            if (!radialOpen) setDrawerOpen(true);
          }}
          role="button" 
          tabIndex={0}
          title={`${activePet.name} (${activePet.subtitle})\n• Klik: Buka Laci AI Copilot\n• Klik Kanan: Roda Orbit Hermes\n• Heret: Alih kedudukan`}
        >
          <PetAvatar 
            mood={mood} 
            petId={activePetId} 
            size={68} 
            onContextMenu={handleContextMenu}
          />

          {/* Sleek Floating Dock below mascot */}
          <div className="pet-dock-bar">
            <span className="pet-dock-name">
              <Sparkles size={11} className="text-amber-400" />
              {activePet.name}
            </span>

            {/* Quick Mic Floating Action */}
            <button
              type="button"
              className={`pet-dock-mic ${
                isListening ? 'listening' : ''
              }`}
              onClick={e => {
                e.stopPropagation();
                toggleListening();
              }}
              title={isListening ? 'Berhenti mendengar' : 'Bercakap (STT)'}
            >
              {isListening ? <MicOff size={13} /> : <Mic size={13} />}
            </button>
          </div>
        </div>

        {/* 2. Cyberpunk Radial Arc Menu (Hermes Bat-Wheel Orbit) */}
        {radialOpen && (
          <div className="pet-radial-menu">
            {/* Top Node: Voice STT */}
            <div 
              className="pet-radial-node node-talk" 
              onClick={() => {
                setRadialOpen(false);
                toggleListening();
              }}
              title="Cakap (Voice STT)"
            >
              🎙️
            </div>

            {/* Right-Top Node: Petting / Love */}
            <div 
              className="pet-radial-node node-pet" 
              onClick={() => {
                setRadialOpen(false);
                triggerPetting();
              }}
              title="Belai Pet (Pet Love)"
            >
              💖
            </div>

            {/* Right-Bottom Node: Sleep / Rest */}
            <div 
              className="pet-radial-node node-sleep" 
              onClick={toggleSleep}
              title={mood === 'sleeping' ? 'Bangun' : 'Tidur (Rest)'}
            >
              💤
            </div>

            {/* Bottom Node: Vitals */}
            <div 
              className="pet-radial-node node-vitals" 
              onClick={() => {
                setRadialOpen(false);
                setAmbientText('Vitals: Rules Own The Money. Server SQLite Aktif.');
                setTimeout(() => setAmbientText(null), 3000);
              }}
              title="Vitals Sistem"
            >
              ⚡
            </div>

            {/* Left-Top Node: Open Full Sidecar Drawer */}
            <div 
              className="pet-radial-node node-drawer" 
              onClick={() => {
                setRadialOpen(false);
                setDrawerOpen(true);
              }}
              title="Buka Drawer Penuh"
            >
              💬
            </div>
          </div>
        )}
      </div>

      {/* 3. Sidecar Drawer Backdrop */}
      <div
        className={`pet-drawer-backdrop ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* 4. Sidecar Drawer (Slide-out Assistant HUD) */}
      <aside className={`pet-sidecar-drawer ${drawerOpen ? 'open' : ''}`} aria-label="Si Colek AI Copilot Sidecar">
        {/* Drawer Header */}
        <div className="pet-drawer-header">
          <div className="flex items-center gap-3">
            <PetAvatar mood={mood} petId={activePetId} size={42} />
            <div>
              <h3 className="font-bold text-[14.5px] text-[var(--ui-text,#0f172a)] flex items-center gap-1.5">
                {activePet.name}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                  {lang === 'ms-MY' ? 'Bahasa Melayu' : 'English'}
                </span>
              </h3>
              <p className="text-[11.5px] text-[var(--ui-muted,#64748b)]">
                {isListening ? '🎙️ Mendengar suara anda...' : isProcessing ? '⚡ Sedang memproses...' : activePet.subtitle}
              </p>
            </div>
          </div>

          <div className="pet-drawer-controls">
            {/* Language Switch */}
            <button
              type="button"
              className="pet-icon-btn"
              onClick={toggleLanguage}
              title={`Tukar bahasa (Semasa: ${lang})`}
            >
              <Globe size={15} />
            </button>

            {/* Mute/Unmute TTS */}
            <button
              type="button"
              className={`pet-icon-btn ${isMuted ? '' : 'text-emerald-600'}`}
              onClick={toggleMute}
              title={isMuted ? 'Buka suara Pet (TTS)' : 'Senyapkan suara (Mute)'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Close Drawer */}
            <button
              type="button"
              className="pet-icon-btn"
              onClick={() => setDrawerOpen(false)}
              title="Tutup drawer (Ctrl+J)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Petdex Skin Switcher Row */}
        <div className="pet-skin-switcher">
          <span className="text-[11px] font-bold text-neutral-500 uppercase">Petdex:</span>
          {Object.values(PETDEX_CATALOG).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => switchPetSkin(p.id)}
              className={`pet-skin-chip ${activePetId === p.id ? 'active' : ''}`}
            >
              {p.id === 'colek' ? '🌶️' : p.id === 'batmeme' ? '🦇' : '🔥'} {p.name}
            </button>
          ))}
        </div>

        {/* Drawer Messages Stream */}
        <div className="pet-messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={`pet-msg ${msg.role}`}>
              <div className="pet-msg-bubble">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
                <div className="text-[10px] opacity-70 mt-1 text-right">{msg.time}</div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="pet-msg bot">
              <div className="pet-msg-bubble flex items-center gap-2 text-[12px] text-amber-600">
                <Loader2 size={13} className="animate-spin" />
                {activePet.name} sedang memproses alatan & data...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Chips */}
        <div className="pet-quick-chips">
          <button
            type="button"
            className="pet-chip"
            onClick={() => void handleSendMessage('Siasat aduan botol kuah colek bocor (LEAKAGE) dan draf emel gantian')}
          >
            🔴 Siasat Botol Bocor
          </button>
          <button
            type="button"
            className="pet-chip"
            onClick={() => void handleSendMessage('Dapatkan jadual bas kargo TBS ke Kuala Terengganu dan semak kos')}
          >
            🚌 Jadual Bas TBS
          </button>
          <button
            type="button"
            className="pet-chip"
            onClick={() => void handleSendMessage('Semak sumbangan margin untuk promosi Beli 3 Botol Percuma 1 Botol')}
          >
            🛡️ Semak Margin Promo
          </button>
          <button
            type="button"
            className="pet-chip"
            onClick={() => void handleSendMessage('Cipta SOP pemeriksaan kualiti botol kuah di Google Docs')}
          >
            📄 Draf SOP di Docs
          </button>
          {onNavigate && (
            <button
              type="button"
              className="pet-chip"
              onClick={() => {
                onNavigate('/founder/copilot');
                setDrawerOpen(false);
              }}
            >
              🖥️ Buka Penuh (Full Page)
            </button>
          )}
        </div>

        {/* Input & Voice Mic Bar */}
        <form onSubmit={e => { e.preventDefault(); void handleSendMessage(inputText); }} className="pet-input-bar">
          <button
            type="button"
            onClick={toggleListening}
            className={`pet-mic-btn ${isListening ? 'listening' : ''}`}
            title={isListening ? 'Klik untuk berhenti mendengar' : 'Bercakap sekarang (STT Suara)'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            type="text"
            className="pet-text-input"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={isListening ? 'Mendengar suara anda... bercakaplah' : `Bercakap atau taip arahan untuk ${activePet.name}...`}
            disabled={isProcessing}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors shrink-0"
            title="Hantar arahan"
          >
            <Send size={15} />
          </button>
        </form>
      </aside>
    </>
  );
};

export default PetCompanion;
