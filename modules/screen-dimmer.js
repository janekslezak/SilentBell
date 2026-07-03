// ─── Screen Dimmer Module ────────────────────────────────────────
// Dims the screen during meditation. Uses z-index layering to
// control interaction — no fragile pointer-events timing hacks.
//
// States:
//   Dimmed:    z-index 99999 + opacity 0.97  → overlay ON TOP, captures taps
//   Preview:   z-index 0 + opacity 0.5       → overlay BEHIND, buttons work
//   Hidden:    z-index 0 + opacity 0          → off
//
// The overlay stays at z-index 99999 for 350ms after a tap,
// covering the iOS synthetic click window (50–300ms).

import { isIOS } from './platform.js';

let overlay = null;
let isDimmed = false;
let settingEnabled = false;
let restoreTimer = null;
let pointerTimer = null;

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[Dimmer]', ...args); }

const Z_TOP = '99999';
const Z_BEHIND = '0';

export function setDimmerEnabled(enabled) {
  settingEnabled = !!enabled;
  log('Setting:', settingEnabled);
}

export function getDimmerEnabled() {
  return settingEnabled;
}

function buildOverlay() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'sb-dimmer';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'width:100vw', 'height:100vh',
    'background:#000', 'opacity:0', 'z-index:' + Z_BEHIND,
    'pointer-events:none',
    'transition:opacity 1.2s ease-in-out',
    '-webkit-tap-highlight-color:transparent'
  ].join(';') + ';';

  overlay.addEventListener('click', onTap);
  overlay.addEventListener('touchstart', onTap, { passive: true });

  document.body.appendChild(overlay);
  log('Overlay built');
}

function onTap(e) {
  if (!isDimmed || !overlay) return;
  e.preventDefault();
  e.stopPropagation();

  if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
  if (pointerTimer) { clearTimeout(pointerTimer); pointerTimer = null; }

  // ── Preview mode: brighten ──
  // Keep z-index at Z_TOP for now so the synthetic click (50–300ms
  // after touchstart on iOS) is captured by the overlay, not the
  // Stop button underneath.
  overlay.style.opacity = isIOS ? '0.65' : '0.45';

  // ── After 350ms: drop behind buttons ──
  // The synthetic click has fired by now. Drop the overlay behind
  // the controls so buttons become clickable.
  pointerTimer = setTimeout(() => {
    if (!isDimmed || !overlay) return;
    overlay.style.zIndex = Z_BEHIND;
    overlay.style.pointerEvents = 'none';
    log('Preview: pointer-events off');
  }, 350);

  // ── Re-dim after 3 seconds ──
  restoreTimer = setTimeout(() => {
    if (!isDimmed || !overlay) return;
    // Bring to front FIRST (before opacity transition)
    overlay.style.zIndex = Z_TOP;
    overlay.style.pointerEvents = 'auto';
    // Let z-index apply, then fade
    requestAnimationFrame(() => {
      overlay.style.opacity = getTargetOpacity();
    });
    log('Re-dimmed');
  }, 3000);
}

function getTargetOpacity() {
  return isIOS ? '0.97' : '0.90';
}

export function dimScreen() {
  if (!settingEnabled) { log('Disabled'); return; }
  buildOverlay();
  isDimmed = true;

  setTimeout(() => {
    if (!isDimmed || !overlay) return;
    overlay.style.zIndex = Z_TOP;
    overlay.style.pointerEvents = 'auto';
    overlay.style.opacity = getTargetOpacity();
    log('Dimmed');
  }, 2500);
}

export function restoreScreen() {
  isDimmed = false;
  if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
  if (pointerTimer) { clearTimeout(pointerTimer); pointerTimer = null; }
  if (!overlay) return;
  overlay.style.opacity = '0';
  overlay.style.zIndex = Z_BEHIND;
  overlay.style.pointerEvents = 'none';
  log('Restored');
}

export function isScreenDimmed() {
  return isDimmed;
}
