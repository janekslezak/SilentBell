// ─── Wake Lock Module ────────────────────────────────────────────
// Comprehensive screen wake lock for iOS, Android, and all browsers.

import { startSilentLoop, stopSilentLoop } from './silent-loop.js';

let nativeWakeLock = null;
let noSleepInstance = null;
let videoElement = null;
let isActive = false;
let currentMethod = null;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[WakeLock]', ...args);
}

async function acquireNativeWakeLock() {
  if (!('wakeLock' in navigator)) {
    throw new Error('Native Wake Lock API not supported');
  }
  
  try {
    nativeWakeLock = await navigator.wakeLock.request('screen');
    
    nativeWakeLock.addEventListener('release', () => {
      log('Native wake lock released');
      nativeWakeLock = null;
      
      if (isActive && document.visibilityState === 'visible') {
        log('Auto-reacquiring wake lock...');
        setTimeout(() => acquireWakeLock(), 100);
      }
    });
    
    log('Native wake lock acquired');
    return true;
  } catch (err) {
    log('Native wake lock failed:', err.message);
    throw err;
  }
}

async function acquireNoSleepWakeLock() {
  if (typeof window.NoSleep === 'undefined') {
    throw new Error('NoSleep.js not available');
  }
  
  try {
    if (!noSleepInstance) {
      noSleepInstance = new window.NoSleep();
    }
    
    await noSleepInstance.enable();
    log('NoSleep.js wake lock acquired');
    return true;
  } catch (err) {
    log('NoSleep.js failed:', err.message);
    throw err;
  }
}

async function acquireVideoWakeLock() {
  try {
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('muted', '');
      videoElement.setAttribute('loop', '');
      videoElement.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
      
      const webmBlob = new Blob([
        new Uint8Array([0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81, 0x01, 0x42, 0xF7, 0x81,
          0x01, 0x42, 0xF2, 0x81, 0x04, 0x42, 0xF3, 0x81, 0x08, 0x42, 0x82, 0x84,
          0x77, 0x65, 0x62, 0x6D, 0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02])
      ], { type: 'video/webm' });
      
      videoElement.src = URL.createObjectURL(webmBlob);
      document.body.appendChild(videoElement);
    }
    
    videoElement.muted = true;
    videoElement.volume = 0;
    
    await videoElement.play();
    log('Video wake lock acquired');
    return true;
  } catch (err) {
    log('Video wake lock failed:', err.message);
    throw err;
  }
}

export async function acquireWakeLock() {
  if (isActive) {
    log('Wake lock already active');
    return currentMethod;
  }
  
  isActive = true;
  
  startSilentLoop();
  
  const methods = [
    { name: 'native', fn: acquireNativeWakeLock },
    { name: 'nosleep', fn: acquireNoSleepWakeLock },
    { name: 'video', fn: acquireVideoWakeLock }
  ];
  
  for (const method of methods) {
    try {
      await method.fn();
      currentMethod = method.name;
      log('Using method:', method.name);
      return method.name;
    } catch (err) {
      log(method.name, 'failed, trying next...');
    }
  }
  
  log('All wake lock methods failed, using silent loop only');
  currentMethod = 'audio-only';
  return 'audio-only';
}

export async function releaseWakeLock() {
  isActive = false;
  currentMethod = null;
  
  stopSilentLoop();
  
  if (nativeWakeLock) {
    try {
      await nativeWakeLock.release();
      log('Native wake lock released');
    } catch (err) {
      log('Error releasing native wake lock:', err.message);
    }
    nativeWakeLock = null;
  }
  
  if (noSleepInstance) {
    try {
      noSleepInstance.disable();
      log('NoSleep.js disabled');
    } catch (err) {
      log('Error disabling NoSleep.js:', err.message);
    }
    noSleepInstance = null;
  }
  
  if (videoElement) {
    try {
      videoElement.pause();
      videoElement.currentTime = 0;
      log('Video wake lock stopped');
    } catch (err) {
      log('Error stopping video:', err.message);
    }
  }
}

export function isWakeLockActive() {
  return isActive;
}

export function getWakeLockMethod() {
  return currentMethod;
}

let audioKeepaliveInterval = null;
let silentBufferSource = null;

export function startAudioKeepalive(audioContext) {
  if (audioKeepaliveInterval) {
    clearInterval(audioKeepaliveInterval);
  }
  
  if (isIOS && audioContext) {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.frequency.value = 1;
      gainNode.gain.value = 0.001;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      silentBufferSource = oscillator;
      
      log('iOS continuous silent audio started');
    } catch (e) {
      log('Error starting continuous silent audio:', e.message);
    }
  }
  
  audioKeepaliveInterval = setInterval(() => {
    if (!audioContext) return;
    
    if (audioContext.state === 'suspended') {
      log('Attempting to resume AudioContext...');
      audioContext.resume().catch(() => {});
    }
    
    try {
      const buffer = audioContext.createBuffer(1, 128, audioContext.sampleRate);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (e) {}
    
  }, 1000);
  
  log('Audio keepalive started');
}

export function stopAudioKeepalive() {
  if (audioKeepaliveInterval) {
    clearInterval(audioKeepaliveInterval);
    audioKeepaliveInterval = null;
    log('Audio keepalive stopped');
  }
  
  if (silentBufferSource) {
    try {
      silentBufferSource.stop();
      silentBufferSource = null;
    } catch (e) {}
  }
}

export function setupVisibilityHandler(audioContext) {
  document.addEventListener('visibilitychange', async () => {
    log('Visibility changed:', document.visibilityState);
    
    if (document.visibilityState === 'visible') {
      if (isActive && !nativeWakeLock && !noSleepInstance) {
        log('Reacquiring wake lock after visibility change...');
        await acquireWakeLock();
      }
      
      if (audioContext && audioContext.state === 'suspended') {
        log('Resuming AudioContext after visibility change...');
        audioContext.resume().catch(() => {});
      }
    } else {
      if (isActive) {
        log('Page hidden - ensuring silent loop for locked screen');
        startSilentLoop();
      }
    }
  });
}

export function isIOSStandalone() {
  return isIOS && isStandalone;
}

export function setupIOSStandaloneHandler() {
  if (!isIOSStandalone()) return;
  
  log('iOS standalone mode detected');
  
  window.addEventListener('pagehide', () => {
    log('Page hide event - maintaining audio session');
    if (isActive) {
      startSilentLoop();
    }
  });
  
  window.addEventListener('pageshow', () => {
    log('Page show event - checking audio session');
  });
  
  window.addEventListener('beforeunload', () => {
    cleanupWakeLock();
  });
}

export function cleanupWakeLock() {
  releaseWakeLock();
  stopAudioKeepalive();
  
  if (videoElement) {
    try {
      URL.revokeObjectURL(videoElement.src);
      videoElement.remove();
    } catch (e) {}
    videoElement = null;
  }
}

export function getWakeLockInfo() {
  return {
    isActive,
    currentMethod,
    isIOS,
    isAndroid,
    isStandalone,
    nativeWakeLock: nativeWakeLock ? { released: nativeWakeLock.released } : null,
    noSleepInstance: noSleepInstance ? { enabled: noSleepInstance.enabled } : null,
    videoElement: videoElement ? { paused: videoElement.paused } : null
  };
}
