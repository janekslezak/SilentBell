// ─── iOS Audio Module ─────────────────────────────────────────────
// Simple iOS audio handling - play sounds directly during user gesture.

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[iOS Audio]', ...args);
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const SOUNDS = {
  'bell': {
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
  'chugpi': {
    start: 'sounds/sequence_chugpi_start.mp3',
    interval: 'sounds/sequence_chugpi_interval.mp3',
    end: 'sounds/sequence_chugpi_end.mp3',
    test: 'sounds/chugpi.mp3'
  }
};

// CRITICAL: Keep references to prevent garbage collection on iOS Safari
const audioPool = [];
let unlockAudio = null;

// Play silent unlock SYNCHRONOUSLY (no async/await) for Safari iOS
// This MUST be called directly in the click handler, not in a promise/async function
export function unlockIOSAudio() {
  if (!isIOS) return;
  
  log('iOS: Synchronous audio unlock...');
  
  try {
    // Create a silent oscillator using Web Audio API (synchronous)
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.value = 1;
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1); // 100ms
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }
    
    // Also play a silent HTML5 Audio (synchronous)
    unlockAudio = new Audio();
    unlockAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA//uQZAA==';
    unlockAudio.volume = 0.01;
    unlockAudio.play().catch(() => {});
    
    log('iOS: Audio unlocked synchronously');
  } catch (e) {
    log('iOS: Unlock error:', e.message);
  }
}

// Play audio - simple and direct
async function playAudio(src, volume = 1.0) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.preload = 'auto';
  
  return new Promise((resolve, reject) => {
    audio.addEventListener('canplaythrough', async () => {
      try {
        await audio.play();
        resolve(audio);
      } catch (err) {
        reject(err);
      }
    }, { once: true });
    
    audio.addEventListener('error', () => {
      reject(new Error('Audio load error'));
    }, { once: true });
    
    audio.load();
  });
}

export async function playStartSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || 'bell';
  const src = SOUNDS[type]?.start || SOUNDS['bell'].start;
  
  log('playStartSound:', type);
  
  try {
    await playAudio(src, 1.0);
    log('Start sound OK');
    return true;
  } catch (error) {
    log('Start sound failed:', error.message);
    return false;
  }
}

export async function playIntervalSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || 'bell';
  const src = SOUNDS[type]?.interval || SOUNDS['bell'].interval;
  
  try {
    await playAudio(src, 0.8);
    return true;
  } catch (error) {
    log('Interval sound failed:', error.message);
    return false;
  }
}

export async function playEndSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || 'bell';
  const src = SOUNDS[type]?.end || SOUNDS['bell'].end;
  
  log('playEndSound:', type);
  
  try {
    await playAudio(src, 1.0);
    log('End sound OK');
    return true;
  } catch (error) {
    log('End sound failed:', error.message);
    return false;
  }
}

export async function playSingleSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || 'bell';
  const src = SOUNDS[type]?.test || SOUNDS['bell'].test;
  
  log('playSingleSound:', type);
  
  try {
    await playAudio(src, 1.0);
    return true;
  } catch (error) {
    log('Single sound failed:', error.message);
    return false;
  }
}

// No-op functions for API compatibility
export async function startIOSSession() { return true; }
export function stopIOSSession() {}
export function stopAllAudio() {}
export function isIOSSessionActive() { return false; }

log('iOS Audio module loaded, isIOS:', isIOS);
