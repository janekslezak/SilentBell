// ─── i18n Module ─────────────────────────────────────────────────
// Internationalization support for multiple languages.

const translations = {
  en: {
    nav_timer: 'Timer',
    nav_log: 'Log',
    nav_settings: 'Settings',
    btn_start: 'Start',
    btn_stop: 'Stop',
    btn_save: 'Save',
    btn_clear: 'Clear Log',
    btn_export: 'Export CSV',
    btn_import: 'Import CSV',
    btn_manual: 'Log Manual Session',
    btn_test: 'Test Sound',
    status_ready: 'Ready',
    status_loading: 'Loading...',
    status_preparing: 'Preparing audio...',
    status_meditating: 'Meditating...',
    status_complete: 'Session complete 🙏',
    status_stopped: 'Stopped early',
    status_prepare: 'Prepare... {secs}s',
    status_error: 'Error - tap to retry',
    settings_duration: 'Default duration (min)',
    settings_sound: 'Sound',
    settings_interval: 'Interval bell (min)',
    settings_prepare: 'Prepare countdown (sec)',
    settings_notes: 'Session notes',
    notes_on: 'Enabled',
    notes_off: 'Disabled',
    sound_bell: 'Temple Bell',
    sound_bell_high: 'High Bell',
    sound_chugpi: 'Chugpi',
    sound_none: 'None',
    interval_none: 'None',
    log_sessions: 'Sessions',
    log_total: 'Total',
    log_completed: 'Completed',
    log_planned: 'planned',
    log_stopped: '(stopped)',
    log_manual: 'manual',
    log_days: 'days',
    log_avg_daily: 'Avg daily',
    chart_last7: 'Last 7 days',
    chart_avg_weekday: 'Avg / weekday',
    note_placeholder: 'How was your session?',
    note_save: 'Save',
    manual_title: 'Log Manual Session',
    manual_saved: 'Session saved',
    manual_err_dur: 'Please enter a valid duration',
    confirm_clear: 'Clear all session history? This cannot be undone.',
    confirm_delete: 'Delete this session? This cannot be undone.',
    export_success: 'Exported {count} sessions to CSV',
    export_error: 'Nothing to export',
    import_success: 'Imported {count} sessions from CSV',
    import_error: 'Could not import CSV',
    ios_install: 'To install: tap Share then "Add to Home Screen"'
  },
  pl: {
    nav_timer: 'Timer',
    nav_log: 'Dziennik',
    nav_settings: 'Ustawienia',
    btn_start: 'Start',
    btn_stop: 'Stop',
    btn_save: 'Zapisz',
    btn_clear: 'Wyczyść dziennik',
    btn_export: 'Eksport CSV',
    btn_import: 'Import CSV',
    btn_manual: 'Dodaj ręcznie',
    btn_test: 'Testuj dźwięk',
    status_ready: 'Gotowy',
    status_loading: 'Ładowanie...',
    status_preparing: 'Przygotowywanie dźwięku...',
    status_meditating: 'Medytacja...',
    status_complete: 'Sesja zakończona 🙏',
    status_stopped: 'Przerwano',
    status_prepare: 'Przygotuj się... {secs}s',
    status_error: 'Błąd - dotknij, aby spróbować',
    settings_duration: 'Domyślny czas (min)',
    settings_sound: 'Dźwięk',
    settings_interval: 'Dzwonek co (min)',
    settings_prepare: 'Odliczanie (sek)',
    settings_notes: 'Notatki',
    notes_on: 'Włączone',
    notes_off: 'Wyłączone',
    sound_bell: 'Dzwon świątynny',
    sound_bell_high: 'Wysoki dzwon',
    sound_chugpi: 'Chugpi',
    sound_none: 'Brak',
    interval_none: 'Brak',
    log_sessions: 'Sesje',
    log_total: 'Razem',
    log_completed: 'Ukończone',
    log_planned: 'planowane',
    log_stopped: '(przerwane)',
    log_manual: 'ręcznie',
    log_days: 'dni',
    log_avg_daily: 'Śr. dzienna',
    chart_last7: 'Ostatnie 7 dni',
    chart_avg_weekday: 'Śr. / dzień tyg.',
    note_placeholder: 'Jak przebiegła sesja?',
    note_save: 'Zapisz',
    manual_title: 'Dodaj sesję ręcznie',
    manual_saved: 'Sesja zapisana',
    manual_err_dur: 'Podaj prawidłowy czas',
    confirm_clear: 'Wyczyścić całą historię? Tej operacji nie można cofnąć.',
    confirm_delete: 'Usunąć tę sesję? Tej operacji nie można cofnąć.',
    export_success: 'Wyeksportowano {count} sesji do CSV',
    export_error: 'Nic do wyeksportowania',
    import_success: 'Zaimportowano {count} sesji z CSV',
    import_error: 'Nie udało się zaimportować CSV',
    ios_install: 'Aby zainstalować: dotknij Udostępnij, potem "Dodaj do ekranu głównego"'
  },
  ko: {
    nav_timer: '타이머',
    nav_log: '기록',
    nav_settings: '설정',
    btn_start: '시작',
    btn_stop: '중지',
    btn_save: '저장',
    btn_clear: '기록 삭제',
    btn_export: 'CSV 낳기',
    btn_import: 'CSV 가져오기',
    btn_manual: '수동 기록',
    btn_test: '소리 테스트',
    status_ready: '준비',
    status_loading: '로딩 중...',
    status_preparing: '오디오 준비 중...',
    status_meditating: '명상 중...',
    status_complete: '세션 완료 🙏',
    status_stopped: '중단됨',
    status_prepare: '준비하세요... {secs}초',
    status_error: '오류 - 재시도하려면 탭하세요',
    settings_duration: '기본 시간 (분)',
    settings_sound: '소리',
    settings_interval: '간격 벨 (분)',
    settings_prepare: '준비 카운트다운 (초)',
    settings_notes: '세션 메모',
    notes_on: '사용',
    notes_off: '사용 안함',
    sound_bell: '절 종',
    sound_bell_high: '높은 종',
    sound_chugpi: 'Chugpi',
    sound_none: '없음',
    interval_none: '없음',
    log_sessions: '세션',
    log_total: '총계',
    log_completed: '완료',
    log_planned: '계획',
    log_stopped: '(중단)',
    log_manual: '수동',
    log_days: '일',
    log_avg_daily: '일일 평균',
    chart_last7: '최근 7일',
    chart_avg_weekday: '요일별 평균',
    note_placeholder: '세션은 어땠나요?',
    note_save: '저장',
    manual_title: '수동 세션 기록',
    manual_saved: '세션이 저장되었습니다',
    manual_err_dur: '유효한 시간을 입력하세요',
    confirm_clear: '모든 기록을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
    confirm_delete: '이 세션을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
    export_success: '{count}개 세션을 CSV로 낳았습니다',
    export_error: '낳을 내용이 없습니다',
    import_success: 'CSV에서 {count}개 세션을 가져왔습니다',
    import_error: 'CSV를 가져올 수 없습니다',
    ios_install: '설치하려면: 공유를 탭한 후 "홈 화면에 추가"를 선택하세요'
  }
};

let currentLang = localStorage.getItem('lang') || 'en';

// Ensure currentLang is valid
if (!translations[currentLang]) {
  currentLang = 'en';
}

export function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

export function getCurrentLang() {
  return currentLang;
}

export function setLang(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updatePageText();
  }
}

function updatePageText() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
}

export function initI18n() {
  // Ensure valid language
  if (!translations[currentLang]) {
    currentLang = 'en';
    localStorage.setItem('lang', 'en');
  }
  updatePageText();
}

export { translations };
