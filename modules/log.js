// ─── Log Module ──────────────────────────────────────────────────
// Session logging, export, import, visualization, and analytics.

import { t, getCurrentLang } from './i18n.js';
import { get, set, saveToStorage } from './state.js';

let sessionStart = null;
let plannedDuration = 0;
let currentSound = 'bell';

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[Log]', ...args); }

const STORAGE_KEY = 'meditation_log';
const MAX_SESSIONS = 1000;

export function setSessionStart(start) { sessionStart = start; }
export function setPlannedDuration(duration) { plannedDuration = duration; }
export function setCurrentSoundForLog(sound) { currentSound = sound; }

// ─── Safe Storage with Quota Protection ──────────────────────────

function safeRead() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function safeWrite(sessions) {
  try {
    // Cap at MAX_SESSIONS — remove oldest (at end of array)
    if (sessions.length > MAX_SESSIONS) {
      sessions = sessions.slice(0, MAX_SESSIONS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch (e) {
    // Quota exceeded — try removing half and retry once
    if (e.name === 'QuotaExceededError') {
      console.warn('[Log] Storage quota exceeded, removing older sessions');
      try {
        sessions = sessions.slice(0, Math.floor(sessions.length / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        return true;
      } catch { /* fall through */ }
    }
    console.error('[Log] Failed to save:', e.message);
    return false;
  }
}

export function getSessions() { return safeRead(); }

// ─── HTML Escape ─────────────────────────────────────────────────
// Properly escapes all HTML special characters to prevent XSS.

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ─── Streak ──────────────────────────────────────────────────────

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
    if (dateSet[k]) streak++;
    else break;
  }
  return streak;
}

// ─── Average Daily Time ──────────────────────────────────────────

function _getIncludeEmptyDays() {
  return get('settings.includeEmptyDays') === true;
}

export function computeAvgDaily(sessions) {
  if (!sessions.length) return 0;

  if (_getIncludeEmptyDays()) {
    let firstTimestamp = Infinity;
    sessions.forEach(s => { if (s.id && s.id < firstTimestamp) firstTimestamp = s.id; });
    if (firstTimestamp === Infinity) return 0;

    const firstDate = new Date(firstTimestamp);
    const today = new Date();
    firstDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const dayCount = Math.max(1, Math.round((today - firstDate) / 86400000) + 1);

    let totalSecs = 0;
    sessions.forEach(s => { if (s.completed) totalSecs += s.actual; });
    return Math.round(totalSecs / dayCount);
  }

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
  return uniqueDays > 0 ? Math.round(totalSecs / uniqueDays) : 0;
}

// ─── Chart Helpers ───────────────────────────────────────────────

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
    const shortLabel = labelDate.toLocaleDateString(locale, { weekday: 'short' });
    const label = esc(shortLabel.substring(0, 2));
    bars += `<rect x="${x}" y="${H - 2}" width="${BW}" height="2" rx="1" fill="${esc(colors.border)}" opacity="0.35"></rect>` +
            `<text x="${x + BW / 2}" y="${H + LH - 2}" text-anchor="middle" font-size="10" fill="${esc(colors.muted)}">${label}</text>`;
  }
  return `<svg width="100%" viewBox="0 0 ${svgW} ${H + LH + TOPH}" style="display:block;margin:14px 0 6px"><g transform="translate(0,${TOPH})">${bars}</g></svg>`;
}

export function buildWeekChart(sessions) {
  const W = 7, BW = 28, GAP = 8, H = 56, LH = 18, TOPH = 16;
  const svgW = W * (BW + GAP) - GAP;
  const colors = getChartColors();
  const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';

  const dayMins = {};
  const days = [];
  for (let i = W - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString(locale, { weekday: 'short' }).substring(0, 2);
    days.push({ key: k, label });
    dayMins[k] = 0;
  }

  sessions.forEach(s => {
    const d = new Date(s.id);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dayMins[k] !== undefined) dayMins[k] += Math.round(s.actual / 60);
  });

  const maxM = Math.max(1, Math.max(...days.map(d => dayMins[d.key])));
  const todayKey = days[W - 1].key;

  const bars = days.map((day, i) => {
    const mins = dayMins[day.key];
    const bh = mins > 0 ? Math.max(4, Math.round((mins / maxM) * H)) : 2;
    const x = i * (BW + GAP);
    const fill = mins > 0 ? esc(colors.accent) : esc(colors.border);
    const op = day.key === todayKey ? '1' : '0.65';

    const barRect = `<rect x="${x}" y="${H - bh}" width="${BW}" height="${bh}" rx="3" fill="${fill}" opacity="${op}"><title>${mins} min</title></rect>`;
    const minLabel = mins > 0 ? `<text x="${x + BW / 2}" y="${H - bh - 4}" text-anchor="middle" font-size="9" fill="${esc(colors.accent)}" opacity="${op}">${mins}</text>` : '';
    const dayLabel = `<text x="${x + BW / 2}" y="${H + LH - 2}" text-anchor="middle" font-size="10" fill="${esc(colors.muted)}">${esc(day.label)}</text>`;
    return barRect + minLabel + dayLabel;
  }).join('');

  return `<svg width="100%" viewBox="0 0 ${svgW} ${H + LH + TOPH}" style="display:block;margin:14px 0 6px"><g transform="translate(0,${TOPH})">${bars}</g></svg>`;
}

export function buildWeekdayAverageChart(sessions) {
  const W = 7, BW = 28, GAP = 8, H = 56, LH = 18, TOPH = 16;
  const svgW = W * (BW + GAP) - GAP;
  const colors = getChartColors();
  const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';

  const weekdayData = [];
  const uniqueDates = [];
  for (let i = 0; i < 7; i++) {
    weekdayData.push({ total: 0, label: '' });
    uniqueDates.push(new Set());
  }

  const labelDate = new Date(2024, 0, 1);
  for (let i = 0; i < 7; i++) {
    const d = new Date(labelDate);
    d.setDate(d.getDate() + i);
    const shortLabel = d.toLocaleDateString(locale, { weekday: 'short' });
    weekdayData[i].label = shortLabel.substring(0, 2);
  }

  if (!sessions.length) return buildEmptyChart(svgW, H, LH, TOPH, colors);

  sessions.forEach(s => {
    if (!s.completed) return;
    const d = new Date(s.id);
    const dayIndex = d.getDay();
    const mondayFirst = (dayIndex + 6) % 7;
    weekdayData[mondayFirst].total += s.actual;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    uniqueDates[mondayFirst].add(dateStr);
  });

  const avgMins = weekdayData.map((d, i) => {
    const uniqueDayCount = uniqueDates[i].size;
    return uniqueDayCount > 0 ? Math.round(d.total / uniqueDayCount / 60) : 0;
  });

  const maxM = Math.max(1, Math.max(...avgMins));

  const bars = avgMins.map((mins, i) => {
    const bh = mins > 0 ? Math.max(4, Math.round((mins / maxM) * H)) : 2;
    const x = i * (BW + GAP);
    const fill = mins > 0 ? esc(colors.accent) : esc(colors.border);
    const hasData = uniqueDates[i].size > 0;
    const op = hasData ? '0.85' : '0.35';

    const barRect = `<rect x="${x}" y="${H - bh}" width="${BW}" height="${bh}" rx="3" fill="${fill}" opacity="${op}"><title>${hasData ? uniqueDates[i].size + ' ' + t('log_days') + ', avg: ' : 'No data, '}${mins} min</title></rect>`;
    const minLabel = mins > 0 ? `<text x="${x + BW / 2}" y="${H - bh - 4}" text-anchor="middle" font-size="9" fill="${esc(colors.accent)}" opacity="${op}">${mins}</text>` : '';
    const dayLabel = `<text x="${x + BW / 2}" y="${H + LH - 2}" text-anchor="middle" font-size="10" fill="${esc(colors.muted)}">${esc(weekdayData[i].label)}</text>`;
    return barRect + minLabel + dayLabel;
  }).join('');

  return `<svg width="100%" viewBox="0 0 ${svgW} ${H + LH + TOPH}" style="display:block;margin:14px 0 6px"><g transform="translate(0,${TOPH})">${bars}</g></svg>`;
}

// ─── Chart & Empty-Days Mode Management ──────────────────────────
// Persisted via state.js for consistency with other settings.

function _getChartMode() {
  return get('settings.chartMode') || 'week';
}

function _setChartMode(mode) {
  set('settings.chartMode', mode);
  saveToStorage();
  renderLog();
}

function _setIncludeEmptyDays(enabled) {
  set('settings.includeEmptyDays', enabled);
  saveToStorage();
  renderLog();
}

// ─── Render Log ──────────────────────────────────────────────────
// Chart section uses innerHTML for SVG (safe — all data escaped).
// Log list uses DOM API (safe — textContent, no HTML injection).

export function renderLog() {
  const sessions = getSessions();
  const totalSecs = sessions.reduce((a, s) => a + s.actual, 0);
  const totalH = Math.floor(totalSecs / 3600);
  const totalM = Math.floor((totalSecs % 3600) / 60);
  const streak = computeStreak(sessions);
  const includeEmpty = _getIncludeEmptyDays();
  const chartMode = _getChartMode();

  // ── Summary ──
  const summaryEl = document.getElementById('log-summary');
  if (summaryEl) {
    const streakHtml = streak > 0 ? ` \u00A0🔥 <strong>${streak}</strong> ${t('log_days')}` : '';
    const avgDailySecs = computeAvgDaily(sessions);
    const avgDailyM = Math.floor(avgDailySecs / 60);
    const avgLabel = includeEmpty ? (t('log_avg_daily_all') || 'Avg daily (all days)') : (t('log_avg_daily') || 'Avg daily');
    const avgDailyHtml = sessions.length > 0 ? ` \u00A0|\u00A0 ${avgLabel}: <strong>${avgDailyM}m</strong>` : '';

    summaryEl.innerHTML =
      `${t('log_sessions')}: <strong>${sessions.length}</strong> \u00A0` +
      `${t('log_total')}: <strong>${totalH}h ${totalM}m</strong> \u00A0` +
      `${t('log_completed')}: <strong>${sessions.filter(s => s.completed).length}</strong>` +
      streakHtml + avgDailyHtml;
  }

  // ── Chart Section ──
  const chartEl = document.getElementById('log-chart');
  if (chartEl) {
    if (!sessions.length) {
      chartEl.innerHTML = '';
    } else {
      const isWeek = chartMode === 'week';
      const colors = getChartColors();

      // Toggle buttons + empty-days toggle + chart SVG
      let chartHtml = `<div class="chart-toggle" style="display:flex;gap:8px;justify-content:center;margin-bottom:8px;">` +
        `<button class="chart-toggle-btn${isWeek ? ' active' : ''}" data-mode="week" ` +
        `style="padding:6px 12px;border:1px solid ${esc(colors.border)};border-radius:6px;background:${isWeek ? esc(colors.accent) : 'var(--surface)'};color:${isWeek ? 'var(--bg)' : 'var(--text)'};font-size:0.85rem;cursor:pointer;transition:all 0.2s;-webkit-tap-highlight-color:transparent;">${esc(t('chart_last7') || 'Last 7 days')}</button>` +
        `<button class="chart-toggle-btn${!isWeek ? ' active' : ''}" data-mode="average" ` +
        `style="padding:6px 12px;border:1px solid ${esc(colors.border)};border-radius:6px;background:${!isWeek ? esc(colors.accent) : 'var(--surface)'};color:${!isWeek ? 'var(--bg)' : 'var(--text)'};font-size:0.85rem;cursor:pointer;transition:all 0.2s;-webkit-tap-highlight-color:transparent;">${esc(t('chart_avg_weekday') || 'Avg / weekday')}</button>` +
        `</div>`;

      chartHtml += `<div class="empty-days-toggle" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;font-size:0.85rem;color:var(--muted);">` +
        `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;-webkit-tap-highlight-color:transparent;">` +
        `<input type="checkbox" id="toggle-empty-days" ${includeEmpty ? 'checked' : ''} style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer;">` +
        `${esc(t('log_include_empty') || 'Include days with no meditation')}` +
        `</label>` +
        `</div>`;

      chartHtml += isWeek ? buildWeekChart(sessions) : buildWeekdayAverageChart(sessions);
      chartEl.innerHTML = chartHtml;

      chartEl.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => _setChartMode(btn.dataset.mode));
      });

      const emptyToggle = chartEl.querySelector('#toggle-empty-days');
      if (emptyToggle) {
        emptyToggle.addEventListener('change', (e) => _setIncludeEmptyDays(e.target.checked));
      }
    }
  }

  // ── Log List — DOM-based rendering (no innerHTML for user data) ──
  const logListEl = document.getElementById('log-list');
  if (logListEl) {
    // Clear existing
    logListEl.innerHTML = '';

    sessions.forEach(s => {
      const li = document.createElement('li');
      li.dataset.sessionId = s.id;

      // Header
      const header = document.createElement('div');
      header.className = 'log-header';

      const dateDiv = document.createElement('div');
      dateDiv.className = 'log-date';
      dateDiv.textContent = `${s.date} \u00A0 ${s.startTime}`;

      const delBtn = document.createElement('button');
      delBtn.className = 'log-delete-btn';
      delBtn.dataset.sessionId = s.id;
      delBtn.setAttribute('aria-label', 'Delete session');
      delBtn.textContent = '\u00D7';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSession(s.id);
      });

      header.appendChild(dateDiv);
      header.appendChild(delBtn);

      // Detail
      const detail = document.createElement('div');
      detail.className = 'log-detail';
      let detailText = `${formatDuration(s.actual)} / ${formatDuration(s.planned)} ${t('log_planned')}`;
      if (!s.completed) detailText += ` \u00A0 ${t('log_stopped')}`;
      detail.textContent = detailText;

      if (s.manual) {
        const manualSpan = document.createElement('span');
        manualSpan.style.cssText = 'opacity:0.6;font-size:0.8em';
        manualSpan.textContent = ` \u00A0 ${t('log_manual')}`;
        detail.appendChild(manualSpan);
      }

      li.appendChild(header);
      li.appendChild(detail);

      if (s.note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'log-note';
        noteDiv.textContent = s.note;  // textContent = safe, no HTML execution
        li.appendChild(noteDiv);
      }

      logListEl.appendChild(li);
    });
  }
}

// ─── Save / Notes ────────────────────────────────────────────────

export function saveSession(completed, actualSecs, note) {
  const sessions = safeRead();
  sessions.unshift({
    id: Date.now(),
    date: new Date(sessionStart).toLocaleDateString({ pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB'),
    startTime: new Date(sessionStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    planned: plannedDuration,
    actual: actualSecs !== undefined ? actualSecs : plannedDuration,
    completed,
    sound: currentSound,
    note: note || ''
  });
  safeWrite(sessions);
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

// ─── CSV Export / Import ─────────────────────────────────────────

export function exportCSV() {
  const sessions = safeRead();
  if (!sessions.length) { alert(t('export_error')); return; }
  const rows = [['Date', 'Start', 'Planned (s)', 'Actual (s)', 'Completed', 'Sound', 'Note']].concat(
    sessions.map(s => [s.date, s.startTime, s.planned, s.actual, s.completed, s.sound, '"' + (s.note || '').split('"').join('""') + '"'])
  );
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'meditation_log_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  log('CSV exported:', sessions.length);
}

export function importCSV(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim());
      const header = lines[0].split(',');
      const col = name => header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
      const iDate = col('date'), iStart = col('start'), iPlanned = col('planned (s)');
      const iActual = col('actual (s)'), iCompleted = col('completed'), iSound = col('sound'), iNote = col('note');
      if (iDate < 0 || iActual < 0) throw new Error('Unrecognised CSV format');

      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = [];
        const line = lines[i];
        let inQ = false, cur = '';
        for (let c = 0; c < line.length; c++) {
          const ch = line[c];
          if (ch === '"') inQ = !inQ;
          else if (ch === ',' && !inQ) { parts.push(cur); cur = ''; }
          else cur += ch;
        }
        parts.push(cur);

        const actual = parseInt(parts[iActual]) || 0;
        const planned = iPlanned >= 0 ? (parseInt(parts[iPlanned]) || actual) : actual;
        const completed = iCompleted >= 0 ? parts[iCompleted].trim().toLowerCase() === 'true' : true;
        const note = iNote >= 0 ? parts[iNote].trim() : '';
        const dateStr = iDate >= 0 ? parts[iDate].trim() : '';
        const startStr = iStart >= 0 ? parts[iStart].trim() : '00:00';
        const id = parseDateToTimestamp(dateStr, startStr) || Date.now() - (lines.length - i) * 1000;

        imported.push({ id, date: dateStr, startTime: startStr, planned, actual, completed, sound: iSound >= 0 ? parts[iSound].trim() : 'bell', note });
      }

      if (!imported.length) throw new Error('No rows found');

      const existing = safeRead();
      const merged = existing.slice();
      imported.forEach(s => { if (!merged.find(x => x.id === s.id)) merged.push(s); });
      merged.sort((a, b) => b.id - a.id);
      safeWrite(merged);
      renderLog();
      onSuccess(imported.length);
      log('CSV imported:', imported.length);
    } catch (err) { onError(err.message); }
  };
  reader.readAsText(file);
}

function parseDateToTimestamp(dateStr, timeStr) {
  if (!dateStr) return null;
  const normalized = dateStr.trim();
  const timeNorm = (timeStr || '00:00').trim();

  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [h, m] = timeNorm.split(':');
    return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]), parseInt(h) || 0, parseInt(m) || 0).getTime();
  }
  const euro = normalized.match(/^(\d{1,2})[/\.](\d{1,2})[/\.](\d{4})$/);
  if (euro) {
    const [h, m] = timeNorm.split(':');
    return new Date(parseInt(euro[3]), parseInt(euro[2]) - 1, parseInt(euro[1]), parseInt(h) || 0, parseInt(m) || 0).getTime();
  }
  const parsed = Date.parse(normalized + ' ' + timeNorm);
  return isNaN(parsed) ? null : parsed;
}

// ─── Manual Entry ────────────────────────────────────────────────

export function saveManualSession(dateStr, timeStr, durationMins, note) {
  const sessions = safeRead();
  const id = Date.parse(dateStr + 'T' + timeStr) || Date.now();
  const locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[getCurrentLang()] || 'en-GB';
  const d = new Date(id);
  sessions.push({
    id, date: d.toLocaleDateString(locale), startTime: timeStr,
    planned: durationMins * 60, actual: durationMins * 60,
    completed: true, sound: 'none', note: note || '', manual: true
  });
  sessions.sort((a, b) => b.id - b.id);
  safeWrite(sessions);
  log('Manual session saved');
}

export function clearLog() { localStorage.removeItem(STORAGE_KEY); log('Log cleared'); }

export function deleteSession(sessionId) {
  if (!confirm(t('confirm_delete'))) return;
  const sessions = safeRead().filter(s => s.id !== sessionId);
  safeWrite(sessions);
  log('Session deleted:', sessionId);
  renderLog();
}
