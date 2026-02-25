import { currentLang, currentTheme, applyLang, applyTheme,
         setLang, setTheme } from './lang.js';
import { unlockAudio } from './audio.js';
import { renderLog, initExport, initImport,
         initManualEntry, initClearLog } from './log.js';
import { loadSettings, initSettings } from './settings.js';
import { setTime, formatTime, initDisplayControls,
         initTimerButtons } from './timer.js';

// ─── Navigation ───────────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'log') renderLog();
  });
});

// ─── Language & Theme buttons ─────────────────────────────────────

document.querySelectorAll('.btn-lang').forEach(function(btn) {
  btn.addEventListener('click', function() {
    setLang(btn.dataset.lang);
    applyLang();
  });
});

document.getElementById('btn-theme').addEventListener('click', function() {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  applyTheme();
});

// ─── iOS Install Banner ───────────────────────────────────────────

(function() {
  var isIos        = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isStandalone = window.navigator.standalone === true;
  var dismissed    = localStorage.getItem('iosPromptDismissed');
  if (!isIos || isStandalone || dismissed) return;
  var banner = document.getElementById('ios-install-banner');
  if (!banner) return;
  banner.style.display = 'flex';
  document.getElementById('ios-install-close').addEventListener('click', function() {
    banner.style.display = 'none';
    localStorage.setItem('iosPromptDismissed', '1');
  });
})();

// ─── Init ─────────────────────────────────────────────────────────

applyLang();
applyTheme();
loadSettings(null, null, setTime);
initSettings(setTime);
initDisplayControls();
initTimerButtons();
initExport();
initImport();
initManualEntry();
initClearLog();

