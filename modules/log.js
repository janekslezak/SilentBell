// ─── Log Module ────────────────────────────────────────────────
// Session logging, export, import, and visualization.

import { t } from './i18n.js';
import { state, get, set } from './state.js';
import { storage } from './storage.js';

let sessionStart = null;
let plannedDuration = 0;
let currentSound = 'bell';

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Log]', ...args);
}

export function setSessionStart(start) {
  sessionStart = start;
}

export function setPlannedDuration(duration) {
  plannedDuration = duration;
}

export function setCurrentSoundForLog(sound) {
  currentSound = sound;
}

export function getSessions() {
  return storage.get('meditation_log', []);
}

export function saveSession(completed, actualSeconds, note) {
  const sessions = getSessions();
  
  const session = {
    date: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    planned: plannedDuration,
    actual: actualSeconds || plannedDuration,
    completed: completed,
    sound: currentSound,
    note: note || ''
  };
  
  sessions.unshift(session);
  storage.set('meditation_log', sessions);
  log('Session saved:', session);
}

export function showNoteField(completed, actualSeconds) {
  const noteWrap = document.getElementById('note-wrap');
  const noteInput = document.getElementById('note-input');
  const noteSaveBtn = document.getElementById('note-save-btn');
  
  if (!noteWrap) return;
  
  noteWrap.style.display = 'flex';
  if (noteInput) {
    noteInput.value = '';
    noteInput.placeholder = t('note_placeholder');
    noteInput.focus();
  }
  
  const saveHandler = () => {
    const note = noteInput ? noteInput.value.trim() : '';
    saveSession(completed, actualSeconds, note);
    noteWrap.style.display = 'none';
    renderLog();
    
    if (noteSaveBtn) {
      noteSaveBtn.removeEventListener('click', saveHandler);
    }
  };
  
  if (noteSaveBtn) {
    noteSaveBtn.addEventListener('click', saveHandler);
  }
  
  if (noteInput) {
    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveHandler();
      }
    });
  }
}

export function saveManualSession(date, time, duration, note) {
  const sessions = getSessions();
  
  const session = {
    date: date,
    startTime: time,
    planned: duration * 60,
    actual: duration * 60,
    completed: true,
    sound: currentSound,
    note: note || '',
    manual: true
  };
  
  sessions.unshift(session);
  storage.set('meditation_log', sessions);
  log('Manual session saved:', session);
}

export function clearLog() {
  storage.set('meditation_log', []);
  log('Log cleared');
}

export function exportCSV() {
  const sessions = getSessions();
  
  if (sessions.length === 0) {
    alert(t('export_error') + ': ' + 'No sessions to export');
    return;
  }
  
  const headers = ['Date', 'Time', 'Planned (min)', 'Actual (min)', 'Completed', 'Sound', 'Note'];
  const rows = sessions.map(s => [
    s.date,
    s.startTime,
    Math.round(s.planned / 60),
    Math.round(s.actual / 60),
    s.completed ? 'Yes' : 'No',
    s.sound,
    `"${(s.note || '').replace(/"/g, '""')}"`
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `silent-bell-sessions-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  log('CSV exported');
}

// Parse European date format (DD.MM.YYYY) to ISO format (YYYY-MM-DD)
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Check if already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try European format (DD.MM.YYYY)
  const euroMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euroMatch) {
    const [, day, month, year] = euroMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try other common formats
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return dateStr;
}

// Detect if CSV uses seconds or minutes based on values
function detectUnit(values) {
  // If average value is > 200, likely seconds; if < 100, likely minutes
  const nums = values.map(v => parseInt(v, 10)).filter(n => !isNaN(n) && n > 0);
  if (nums.length === 0) return 'minutes';
  
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return avg > 200 ? 'seconds' : 'minutes';
}

export function importCSV(file, onSuccess, onError) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      
      if (lines.length < 2) {
        onError('Invalid CSV format');
        return;
      }
      
      // Parse header to detect format
      const header = lines[0].toLowerCase();
      const isOldFormat = header.includes('planned (s)') || header.includes('actual (s)');
      const usesSeconds = isOldFormat || header.includes('(s)');
      
      log('CSV format detected:', isOldFormat ? 'old (seconds)' : 'new (minutes)', 
          'Header:', header);
      
      const sessions = getSessions();
      let importedCount = 0;
      
      // Collect all planned values to detect unit if ambiguous
      const allPlanned = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 3) {
          allPlanned.push(parts[2]);
        }
      }
      const unit = usesSeconds ? 'seconds' : detectUnit(allPlanned);
      log('Detected time unit:', unit);
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 6) {
          const dateStr = parts[0].trim();
          const timeStr = parts[1].trim();
          const plannedVal = parseInt(parts[2], 10);
          const actualVal = parseInt(parts[3], 10);
          const completedStr = parts[4].trim().toLowerCase();
          const sound = parts[5].trim();
          const note = parts[6] ? parts[6].replace(/^"|"$/g, '').replace(/""/g, '"') : '';
          
          // Parse date (handle both ISO and European formats)
          const parsedDate = parseDate(dateStr);
          
          // Convert to seconds if needed
          const planned = unit === 'seconds' ? plannedVal : plannedVal * 60;
          const actual = unit === 'seconds' ? actualVal : actualVal * 60;
          
          // Parse completed status
          const completed = completedStr === 'true' || completedStr === 'yes';
          
          if (parsedDate && !isNaN(planned)) {
            const session = {
              date: parsedDate,
              startTime: timeStr,
              planned: planned,
              actual: actual || planned,
              completed: completed,
              sound: sound || 'bell',
              note: note,
              imported: true
            };
            
            sessions.push(session);
            importedCount++;
            log('Imported session:', session);
          } else {
            log('Skipped invalid row:', parts);
          }
        }
      }
      
      storage.set('meditation_log', sessions);
      onSuccess(importedCount);
      log('CSV imported:', importedCount, 'sessions');
    } catch (error) {
      log('Import error:', error);
      onError(error.message);
    }
  };
  
  reader.onerror = () => {
    onError('Failed to read file');
  };
  
  reader.readAsText(file);
}

export function renderLog() {
  const logList = document.getElementById('log-list');
  const logSummary = document.getElementById('log-summary');
  const logChart = document.getElementById('log-chart');
  
  if (!logList) return;
  
  const sessions = getSessions();
  
  // Summary
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.actual || s.planned), 0) / 60;
  const completedSessions = sessions.filter(s => s.completed).length;
  
  if (logSummary) {
    logSummary.innerHTML = `
      <div class="log-stat">
        <span class="log-stat-value">${totalSessions}</span>
        <span class="log-stat-label">${t('log_sessions')}</span>
      </div>
      <div class="log-stat">
        <span class="log-stat-value">${Math.round(totalMinutes)}</span>
        <span class="log-stat-label">${t('log_total')} (min)</span>
      </div>
      <div class="log-stat">
        <span class="log-stat-value">${completedSessions}</span>
        <span class="log-stat-label">${t('log_completed')}</span>
      </div>
    `;
  }
  
  // Chart (last 7 days)
  if (logChart) {
    renderChart(logChart, sessions);
  }
  
  // Session list
  logList.innerHTML = '';
  
  sessions.slice(0, 50).forEach(session => {
    const li = document.createElement('li');
    li.className = 'log-item';
    
    const noteText = session.note ? `<div class="log-note">${session.note}</div>` : '';
    const manualBadge = session.manual ? `<span class="log-badge">${t('log_manual')}</span>` : '';
    const importedBadge = session.imported ? `<span class="log-badge">imported</span>` : '';
    
    li.innerHTML = `
      <div class="log-item-header">
        <span class="log-date">${session.date}</span>
        <span class="log-time">${session.startTime}</span>
        ${manualBadge}
        ${importedBadge}
      </div>
      <div class="log-item-body">
        <span class="log-duration">${Math.round((session.actual || session.planned) / 60)} min</span>
        <span class="log-sound">${session.sound}</span>
        ${!session.completed ? `<span class="log-stopped">${t('log_stopped')}</span>` : ''}
      </div>
      ${noteText}
    `;
    
    logList.appendChild(li);
  });
}

function renderChart(container, sessions) {
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const daySessions = sessions.filter(s => s.date === dateStr);
    const dayMinutes = daySessions.reduce((sum, s) => sum + (s.actual || s.planned), 0) / 60;
    
    last7Days.push({
      date: dateStr,
      minutes: Math.round(dayMinutes),
      label: date.toLocaleDateString('en', { weekday: 'short' })
    });
  }
  
  const maxMinutes = Math.max(...last7Days.map(d => d.minutes), 1);
  
  container.innerHTML = `
    <div class="chart-title">${t('chart_last7')}</div>
    <div class="chart-bars">
      ${last7Days.map(day => `
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="height: ${(day.minutes / maxMinutes) * 100}%"></div>
          <div class="chart-bar-label">${day.label}</div>
          ${day.minutes > 0 ? `<div class="chart-bar-value">${day.minutes}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}
