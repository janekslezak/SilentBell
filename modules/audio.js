// ─── Audio Engine Module ─────────────────────────────────────────
// Simple MP3-based audio system for all platforms.

import { getAudioContext, unlockAudio } from './audio-context.js';

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
    
    const timeoutId = setTimeout(() => {
      resolve(audio);
    }, 5000);
    
    const onCanPlay = () => {
      clearTimeout(timeoutId);
      resolve(audio);
    };
    
    const onError = () => {
      clearTimeout(timeoutId);
      resolve(audio);
    };
    
    audio.addEventListener('canplaythrough', onCanPlay, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
}

export async function preloadSoundSet(soundType) {
  const files = AUDIO_FILES[soundType];
  if (!files) return;
  
  isLoading = true;
  log('Preloading sound set:', soundType);
  
  try {
    await Promise.all([
      preloadAudio(files.start),
      preloadAudio(files.interval),
      preloadAudio(files.end)
    ]);
    log('Sound set preloaded:', soundType);
  } catch (error) {
    log('Preload error (non-critical):', error.message);
  } finally {
    isLoading = false;
  }
}

export function stopAllAudio() {
  audioCache.forEach(audio => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  });
}

async function playHTML5Audio(src, volume = 1.0) {
  try {
    const audio = getAudioElement(src);
    audio.volume = volume;
    audio.currentTime = 0;
    
    if (isIOS) {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    }
    
    await audio.play();
    log('Playing:', src);
    return true;
  } catch (error) {
    log('Playback failed:', error.message);
    return false;
  }
}

export async function playStartSound(type) {
  if (type === 'none') return;
  
  log('Playing start sound:', type);
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  
  if (isIOS) {
    await unlockAudio();
  }
  
  await playHTML5Audio(files.start, 1.0);
}

export async function playIntervalSound(type) {
  if (type === 'none') return;
  
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  await playHTML5Audio(files.interval, 0.8);
}

export async function playEndSound(type) {
  if (type === 'none') return;
  
  log('Playing end sound:', type);
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  
  if (isIOS) {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }
  
  await playHTML5Audio(files.end, 1.0);
}

export async function playSingleSound(type) {
  if (type === 'none') return;
  
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  
  if (isIOS) {
    await unlockAudio();
  }
  
  await playHTML5Audio(files.single, 1.0);
}

log('Audio module loaded. Platform:', isIOS ? 'iOS' : 'Desktop');
