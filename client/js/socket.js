/**
 * Socket.io client connection and event handling.
 * Connects to the server and handles real-time game events.
 */

let socket = null;

function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('[socket] Connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('[socket] Disconnected');
  });

  socket.on('error', (data) => {
    console.error('[socket] Error:', data.message);
    showToast('Erreur: ' + data.message);
  });

  // ── Clock sync ────────────────────────────────────────

  socket.on('clock:tick', (data) => {
    document.getElementById('gameClock').textContent = data.time;
    document.getElementById('timeFactor').textContent = '×' + data.timeFactor;
  });

  socket.on('clock:factorChanged', (data) => {
    showToast('Vitesse: ×' + data.factor);
  });

  // ── Room events ───────────────────────────────────────

  socket.on('room:state', (data) => {
    console.log('[socket] Room state received:', data);
    // Restore calls and interventions from server state
    if (data.calls) {
      for (const call of data.calls) {
        if (!window.gameState.calls.find(c => c.id === call.id)) {
          window.gameState.calls.unshift(call);
        }
      }
      renderCalls();
    }
  });

  socket.on('room:player_joined', (data) => {
    showToast(data.username + ' a rejoint (' + data.service + ')');
  });

  socket.on('room:player_left', (data) => {
    if (data.username) {
      showToast(data.username + ' a quitté');
    }
  });

  // ── Call events ───────────────────────────────────────

  socket.on('call:new', (call) => {
    window.gameState.calls.unshift(call);
    renderCalls();
    updateBadges(window.gameState);
    showToast('📞 ' + call.nature);
  });

  socket.on('call:answered', (data) => {
    const call = window.gameState.calls.find(c => c.id === data.callId);
    if (call) call.ringing = false;
    renderCalls();
    updateBadges(window.gameState);
  });

  socket.on('call:rejected', (data) => {
    window.gameState.calls = window.gameState.calls.filter(c => c.id !== data.callId);
    renderCalls();
    updateBadges(window.gameState);
  });

  socket.on('call:removed', (data) => {
    window.gameState.calls = window.gameState.calls.filter(c => c.id !== data.callId);
    renderCalls();
    updateBadges(window.gameState);
  });

  socket.on('call:transferred', (data) => {
    showToast('↗ Appel transféré au ' + data.toService);
  });

  socket.on('call:auto_handled', (data) => {
    showToast('↗ ' + data.service + ' — moyens engagés automatiquement');
    window.gameState.calls = window.gameState.calls.filter(c => c.id !== data.callId);
    renderCalls();
    updateBadges(window.gameState);
  });

  // ── Intervention events ───────────────────────────────

  socket.on('intervention:new', (intervention) => {
    window.gameState.interventions.unshift(intervention);
    window.gameState.vehiclesEngaged += intervention.vehicles.length;
    // Add map markers
    if (window.gameMap) {
      intervention._marker = addInterventionMarker(window.gameMap, intervention);
    }
    renderInterventions();
    updateStats(window.gameState);
    updateBadges(window.gameState);
  });

  socket.on('intervention:update', (updated) => {
    const inter = window.gameState.interventions.find(i => i.id === updated.id);
    if (inter) {
      inter.status = updated.status;
      renderInterventions();
      updateBadges(window.gameState);
      showToast('✅ Sur place — ' + inter.nature);
    }
  });

  socket.on('intervention:resolved', (resolved) => {
    window.gameState.resolved++;
    const inter = window.gameState.interventions.find(i => i.id === resolved.id);
    if (inter) {
      window.gameState.vehiclesEngaged -= inter.vehicles.length;
      if (inter._marker && window.gameMap) window.gameMap.removeLayer(inter._marker);
    }
    window.gameState.interventions = window.gameState.interventions.filter(i => i.id !== resolved.id);
    renderInterventions();
    updateStats(window.gameState);
    updateBadges(window.gameState);
    showToast('🏁 Résolue — ' + resolved.nature);
  });

  return socket;
}

// ── Emit helpers ────────────────────────────────────────────

function socketJoinRoom(roomId, userId, username, service) {
  if (socket) socket.emit('room:join', { roomId, userId, username, service });
}

function socketAnswerCall(callId) {
  if (socket) socket.emit('call:answer', { callId });
}

function socketRejectCall(callId) {
  if (socket) socket.emit('call:reject', { callId });
}

function socketTransferCall(callId, targetService) {
  if (socket) socket.emit('call:transfer', { callId, targetService });
}

function socketDispatch(callId, vehicleIds) {
  if (socket) socket.emit('dispatch', { callId, vehicleIds });
}
