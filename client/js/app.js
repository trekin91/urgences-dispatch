/**
 * App entry point — initializes all modules
 */

// Global game state
window.gameState = {
  calls: [],
  interventions: [],
  resolved: 0,
  vehiclesEngaged: 0,
  activeCallId: null,
};

// ── Initialize ──────────────────────────────────────────────

(function init() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Init UI tabs
  initTabs();

  // Init map
  const map = initMap();
  addStationMarkers(map, DEFAULT_STATIONS);

  // Form interactions
  document.querySelectorAll('.severity-btn[data-level]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.severity-btn[data-level]').forEach(x => x.className = 'severity-btn');
      b.classList.add('active-' + b.dataset.level);
    });
  });

  document.querySelectorAll('.vehicle-select').forEach(b => {
    b.addEventListener('click', () => b.classList.toggle('active-2'));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Init socket connection
  initSocket();

  // Auto-join default room (for now — will be replaced by lobby UI)
  setTimeout(() => {
    socketJoinRoom('default', null, 'Opérateur', '18');
  }, 500);

  // Initial render
  renderCalls();
  renderInterventions();
  updateStats(window.gameState);
  updateBadges(window.gameState);
})();
