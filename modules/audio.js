// ─── Audio Module ────────────────────────────────────────────────
// Audio system with platform-aware playback.
// Strategy: MP3 files everywhere — proven to work on all platforms.
//
// iOS: Uses ios-audio.js which primes Audio elements during user gesture.
// Non-iOS: Uses standard HTML5 Audio with element caching.
//
// Both paths use the same MP3 sound files from /sounds/.

import { isIOS } from './platform.js';

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[Audio]', ...args); }

// ─── MP3 File Registry ───────────────────────────────────────────

const AUDIO_FILES = {
  bell: {
    start:    'sounds/sequence_bell_start.mp3',
    interval: 'sounds/sequence_bell_interval.mp3',
    end:      'sounds/sequence_bell_end.mp3',
    single:   'sounds/temple_bell_standard.mp3'
  },
  'bell-high': {
    start:    'sounds/sequence_bell_high_start.mp3',
    interval: 'sounds/sequence_bell_high_interval.mp3',
    end:      'sounds/sequence_bell_high_end.mp3',
    single:   'sounds/temple_bell_high.mp3'
  },
  chugpi: {
    start:    'sounds/sequence_chugpi_start.mp3',
    interval: 'sounds/sequence_chugpi_interval.mp3',
    end:      'sounds/sequence_chugpi_end.mp3',
    single:   'sounds/chugpi.mp3'
  }
};

// ─── iOS Audio (primed MP3 elements) ─────────────────────────────

let iosAudioElements = {};
let iosPrimed = false;

function initIOSElements() {
  if (!isIOS || Object.keys(iosAudioElements).length > 0) return;
  Object.keys(AUDIO_FILES).forEach(type => {
    iosAudioElements[type] = {};
    ['start', 'interval', 'end'].forEach(key => {
      const a = new Audio();
      a.src = AUDIO_FILES[type][key];
      a.preload = 'auto';
      iosAudioElements[type][key] = a;
    });
  });
  log('iOS audio elements initialized');
}

export function primeAudio(soundType) {
  if (!isIOS) return;
  initIOSElements();
  const type = soundType || 'bell';
  log('Priming iOS audio for:', type);

  ['start', 'interval', 'end'].forEach(key => {
    const a = iosAudioElements[type]?.[key];
    if (!a) return;
    a.muted = true;
    a.volume = 0;
    a.currentTime = 0;
    const p = a.play();
    if (p !== undefined) {
      p.then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
        a.volume = (key === 'interval') ? 0.8 : 1.0;
      }).catch(() => {
        a.muted = false;
        a.volume = (key === 'interval') ? 0.8 : 1.0;
      });
    }
  });
  iosPrimed = true;
}

async function playIOS(type, key) {
  if (!isIOS) return false;
  const a = iosAudioElements[type]?.[key];
  if (!a) return false;
  a.currentTime = 0;
  a.muted = false;
  a.volume = (key === 'interval') ? 0.8 : 1.0;
  try { await a.play(); return true; } catch { return false; }
}

function stopIOS() {
  if (!isIOS) return;
  Object.values(iosAudioElements).forEach(typeObj => {
    Object.values(typeObj).forEach(a => {
      try { a.pause(); a.currentTime = 0; a.muted = false; } catch {}
    });
  });
}

// ─── Standard HTML5 Audio (non-iOS) ──────────────────────────────

const audioCache = new Map();
let isLoading = false;

function getCachedAudio(src) {
  if (audioCache.has(src)) return audioCache.get(src);
  const a = new Audio(src);
  a.preload = 'auto';
  a.loop = false;
  audioCache.set(src, a);
  return a;
}

export async function preloadAudio(src) {
  return new Promise((resolve) => {
    const audio = getCachedAudio(src);
    if (audio.readyState >= 3) { resolve(audio); return; }
    const timeout = setTimeout(() => resolve(audio), 5000);
    audio.addEventListener('canplaythrough', () => { clearTimeout(timeout); resolve(audio); }, { once: true });
    audio.addEventListener('error', () => { clearTimeout(timeout); resolve(audio); }, { once: true });
    audio.load();
  });
}

export async function preloadSoundSet(soundType) {
  if (isIOS) {
    // On iOS, prime during user gesture instead of preloading
    primeAudio(soundType);
    return;
  }
  const files = AUDIO_FILES[soundType];
  if (!files) return;
  isLoading = true;
  try {
    await Promise.all([preloadAudio(files.start), preloadAudio(files.interval), preloadAudio(files.end)]);
    log('Preloaded:', soundType);
  } catch (e) {
    log('Preload error:', e.message);
  } finally {
    isLoading = false;
  }
}

async function playStandard(type, key) {
  if (isIOS) return false;
  const files = AUDIO_FILES[type] || AUDIO_FILES.bell;
  const src = files[key];
  if (!src) return false;
  try {
    const a = getCachedAudio(src);
    a.volume = (key === 'interval') ? 0.8 : 1.0;
    a.currentTime = 0;
    await a.play();
    return true;
  } catch (e) {
    log('Playback failed:', e.message);
    return false;
  }
}

// ─── Unified Public API ──────────────────────────────────────────

export async function playStartSound(type) {
  if (type === 'none') return;
  log('playStartSound:', type, 'iOS:', isIOS);
  if (isIOS) { await playIOS(type, 'start'); return; }
  await playStandard(type, 'start');
}

export async function playIntervalSound(type) {
  if (type === 'none') return;
  if (isIOS) { await playIOS(type, 'interval'); return; }
  await playStandard(type, 'interval');
}

export async function playEndSound(type) {
  if (type === 'none') return;
  log('playEndSound:', type, 'iOS:', isIOS);
  if (isIOS) { await playIOS(type, 'end'); return; }
  await playStandard(type, 'end');
}

export async function playSingleSound(type) {
  if (!type || type === 'none') return;
  if (isIOS) {
    const src = AUDIO_FILES[type]?.single || AUDIO_FILES.bell.single;
    try {
      const a = new Audio(src);
      a.muted = false;
      a.volume = 1.0;
      await a.play();
    } catch {}
    return;
  }
  await playStandard(type, 'single');
}

export function stopAllAudio() {
  stopIOS();
  audioCache.forEach(a => {
    try { a.pause(); a.currentTime = 0; } catch {}
  });
}

export async function startIOSSession() { return true; }
export function stopIOSSession() { stopIOS(); }
export function isIOSSessionActive() { return iosPrimed; }

export function isAudioLoading() { return isLoading; }

// ─── Unlock (called on first user interaction) ───────────────────

export async function unlockAudio() {
  // Play a silent sound to unlock the audio subsystem.
  // Uses a timeout to prevent the promise from hanging on iOS
  // when called outside the main start-button user gesture.
  try {
    const a = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    a.volume = 0.001;
    await Promise.race([
      a.play(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Unlock timeout')), 500))
    ]);
  } catch {}
}
