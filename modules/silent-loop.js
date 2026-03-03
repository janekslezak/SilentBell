// ─── Silent Loop Module ──────────────────────────────────────────
// Keeps audio session alive for locked-screen playback on mobile devices.

let isRunning = false;
let audioContext = null;
let oscillator = null;
let gainNode = null;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[SilentLoop]', ...args);
}

export function startSilentLoop() {
  if (isRunning) {
    log('Silent loop already running');
    return;
  }
  
  isRunning = true;
  log('Starting silent loop...');
  
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      log('Web Audio API not available');
      return;
    }
    
    // Create new audio context for silent loop
    audioContext = new AudioCtx();
    
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    // Very low frequency, very quiet - essentially silent but keeps session alive
    oscillator.frequency.value = 1; // 1Hz - below human hearing
    gainNode.gain.value = 0.001; // Very quiet
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    
    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        log('Silent loop context resumed');
      }).catch((e) => {
        log('Failed to resume silent loop context:', e.message);
      });
    }
    
    log('Silent loop started, state:', audioContext.state);
  } catch (e) {
    log('Failed to start silent loop:', e.message);
    isRunning = false;
  }
}

export function stopSilentLoop() {
  if (!isRunning) {
    return;
  }
  
  isRunning = false;
  log('Stopping silent loop...');
  
  try {
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
    
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    
    log('Silent loop stopped');
  } catch (e) {
    log('Error stopping silent loop:', e.message);
  }
}

export function isSilentLoopRunning() {
  return isRunning;
}

// Handle visibility changes to keep audio alive
if (isIOS) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && isRunning) {
      log('Page hidden - silent loop maintaining audio session');
    } else if (document.visibilityState === 'visible' && isRunning && audioContext) {
      log('Page visible - checking silent loop');
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    }
  });
}
