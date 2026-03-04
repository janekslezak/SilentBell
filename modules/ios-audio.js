// ─── iOS Audio Module ─────────────────────────────────────────────
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[iOS Audio]', ...args);
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

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

// ✅ FIXED: Define audioElements BEFORE functions use it
const audioElements = {};
let isPriming = false;
let isUnlocked = false;
let primeTimeout;

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
        audio.volume = 0;
        audio.muted = true;
        audioElements[type][key] = audio;
      }
    });
  });
}

// Helper to safely prime a single audio element
async function primeSingleAudio(audio, targetVolume = 1.0) {
  if (!audio) return;
  
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = true;
    audio.volume = 0;
    
    await audio.play();
    
    // Use a Promise instead of setTimeout for better control
    await new Promise(resolve => {
      primeTimeout = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        audio.volume = targetVolume;
        resolve();
      }, 100);
    });
  } catch (e) {
    log('Prime error:', e.message);
    audio.muted = false;
    audio.volume = targetVolume;
    throw e;
  }
}

export async function primeAudio(soundType = 'bell') {
  if (!isIOS || isUnlocked) {
    log('Audio already unlocked or not iOS');
    return;
  }
  
  if (isPriming) {
    log('Already priming, waiting...');
    // Wait for current priming to finish
    while (isPriming) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return;
  }
  
  isPriming = true;
  log('Priming audio for:', soundType);
  
  try {
    const type = soundType;
    if (!audioElements[type]) {
      initAudioElements();
    }
    
    // Prime all sounds in parallel
    await Promise.all([
      primeSingleAudio(audioElements[type]?.start, 1.0),
      primeSingleAudio(audioElements[type]?.end, 1.0),
      primeSingleAudio(audioElements[type]?.interval, 0.8)
    ]);
    
    isUnlocked = true;
    log('All sounds primed successfully');
  } catch (e) {
    log('Prime failed:', e.message);
  } finally {
    isPriming = false;
    if (primeTimeout) clearTimeout(primeTimeout);
  }
}

export async function play(soundType = 'bell', phase = 'interval') {
  if (!isIOS) {
    // Non-iOS implementation here
    return;
  }
  
  if (!isUnlocked) {
    log('Audio not primed yet!');
    return;
  }
  
  const audio = audioElements[soundType]?.[phase];
  if (!audio) {
    log('Sound not found:', soundType, phase);
    return;
  }
  
  try {
    audio.currentTime = 0;
    await audio.play();
    log('Playing:', soundType, phase);
  } catch (e) {
    log('Play error:', e.message);
  }
}

// Initialize on load
initAudioElements();
