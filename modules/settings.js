// ─── Settings Module ─────────────────────────────────────────────

import { t } from './i18n.js';
import { setCurrentSound, setPrepareSeconds, setNotesEnabled, setSelectedMinutes, setSelectedSeconds, formatTime } from './timer.js';

let settingsDuration, settingsSound, settingsPrepare, settingsNotes;

export function initSettingsRefs() {
  settingsDuration = document.getElementById('settings-duration');
  settingsSound = document.getElementById('settings-sound');
  settingsPrepare = document.getElementById('settings-prepare');
  settingsNotes = document.getElementById('settings-notes');
}

export function loadSettings(displayEl) {
  var dur = localStorage.getItem('settings_duration');
  var sound = localStorage.getItem('settings_sound');
  var prep = localStorage.getItem('settings_prepare');
  var interval = localStorage.getItem('settings_interval');
  var notes = localStorage.getItem('settings_notes');

  if (dur) {
    if (settingsDuration) settingsDuration.value = dur;
    setSelectedMinutes(parseInt(dur));
    setSelectedSeconds(0);
    if (displayEl) displayEl.textContent = formatTime(parseInt(dur) * 60);
  }
  if (sound) {
    if (settingsSound) settingsSound.value = sound;
    setCurrentSound(sound);
  }
  if (interval) {
    var intervalSelect = document.getElementById('interval-select');
    if (intervalSelect) intervalSelect.value = interval;
  }

  var p = (prep !== null && prep !== '') ? parseInt(prep) : 10;
  setPrepareSeconds(p);
  if (settingsPrepare) settingsPrepare.value = p;

  if (notes) {
    setNotesEnabled(notes === 'on');
    if (settingsNotes) settingsNotes.value = notes;
  }
}

export function setupSettingsListeners(displayEl) {
  if (settingsSound) {
    settingsSound.addEventListener('change', function() {
      setCurrentSound(settingsSound.value);
      localStorage.setItem('settings_sound', settingsSound.value);
    });
  }

  var intervalSelect = document.getElementById('interval-select');
  if (intervalSelect) {
    intervalSelect.addEventListener('change', function() {
      localStorage.setItem('settings_interval', intervalSelect.value);
    });
  }

  if (settingsDuration) {
    settingsDuration.addEventListener('change', function() {
      var dur = parseInt(settingsDuration.value);
      if (dur > 0) {
        localStorage.setItem('settings_duration', dur);
        setSelectedMinutes(dur);
        setSelectedSeconds(0);
        if (displayEl) displayEl.textContent = formatTime(dur * 60);
      }
    });
  }

  if (settingsPrepare) {
    settingsPrepare.addEventListener('change', function() {
      var prep = parseInt(settingsPrepare.value);
      if (!isNaN(prep) && prep >= 0) {
        setPrepareSeconds(prep);
        localStorage.setItem('settings_prepare', prep);
      }
    });
  }

  if (settingsNotes) {
    settingsNotes.addEventListener('change', function() {
      setNotesEnabled(settingsNotes.value === 'on');
      localStorage.setItem('settings_notes', settingsNotes.value);
    });
  }
}
