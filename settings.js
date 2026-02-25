import { t } from './lang.js';
import { playStrokes, playSound, ensureAudioContext } from './audio.js';

// ─── State ────────────────────────────────────────────────────────

export let currentSound    = 'bell';
export let prepareSeconds  = 10;
export let notesEnabled    = true;

// ─── Persistence ─────────────────────────────────────────────────

function saveSettings() {
  localStorage.setItem('settings', JSON.stringify({
    duration:  document.getElementById('settings-duration').value,
    sound:     currentSound,
    interval:  document.getElementById('interval-select').value,
    prepare:   prepareSeconds,
    notes:     notesEnabled ? 'on' : 'off'
  }));
}

export function loadSettings(display, formatTime, setTime) {
  var raw = localStorage.getItem('settings');
  var s   = raw ? JSON.parse(raw) : {};

  // Legacy single-key migration
  if (!raw) {
    s.duration = localStorage.getItem('settings_duration');
    s.sound    = localStorage.getItem('settings_sound');
    s.interval = localStorage.getItem('settings_interval');
    s.prepare  = localStorage.getItem('settings_prepare');
    s.notes    = localStorage.getItem('settings_notes');
  }

  if (s.duration) {
    document.getElementById('settings-duration').value = s.duration;
    setTime(parseInt(s.duration) * 60);
  }
  if (s.sound) {
    currentSound = s.sound;
    document.getElementById('settings-sound').value = s.sound;
  }
  if (s.interval) {
    document.getElementById('interval-select').value = s.interval;
  }
  var p = (s.prepare !== null && s.prepare !== undefined && s.prepare !== '')
    ? parseInt(s.prepare) : prepareSeconds;
  prepareSeconds = isNaN(p) ? 10 : p;
  document.getElementById('settings-prepare').value = prepareSeconds;

  if (s.notes) {
    notesEnabled = s.notes === 'on';
    document.getElementById('settings-notes').value = s.notes;
  }
}

export function initSettings(setTime) {
  document.getElementById('settings-sound').addEventListener('change', function() {
    currentSound = this.value;
    saveSettings();
  });
  document.getElementById('interval-select').addEventListener('change', saveSettings);
  document.getElementById('settings-duration').addEventListener('change', function() {
    var dur = parseInt(this.value);
    if (dur > 0) { setTime(dur * 60); saveSettings(); }
  });
  document.getElementById('settings-prepare').addEventListener('change', function() {
    var p = parseInt(this.value);
    if (!isNaN(p) && p >= 0) { prepareSeconds = p; saveSettings(); }
  });
  document.getElementById('settings-notes').addEventListener('change', function() {
    notesEnabled = this.value === 'on';
    saveSettings();
  });
  document.getElementById('btn-test-sound').addEventListener('click', function() {
    var type = document.getElementById('settings-sound').value;
    if (type === 'chugpi') playStrokes('chugpi', 1);
    else if (type !== 'none') playSound(type);
  });
}

