// ─── State Module ────────────────────────────────────────────────
// Application state management with localStorage persistence.

const STORAGE_KEY = 'silent_bell_state';

const defaultState = {
  timer: {
    selectedMinutes: 20,
    selectedSeconds: 0,
    prepareSeconds: 10
  },
  audio: {
    currentSound: 'bell'
  },
  settings: {
    duration: 20,
    sound: 'bell',
    interval: 0,
    prepare: 10,
    notes: true
  }
};

export let state = { ...defaultState };

export function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      state = { ...defaultState, ...parsed };
    }
  } catch (e) {
    console.log('State load error:', e.message);
  }
}

export function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.log('State save error:', e.message);
  }
}

export function get(key) {
  const keys = key.split('.');
  let value = state;
  for (const k of keys) {
    value = value?.[k];
  }
  return value;
}

export function set(key, value) {
  const keys = key.split('.');
  let target = state;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) target[keys[i]] = {};
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
}
