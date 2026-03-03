// ─── Log Module ──────────────────────────────────────────────────
// Session logging, export, import, and visualization.

import { t, getCurrentLang } from './i18n.js';

let sessionStart = null;
let plannedDuration = 0;
let currentSound = 'bell';

let chartMode = localStorage.getItem('log_chart_mode') || 'week';

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Log]', ...args);
}

export function setSessionStart(start) { sessionStart = start; }
export function setPlannedDuration(duration) { plannedDuration = duration; }
export function setCurrentSoundForLog(sound) { currentSound = sound; }

export function getSessions() {
  try { return JSON.parse(localStorage.getItem('meditation_log')) || []; }
  catch(e) { return []; }
}

export function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? (m + 'm ' + s + 's') : (m + 'm');
}

export function computeStreak(sessions) {
  const dateSet = {};
  sessions.forEach(s => {
    if (!s.completed) return;
    const d = new Date(s.id);
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    dateSet[k] = true;
  });
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (dateSet[k]) { streak++; } else { break; }
  }
  return streak;
}

export function computeAvgDaily(sessions) {
  if (!sessions.length) return 0;
  
  const dateSet = {};
  let totalSecs = 0;
  
  sessions.forEach(s => {
    if (!s.completed) return;
    const d = new Date(s.id);
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    dateSet[k] = true;
    totalSecs += s.actual;
  });
  
  const uniqueDays = Object.keys(dateSet).length;
  if (uniqueDays === 0) return 0;
  
  return Math.round(totalSecs / uniqueDays);
}

function getChartColors() {
  const cs = getComputedStyle(document.documentElement);
  return {
    accent: cs.getPropertyValue('--accent').trim() || '#88c0d0',
    muted: cs.getPropertyValue('--muted').trim() || '#7b8fa1',
    border: cs.getPropertyValue('--border').trim() || '#2e3a4e'
  };
}

function buildEmptyChart(svgW, H, LH, TOPH, colors) {
  const W = 7, BW = 28, GAP = 8;
  const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';
  
  let bars = '';
  for (let i = 0; i < 7; i++) {
    const x = i * (BW + GAP);
    const labelDate = new Date(2024, 0, 1);
    labelDate.setDate(labelDate.getDate() + i);
    // Two-letter weekday format
    const shortLabel = labelDate.toLocaleDateString(locale, { weekday: 'short' });
    const label = shortLabel.substring(0, 2);
    
    bars += '<rect x="' + x + '" y="' + (H - 2) + '" width="' + BW +
      '" height="2" rx="1" fill="' + colors.border + '" opacity="0.35"></rect>' +
      '<text x="' + (x + BW / 2) + '" y="' + (H + LH - 2) +
      '" text-anchor="middle" font-size="10" fill="' + colors.muted + '">' + label + '</text>';
  }
  
  return '<svg width="100%" viewBox="0 0 ' + svgW + ' ' + (H + LH + TOPH) +
    '" style="display:block;margin:14px 0 6px">' +
    '<g transform="translate(0,' + TOPH + ')">' + bars + '</g></svg>';
}

export function buildWeekChart(sessions) {
  const W = 7, BW = 28, GAP = 8, H = 56, LH = 18, TOPH = 16;
  const svgW = W * (BW + GAP) - GAP;
  const colors = getChartColors();

  const dayMins = {};
  const days = [];
  for (let i = W - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const label = d.toLocaleDateString(
      { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB',
      { weekday: 'short' }
    );
    days.push({ key: k, label: label });
    dayMins[k] = 0;
  }

  sessions.forEach(s => {
    const d = new Date(s.id);
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (dayMins[k] !== undefined) dayMins[k] += Math.round(s.actual / 60);
  });

  const maxM = Math.max(1, Math.max(...days.map(d => dayMins[d.key])));
  const todayKey = days[W - 1].key;

  const bars = days.map((day, i) => {
    const mins = dayMins[day.key];
    const bh = mins > 0 ? Math.max(4, Math.round((mins / maxM) * H)) : 2;
    const x = i * (BW + GAP);
    const fill = mins > 0 ? colors.accent : colors.border;
    const op = day.key === todayKey ? '1' : '0.65';

    const barRect = '<rect x="' + x + '" y="' + (H - bh) + '" width="' + BW +
      '" height="' + bh + '" rx="3" fill="' + fill + '" opacity="' + op + '">' +
      '<title>' + mins + ' min</title></rect>';

    const minLabel = mins > 0
      ? '<text x="' + (x + BW / 2) + '" y="' + (H - bh - 4) +
        '" text-anchor="middle" font-size="9" fill="' + colors.accent +
        '" opacity="' + op + '">' + mins + '</text>'
      : '';

    const dayLabel = '<text x="' + (x + BW / 2) + '" y="' + (H + LH - 2) +
      '" text-anchor="middle" font-size="10" fill="' + colors.muted + '">' + day.label + '</text>';

    return barRect + minLabel + dayLabel;
  }).join('');

  return '<svg width="100%" viewBox="0 0 ' + svgW + ' ' + (H + LH + TOPH) +
    '" style="display:block;margin:14px 0 6px">' +
    '<g transform="translate(0,' + TOPH + ')">' + bars + '</g></svg>';
}

export function buildWeekdayAverageChart(sessions) {
  const W = 7, BW = 28, GAP = 8, H = 56, LH = 18, TOPH = 16;
  const svgW = W * (BW + GAP) - GAP;
  const colors = getChartColors();
  
  const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';
  
  // Initialize weekday data: Monday-first (0=Monday, 6=Sunday)
  const weekdayData = [];
  const uniqueDates = []; // Track unique dates (YYYY-MM-DD) per weekday
  
  for (let i = 0; i < 7; i++) {
    weekdayData.push({ total: 0, label: '' });
    uniqueDates.push(new Set());
  }
  
  // Set labels (Monday first) - Two letter format
  const labelDate = new Date(2024, 0, 1); // Jan 1, 2024 was Monday
  for (let i = 0; i < 7; i++) {
    const d = new Date(labelDate);
    d.setDate(d.getDate() + i);
    // Use short weekday format and take first 2 characters (e.g., "Mo", "Tu")
    const shortLabel = d.toLocaleDateString(locale, { weekday: 'short' });
    weekdayData[i].label = shortLabel.substring(0, 2);
  }
  
  if (!sessions.length) {
    return buildEmptyChart(svgW, H, LH, TOPH, colors);
  }
  
  // Aggregate data by weekday - track total time and unique days
  sessions.forEach(s => {
    if (!s.completed) return;
    const d = new Date(s.id);
    const dayIndex = d.getDay(); // 0=Sunday, 1=Monday...
    // Convert to Monday-first: Monday=0, Sunday=6
    const mondayFirst = (dayIndex + 6) % 7;
    weekdayData[mondayFirst].total += s.actual;
    
    // Track unique date string (YYYY-MM-DD)
    const dateStr = d.getFullYear() + '-' + 
                   String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(d.getDate()).padStart(2, '0');
    uniqueDates[mondayFirst].add(dateStr);
  });
  
  // Calculate average total meditation time per day (not per session)
  const avgMins = weekdayData.map((d, i) => {
    const uniqueDayCount = uniqueDates[i].size;
    return uniqueDayCount > 0 ? Math.round(d.total / uniqueDayCount / 60) : 0;
  });
  
  const maxM = Math.max(1, Math.max(...avgMins));
  
  const bars = avgMins.map((mins, i) => {
    const bh = mins > 0 ? Math.max(4, Math.round((mins / maxM) * H)) : 2;
    const x = i * (BW + GAP);
    const fill = mins > 0 ? colors.accent : colors.border;
    const uniqueDayCount = uniqueDates[i].size;
    const hasData = uniqueDayCount > 0;
    const op = hasData ? '0.85' : '0.35';

    const barRect = '<rect x="' + x + '" y="' + (H - bh) + '" width="' + BW +
      '" height="' + bh + '" rx="3" fill="' + fill + '" opacity="' + op + '">' +
      '<title>' + (hasData ? uniqueDayCount + ' ' + t('log_days') + ', avg: ' : 'No data, ') + 
      mins + ' min</title></rect>';

    const minLabel = mins > 0
      ? '<text x="' + (x + BW / 2) + '" y="' + (H - bh - 4) +
        '" text-anchor="middle" font-size="9" fill="' + colors.accent +
        '" opacity="' + op + '">' + mins + '</text>'
      : '';

    const dayLabel = '<text x="' + (x + BW / 2) + '" y="' + (H + LH - 2) +
      '" text-anchor="middle" font-size="10" fill="' + colors.muted + '">' + 
      weekdayData[i].label + '</text>';

    return barRect + minLabel + dayLabel;
  }).join('');
  
  return '<svg width="100%" viewBox="0 0 ' + svgW + ' ' + (H + LH + TOPH) +
    '" style="display:block;margin:14px 0 6px">' +
    '<g transform="translate(0,' + TOPH + ')">' + bars + '</g></svg>';
}

export function setChartMode(mode) {
  chartMode = mode;
  localStorage.setItem('log_chart_mode', mode);
  renderLog();
}

export function getChartMode() {
  return chartMode;
}

export function renderLog() {
  const sessions = getSessions();
  const totalSecs = sessions.reduce((a, s) => a + s.actual, 0);
  const totalH = Math.floor(totalSecs / 3600);
  const totalM = Math.floor((totalSecs % 3600) / 60);

  const streak = computeStreak(sessions);
  const streakHtml = streak > 0
    ? ' &nbsp;🔥 <strong>' + streak + '</strong> ' + t('log_days')
    : '';

  const avgDailySecs = computeAvgDaily(sessions);
  const avgDailyM = Math.floor(avgDailySecs / 60);
  const avgDailyHtml = sessions.length > 0
    ? ' &nbsp;|&nbsp; ' + t('log_avg_daily') + ': <strong>' + avgDailyM + 'm</strong>'
    : '';

  const summaryEl = document.getElementById('log-summary');
  if (summaryEl) {
    summaryEl.innerHTML =
      t('log_sessions') + ': <strong>' + sessions.length + '</strong> &nbsp;' +
      t('log_total') + ': <strong>' + totalH + 'h ' + totalM + 'm</strong> &nbsp;' +
      t('log_completed') + ': <strong>' + sessions.filter(s => s.completed).length + '</strong>' +
      streakHtml + avgDailyHtml;
  }

  const chartEl = document.getElementById('log-chart');
  if (chartEl) {
    if (!sessions.length) {
      chartEl.innerHTML = '';
    } else {
      let chartHtml = '';
      const isWeek = chartMode === 'week';
      const colors = getChartColors();
      
      chartHtml += '<div class="chart-toggle" style="display:flex;gap:8px;justify-content:center;margin-bottom:8px;">' +
        '<button class="chart-toggle-btn' + (isWeek ? ' active' : '') + '" data-mode="week" ' +
        'style="padding:6px 12px;border:1px solid ' + colors.border + ';border-radius:6px;' +
        'background:' + (isWeek ? colors.accent : 'var(--surface)') + ';' +
        'color:' + (isWeek ? 'var(--bg)' : 'var(--text)') + ';font-size:0.85rem;' +
        'cursor:pointer;transition:all 0.2s;-webkit-tap-highlight-color:transparent;">' + 
        (t('chart_last7') || 'Last 7 days') + '</button>' +
        '<button class="chart-toggle-btn' + (!isWeek ? ' active' : '') + '" data-mode="average" ' +
        'style="padding:6px 12px;border:1px solid ' + colors.border + ';border-radius:6px;' +
        'background:' + (!isWeek ? colors.accent : 'var(--surface)') + ';' +
        'color:' + (!isWeek ? 'var(--bg)' : 'var(--text)') + ';font-size:0.85rem;' +
        'cursor:pointer;transition:all 0.2s;-webkit-tap-highlight-color:transparent;">' + 
        (t('chart_avg_weekday') || 'Avg / weekday') + '</button>' +
        '</div>';
      
      chartHtml += isWeek ? buildWeekChart(sessions) : buildWeekdayAverageChart(sessions);
      chartEl.innerHTML = chartHtml;
      
      chartEl.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setChartMode(btn.dataset.mode);
        });
      });
    }
  }

  const logListEl = document.getElementById('log-list');
  if (logListEl) {
    logListEl.innerHTML = sessions.map(s => {
      const noteHtml = s.note
        ? '<div class="log-note">' + s.note.replace(/</g, '&lt;') + '</div>'
        : '';
      return '<li data-session-id="' + s.id + '">' +
        '<div class="log-header">' +
          '<div class="log-date">' + s.date + ' &nbsp; ' + s.startTime + '</div>' +
          '<button class="log-delete-btn" data-session-id="' + s.id + '" aria-label="Delete session">×</button>' +
        '</div>' +
        '<div class="log-detail">' +
          formatDuration(s.actual) + ' / ' + formatDuration(s.planned) + ' ' + t('log_planned') +
          (!s.completed ? ' &nbsp; ' + t('log_stopped') : '') +
          (s.manual ? ' &nbsp; <span style="opacity:0.6;font-size:0.8em">' + t('log_manual') + '</span>' : '') +
        '</div>' + noteHtml + '</li>';
    }).join('');
    
    // Attach delete handlers
    logListEl.querySelectorAll('.log-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sessionId = parseInt(btn.dataset.sessionId);
        deleteSession(sessionId);
      });
    });
  }
}

export function saveSession(completed, actualSecs, note) {
  const sessions = getSessions();
  sessions.unshift({
    id: Date.now(),
    date: new Date(sessionStart).toLocaleDateString(
             { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB'),
    startTime: new Date(sessionStart).toLocaleTimeString('en-GB',
             { hour: '2-digit', minute: '2-digit' }),
    planned: plannedDuration,
    actual: actualSecs !== undefined ? actualSecs : plannedDuration,
    completed: completed,
    sound: currentSound,
    note: note || ''
  });
  localStorage.setItem('meditation_log', JSON.stringify(sessions));
  log('Session saved, total sessions:', sessions.length);
}

export function showNoteField(completed, actualSecs) {
  const wrap = document.getElementById('note-wrap');
  const input = document.getElementById('note-input');
  const btn = document.getElementById('note-save-btn');
  if (!wrap) { saveSession(completed, actualSecs, ''); return; }

  let saved = false;
  input.value = '';
  input.placeholder = t('note_placeholder');
  btn.textContent = t('note_save');
  wrap.style.display = 'flex';
  input.focus();

  function doSave() {
    if (saved) return;
    saved = true;
    wrap.style.display = 'none';
    saveSession(completed, actualSecs, input.value.trim());
  }

  btn.onclick = doSave;
  input.onkeydown = (e) => { if (e.key === 'Enter') doSave(); };
  input.onblur = () => { setTimeout(doSave, 200); };
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.addEventListener('click', doSave, { once: true });
  });
}

export function exportCSV() {
  const sessions = getSessions();
  if (sessions.length === 0) {
    alert(t('export_error'));
    return;
  }
  
  const rows = [['Date', 'Start', 'Planned (s)', 'Actual (s)', 'Completed', 'Sound', 'Note']].concat(
    sessions.map(s => {
      return [
        s.date, s.startTime, s.planned, s.actual, s.completed, s.sound,
        '"' + (s.note || '').replace(/"/g, '""') + '"'
      ];
    })
  );
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'meditation_log_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  log('CSV exported:', sessions.length, 'sessions');
}

export function importCSV(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim());
      const header = lines[0].split(',');

      function col(name) {
        return header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
      }
      const iDate = col('Date');
      const iStart = col('Start');
      const iPlanned = col('Planned (s)');
      const iActual = col('Actual (s)');
      const iCompleted = col('Completed');
      const iSound = col('Sound');
      const iNote = col('Note');

      if (iDate < 0 || iActual < 0) throw new Error('Unrecognised CSV format');

      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = [];
        const line = lines[i];
        let inQ = false;
        let cur = '';
        for (let c = 0; c < line.length; c++) {
          const ch = line[c];
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { parts.push(cur); cur = ''; }
          else { cur += ch; }
        }
        parts.push(cur);

        const actual = parseInt(parts[iActual]) || 0;
        const planned = iPlanned >= 0 ? (parseInt(parts[iPlanned]) || actual) : actual;
        const completed = iCompleted >= 0 ? (parts[iCompleted].trim().toLowerCase() === 'true') : true;
        const note = iNote >= 0 ? parts[iNote].trim() : '';
        const dateStr = iDate >= 0 ? parts[iDate].trim() : '';
        const startStr = iStart >= 0 ? parts[iStart].trim() : '00:00';
        
        const id = parseDateToTimestamp(dateStr, startStr);

        imported.push({
          id: id || Date.now() - (lines.length - i) * 1000,
          date: dateStr,
          startTime: startStr,
          planned: planned,
          actual: actual,
          completed: completed,
          sound: iSound >= 0 ? parts[iSound].trim() : 'bell',
          note: note
        });
      }

      if (!imported.length) throw new Error('No rows found');

      const existing = getSessions();
      const merged = existing.slice();
      imported.forEach(s => {
        if (!merged.find(x => x.id === s.id)) merged.push(s);
      });
      merged.sort((a, b) => b.id - a.id);
      localStorage.setItem('meditation_log', JSON.stringify(merged));
      renderLog();
      onSuccess(imported.length);
      log('CSV imported:', imported.length, 'sessions');
    } catch(err) {
      onError(err.message);
    }
  };
  reader.readAsText(file);
}

function parseDateToTimestamp(dateStr, timeStr) {
  if (!dateStr) return null;
  
  const normalized = dateStr.trim();
  const timeNormalized = (timeStr || '00:00').trim();
  
  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const timeParts = timeNormalized.split(':');
    const hours = parseInt(timeParts[0]) || 0;
    const mins = parseInt(timeParts[1]) || 0;
    return new Date(
      parseInt(isoDate[1]), 
      parseInt(isoDate[2]) - 1, 
      parseInt(isoDate[3]),
      hours, mins
    ).getTime();
  }
  
  const euroDate = normalized.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
  if (euroDate) {
    const timeParts = timeNormalized.split(':');
    const hours = parseInt(timeParts[0]) || 0;
    const mins = parseInt(timeParts[1]) || 0;
    return new Date(
      parseInt(euroDate[3]), 
      parseInt(euroDate[2]) - 1, 
      parseInt(euroDate[1]),
      hours, mins
    ).getTime();
  }
  
  const parsed = Date.parse(normalized + ' ' + timeNormalized);
  return isNaN(parsed) ? null : parsed;
}

export function saveManualSession(dateStr, timeStr, durationMins, note) {
  const sessions = getSessions();
  const id = Date.parse(dateStr + 'T' + timeStr) || Date.now();
  const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';
  const d = new Date(id);
  sessions.push({
    id: id,
    date: d.toLocaleDateString(locale),
    startTime: timeStr,
    planned: durationMins * 60,
    actual: durationMins * 60,
    completed: true,
    sound: 'none',
    note: note || '',
    manual: true
  });
  sessions.sort((a, b) => b.id - a.id);
  localStorage.setItem('meditation_log', JSON.stringify(sessions));
  log('Manual session saved');
}

export function clearLog() {
  localStorage.removeItem('meditation_log');
  log('Log cleared');
}

export function deleteSession(sessionId) {
  if (!confirm(t('confirm_delete'))) {
    return;
  }
  
  const sessions = getSessions();
  const filteredSessions = sessions.filter(s => s.id !== sessionId);
  
  if (filteredSessions.length === sessions.length) {
    log('Session not found:', sessionId);
    return;
  }
  
  localStorage.setItem('meditation_log', JSON.stringify(filteredSessions));
  log('Session deleted:', sessionId);
  renderLog();
}
