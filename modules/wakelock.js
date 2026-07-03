// ─── Wake Lock Module ────────────────────────────────────────────
// Multi-strategy screen wake lock: native API → NoSleep.js → video → audio-only.
// Prevents screen dimming/locking during meditation sessions.

import { startSilentLoop, stopSilentLoop } from './silent-loop.js';
import { isIOS, isStandalone, supportsWakeLock } from './platform.js';

let nativeWakeLock = null;
let noSleepInstance = null;
let videoElement = null;
let isActive = false;
let currentMethod = null;

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[WakeLock]', ...args); }

async function acquireNativeWakeLock() {
  if (!supportsWakeLock()) throw new Error('Not supported');
  nativeWakeLock = await navigator.wakeLock.request('screen');
  nativeWakeLock.addEventListener('release', () => {
    log('Native wake lock released');
    nativeWakeLock = null;
    if (isActive && document.visibilityState === 'visible') {
      setTimeout(() => acquireWakeLock(), 100);
    }
  });
  log('Native wake lock acquired');
  return true;
}

async function acquireNoSleepWakeLock() {
  if (typeof window.NoSleep === 'undefined') throw new Error('NoSleep.js not available');
  if (!noSleepInstance) noSleepInstance = new window.NoSleep();
  await noSleepInstance.enable();
  log('NoSleep.js wake lock acquired');
  return true;
}

async function acquireVideoWakeLock() {
  if (!videoElement) {
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('muted', '');
    videoElement.setAttribute('loop', '');
    videoElement.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
    const webmBlob = new Blob([new Uint8Array([0x1A,0x45,0xDF,0xA3,0x9F,0x42,0x86,0x81,0x01,0x42,0xF7,0x81,0x01,0x42,0xF2,0x81,0x04,0x42,0xF3,0x81,0x08,0x42,0x82,0x84,0x77,0x65,0x62,0x6D,0x42,0x87,0x81,0x02,0x42,0x85,0x81,0x02])], { type: 'video/webm' });
    videoElement.src = URL.createObjectURL(webmBlob);
    document.body.appendChild(videoElement);
  }
  videoElement.muted = true;
  videoElement.volume = 0;
  await videoElement.play();
  log('Video wake lock acquired');
  return true;
}

export async function acquireWakeLock() {
  if (isActive) return currentMethod;
  isActive = true;
  startSilentLoop();

  // iOS prioritizes NoSleep.js (works best in standalone PWAs)
  const methods = isIOS
    ? [{ name: 'nosleep', fn: acquireNoSleepWakeLock }, { name: 'native', fn: acquireNativeWakeLock }, { name: 'video', fn: acquireVideoWakeLock }]
    : [{ name: 'native', fn: acquireNativeWakeLock }, { name: 'nosleep', fn: acquireNoSleepWakeLock }, { name: 'video', fn: acquireVideoWakeLock }];

  for (const method of methods) {
    try { await method.fn(); currentMethod = method.name; log('Using:', method.name); return method.name; }
    catch { log(method.name, 'failed, trying next...'); }
  }

  log('All methods failed, using audio-only');
  currentMethod = 'audio-only';
  return 'audio-only';
}

export async function releaseWakeLock() {
  isActive = false;
  currentMethod = null;
  stopSilentLoop();

  if (nativeWakeLock) { try { await nativeWakeLock.release(); } catch {} nativeWakeLock = null; }
  if (noSleepInstance) { try { noSleepInstance.disable(); } catch {} noSleepInstance = null; }
  if (videoElement) { try { videoElement.pause(); videoElement.currentTime = 0; } catch {} }
}

export function isWakeLockActive() { return isActive; }
export function getWakeLockMethod() { return currentMethod; }

export function getWakeLockInfo() {
  return { isActive, currentMethod, isIOS, isStandalone };
}
