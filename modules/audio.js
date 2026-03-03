// ─── Audio Engine Module ─────────────────────────────────────────
// Unified audio system with iOS-specific handling.

import { 
  playStartSound as playIOSStart,
  playIntervalSound as playIOSInterval,
  playEndSound as playIOSEnd,
  playSingleSound as playIOSSingle,
  stopAllAudio as stopIOSAudio,
  startIOSSession,
  stopIOSSession,
  isIOSSessionActive
} from './ios-audio.js';

import { loadAudioBuffer } from './audio-context.js';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Audio]', ...args);
}

const audioCache = new Map();
let isLoading = false;

const AUDIO_FILES = {
  'bell': {
    start: 'sounds/sequence_bell_start.mp3',
    interval: 'sounds/sequence_bell_interval.mp3',
    end: 'sounds/sequence_bell_end.mp3',
    single: 'sounds/temple_bell_standard.mp3'
  },
  'bell-high': {
    start: 'sounds/sequence_bell_high_start.mp3',
    interval: 'sounds/sequence_bell_high_interval.mp3',
    end: 'sounds/sequence_bell_high_end.mp3',
    single: 'sounds/temple_bell_high.mp3'
  },
  'chugpi': {
    start: 'sounds/sequence_chugpi_start.mp3',
    interval: 'sounds/sequence_chugpi_interval.mp3',
    end: 'sounds/sequence_chugpi_end.mp3',
    single: 'sounds/chugpi.mp3'
  }
};

export function isAudioLoading() {
  return isLoading;
}

function getAudioElement(src) {
  if (audioCache.has(src)) {
    return audioCache.get(src);
  }
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.loop = false;
  audioCache.set(src, audio);
  return audio;
}

export async function preloadAudio(src) {
  return new Promise((resolve) => {
    const audio = getAudioElement(src);
    if (audio.readyState >= 3) {
      resolve(audio);
      return;
    }
    const timeoutId = setTimeout(() => resolve(audio), 5000);
    audio.addEventListener('canplaythrough', () => {
      clearTimeout(timeoutId);
      resolve(audio);
    }, { once: true });
    audio.addEventListener('error', () => {
      clearTimeout(timeoutId);
      resolve(audio);
    }, { once: true });
    audio.load();
  });
}

export async function preloadSoundSet(soundType) {
  if (isIOS) return; // iOS handles its own preloading
  
  const files = AUDIO_FILES[soundType];
  if (!files) return;
  
  isLoading = true;
  log('Preloading:', soundType);
  
  try {
    await Promise.all([
      preloadAudio(files.start),
      preloadAudio(files.interval),
      preloadAudio(files.end)
    ]);
    log('Preloaded:', soundType);
  } catch (error) {
    log('Preload error:', error.message);
  } finally {
    isLoading = false;
  }
}

// Get file path for sound type
export function getStartSoundFile(type) {
  if (type === 'none') return null;
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  return files.start;
}

// Non-iOS: Simple HTML5 audio playback
async function playStandardAudio(src, volume = 1.0) {
  try {
    const audio = getAudioElement(src);
    audio.volume = volume;
    audio.currentTime = 0;
    await audio.play();
    log('Playing:', src);
    return true;
  } catch (error) {
    log('Playback failed:', error.message);
    return false;
  }
}

// Main exported functions
export async function playStartSound(type) {
  if (type === 'none') return;
  log('playStartSound:', type);
  
  if (isIOS) {
    return await playIOSStart(type);
  }
  
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  await playStandardAudio(files.start, 1.0);
}

export async function playIntervalSound(type) {
  if (type === 'none') return;
  
  if (isIOS) {
    return await playIOSInterval(type);
  }
  
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  await playStandardAudio(files.interval, 0.8);
}

export async function playEndSound(type) {
  if (type === 'none') return;
  log('playEndSound:', type);
  
  if (isIOS) {
    return await playIOSEnd(type);
  }
  
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  await playStandardAudio(files.end, 1.0);
}

export async function playSingleSound(type) {
  if (type === 'none') return;
  
  if (isIOS) {
    return await playIOSSingle(type);
  }
  
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  await playStandardAudio(files.single, 1.0);
}

export function stopAllAudio() {
  stopIOSAudio();
  audioCache.forEach(audio => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  });
}

export { startIOSSession, stopIOSSession, isIOSSessionActive, loadAudioBuffer };

log('Audio module loaded, isIOS:', isIOS);
