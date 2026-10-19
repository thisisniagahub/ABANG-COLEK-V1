/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Petdex System for AbangColek Platform — Inspired by Hermes Charm & Petdex
 */

export interface PetdexEntry {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  taglines: string[];
  ambientGreetings: string[];
  personality: 'energetic' | 'vigilante' | 'playful';
}

export const PETDEX_CATALOG: Record<string, PetdexEntry> = {
  colek: {
    id: 'colek',
    name: 'Si Colek',
    subtitle: 'Maskot Rasmi Kuah Colek',
    description: 'Botol kuah colek likat berkaramel dengan tangkai cili hijau. Sentiasa ceria dan bersemangat menjaga operasi!',
    primaryColor: '#ea580c',
    accentColor: '#f59e0b',
    taglines: [
      'PEDAS MANIS LIKAT MELEKAT 🌶️🥭',
      'Rasa Padu, Pedas Menggamit!',
      'Kasi Lagi-Lagi! 🔥',
    ],
    ambientGreetings: [
      'Bro Megat! Sedia siasat botol bocor!',
      'Stok kuah colek di cawangan Shah Alam sentiasa mantap.',
      'Duit masuk, rekod jujur, Rules Own The Money!',
      'Kasi Lagi-Lagi! Ada pesanan nak saya semak?',
      'Kuah colek likat melekat, bisnes laju berkat.',
    ],
    personality: 'energetic',
  },
  batmeme: {
    id: 'batmeme',
    name: 'Batmeme',
    subtitle: 'Hermes Vigilante Bat',
    description: 'Keluaran Hermes Charm. Kelawar cilik pengawal terminal malam yang menjaga keselamatan kod dan logistik.',
    primaryColor: '#3b82f6',
    accentColor: '#1e293b',
    taglines: [
      'I am the night. I am the code. 🦇',
      'Vigilante operations online.',
      'No bug escapes the sonar.',
    ],
    ambientGreetings: [
      'Sonar mengesan sifar pencerobohan keselamatan.',
      'Sistem dalam radar pemantauan, bos.',
      'Saya bersiap di bumbung terminal bas TBS.',
      'Log kriptografi bersih daripada IDOR.',
    ],
    personality: 'vigilante',
  },
  charm: {
    id: 'charm',
    name: 'Flame Charm',
    subtitle: 'Ekor Api Cilik',
    description: 'Keluaran Hermes Petdex. Rakan cicak ekor api yang comel dan menghangatkan semangat jualan pop-up!',
    primaryColor: '#ef4444',
    accentColor: '#f97316',
    taglines: [
      'Api semangat jualan menyala! 🔥',
      'Hangat, pantas, padu!',
      'Char-char! Sedia bakar sales!',
    ],
    ambientGreetings: [
      'Api semangat pop-up gerai hari ini membara!',
      'Char-char! Mari kita bakar sasaran jualan!',
      'Pesanan panas-panas baru masuk dari pelanggan!',
    ],
    personality: 'playful',
  },
};

