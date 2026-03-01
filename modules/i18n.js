// ─── i18n Module ─────────────────────────────────────────────────
// Internationalization with central state integration.

import { state, set, get } from './state.js';

// Translation strings
const STRINGS = {
  en: {
    app_title:         'Silent Bell',
    nav_timer:         'Timer',
    nav_log:           'Log',
    nav_settings:      'Settings',
    status_ready:      'Ready',
    status_meditating: 'Meditating…',
    status_complete:   'Session complete 🙏',
    status_stopped:    'Stopped early',
    status_prepare:    'Prepare… {secs}s',
    status_error:      'Error starting session',
    status_audio_interrupted: 'Audio interrupted - tap to resume',
    label_sound:       'Sound',
    label_interval:    'Interval sound every',
    sound_bell:        'Bell',
    sound_bell_high:   'Bell (Higher pitch)',
    sound_chugpi:      'Jugbi 죽비',
    sound_silent:      'Silent',
    interval_none:     'None',
    btn_start:         'Start',
    btn_stop:          'Stop',
    btn_export:        'Export CSV',
    btn_clear:         'Clear Log',
    btn_save:          'Save',
    settings_duration: 'Default duration (min)',
    settings_sound:    'Sound',
    settings_prepare:  'Prepare countdown (sec)',
    settings_notes:    'Session notes',
    notes_on:          'Enabled',
    notes_off:         'Disabled',
    settings_saved:    'Saved ✓',
    settings_quota_error: 'Storage full. Some settings may not be saved.',
    log_sessions:      'Sessions',
    log_total:         'Total time',
    log_completed:     'Completed',
    log_planned:       'planned',
    log_stopped:       '⚠ stopped early',
    confirm_clear:     'Clear all session history?',
    ios_install:       'To install: tap the Share button ↑ then "Add to Home Screen"',
    log_streak:        'Streak',
    log_days:          'days',
    note_placeholder:  'Note (optional)',
    note_save:         'Save ✓',
    btn_manual:        '+ Manual Add',
    manual_title:      'Log Manual Session',
    manual_saved:      'Session saved ✓',
    manual_err_dur:    'Please enter a valid duration.',
    log_manual:        '✎ manual',
    log_avg_daily:     'Avg daily',
    chart_last7:       'Last 7 days',
    chart_avg_weekday: 'Avg / Weekday',
    chart_avg_label:   'average',
    import_success:    'Imported {count} sessions from CSV.',
    import_error:      'Could not import CSV: ',
    save_error:        'Failed to save session',
    export_error:      'Failed to export'
  },
  pl: {
    app_title:         'Dzwon Ciszy',
    nav_timer:         'Timer',
    nav_log:           'Dziennik',
    nav_settings:      'Ustawienia',
    status_ready:      'Gotowy',
    status_meditating: 'Medytacja…',
    status_complete:   'Sesja zakończona 🙏',
    status_stopped:    'Przerwano',
    status_prepare:    'Przygotuj się… {secs}s',
    status_error:      'Błąd uruchamiania sesji',
    status_audio_interrupted: 'Dźwięk przerwany - dotknij, aby wznowić',
    label_sound:       'Dźwięk',
    label_interval:    'Dźwięk co każde',
    sound_bell:        'Dzwon',
    sound_bell_high:   'Dzwon (Wyższy dźwięk)',
    sound_chugpi:      'Jugbi 죽비',
    sound_silent:      'Cisza',
    interval_none:     'Brak',
    btn_start:         'Start',
    btn_stop:          'Stop',
    btn_export:        'Eksport CSV',
    btn_clear:         'Wyczyść',
    btn_save:          'Zapisz',
    settings_duration: 'Domyślny czas (min)',
    settings_sound:    'Dźwięk',
    settings_prepare:  'Odliczanie przed startem (s)',
    settings_notes:    'Notatki sesji',
    notes_on:          'Włączone',
    notes_off:         'Wyłączone',
    settings_saved:    'Zapisano ✓',
    settings_quota_error: 'Pamięć pełna. Niektóre ustawienia mogą nie zostać zapisane.',
    log_sessions:      'Sesje',
    log_total:         'Łączny czas',
    log_completed:     'Ukończone',
    log_planned:       'zaplanowano',
    log_stopped:       '⚠ przerwano',
    confirm_clear:     'Wyczyścić historię sesji?',
    ios_install:       'Aby zainstalować: wybierz Udostępnij ↑, potem „Dodaj do ekranu głównego"',
    log_streak:        'Seria',
    log_days:          'dni',
    note_placeholder:  'Notatka (opcjonalna)',
    note_save:         'Zapisz ✓',
    btn_manual:        '+ Dodaj Ręcznie',
    manual_title:      'Dodaj sesję ręcznie',
    manual_saved:      'Sesja zapisana ✓',
    manual_err_dur:    'Podaj prawidłowy czas trwania.',
    log_manual:        '✎ ręcznie',
    log_avg_daily:     'Śr. dzienna',
    chart_last7:       'Ostatnie 7 dni',
    chart_avg_weekday: 'Średnia / Dzień Tygodnia',
    chart_avg_label:   'średnia',
    import_success:    'Zaimportowano {count} sesji z CSV.',
    import_error:      'Nie można zaimportować CSV: ',
    save_error:        'Nie udało się zapisać sesji',
    export_error:      'Eksport nie powiódł się'
  },
  ko: {
    app_title:         '침묵의 종',
    nav_timer:         '타이머',
    nav_log:           '기록',
    nav_settings:      '설정',
    status_ready:      '준비',
    status_meditating: '명상 중…',
    status_complete:   '세션 완료 🙏',
    status_stopped:    '중단됨',
    status_prepare:    '준비하세요… {secs}초',
    status_error:      '세션 시작 오류',
    status_audio_interrupted: '오디오 중단됨 - 재개하려면 탭하세요',
    label_sound:       '소리',
    label_interval:    '간격 소리 (매)',
    sound_bell:        '범종',
    sound_bell_high:   '범종 (높은 음)',
    sound_chugpi:      '죽비',
    sound_silent:      '무음',
    interval_none:     '없음',
    btn_start:         '시작',
    btn_stop:          '정지',
    btn_export:        'CSV 날보기',
    btn_clear:         '기록 삭제',
    btn_save:          '저장',
    settings_duration: '기본 시간 (분)',
    settings_sound:    '소리',
    settings_prepare:  '준비 카운트다운 (초)',
    settings_notes:    '세션 메모',
    notes_on:          '활성화',
    notes_off:         '비활성화',
    settings_saved:    '저장됨 ✓',
    settings_quota_error: '저장 공간이 부족합니다. 일부 설정이 저장되지 않을 수 있습니다.',
    log_sessions:      '세션',
    log_total:         '총 시간',
    log_completed:     '완료',
    log_planned:       '계획',
    log_stopped:       '⚠ 중단됨',
    confirm_clear:     '모든 세션 기록을 삭제하시겠습니까?',
    ios_install:       '설치하려면: 공유 버튼을 탭한 후 "홈 화면에 추가"를 선택하세요',
    log_streak:        '연속',
    log_days:          '일',
    note_placeholder:  '메모 (선택)',
    note_save:         '저장 ✓',
    btn_manual:        '+ 수동 입력',
    manual_title:      '수동 세션 기록',
    manual_saved:      '세션 저장됨 ✓',
    manual_err_dur:    '올바른 시간을 입력하세요.',
    log_manual:        '✎ 수동',
    log_avg_daily:     '일일 평균',
    chart_last7:       '최근 7일',
    chart_avg_weekday: '요일 평균',
    chart_avg_label:   '평균',
    import_success:    'CSV에서 {count}개의 세션을 가져왔습니다.',
    import_error:      'CSV를 가져올 수 없습니다: ',
    save_error:        '세션 저장 실패',
    export_error:      '날볼 수 없습니다'
  }
};

// Current language and theme
let currentLang = 'en';
let currentTheme = 'dark';

// Initialize from state or legacy storage
function initFromStorage() {
  // Try central state first
  const stateLang = get('settings.language');
  const stateTheme = get('settings.theme');
  
  if (stateLang && STRINGS[stateLang]) {
    currentLang = stateLang;
  } else {
    // Fallback to legacy localStorage
    const legacyLang = localStorage.getItem('lang');
    if (legacyLang && STRINGS[legacyLang]) {
      currentLang = legacyLang;
    }
  }
  
  if (stateTheme) {
    currentTheme = stateTheme;
  } else {
    // Fallback to legacy localStorage
    const legacyTheme = localStorage.getItem('theme');
    if (legacyTheme) {
      currentTheme = legacyTheme;
    }
  }
}

// Translate function
export function t(key, replacements = {}) {
  let text = (STRINGS[currentLang] && STRINGS[currentLang][key])
      || (STRINGS['en'] && STRINGS['en'][key])
      || key;
  
  // Replace placeholders
  for (const [placeholder, value] of Object.entries(replacements)) {
    text = text.replace(`{${placeholder}}`, value);
  }
  
  return text;
}

// Getters
export function getCurrentLang() { return currentLang; }

export function setCurrentLang(lang) { 
  if (STRINGS[lang]) {
    currentLang = lang;
    set('settings.language', lang);
    state.saveToStorage();
  }
}

export function getCurrentTheme() { return currentTheme; }

export function setCurrentTheme(theme) { 
  if (theme === 'dark' || theme === 'light') {
    currentTheme = theme;
    set('settings.theme', theme);
    state.saveToStorage();
  }
}

// Apply language to DOM
export function applyLang() {
  document.documentElement.lang = currentLang;
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) {
      el.textContent = t(key);
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (key) {
      el.placeholder = t(key);
    }
  });
  
  // Update language buttons
  const allLangs = ['en', 'pl', 'ko'];
  const otherLangs = allLangs.filter(l => l !== currentLang);
  const langDisplay = { en: 'EN', pl: 'PL', ko: '한' };
  
  document.querySelectorAll('.btn-lang').forEach((btn, i) => {
    if (otherLangs[i]) {
      btn.dataset.lang = otherLangs[i];
      btn.textContent = langDisplay[otherLangs[i]];
    }
  });
}

// Apply theme to DOM
export function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  }
  
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = currentTheme === 'dark' ? '#111820' : '#f0ece4';
  }
}

// Initialize i18n
export function initI18n() {
  // Load from storage
  initFromStorage();
  
  // Apply to DOM
  applyLang();
  applyTheme();
  
  // Setup language buttons
  document.querySelectorAll('.btn-lang').forEach(btn => {
    btn.addEventListener('click', () => {
      const newLang = btn.dataset.lang;
      if (newLang && STRINGS[newLang]) {
        currentLang = newLang;
        set('settings.language', newLang);
        state.saveToStorage();
        applyLang();
      }
    });
  });
  
  // Setup theme button
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      set('settings.theme', currentTheme);
      state.saveToStorage();
      applyTheme();
    });
  }
}

// Get available languages
export function getAvailableLanguages() {
  return Object.keys(STRINGS);
}

// Check if translation exists
export function hasTranslation(key, lang = currentLang) {
  return !!(STRINGS[lang] && STRINGS[lang][key]);
}

// Add custom translations (for extensions)
export function addTranslations(lang, translations) {
  if (!STRINGS[lang]) {
    STRINGS[lang] = {};
  }
  Object.assign(STRINGS[lang], translations);
}
