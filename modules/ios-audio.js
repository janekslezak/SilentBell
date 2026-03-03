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

// Play a silent/quiet sound to unlock audio session without user hearing it
// Uses Web Audio API for reliable iOS unlocking
export async function playSilentUnlock() {
  if (!isIOS) return true;
  
  log('Playing silent unlock sound...');
  
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.frequency.value = 1; // 1Hz - inaudible
    gainNode.gain.value = 0.001; // Very quiet
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.05); // 50ms
    
    // Also resume context if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    log('Silent unlock played');
    return true;
  } catch (error) {
    log('Silent unlock failed:', error.message);
    return false;
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
