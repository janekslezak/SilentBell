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
    
    audioContext = new AudioCtx();
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    oscillator.frequency.value = 1;
    gainNode.gain.value = 0.0001;
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    
    log('Silent loop started');
  } catch (e) {
    log('Failed to start silent loop:', e.message);
    isRunning = false;
  }
}

export function stopSilentLoop() {
  if (!isRunning) return;
  
  isRunning = false;
  log('Stopping silent loop...');
  
  try {
    if (oscillator) {
      try { oscillator.stop(); } catch (e) {}
      try { oscillator.disconnect(); } catch (e) {}
      oscillator = null;
    }
    
    if (gainNode) {
      try { gainNode.disconnect(); } catch (e) {}
      gainNode = null;
    }
    
    if (audioContext) {
      try { audioContext.close(); } catch (e) {}
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
