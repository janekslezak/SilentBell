// ─── Silent Loop Module ──────────────────────────────────────────
// Keeps audio session alive for locked-screen playback on mobile devices.

let silentLoop = null;
let isRunning = false;
let audioContextSilentSource = null;

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[SilentLoop]', ...args);
}

export function startSilentLoop() {
  if (isRunning) {
    return;
  }
  
  isRunning = true;
  
  // Use Web Audio API for silent loop (more reliable)
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.frequency.value = 1;
      gainNode.gain.value = 0.001;
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start();
      audioContextSilentSource = { oscillator, ctx };
      
      log('Web Audio API silent loop started');
    }
  } catch (e) {
    log('Web Audio silent loop failed:', e.message);
  }
}

export function stopSilentLoop() {
  isRunning = false;
  
  if (audioContextSilentSource) {
    try {
      audioContextSilentSource.oscillator.stop();
      audioContextSilentSource.ctx.close();
      audioContextSilentSource = null;
    } catch (e) {
      log('Error stopping Web Audio silent loop:', e.message);
    }
  }
  
  if (silentLoop) {
    try {
      silentLoop.pause();
      silentLoop.currentTime = 0;
    } catch (e) {
      log('Error stopping silent loop:', e.message);
    }
  }
  
  log('Silent loop stopped');
}

export function isSilentLoopRunning() {
  return isRunning;
}
