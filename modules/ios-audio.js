// ─── iOS Audio Module ─────────────────────────────────────────────
// Safari iOS compatible audio — prime all sounds during user gesture.
// Used as fallback when Web Audio API procedural sounds aren't available.
// This module pre-creates Audio elements and "unlocks" them by playing
// muted during a user interaction, allowing later playback even with
// the screen locked.

import { isIOS } from './platform.js';

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[iOS Audio]', ...args); }

const SOUNDS = {
  bell: {
    start: 'sounds/sequence_bell_start.mp3',
    interval: 'sounds/sequence_bell_interval.mp3',
    end: 'sounds/sequence_bell_end.mp3',
    test: 'sounds/temple_bell_standard.mp3'
  },
  'bell-high': {
    start: 'sounds/sequence_bell_high_start.mp3',
    interval: 'sounds/sequence_bell_high_interval.mp3',
    end: 'sounds/sequence_bell_high_end.mp3',
    test: 'sounds/temple_bell_high.mp3'
  },
  chugpi: {
    start: 'sounds/sequence_chugpi_start.mp3',
    interval: 'sounds/sequence_chugpi_interval.mp3',
    end: 'sounds/sequence_chugpi_end.mp3',
    test: 'sounds/chugpi.mp3'
  }
};

const audioElements = {};
let isUnlocked = false;

// Initialize audio elements immediately (but don't play yet)
function initAudioElements() {
  if (!isIOS) return;
  Object.keys(SOUNDS).forEach(type => {
    audioElements[type] = {};
    ['start', 'interval', 'end'].forEach(key => {
      const audio = new Audio();
      audio.src = SOUNDS[type][key];
      audio.preload = 'auto';
      audioElements[type][key] = audio;
    });
  });
}

// Prime all sounds for a type (unlock them during user gesture)
export function primeAudio(soundType) {
  if (!isIOS) return;
  const type = soundType || 'bell';
  log('Priming audio for:', type);

  ['start', 'end', 'interval'].forEach(key => {
    const audio = audioElements[type]?.[key];
    if (!audio) return;

    audio.muted = true;
    audio.volume = 0;
    audio.currentTime = 0;

    const p = audio.play();
    if (p !== undefined) {
      p.then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        audio.volume = key === 'interval' ? 0.8 : 1.0;
      }).catch(() => {
        audio.muted = false;
        audio.volume = key === 'interval' ? 0.8 : 1.0;
      });
    }
  });
  isUnlocked = true;
}

export async function playStartSound(soundType) {
  if (!isIOS || soundType === 'none') return false;
  const audio = audioElements[soundType]?.start;
  if (!audio) return false;
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = 1.0;
  try { await audio.play(); return true; } catch (e) { return false; }
}

export async function playIntervalSound(soundType) {
  if (!isIOS || soundType === 'none') return false;
  const audio = audioElements[soundType]?.interval;
  if (!audio) return false;
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = 0.8;
  try { await audio.play(); return true; } catch (e) { return false; }
}

export async function playEndSound(soundType) {
  if (!isIOS || soundType === 'none') return false;
  const audio = audioElements[soundType]?.end;
  if (!audio) return false;
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = 1.0;
  try { await audio.play(); return true; } catch (e) { return false; }
}

export async function playSingleSound(soundType) {
  if (!isIOS || soundType === 'none') return false;
  const src = SOUNDS[soundType]?.test || SOUNDS.bell.test;
  try {
    const audio = new Audio(src);
    audio.muted = false;
    audio.volume = 1.0;
    await audio.play();
    return true;
  } catch { return false; }
}

export function stopIOSSession() {
  Object.keys(audioElements).forEach(type => {
    ['start', 'interval', 'end'].forEach(key => {
      const audio = audioElements[type]?.[key];
      if (audio) {
        try { audio.pause(); audio.currentTime = 0; audio.muted = false; } catch {}
      }
    });
  });
}

export function stopAllAudio() { stopIOSSession(); }
export async function startIOSSession() { return true; }
export function isIOSSessionActive() { return isUnlocked; }

initAudioElements();
log('iOS Audio module loaded, isIOS:', isIOS);
