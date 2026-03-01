// ─── Log Module ──────────────────────────────────────────────────
// Meditation session logging with storage integration and error handling.

import { t, getCurrentLang } from './i18n.js';
import { storage, QuotaExceededError, StorageError } from './storage.js';
import { state, set, get } from './state.js';

// Session tracking
let sessionStart = null;
let plannedDuration = 0;
let currentSound = 'bell';

// Chart mode state
let chartMode = 'week';

// Error tracking
const logErrors = [];

// Setters for session tracking
export function setSessionStart(start) { 
  sessionStart = start; 
}

export function setPlannedDuration(duration) { 
  plannedDuration = duration; 
}

export function setCurrentSoundForLog(sound) { 
  currentSound = sound; 
}

// Get sessions with error handling
export function getSessions() {
  try {
    // Try new storage first
    const sessions = storage.get('meditation_log');
    if (sessions && Array.isArray(sessions)) {
      return sessions;
    }
    
    // Fallback to legacy localStorage
    const legacy = localStorage.getItem('meditation_log');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) {
        // Migrate to new storage
        storage.set('meditation_log', parsed);
        return parsed;
      }
    }
    
    return [];
  } catch (error) {
    logError('getSessions', error);
    return [];
  }
}

// Log error for debugging
function logError(operation, error) {
  const entry = {
    timestamp: Date.now(),
    operation,
    message: error?.message || String(error)
  };
  
  logErrors.push(entry);
  
  if (logErrors.length > 20) {
    logErrors.shift();
  }
  
  console.warn(`Log error [${operation}]:`, error);
}

// Format duration for display
export function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ─── Streak Calculation ───────────────────────────────────────────

export function computeStreak(sessions) {
  const dateSet = {};
  
  sessions.forEach(s => {
    if (!s.completed) return;
    
    const d = new Date(s.id);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dateSet[k] = true;
  });
  
  let streak = 0;
  
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (dateSet[k]) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

// ─── Average Daily Time ───────────────────────────────────────────

export function computeAvgDaily(sessions) {
  if (!sessions.length) return 0;
  
  const dateSet = {};
  let totalSecs = 0;
  
  sessions.forEach(s => {
    if (!s.completed) return;
    
    const d = new Date(s.id);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dateSet[k] = true;
    totalSecs += s.actual;
  });
  
  const uniqueDays = Object.keys(dateSet).length;
  if (uniqueDays === 0) return 0;
  
  return Math.round(totalSecs / uniqueDays);
}

// ─── Chart Helpers ────────────────────────────────────────────────

function getChartColors() {
  const cs = getComputedStyle(document.documentElement);
  return {
    accent: cs.getPropertyValue('--accent').trim() || '#88c0d0',
    muted: cs.getPropertyValue('--muted').trim() || '#7b8fa1',
    border: cs.getPropertyValue('--border').trim() || '#2e3a4e'
  };
}

function buildEmptyChart(svgW, H, LH, TOPH, colors) {
  const W = 7;
  const BW = 28;
  const GAP = 8;
  const bars = [];
  
  for (let i = 0; i < 7; i++) {
    const x = i * (BW + GAP);
    const labelDate = new Date(2024, 0, 1);
    labelDate.setDate(labelDate.getDate() + i);
    const label = labelDate.toLocaleDateString('en-GB', { weekday: 'narrow' });
    
    bars.push(
      `<rect x="${x}" y="${H - 2}" width="${BW}" height="2" rx="1" fill="${colors.border}" opacity="0.35"></rect>` +
      `<text x="${x + BW / 2}" y="${H + LH - 2}" text-anchor="middle" font-size="10" fill="${colors.muted}">${label}</text>`
    );
  }
  
  return `<svg width="100%" viewBox="0 0 ${svgW} ${H + LH + TOPH}" style="display:block;margin:14px 0 6px">` +
    `<g transform="translate(0,${TOPH})">${bars.join('')}</g></svg>`;
}

// ─── Weekly Chart (Last 7 Days) ───────────────────────────────────

export function buildWeekChart(sessions) {
  const W = 7;
  const BW = 28;
  const GAP = 8;
  const H = 56;
  const LH = 18;
  const TOPH = 16;
  const svgW = W * (BW + GAP) - GAP;
  const colors = getChartColors();
  
  const dayMins = {};
  const days = [];
  
  for (let i = W - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';
    const label = d.toLocaleDateString(locale, { weekday: 'narrow' });
    
    days.push({ key: k, label });
    dayMins[k] = 0;
  }
  
  sessions.forEach(s => {
    const d = new Date(s.id);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dayMins[k] !== undefined) {
      dayMins[k] += Math.round(s.actual / 60);
    }
  });
  
  const maxM = Math.max(1, Math.max(...days.map(d => dayMins[d.key])));
  const todayKey = days[W - 1].key;
  
  const bars = days.map((day, i) => {
    const mins = dayMins[day.key];
    const bh = mins > 0 ? Math.max(4, Math.round((mins / maxM) * H)) : 2;
    const x = i * (BW + GAP);
    const fill = mins > 0 ? colors.accent : colors.border;
    const op = day.key === todayKey ? '1' : '0.65';
    
    const barRect = `<rect x="${x}" y="${H - bh}" width="${BW}" height="${bh}" rx="3" fill="${fill}" opacity="${op}">` +
      `<title>${mins} min</title></rect>`;
    
    const minLabel = mins > 0
      ? `<text x="${x + BW / 2}" y="${H - bh - 4}" text-anchor="middle" font-size="9" fill="${colors.accent}" opacity="${op}">${mins}</text>`
      : '';
    
    const dayLabel = `<text x="${x + BW / 2}" y="${H + LH - 2}" text-anchor="middle" font-size="10" fill="${colors.muted}">${day.label}</text>`;
    
    return barRect + minLabel + dayLabel;
  }).join('');
  
  return `<svg width="100%" viewBox="0 0 ${svgW} ${H + LH + TOPH}" style="display:block;margin:14px 0 6px">` +
    `<g transform="translate(0,${TOPH})">${bars}</g></svg>`;
}

// ─── Weekday Average Chart ────────────────────────────────────────

export function buildWeekdayAverageChart(sessions) {
  const W = 7;
  const BW = 28;
  const GAP = 8;
  const H = 56;
  const LH = 18;
  const TOPH = 16;
  const svgW = W * (BW + GAP) - GAP;
  const colors = getChartColors();
  
  const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';
  
  // Initialize weekday data (Monday-first)
  const weekdayData = [];
  for (let i = 0; i < 7; i++) {
    weekdayData.push({ total: 0, count: 0, label: '' });
  }
  
  // Set labels
  const labelDate = new Date(2024, 0, 1);
  for (let i = 0; i < 7; i++) {
    const d = new Date(labelDate);
    d.setDate(d.getDate() + i);
    weekdayData[i].label = d.toLocaleDateString(locale, { weekday: 'narrow' });
  }
  
  if (!sessions.length) {
    return buildEmptyChart(svgW, H, LH, TOPH, colors);
  }
  
  // Aggregate data
  sessions.forEach(s => {
    if (!s.completed) return;
    
    const d = new Date(s.id);
    const dayIndex = d.getDay();
    const mondayFirst = (dayIndex + 6) % 7;
    weekdayData[mondayFirst].total += s.actual;
    weekdayData[mondayFirst].count++;
  });
  
  // Calculate averages
  const avgMins = weekdayData.map(d => 
    d.count > 0 ? Math.round(d.total / d.count / 60) : 0
  );
  
  const maxM = Math.max(1, Math.max(...avgMins));
  
  const bars = avgMins.map((mins, i) => {
    const bh = mins > 0 ? Math.max(4, Math.round((mins / maxM) * H)) : 2;
    const x = i * (BW + GAP);
    const fill = mins > 0 ? colors.accent : colors.border;
    const hasData = weekdayData[i].count > 0;
    const op = hasData ? '0.85' : '0.35';
    
    const barRect = `<rect x="${x}" y="${H - bh}" width="${BW}" height="${bh}" rx="3" fill="${fill}" opacity="${op}">` +
      `<title>${hasData ? `${weekdayData[i].count} sessions, avg: ` : 'No data, '}${mins} min</title></rect>`;
    
    const minLabel = mins > 0
      ? `<text x="${x + BW / 2}" y="${H - bh - 4}" text-anchor="middle" font-size="9" fill="${colors.accent}" opacity="${op}">${mins}</text>`
      : '';
    
    const dayLabel = `<text x="${x + BW / 2}" y="${H + LH - 2}" text-anchor="middle" font-size="10" fill="${colors.muted}">${weekdayData[i].label}</text>`;
    
    return barRect + minLabel + dayLabel;
  }).join('');
  
  const avgIndicator = `<text x="${svgW / 2}" y="12" text-anchor="middle" font-size="10" fill="${colors.muted}" opacity="0.7"></text>`;
  
  return `<svg width="100%" viewBox="0 0 ${svgW} ${H + LH + TOPH}" style="display:block;margin:14px 0 6px">` +
    `<g transform="translate(0,${TOPH})">${bars}</g>${avgIndicator}</svg>`;
}

// ─── Chart Mode Management ────────────────────────────────────────

export function setChartMode(mode) {
  if (mode !== 'week' && mode !== 'average') return;
  
  chartMode = mode;
  
  try {
    set('log.chartMode', mode);
    state.saveToStorage();
  } catch (error) {
    logError('setChartMode', error);
  }
  
  renderLog();
}

export function getChartMode() {
  return get('log.chartMode') || chartMode;
}

// ─── Render Log ───────────────────────────────────────────────────

export function renderLog() {
  try {
    const sessions = getSessions();
    const totalSecs = sessions.reduce((a, s) => a + s.actual, 0);
    const totalH = Math.floor(totalSecs / 3600);
    const totalM = Math.floor((totalSecs % 3600) / 60);
    
    const streak = computeStreak(sessions);
    const streakHtml = streak > 0
      ? ` &nbsp;🔥 <strong>${streak}</strong> ${t('log_days')}`
      : '';
    
    const avgDailySecs = computeAvgDaily(sessions);
    const avgDailyM = Math.floor(avgDailySecs / 60);
    const avgDailyHtml = sessions.length > 0
      ? ` &nbsp;|&nbsp; ${t('log_avg_daily')}: <strong>${avgDailyM}m</strong>`
      : '';
    
    const summaryEl = document.getElementById('log-summary');
    if (summaryEl) {
      summaryEl.innerHTML =
        `${t('log_sessions')}: <strong>${sessions.length}</strong> &nbsp;` +
        `${t('log_total')}: <strong>${totalH}h ${totalM}m</strong> &nbsp;` +
        `${t('log_completed')}: <strong>${sessions.filter(s => s.completed).length}</strong>` +
        streakHtml + avgDailyHtml;
    }
    
    // Render chart
    const chartEl = document.getElementById('log-chart');
    if (chartEl) {
      if (!sessions.length) {
        chartEl.innerHTML = '';
      } else {
        renderChart(chartEl, sessions);
      }
    }
    
    // Render session list
    const logListEl = document.getElementById('log-list');
    if (logListEl) {
      logListEl.innerHTML = sessions.map(s => {
        const noteHtml = s.note
          ? `<div class="log-note">${s.note.replace(/</g, '&lt;')}</div>`
          : '';
        
        return `<li>` +
          `<div class="log-date">${s.date} &nbsp; ${s.startTime}</div>` +
          `<div class="log-detail">` +
            `${formatDuration(s.actual)} / ${formatDuration(s.planned)} ${t('log_planned')}` +
            (!s.completed ? ` &nbsp; ${t('log_stopped')}` : '') +
            (s.manual ? ` &nbsp; <span style="opacity:0.6;font-size:0.8em">${t('log_manual')}</span>` : '') +
          `</div>${noteHtml}</li>`;
      }).join('');
    }
  } catch (error) {
    logError('renderLog', error);
  }
}

// Render chart with toggle
function renderChart(chartEl, sessions) {
  const mode = getChartMode();
  const isWeek = mode === 'week';
  const colors = getChartColors();
  
  let chartHtml = '';
  
  // Toggle buttons
  chartHtml += `<div class="chart-toggle" style="display:flex;gap:8px;justify-content:center;margin-bottom:8px;">` +
    `<button class="chart-toggle-btn${isWeek ? ' active' : ''}" data-mode="week" ` +
    `style="padding:6px 12px;border:1px solid ${colors.border};border-radius:6px;` +
    `background:${isWeek ? colors.accent : 'var(--surface)'};` +
    `color:${isWeek ? 'var(--bg)' : 'var(--text)'};font-size:0.85rem;` +
    `cursor:pointer;transition:all 0.2s;-webkit-tap-highlight-color:transparent;">` +
    `${t('chart_last7') || 'Last 7 days'}</button>` +
    `<button class="chart-toggle-btn${!isWeek ? ' active' : ''}" data-mode="average" ` +
    `style="padding:6px 12px;border:1px solid ${colors.border};border-radius:6px;` +
    `background:${!isWeek ? colors.accent : 'var(--surface)'};` +
    `color:${!isWeek ? 'var(--bg)' : 'var(--text)'};font-size:0.85rem;` +
    `cursor:pointer;transition:all 0.2s;-webkit-tap-highlight-color:transparent;">` +
    `${t('chart_avg_weekday') || 'Avg / weekday'}</button>` +
    `</div>`;
  
  // Chart content
  chartHtml += isWeek ? buildWeekChart(sessions) : buildWeekdayAverageChart(sessions);
  chartEl.innerHTML = chartHtml;
  
  // Attach toggle handlers
  chartEl.querySelectorAll('.chart-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => setChartMode(btn.dataset.mode));
  });
}

// ─── Save Session ─────────────────────────────────────────────────

export function saveSession(completed, actualSecs, note) {
  try {
    const sessions = getSessions();
    const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';
    
    sessions.unshift({
      id: Date.now(),
      date: new Date(sessionStart).toLocaleDateString(locale),
      startTime: new Date(sessionStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      planned: plannedDuration,
      actual: actualSecs !== undefined ? actualSecs : plannedDuration,
      completed: completed,
      sound: currentSound,
      note: note || ''
    });
    
    // Save with error handling
    try {
      storage.set('meditation_log', sessions);
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        // Trim old sessions and retry
        while (sessions.length > 50) {
          sessions.pop();
        }
        storage.set('meditation_log', sessions);
      } else {
        throw error;
      }
    }
  } catch (error) {
    logError('saveSession', error);
    showErrorNotification(t('save_error') || 'Failed to save session');
  }
}

// ─── Session Note UI ──────────────────────────────────────────────

export function showNoteField(completed, actualSecs) {
  const wrap = document.getElementById('note-wrap');
  const input = document.getElementById('note-input');
  const btn = document.getElementById('note-save-btn');
  
  if (!wrap) {
    saveSession(completed, actualSecs, '');
    return;
  }
  
  let saved = false;
  input.value = '';
  input.placeholder = t('note_placeholder');
  btn.textContent = t('note_save');
  wrap.style.display = 'flex';
  input.focus();
  
  const doSave = () => {
    if (saved) return;
    saved = true;
    wrap.style.display = 'none';
    saveSession(completed, actualSecs, input.value.trim());
  };
  
  btn.onclick = doSave;
  input.onkeydown = (e) => { if (e.key === 'Enter') doSave(); };
  input.onblur = () => { setTimeout(doSave, 200); };
  
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.addEventListener('click', doSave, { once: true });
  });
}

// ─── CSV Export ───────────────────────────────────────────────────

export function exportCSV() {
  try {
    const sessions = getSessions();
    const rows = [['Date', 'Start', 'Planned (s)', 'Actual (s)', 'Completed', 'Sound', 'Note']].concat(
      sessions.map(s => [
        s.date,
        s.startTime,
        s.planned,
        s.actual,
        s.completed,
        s.sound,
        `"${(s.note || '').replace(/"/g, '""')}"`
      ])
    );
    
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `meditation_log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    logError('exportCSV', error);
    showErrorNotification(t('export_error') || 'Failed to export');
  }
}

// ─── CSV Import ───────────────────────────────────────────────────

export function importCSV(file, onSuccess, onError) {
  const reader = new FileReader();
  
  reader.onload = (ev) => {
    try {
      const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim());
      const header = lines[0].split(',');
      
      const col = (name) => header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
      
      const iDate = col('Date');
      const iStart = col('Start');
      const iPlanned = col('Planned (s)');
      const iActual = col('Actual (s)');
      const iCompleted = col('Completed');
      const iSound = col('Sound');
      const iNote = col('Note');
      
      if (iDate < 0 || iActual < 0) {
        throw new Error('Unrecognised CSV format');
      }
      
      const imported = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        
        const actual = parseInt(parts[iActual]) || 0;
        const planned = parseInt(parts[iPlanned]) || actual;
        const completed = iCompleted >= 0
          ? parts[iCompleted].trim().toLowerCase() === 'true'
          : true;
        const note = iNote >= 0 ? parts[iNote].trim() : '';
        const dateStr = iDate >= 0 ? parts[iDate].trim() : '';
        const startStr = iStart >= 0 ? parts[iStart].trim() : '00:00';
        
        const id = parseDateToTimestamp(dateStr, startStr) || 
          (Date.now() - (lines.length - i) * 1000);
        
        imported.push({
          id,
          date: dateStr,
          startTime: startStr,
          planned,
          actual,
          completed,
          sound: iSound >= 0 ? parts[iSound].trim() : 'bell',
          note
        });
      }
      
      if (!imported.length) {
        throw new Error('No rows found');
      }
      
      // Merge with existing
      const existing = getSessions();
      const merged = [...existing];
      
      imported.forEach(s => {
        if (!merged.find(x => x.id === s.id)) {
          merged.push(s);
        }
      });
      
      merged.sort((a, b) => b.id - a.id);
      
      // Save with quota handling
      try {
        storage.set('meditation_log', merged);
      } catch (error) {
        if (error instanceof QuotaExceededError) {
          // Keep only most recent sessions
          const trimmed = merged.slice(0, 100);
          storage.set('meditation_log', trimmed);
        } else {
          throw error;
        }
      }
      
      renderLog();
      onSuccess(imported.length);
    } catch (err) {
      onError(err.message);
    }
  };
  
  reader.onerror = () => onError('Failed to read file');
  reader.readAsText(file);
}

// Parse CSV line with quote handling
function parseCSVLine(line) {
  const parts = [];
  let inQ = false;
  let cur = '';
  
  for (let c = 0; c < line.length; c++) {
    const ch = line[c];
    if (ch === '"') {
      inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  
  return parts;
}

// Parse date string to timestamp
function parseDateToTimestamp(dateStr, timeStr) {
  if (!dateStr) return null;
  
  // ISO format (YYYY-MM-DD)
  const isoDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const timeParts = (timeStr || '00:00').split(':');
    return new Date(
      parseInt(isoDate[1]),
      parseInt(isoDate[2]) - 1,
      parseInt(isoDate[3]),
      parseInt(timeParts[0]) || 0,
      parseInt(timeParts[1]) || 0
    ).getTime();
  }
  
  // European format (DD/MM/YYYY or DD.MM.YYYY)
  const euroDate = dateStr.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (euroDate) {
    const timeParts = (timeStr || '00:00').split(':');
    return new Date(
      parseInt(euroDate[3]),
      parseInt(euroDate[2]) - 1,
      parseInt(euroDate[1]),
      parseInt(timeParts[0]) || 0,
      parseInt(timeParts[1]) || 0
    ).getTime();
  }
  
  // US format (MM/DD/YYYY)
  const usDate = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDate) {
    const timeParts = (timeStr || '00:00').split(':');
    return new Date(
      parseInt(usDate[3]),
      parseInt(usDate[1]) - 1,
      parseInt(usDate[2]),
      parseInt(timeParts[0]) || 0,
      parseInt(timeParts[1]) || 0
    ).getTime();
  }
  
  // Fallback to native parsing
  const parsed = Date.parse(`${dateStr} ${timeStr}`);
  return isNaN(parsed) ? null : parsed;
}

// ─── Manual Session Entry ────────────────────────────────────────

export function saveManualSession(dateStr, timeStr, durationMins, note) {
  try {
    const sessions = getSessions();
    const id = Date.parse(`${dateStr}T${timeStr}`) || Date.now();
    const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';
    const d = new Date(id);
    
    sessions.push({
      id,
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
    
    // Save with quota handling
    try {
      storage.set('meditation_log', sessions);
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        const trimmed = sessions.slice(0, 100);
        storage.set('meditation_log', trimmed);
      } else {
        throw error;
      }
    }
  } catch (error) {
    logError('saveManualSession', error);
    showErrorNotification(t('save_error') || 'Failed to save session');
  }
}

// ─── Clear Log ────────────────────────────────────────────────────

export function clearLog() {
  try {
    storage.remove('meditation_log');
    
    // Also remove legacy key if present
    try {
      localStorage.removeItem('meditation_log');
    } catch (e) {}
  } catch (error) {
    logError('clearLog', error);
  }
}

// ─── Error Notification ───────────────────────────────────────────

function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification notification-error';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    background: var(--danger, #bf616a);
    color: #fff;
    font-size: 14px;
    z-index: 1000;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// ─── Debug Helpers ────────────────────────────────────────────────

export function getLogErrors() {
  return [...logErrors];
}

export function clearLogErrors() {
  logErrors.length = 0;
}
