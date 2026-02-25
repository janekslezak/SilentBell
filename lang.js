// ─── i18n & Theme ────────────────────────────────────────────────

export const STRINGS = {
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
    btn_manual:        '+ Manual',
    manual_title:      'Log Manual Session',
    settings_duration: 'Default duration (min)',
    settings_sound:    'Sound',
    settings_prepare:  'Prepare countdown (sec)',
    settings_notes:    'Session notes',
    notes_on:          'Enabled',
    notes_off:         'Disabled',
    settings_saved:    'Saved ✓',
    log_sessions:      'Sessions',
    log_total:         'Total time',
    log_completed:     'Completed',
    log_planned:       'planned',
    log_stopped:       '⚠ stopped early',
    log_manual:        'manual',
    confirm_clear:     'Clear all session history?',
    ios_install:       'To install: tap the Share button ↑ then "Add to Home Screen"',
    log_streak:        'Streak',
    log_days:          'days',
    note_placeholder:  'Note (optional)',
    note_save:         'Save ✓',
    manual_saved:      'Session saved.',
    manual_err_dur:    'Please enter a duration.'
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
    btn_manual:        '+ Ręczna',
    manual_title:      'Dodaj sesję ręcznie',
    settings_duration: 'Domyślny czas (min)',
    settings_sound:    'Dźwięk',
    settings_prepare:  'Odliczanie przed startem (s)',
    settings_notes:    'Notatki sesji',
    notes_on:          'Włączone',
    notes_off:         'Wyłączone',
    settings_saved:    'Zapisano ✓',
    log_sessions:      'Sesje',
    log_total:         'Łączny czas',
    log_completed:     'Ukończone',
    log_planned:       'zaplanowano',
    log_stopped:       '⚠ przerwano',
    log_manual:        'ręczna',
    confirm_clear:     'Wyczyścić historię sesji?',
    ios_install:       'Aby zainstalować: wybierz Udostępnij ↑, potem „Dodaj do ekranu głównego"',
    log_streak:        'Seria',
    log_days:          'dni',
    note_placeholder:  'Notatka (opcjonalna)',
    note_save:         'Zapisz ✓',
    manual_saved:      'Sesja zapisana.',
    manual_err_dur:    'Podaj czas trwania.'
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
    label_sound:       '소리',
    label_interval:    '간격 소리 (매)',
    sound_bell:        '범종',
    sound_bell_high:   '범종 (높은 음)',
    sound_chugpi:      '죽비',
    sound_silent:      '무음',
    interval_none:     '없음',
    btn_start:         '시작',
    btn_stop:          '정지',
    btn_export:        'CSV 내보내기',
    btn_clear:         '기록 삭제',
    btn_save:          '저장',
    btn_manual:        '+ 수동',
    manual_title:      '수동 세션 기록',
    settings_duration: '기본 시간 (분)',
    settings_sound:    '소리',
    settings_prepare:  '준비 카운트다운 (초)',
    settings_notes:    '세션 메모',
    notes_on:          '활성화',
    notes_off:         '비활성화',
    settings_saved:    '저장됨 ✓',
    log_sessions:      '세션',
    log_total:         '전체 시간',
    log_completed:     '완료',
    log_planned:       '계획',
    log_stopped:       '⚠ 중단됨',
    log_manual:        '수동',
    confirm_clear:     '모든 세션 기록을 삭제하시겠습니까?',
    ios_install:       '설치하려면: 공유 버튼을 탭한 후 "홈 화면에 추가"를 선택하세요',
    log_streak:        '연속',
    log_days:          '일',
    note_placeholder:  '메모 (선택)',
    note_save:         '저장 ✓',
    manual_saved:      '세션이 저장되었습니다.',
    manual_err_dur:    '시간을 입력하세요.'
  }
};

export let currentLang  = localStorage.getItem('lang')  || 'en';
export let currentTheme = localStorage.getItem('theme') || 'dark';

export function t(key) {
  return (STRINGS[currentLang] && STRINGS[currentLang][key])
      || (STRINGS['en']        && STRINGS['en'][key])
      || key;
}

export function applyLang() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  var allLangs   = ['en', 'pl', 'ko'];
  var otherLangs = allLangs.filter(function(l) { return l !== currentLang; });
  var langDisplay = { en: 'EN', pl: 'PL', ko: '한' };
  document.querySelectorAll('.btn-lang').forEach(function(btn, i) {
    btn.dataset.lang = otherLangs[i];
    btn.textContent  = langDisplay[otherLangs[i]];
  });
}

export function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.getElementById('btn-theme').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = currentTheme === 'dark' ? '#111820' : '#f0ece4';
}

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
}

export function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('theme', theme);
}
