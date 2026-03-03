// ─── iOS Audio Module ─────────────────────────────────────────────
// Safari iOS compatible audio - prime the specific audio element during unlock.

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

// Persistent audio elements
const audioElements = {};
let currentSoundType = 'bell';
let isUnlocked = false;

// Initialize audio elements
function initAudioElements() {
  if (!isIOS) return;
  
  log('Initializing audio elements...');
  
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

// CRITICAL: Prime the audio element during user gesture
// We play and immediately pause to unlock it, then play it later
export function primeAudio(soundType) {
  if (!isIOS) return;
  
  currentSoundType = soundType || 'bell';
  log('Priming audio for:', currentSoundType);
  
  try {
    const startAudio = audioElements[currentSoundType]?.start;
    if (!startAudio) return;
    
    // Play and immediately pause to unlock this specific element
    // This satisfies Safari's "user gesture" requirement
    startAudio.volume = 0; // Mute it for the unlock
    const playPromise = startAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Immediately pause and reset
        startAudio.pause();
        startAudio.currentTime = 0;
        startAudio.volume = 1; // Restore volume
        isUnlocked = true;
        log('Audio primed successfully');
      }).catch(e => {
        log('Prime error:', e.message);
      });
    }
  } catch (e) {
    log('Prime exception:', e.message);
  }
}

export async function playStartSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || currentSoundType;
  log('playStartSound:', type);
  
  const audio = audioElements[type]?.start;
  if (!audio) return false;
  
  try {
    // Reset and play
    audio.currentTime = 0;
    audio.volume = 1.0;
    await audio.play();
    log('Start sound playing');
    return true;
  } catch (error) {
    log('Start sound failed:', error.message);
    return false;
  }
}

export async function playIntervalSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || currentSoundType;
  const audio = audioElements[type]?.interval;
  if (!audio) return false;
  
  try {
    audio.currentTime = 0;
    audio.volume = 0.8;
    await audio.play();
    return true;
  } catch (error) {
    log('Interval sound failed:', error.message);
    return false;
  }
}

export async function playEndSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || currentSoundType;
  log('playEndSound:', type);
  
  const audio = audioElements[type]?.end;
  if (!audio) return false;
  
  try {
    audio.currentTime = 0;
    audio.volume = 1.0;
    await audio.play();
    log('End sound playing');
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
    const audio = new Audio(src);
    audio.volume = 1.0;
    await audio.play();
    return true;
  } catch (error) {
    log('Single sound failed:', error.message);
    return false;
  }
}

// For compatibility with old API
export function playSilentUnlock() {
  // Deprecated, use primeAudio instead
}

export async function startIOSSession() { return true; }
export function stopIOSSession() {
  Object.keys(audioElements).forEach(type => {
    ['start', 'interval', 'end'].forEach(key => {
      const audio = audioElements[type][key];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  });
}
export function stopAllAudio() {
  stopIOSSession();
}
export function isIOSSessionActive() { return isUnlocked; }

// Initialize on load
initAudioElements();

log('iOS Audio module loaded, isIOS:', isIOS);
