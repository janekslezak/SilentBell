// ─── Audio Context Module ─────────────────────────────────────────
// Audio context management with iOS-specific handling.

let audioCtx = null;
let isUnlocked = false;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[AudioContext]', ...args);
}

export function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
    log('Created AudioContext, state:', audioCtx.state);
  }
  return audioCtx;
}

export async function unlockAudio() {
  if (isUnlocked && audioCtx?.state === 'running') {
    log('Audio already unlocked');
    return audioCtx;
  }

  log('Unlocking audio...');

  try {
    const ctx = getAudioContext();

    // iOS: Play a short audible sound to unlock - must be audible, not silent
    if (isIOS) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.frequency.value = 440;
      gainNode.gain.value = 0.001; // Very quiet but audible
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.01); // 10ms beep
      
      log('Played unlock beep');
    }

    // Resume the context
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      await ctx.resume();
      log('AudioContext resumed, state:', ctx.state);
    }

    isUnlocked = ctx.state === 'running';
    log('Audio unlocked, state:', ctx.state);

    return ctx;
  } catch (e) {
    log('unlockAudio error:', e.message);
    throw e;
  }
}

export function isAudioUnlocked() {
  return isUnlocked && audioCtx?.state === 'running';
}

// Handle visibility changes - try to resume when page becomes visible
if (isIOS) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioCtx?.state === 'suspended') {
      log('Page visible, attempting to resume AudioContext...');
      audioCtx.resume().then(() => {
        log('AudioContext resumed on visibility change, state:', audioCtx.state);
        isUnlocked = audioCtx.state === 'running';
      }).catch((e) => {
        log('Failed to resume on visibility change:', e.message);
      });
    }
  });
}
