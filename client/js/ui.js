/**
 * UI utilities — toasts, tabs, typing effect
 */

// ── Tab navigation ──────────────────────────────────────────

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabViews = document.querySelectorAll('.tab-view');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabViews.forEach(v => v.classList.remove('active'));
      document.getElementById(t).classList.add('active');
      if (t === 'tabMap' && window.gameMap) {
        setTimeout(() => window.gameMap.invalidateSize(), 50);
      }
    });
  });
}

// ── Toast notifications ─────────────────────────────────────

function showToast(text) {
  const el = document.getElementById('toast');
  document.getElementById('toastText').textContent = text;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 3000);
}

// ── Typing text effect ──────────────────────────────────────

function typeText(el, text, i) {
  if (i <= text.length) {
    el.innerHTML = text.substring(0, i) + '<span class="typing-cursor"></span>';
    setTimeout(() => typeText(el, text, i + 1), 25 + Math.random() * 20);
  }
}

// ── Badge updates ───────────────────────────────────────────

function updateBadges(state) {
  const ringing = state.calls.filter(c => c.ringing).length;
  const cb = document.getElementById('tabCallsBadge');
  cb.textContent = ringing;
  cb.classList.toggle('hidden', ringing === 0);

  const ib = document.getElementById('tabInterBadge');
  ib.textContent = state.interventions.length;
  ib.classList.toggle('hidden', state.interventions.length === 0);
}

// ── Stats display ───────────────────────────────────────────

function updateStats(state) {
  document.getElementById('statInterventions').textContent = state.interventions.length;
  document.getElementById('statVehicles').textContent = state.vehiclesEngaged;
  document.getElementById('statResolved').textContent = state.resolved;
  document.getElementById('statAvgTime').textContent = state.resolved > 0 ? '06:42' : '--:--';
}
