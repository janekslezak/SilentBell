// ─── iOS Audio Module ─────────────────────────────────────────────
// Safari iOS compatible audio - Fixed volume and priming issues

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

// Track priming state to avoid double-playing
let isPriming = false;
let isUnlocked = false;

// Initialize audio elements immediately with proper muted state
function initAudioElements() {
  if (!isIOS) return;
  
  log('Initializing audio elements...');
  
  Object.keys(SOUNDS).forEach(type => {
    if (!audioElements[type]) {
      audioElements[type] = {};
    }
    ['start', 'interval', 'end'].forEach(key => {
      if (!audioElements[type][key]) {
        const audio = new Audio();
        audio.src = SOUNDS[type][key];
        audio.preload = 'auto';
        // CRITICAL: Start with volume 0 and muted
        audio.volume = 0;
        audio.muted = true;
        audioElements[type][key] = audio;
      }
    });
  });
}

// Persistent audio elements
const audioElements = {};

// Prime all sounds for a type (unlock them during user gesture)
export function primeAudio(soundType) {
  if (!isIOS || isPriming) return;
  
  isPriming = true;
  const type = soundType || 'bell';
  log('Priming audio for:', type);
  
  try {
    // Prime START sound - ensure fully muted before playing
    const startAudio = audioElements[type]?.start;
    if (startAudio) {
      // Reset to ensure clean state
      startAudio.pause();
      startAudio.currentTime = 0;
      startAudio.muted = true;
      startAudio.volume = 0;
      
      const playPromise = startAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Keep muted for a moment to ensure no sound escapes
          setTimeout(() => {
            startAudio.pause();
            startAudio.currentTime = 0;
            startAudio.muted = false;
            startAudio.volume = 1.0;
            log('Start sound primed');
            isPriming = false;
            isUnlocked = true;
          }, 100);
        }).catch(e => {
          log('Start prime error:', e.message);
          isPriming = false;
          // Ensure unmuted even on error
          startAudio.muted = false;
          startAudio.volume = 1;
        });
      }
    }
    
    // Prime END sound (critical!) - also fully muted
    const endAudio = audioElements[type]?.end;
    if (endAudio) {
      endAudio.pause();
      endAudio.currentTime = 0;
      endAudio.muted = true;
      endAudio.volume = 0;
      
      const playPromise = endAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setTimeout(() => {
            endAudio.pause();
            endAudio.currentTime = 0;
            endAudio.muted = false;
            endAudio.volume = 1.0;
            log('End sound primed');
          }, 100);
        }).catch(e => {
          log('End prime error:', e.message);
          endAudio.muted = false;
          endAudio.volume = 1;
        });
      }
    }
    
    // Prime INTERVAL sound
    const intervalAudio = audioElements[type]?.interval;
    if (intervalAudio) {
      intervalAudio.pause();
      intervalAudio.currentTime = 0;
      intervalAudio.muted = true;
      intervalAudio.volume = 0;
      
      const playPromise = intervalAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setTimeout(() => {
            intervalAudio.pause();
            intervalAudio.currentTime = 0;
            intervalAudio.muted = false;
            intervalAudio.volume = 0.8; // Interval is quieter
            log('Interval sound primed');
          }, 100);
        }).catch(e => {
          log('Interval prime error:', e.message);
          intervalAudio.muted = false;
          intervalAudio.volume = 0.8;
        });
      }
    }
  } catch (e) {
    log('Prime exception:', e.message);
    isPriming = false;
  }
}

export async function play
