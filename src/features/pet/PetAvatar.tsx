/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PetAvatar — Multi-Skin Animated Mascot with Petdex (Si Colek, Batmeme, Flame Charm)
 */

import React from 'react';
import { type PetMood } from './speechService';

export type ExtendedPetMood = PetMood | 'sleeping';

interface PetAvatarProps {
  mood: ExtendedPetMood;
  petId?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const PetAvatar: React.FC<PetAvatarProps> = ({
  mood,
  petId = 'colek',
  size = 56,
  className = '',
  onClick,
  onContextMenu,
}) => {
  const isSpeaking = mood === 'speaking';
  const isListening = mood === 'listening';
  const isThinking = mood === 'thinking';
  const isHappy = mood === 'happy';
  const isSleeping = mood === 'sleeping';

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`pet-avatar-container relative select-none flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95 ${className}`}
      style={{ width: size, height: size }}
      title={`${petId.toUpperCase()} — Klik untuk laci, klik kanan untuk Roda Orbit!`}
    >
      {/* Listening Pulse Halo */}
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full bg-amber-500/25 animate-ping" />
          <div className="absolute -inset-2 rounded-full border-2 border-amber-400/70 animate-pulse" />
        </>
      )}

      {/* Thinking Sparkles */}
      {isThinking && (
        <div className="absolute -top-2 -right-1 text-amber-500 animate-spin text-[14px]">
          ✨
        </div>
      )}

      {/* Sleeping Zzz Floating */}
      {isSleeping && (
        <div className="absolute -top-3 -right-2 text-blue-400 font-bold text-[12px] animate-bounce select-none">
          Zzz...
        </div>
      )}

      {/* Happy Love Hearts */}
      {isHappy && (
        <div className="absolute -top-3 -left-1 text-rose-500 text-[14px] animate-ping select-none">
          💖
        </div>
      )}

      {/* --- SVG RENDERING BASED ON PETDEX SKIN --- */}
      {petId === 'batmeme' ? (
        // --- BATMEME (Hermes Vigilante Bat) ---
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`pet-svg drop-shadow-md transition-all duration-300 ${
            isSpeaking ? 'animate-bounce' : isListening ? 'scale-105' : isSleeping ? 'opacity-80' : 'animate-pulse'
          }`}
        >
          {/* Shadow */}
          <ellipse cx="50" cy="90" rx="28" ry="5" fill="rgba(0,0,0,0.2)" />
          {/* Bat Wings (Flapping when speaking) */}
          <path
            d={isSpeaking ? "M18 42C10 24 2 46 8 68C18 64 24 58 32 60L24 45Z" : "M22 45C12 28 4 50 10 70C20 66 26 60 34 62L26 48Z"}
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="2"
          />
          <path
            d={isSpeaking ? "M82 42C90 24 98 46 92 68C82 64 76 58 68 60L76 45Z" : "M78 45C88 28 96 50 90 70C80 66 74 60 66 62L74 48Z"}
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="2"
          />
          {/* Bat Ears */}
          <polygon points="32,32 38,12 48,28" fill="#0F172A" />
          <polygon points="36,30 40,16 46,26" fill="#3B82F6" />
          <polygon points="68,32 62,12 52,28" fill="#0F172A" />
          <polygon points="64,30 60,16 54,26" fill="#3B82F6" />
          {/* Bat Body */}
          <ellipse cx="50" cy="56" rx="22" ry="26" fill="#0F172A" stroke="#1E293B" strokeWidth="2" />
          {/* Golden Bat Belt/Badge */}
          <ellipse cx="50" cy="74" rx="8" ry="4" fill="#F59E0B" />
          {/* Eyes */}
          {isSleeping ? (
            <>
              <path d="M38 52L46 52" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M54 52L62 52" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="42" cy="50" r="5" fill="#38BDF8" />
              <circle cx="41" cy="49" r="2" fill="white" />
              <circle cx="58" cy="50" r="5" fill="#38BDF8" />
              <circle cx="57" cy="49" r="2" fill="white" />
            </>
          )}
          {/* Fangs */}
          <polygon points="45,63 47,68 49,63" fill="white" />
          <polygon points="51,63 53,68 55,63" fill="white" />
        </svg>
      ) : petId === 'charm' ? (
        // --- FLAME CHARM (Flame-Tailed Lizard) ---
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`pet-svg drop-shadow-md transition-all duration-300 ${
            isSpeaking ? 'animate-bounce' : isListening ? 'scale-105' : 'animate-pulse'
          }`}
        >
          {/* Shadow */}
          <ellipse cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,0.15)" />
          {/* Tail with flame */}
          <path d="M68 65C82 68 88 54 84 40C80 34 76 42 74 48" stroke="#EA580C" strokeWidth="7" strokeLinecap="round" fill="none" />
          {/* Tail Flame */}
          <path d="M84 38C88 28 96 22 92 14C84 20 80 28 84 38Z" fill="#EF4444" className="animate-pulse" />
          <path d="M85 36C87 28 92 24 90 18C85 22 82 28 85 36Z" fill="#FACC15" />
          {/* Body */}
          <ellipse cx="50" cy="62" rx="22" ry="24" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
          {/* Belly */}
          <ellipse cx="50" cy="66" rx="14" ry="17" fill="#FEF08A" />
          {/* Head */}
          <circle cx="50" cy="38" r="20" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
          {/* Eyes */}
          {isSleeping ? (
            <>
              <path d="M38 38C40 42 46 42 48 38" stroke="#431407" strokeWidth="2" strokeLinecap="round" />
              <path d="M52 38C54 42 60 42 62 38" stroke="#431407" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="43" cy="36" r="4.5" fill="#1C1917" />
              <circle cx="42" cy="35" r="1.5" fill="white" />
              <circle cx="57" cy="36" r="4.5" fill="#1C1917" />
              <circle cx="56" cy="35" r="1.5" fill="white" />
            </>
          )}
          {/* Cute Smile / Mouth */}
          <path d="M46 44C48 48 52 48 54 44" stroke="#431407" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        // --- SI COLEK (Official AbangColek Sauce Bottle Mascot) ---
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`pet-svg drop-shadow-md transition-all duration-300 ${
            isSpeaking ? 'animate-bounce' : isListening ? 'scale-105' : isSleeping ? 'opacity-80' : 'animate-pulse'
          }`}
        >
          {/* Shadow */}
          <ellipse cx="50" cy="92" rx="30" ry="6" fill="rgba(0,0,0,0.15)" />

          <defs>
            <linearGradient id="colekGradient2" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="50%" stopColor="#C2410C" />
              <stop offset="100%" stopColor="#7C2D12" />
            </linearGradient>
            <linearGradient id="lidGradient2" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="chiliStem2" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#15803D" />
            </linearGradient>
          </defs>

          {/* Jar Cap / Bandana */}
          <path
            d="M32 20C32 17 38 15 50 15C62 15 68 17 68 20L66 26C66 28 60 29 50 29C40 29 34 28 34 26L32 20Z"
            fill="url(#lidGradient2)"
            stroke="#78350F"
            strokeWidth="2"
          />

          {/* Green Chili Sprout */}
          <path
            d="M50 15C50 8 58 4 62 6C61 10 57 12 52 14"
            fill="url(#chiliStem2)"
            stroke="#14532D"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Main Jar Body */}
          <path
            d="M26 34C26 28 34 26 50 26C66 26 74 28 74 34L76 72C76 82 66 88 50 88C34 88 24 82 24 72L26 34Z"
            fill="url(#colekGradient2)"
            stroke="#431407"
            strokeWidth="2.5"
          />

          {/* Sheen */}
          <path
            d="M30 36C30 32 35 30 42 29C35 34 33 46 33 60C33 68 31 74 30 74C28 70 29 45 30 36Z"
            fill="white"
            fillOpacity="0.25"
          />

          {/* Blushing Cheeks */}
          <circle cx="34" cy="58" r="5" fill="#EF4444" fillOpacity="0.45" />
          <circle cx="66" cy="58" r="5" fill="#EF4444" fillOpacity="0.45" />

          {/* Eyes */}
          {isSleeping ? (
            <>
              <path d="M36 50C38 54 44 54 46 50" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M54 50C56 54 62 54 64 50" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : isListening ? (
            <>
              <circle cx="40" cy="50" r="6" fill="#1C1917" />
              <circle cx="38" cy="48" r="2.5" fill="white" />
              <circle cx="60" cy="50" r="6" fill="#1C1917" />
              <circle cx="58" cy="48" r="2.5" fill="white" />
            </>
          ) : isHappy ? (
            <>
              <path d="M35 52C38 46 44 46 47 52" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" />
              <path d="M53 52C56 46 62 46 65 52" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            <>
              <ellipse cx="40" cy="50" rx="4.5" ry="6" fill="#1C1917" />
              <circle cx="38.5" cy="48" r="2" fill="white" />
              <ellipse cx="60" cy="50" rx="4.5" ry="6" fill="#1C1917" />
              <circle cx="58.5" cy="48" r="2" fill="white" />
            </>
          )}

          {/* Eyebrows */}
          <path d="M36 42C39 40 43 41 45 43" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />
          <path d="M64 42C61 40 57 41 55 43" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />

          {/* Mouth */}
          {isSpeaking ? (
            <path d="M44 63C44 69 56 69 56 63Z" fill="#7F1D1D" stroke="#1C1917" strokeWidth="2" className="animate-pulse" />
          ) : isListening ? (
            <circle cx="50" cy="64" r="3.5" fill="#450A0A" stroke="#1C1917" strokeWidth="1.5" />
          ) : isHappy ? (
            <path d="M42 61C44 68 56 68 58 61" fill="#FEF2F2" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <path d="M44 62C47 66 53 66 56 62" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* Sambal Chili Seeds */}
          <circle cx="48" cy="74" r="1.5" fill="#FACC15" />
          <circle cx="55" cy="78" r="1.2" fill="#EF4444" />
          <circle cx="38" cy="76" r="1.2" fill="#FACC15" />
        </svg>
      )}

      {/* Mini Status Badge */}
      <div
        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold shadow-xs ${
          isListening
            ? 'bg-amber-500 text-white animate-ping'
            : isSpeaking
            ? 'bg-emerald-500 text-white'
            : isSleeping
            ? 'bg-blue-400 text-white'
            : isThinking
            ? 'bg-blue-500 text-white'
            : 'bg-emerald-500 text-white'
        }`}
      >
        {isListening ? '🎙️' : isSpeaking ? '🔊' : isSleeping ? '💤' : '✓'}
      </div>
    </div>
  );
};
