/**
 * Call list rendering and call handling
 */

function renderCalls() {
  const el = document.getElementById('callsList');
  const state = window.gameState;
  document.getElementById('callCount').textContent = state.calls.length;

  if (!state.calls.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📡</div><div class="empty-state-text">En attente d\'appels...</div></div>';
    return;
  }

  el.innerHTML = state.calls.map(c => {
    const time = c.gameTime ? new Date(c.gameTime) : new Date();
    const h = String(time.getHours()).padStart(2, '0');
    const m = String(time.getMinutes()).padStart(2, '0');
    return `
      <div class="call-card ${c.ringing ? 'ringing' : ''}" onclick="answerCall('${c.id}')">
        <div class="call-header">
          <span class="call-type ${c.type}">${c.type.toUpperCase()}</span>
          <span class="call-time">${c.ringing ? '<span class="phone-icon">📞</span>' : '📋'} ${h}:${m}</span>
        </div>
        <div class="call-nature">${c.nature}</div>
        <div class="call-address">📍 ${c.address}</div>
        <div class="call-actions">
          <button class="btn btn-answer" onclick="event.stopPropagation();answerCall('${c.id}')">✓ Décrocher</button>
          <button class="btn btn-reject" onclick="event.stopPropagation();rejectCall('${c.id}')">✕</button>
          <button class="btn btn-transfer" onclick="event.stopPropagation();transferCallFromList('${c.id}')">↗15</button>
        </div>
      </div>
    `;
  }).join('');
}

function answerCall(id) {
  const state = window.gameState;
  const call = state.calls.find(x => x.id === id);
  if (!call) return;

  call.ringing = false;
  state.activeCallId = id;
  renderCalls();
  updateBadges(state);

  // Notify server
  socketAnswerCall(id);

  // Open modal
  document.getElementById('callModal').classList.add('visible');
  const el = document.getElementById('callerText');
  el.innerHTML = '<span class="typing-cursor"></span>';
  typeText(el, call.text, 0);

  document.getElementById('addressInput').value = call.address;
  document.querySelectorAll('.severity-btn[data-level]').forEach(b => b.className = 'severity-btn');
  const sb = document.querySelector(`.severity-btn[data-level="${call.severity}"]`);
  if (sb) sb.classList.add(`active-${call.severity}`);
  document.querySelectorAll('.vehicle-select').forEach(b => b.className = 'severity-btn vehicle-select');
}

function rejectCall(id) {
  socketRejectCall(id);
  window.gameState.calls = window.gameState.calls.filter(c => c.id !== id);
  renderCalls();
  updateBadges(window.gameState);
}

function transferCallFromList(id) {
  showToast('↗ Transféré au 15');
  socketTransferCall(id, '15');
  rejectCall(id);
}

function closeModal() {
  document.getElementById('callModal').classList.remove('visible');
  window.gameState.activeCallId = null;
}

function transferCall() {
  showToast('↗ Transféré au SAMU');
  const activeId = window.gameState.activeCallId;
  if (activeId) {
    socketTransferCall(activeId, '15');
    window.gameState.calls = window.gameState.calls.filter(c => c.id !== activeId);
    renderCalls();
    updateBadges(window.gameState);
  }
  closeModal();
}
