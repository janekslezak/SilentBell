// ─── iOS Audio Module ─────────────────────────────────────────────
// Safari iOS compatible audio - prime all sounds during unlock.

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
let isUnlocked = false;

// Initialize audio elements immediately
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

// Prime all sounds for a type (unlock them during user gesture)
export function primeAudio(soundType) {
  if (!isIOS) return;
  
  const type = soundType || 'bell';
  log('Priming audio for:', type);
  
  try {
    // Prime START sound - use muted=true for truly silent priming
    const startAudio = audioElements[type]?.start;
    if (startAudio) {
      startAudio.muted = true;  // Mute first
      startAudio.volume = 0;    // Also set volume to 0
      startAudio.currentTime = 0;
      
      const playPromise = startAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          startAudio.pause();
          startAudio.currentTime = 0;
          startAudio.muted = false;  // Unmute after pause
          startAudio.volume = 1;     // Restore volume
          log('Start sound primed');
        }).catch(e => {
          log('Start prime error:', e.message);
          // Ensure unmuted even on error
          startAudio.muted = false;
          startAudio.volume = 1;
        });
      }
    }
    
    // Prime END sound (critical!) - also muted
    const endAudio = audioElements[type]?.end;
    if (endAudio) {
      endAudio.muted = true;
      endAudio.volume = 0;
      endAudio.currentTime = 0;
      
      const playPromise = endAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          endAudio.pause();
          endAudio.currentTime = 0;
          endAudio.muted = false;
          endAudio.volume = 1;
          log('End sound primed');
        }).catch(e => {
          log('End prime error:', e.message);
          endAudio.muted = false;
          endAudio.volume = 1;
        });
      }
    }
    
    // Prime INTERVAL sound - also muted
    const intervalAudio = audioElements[type]?.interval;
    if (intervalAudio) {
      intervalAudio.muted = true;
      intervalAudio.volume = 0;
      intervalAudio.currentTime = 0;
      
      const playPromise = intervalAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          intervalAudio.pause();
          intervalAudio.currentTime = 0;
          intervalAudio.muted = false;
          intervalAudio.volume = 0.8;  // Interval is quieter
          log('Interval sound primed');
        }).catch(e => {
          log('Interval prime error:', e.message);
          intervalAudio.muted = false;
          intervalAudio.volume = 0.8;
        });
      }
    }
    
    isUnlocked = true;
  } catch (e) {
    log('Prime exception:', e.message);
  }
}

export async function playStartSound(soundType) {
  if (!isIOS) return false;
  if (soundType === 'none') return true;
  
  const type = soundType || 'bell';
  log('playStartSound:', type);
  
  const audio = audioElements[type]?.start;
  if (!audio) return false;
  
  try {
    audio.currentTime = 0;
    audio.muted = false;  // Ensure not muted
    audio.volume = 1.0;
    await audio.play();
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
  const audio = audioElements[type]?.interval;
  if (!audio) return false;
  
  try {
    audio.currentTime = 0;
    audio.muted = false;
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
  
  const type = soundType || 'bell';
  log('playEndSound:', type);
  
  const audio = audioElements[type]?.end;
  if (!audio) return false;
  
  try {
    audio.currentTime = 0;
    audio.muted = false;  // Ensure not muted
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
    audio.muted = false;
    audio.volume = 1.0;
    await audio.play();
    return true;
  } catch (error) {
    log('Single sound failed:', error.message);
    return false;
  }
}

// Legacy compatibility
export function playSilentUnlock() {}

export async function startIOSSession() { return true; }
export function stopIOSSession() {
  Object.keys(audioElements).forEach(type => {
    ['start', 'interval', 'end'].forEach(key => {
      const audio = audioElements[type]?.[key];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        // Reset muted state
        audio.muted = false;
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
