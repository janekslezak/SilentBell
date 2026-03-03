// ─── iOS Audio Module ─────────────────────────────────────────────
// Safari iOS compatible audio using persistent elements.

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

// CRITICAL: Safari iOS requires persistent audio elements
// We create them upfront and reuse the same elements
const audioPool = {
  start: null,
  interval: null,
  end: null,
  unlock: null
};

let isUnlocked = false;

// Initialize audio elements immediately (but don't play yet)
function initAudioElements() {
  if (!isIOS) return;
  
  // Create unlock audio (silent)
  audioPool.unlock = new Audio();
  audioPool.unlock.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA//uQZAA==';
  audioPool.unlock.preload = 'auto';
  
  // Create pool for each sound type
  Object.keys(SOUNDS).forEach(type => {
    if (!audioPool[type]) {
      audioPool[type] = {};
    }
    ['start', 'interval', 'end'].forEach(key => {
      if (!audioPool[type][key]) {
        audioPool[type][key] = new Audio();
        audioPool[type][key].src = SOUNDS[type][key];
        audioPool[type][key].preload = 'auto';
        audioPool[type][key].load();
      }
    });
  });
  
  log('Audio elements initialized');
}

// SYNCHRONOUS unlock - must be called directly in click handler
export function unlockIOSAudio() {
  if (!isIOS || isUnlocked) return;
  
  log('iOS: Synchronous unlock...');
  
  try {
    // Play the unlock audio synchronously
    if (audioPool.unlock) {
      audioPool.unlock.volume = 0.01;
      audioPool.unlock.play().catch(() => {});
    }
    
    // Also try to preload/play all sounds to ensure they're ready
    Object.keys(SOUNDS).forEach(type => {
      ['start', 'interval', 'end'].forEach(key => {
        const audio = audioPool[type]?.[key];
        if (audio) {
          // Load but don't play yet
          audio.load();
        }
      });
    });
    
    isUnlocked = true;
    log('iOS: Audio unlocked');
  } catch (e) {
    log('iOS: Unlock error:', e.message);
  }
}

// Play sound using the persistent audio element
async function playPooledSound(type, key, volume = 1.0) {
  if (!isIOS) return false;
  if (!isUnlocked) {
    log('Audio not unlocked yet!');
    return false;
  }
  
  const audio = audioPool[type]?.[key];
  if (!audio) return false;
  
  try {
    // Reset and play
    audio.volume = volume;
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch (error) {
    log('Play error:', error.message);
    // Fallback: try creating new audio
    return playFallback(SOUNDS[type][key], volume);
  }
}

// Fallback if pooled audio fails
async function playFallback(src, volume = 1.0) {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    await audio.play();
    return true;
  } catch (e) {
    return false;
  }
}

export async function playStartSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || 'bell';
  log('playStartSound:', type);
  
  const result = await playPooledSound(type, 'start', 1.0);
  if (result) log('Start sound OK');
  return result;
}

export async function playIntervalSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || 'bell';
  return await playPooledSound(type, 'interval', 0.8);
}

export async function playEndSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || 'bell';
  log('playEndSound:', type);
  
  const result = await playPooledSound(type, 'end', 1.0);
  if (result) log('End sound OK');
  return result;
}

export async function playSingleSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || 'bell';
  const src = SOUNDS[type]?.test || SOUNDS['bell'].test;
  
  log('playSingleSound:', type);
  
  // For test sound, we can try pooled or fallback
  try {
    const audio = new Audio(src);
    audio.volume = 1.0;
    await audio.play();
    return true;
  } catch (error) {
    log('Single sound failed:', error.message);
    return false;
  }
}

// No-op functions for API compatibility
export async function startIOSSession() { return true; }
export function stopIOSSession() {
  // Stop all pooled audio
  Object.values(audioPool).forEach(pool => {
    if (pool && typeof pool === 'object' && pool.pause) {
      pool.pause();
      pool.currentTime = 0;
    } else if (pool && typeof pool === 'object') {
      Object.values(pool).forEach(audio => {
        if (audio && audio.pause) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    }
  });
}
export function stopAllAudio() {
  stopIOSSession();
}
export function isIOSSessionActive() { return isUnlocked; }

// Initialize on load
initAudioElements();

log('iOS Audio module loaded, isIOS:', isIOS);
