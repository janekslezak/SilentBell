// ─── Silent Loop Module ──────────────────────────────────────────
// Keeps audio session alive for locked-screen playback on mobile.
// Uses a Web Audio oscillator at sub-audible frequency + volume.
// Critical for iOS where audio sessions suspend when screen locks.

import { isIOS } from './platform.js';

let isRunning = false;
let ctx = null;
let oscillator = null;
let gainNode = null;

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[SilentLoop]', ...args); }

export function startSilentLoop() {
  if (isRunning) return;
  isRunning = true;
  log('Starting silent loop...');

  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { isRunning = false; return; }

    ctx = new AC();
    oscillator = ctx.createOscillator();
    gainNode = ctx.createGain();

    oscillator.frequency.value = 1;
    gainNode.gain.value = 0.0001;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();

    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    log('Silent loop started');
  } catch (e) {
    log('Failed:', e.message);
    isRunning = false;
  }
}

export function stopSilentLoop() {
  if (!isRunning) return;
  isRunning = false;
  log('Stopping silent loop...');

  try {
    if (oscillator) { try { oscillator.stop(); oscillator.disconnect(); } catch {} oscillator = null; }
    if (gainNode) { try { gainNode.disconnect(); } catch {} gainNode = null; }
    if (ctx) { try { ctx.close(); } catch {} ctx = null; }
  } catch (e) { log('Error:', e.message); }
}

export function isSilentLoopRunning() { return isRunning; }
