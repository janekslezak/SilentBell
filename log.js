import { t, currentLang } from './lang.js';

// ─── Storage ──────────────────────────────────────────────────────

export function getSessions() {
  try { return JSON.parse(localStorage.getItem('meditation_log')) || []; }
  catch(e) { return []; }
}

export function saveSession(sessionStart, plannedDuration, completed, actualSecs, currentSound, note) {
  var sessions = getSessions();
  var locale   = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[currentLang] || 'en-GB';
  sessions.unshift({
    id:        Date.now(),
    date:      new Date(sessionStart).toLocaleDateString(locale),
    startTime: new Date(sessionStart).toLocaleTimeString('en-GB',
                 { hour: '2-digit', minute: '2-digit' }),
    planned:   plannedDuration,
    actual:    actualSecs !== undefined ? actualSecs : plannedDuration,
    completed: completed,
    sound:     currentSound,
    note:      note || ''
  });
  localStorage.setItem('meditation_log', JSON.stringify(sessions));
}

export function saveManualSession(dateStr, timeStr, durationMins, note) {
  var sessions = getSessions();
  var id       = Date.parse(dateStr + 'T' + timeStr) || Date.now();
  var locale   = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[currentLang] || 'en-GB';
  var d        = new Date(id);
  sessions.push({
    id:        id,
    date:      d.toLocaleDateString(locale),
    startTime: timeStr,
    planned:   durationMins * 60,
    actual:    durationMins * 60,
    completed: true,
    sound:     'none',
    note:      note || '',
    manual:    true
  });
  sessions.sort(function(a, b) { return b.id - a.id; });
  localStorage.setItem('meditation_log', JSON.stringify(sessions));
}

// ─── Helpers ──────────────────────────────────────────────────────

export function formatDuration(secs) {
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return s > 0 ? (m + 'm ' + s + 's') : (m + 'm');
}

// ─── Streak ───────────────────────────────────────────────────────

export function computeStreak(sessions) {
  var dateSet = {};
  sessions.forEach(function(s) {
    if (!s.completed) return;
    var d = new Date(s.id);
    var k = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    dateSet[k] = true;
  });
  var streak = 0;
  for (var i = 0; i < 365; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var k = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    if (dateSet[k]) { streak++; } else { break; }
  }
  return streak;
}

// ─── Weekly Chart ─────────────────────────────────────────────────

export function buildWeekChart(sessions) {
  var W = 7, BW = 28, GAP = 8, H = 56, LH = 18, TOPH = 16;
  var svgW   = W * (BW + GAP) - GAP;
  var cs     = getComputedStyle(document.documentElement);
  var accent = cs.getPropertyValue('--accent').trim() || '#88c0d0';
  var muted  = cs.getPropertyValue('--muted').trim()  || '#7b8fa1';
  var border = cs.getPropertyValue('--border').trim() || '#2e3a4e';
  var locale = { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[currentLang] || 'en-GB';

  var dayMins = {}, days = [];
  for (var i = W - 1; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var k = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    days.push({ key: k, label: d.toLocaleDateString(locale, { weekday: 'narrow' }) });
    dayMins[k] = 0;
  }

  sessions.forEach(function(s) {
    var d = new Date(s.id);
    var k = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    if (dayMins[k] !== undefined) dayMins[k] += Math.round(s.actual / 60);
  });

  var maxM     = Math.max(1, Math.max.apply(null, days.map(function(d) { return dayMins[d.key]; })));
  var todayKey = days[W - 1].key;

  var bars = days.map(function(day, i) {
    var mins = dayMins[day.key];
    var bh   = mins > 0 ? Math.max(4, Math.round((mins / maxM) * H)) : 2;
    var x    = i * (BW + GAP);
    var fill = mins > 0 ? accent : border;
    var op   = day.key === todayKey ? '1' : '0.65';
    var barRect  = '<rect x="' + x + '" y="' + (H - bh) + '" width="' + BW +
      '" height="' + bh + '" rx="3" fill="' + fill + '" opacity="' + op + '">' +
      '<title>' + mins + ' min</title></rect>';
    var minLabel = mins > 0
      ? '<text x="' + (x + BW/2) + '" y="' + (H - bh - 4) +
        '" text-anchor="middle" font-size="9" fill="' + accent +
        '" opacity="' + op + '">' + mins + '</text>' : '';
    var dayLabel = '<text x="' + (x + BW/2) + '" y="' + (H + LH - 2) +
      '" text-anchor="middle" font-size="10" fill="' + muted + '">' + day.label + '</text>';
    return barRect + minLabel + dayLabel;
  }).join('');

  return '<svg width="100%" viewBox="0 0 ' + svgW + ' ' + (H + LH + TOPH) +
    '" style="display:block;margin:14px 0 6px">' +
    '<g transform="translate(0,' + TOPH + ')">' + bars + '</g></svg>';
}

// ─── Render Log ───────────────────────────────────────────────────

export function renderLog() {
  var sessions  = getSessions();
  var totalSecs = sessions.reduce(function(a, s) { return a + s.actual; }, 0);
  var totalH    = Math.floor(totalSecs / 3600);
  var totalM    = Math.floor((totalSecs % 3600) / 60);
  var streak    = computeStreak(sessions);
  var streakHtml = streak > 0
    ? ' &nbsp;&#x1F525; <strong>' + streak + '</strong> ' + t('log_days')
    : '';

  document.getElementById('log-summary').innerHTML =
    t('log_sessions') + ': <strong>' + sessions.length + '</strong> &nbsp;' +
    t('log_total') + ': <strong>' + totalH + 'h ' + totalM + 'm</strong> &nbsp;' +
    t('log_completed') + ': <strong>' + sessions.filter(function(s) { return s.completed; }).length + '</strong>' +
    streakHtml;

  var chartEl = document.getElementById('log-chart');
  if (chartEl) chartEl.innerHTML = sessions.length ? buildWeekChart(sessions) : '';

  document.getElementById('log-list').innerHTML = sessions.map(function(s) {
    var noteHtml = s.note
      ? '<div class="log-note">' + s.note.replace(/</g, '&lt;') + '</div>'
      : '';
    return '<li>' +
      '<div class="log-date">' + s.date + ' &nbsp; ' + s.startTime + '</div>' +
      '<div class="log-detail">' +
        formatDuration(s.actual) + ' / ' + formatDuration(s.planned) + ' ' + t('log_planned') +
        (!s.completed ? ' &nbsp; ' + t('log_stopped') : '') +
        (s.manual ? ' &nbsp; <span class="log-manual-badge">' + t('log_manual') + '</span>' : '') +
      '</div>' + noteHtml + '</li>';
  }).join('');
}

// ─── Session Note ─────────────────────────────────────────────────

export function showNoteField(sessionStart, plannedDuration, currentSound, completed, actualSecs) {
  var wrap  = document.getElementById('note-wrap');
  var input = document.getElementById('note-input');
  var btn   = document.getElementById('note-save-btn');
  if (!wrap) { saveSession(sessionStart, plannedDuration, completed, actualSecs, currentSound, ''); return; }

  var saved = false;
  input.value        = '';
  input.placeholder  = t('note_placeholder');
  btn.textContent    = t('note_save');
  wrap.style.display = 'flex';
  input.focus();

  function doSave() {
    if (saved) return;
    saved = true;
    wrap.style.display = 'none';
    saveSession(sessionStart, plannedDuration, completed, actualSecs, currentSound, input.value.trim());
  }

  btn.onclick     = doSave;
  input.onkeydown = function(e) { if (e.key === 'Enter') doSave(); };
  input.onblur    = function()  { setTimeout(doSave, 200); };
  document.querySelectorAll('.nav-btn').forEach(function(b) {
    b.addEventListener('click', doSave, { once: true });
  });
}

// ─── CSV Export ───────────────────────────────────────────────────

export function initExport() {
  document.getElementById('btn-export').addEventListener('click', function() {
    var sessions = getSessions();
    var rows = [['Date','Start','Planned (s)','Actual (s)','Completed','Sound','Manual','Note']].concat(
      sessions.map(function(s) {
        return [
          s.date, s.startTime, s.planned, s.actual, s.completed, s.sound,
          s.manual ? 'true' : 'false',
          '"' + (s.note || '').replace(/"/g, '""') + '"'
        ];
      })
    );
    var csv = rows.map(function(r) { return r.join(','); }).join('\n');
    var a   = document.createElement('a');
    a.href  = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'meditation_log.csv';
    a.click();
  });
}

// ─── CSV Import ───────────────────────────────────────────────────

export function initImport() {
  document.getElementById('btn-import-csv').addEventListener('click', function() {
    document.getElementById('import-csv-file').click();
  });

  document.getElementById('import-csv-file').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var lines  = ev.target.result.split(/\r?\n/).filter(function(l) { return l.trim(); });
        var header = lines[0].split(',');
        function col(name) {
          return header.findIndex(function(h) { return h.trim().toLowerCase() === name.toLowerCase(); });
        }
        var iDate = col('Date'), iStart = col('Start'),
            iPlanned = col('Planned (s)'), iActual = col('Actual (s)'),
            iCompleted = col('Completed'), iSound = col('Sound'), iNote = col('Note');
        if (iDate < 0 || iActual < 0) throw new Error('Unrecognised CSV format');

        var imported = [];
        for (var i = 1; i < lines.length; i++) {
          var parts = [], line = lines[i], inQ = false, cur = '';
          for (var c = 0; c < line.length; c++) {
            var ch = line[c];
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { parts.push(cur); cur = ''; }
            else { cur += ch; }
          }
          parts.push(cur);
          var actual    = parseInt(parts[iActual])  || 0;
          var planned   = parseInt(parts[iPlanned]) || actual;
          var completed = iCompleted >= 0 ? (parts[iCompleted].trim().toLowerCase() === 'true') : true;
          var note      = iNote  >= 0 ? parts[iNote].trim()  : '';
          var dateStr   = iDate  >= 0 ? parts[iDate].trim()  : '';
          var startStr  = iStart >= 0 ? parts[iStart].trim() : '';
          var id = Date.parse(dateStr + ' ' + startStr) || (Date.now() - (lines.length - i) * 1000);
          imported.push({
            id: id, date: dateStr, startTime: startStr, planned: planned, actual: actual,
            completed: completed, sound: iSound >= 0 ? parts[iSound].trim() : 'bell', note: note
          });
        }
        if (!imported.length) throw new Error('No rows found');
        var existing = getSessions();
        var merged   = existing.slice();
        imported.forEach(function(s) {
          if (!merged.find(function(x) { return x.id === s.id; })) merged.push(s);
        });
        merged.sort(function(a, b) { return b.id - a.id; });
        localStorage.setItem('meditation_log', JSON.stringify(merged));
        renderLog();
        alert('Imported ' + imported.length + ' sessions from CSV.');
      } catch(err) {
        alert('Could not import CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

// ─── Manual Session Entry ─────────────────────────────────────────

export function initManualEntry() {
  document.getElementById('btn-manual-log').addEventListener('click', function() {
    var form    = document.getElementById('manual-entry');
    var visible = form.style.display === 'flex';
    if (visible) {
      form.style.display = 'none';
    } else {
      var now = new Date();
      var pad = function(n) { return String(n).padStart(2, '0'); };
      document.getElementById('manual-date').value =
        now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
      document.getElementById('manual-time').value =
        pad(now.getHours()) + ':' + pad(now.getMinutes());
      document.getElementById('manual-duration').value = '';
      document.getElementById('manual-note').value       = '';
      document.getElementById('manual-note').placeholder = t('note_placeholder');
      form.style.display = 'flex';
    }
  });

  document.getElementById('manual-cancel-btn').addEventListener('click', function() {
    document.getElementById('manual-entry').style.display = 'none';
  });

  document.getElementById('manual-save-btn').addEventListener('click', function() {
    var dateVal = document.getElementById('manual-date').value;
    var timeVal = document.getElementById('manual-time').value;
    var durVal  = parseInt(document.getElementById('manual-duration').value);
    var noteVal = document.getElementById('manual-note').value.trim();
    if (!durVal || durVal < 1) { alert(t('manual_err_dur')); return; }
    if (!dateVal) {
      var now = new Date(); var pad = function(n) { return String(n).padStart(2, '0'); };
      dateVal = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    }
    if (!timeVal) timeVal = '00:00';
    saveManualSession(dateVal, timeVal, durVal, noteVal);
    document.getElementById('manual-entry').style.display = 'none';
    renderLog();
    alert(t('manual_saved'));
  });
}

// ─── Clear Log ────────────────────────────────────────────────────

export function initClearLog() {
  document.getElementById('btn-clear-log').addEventListener('click', function() {
    if (confirm(t('confirm_clear'))) {
      localStorage.removeItem('meditation_log');
      renderLog();
    }
  });
}
