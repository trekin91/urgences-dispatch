/**
 * Dispatch logic — send vehicles to interventions
 */

/** Default stations for offline/fallback mode */
const DEFAULT_STATIONS = [
  { name: 'CS Centre', type: 'fire', lat: 43.2965, lng: 5.3698 },
  { name: 'CS La Rose', type: 'fire', lat: 43.3320, lng: 5.4270 },
  { name: 'CS Plombières', type: 'fire', lat: 43.3120, lng: 5.3780 },
  { name: 'CS Endoume', type: 'fire', lat: 43.2850, lng: 5.3520 },
  { name: 'CS Capelette', type: 'fire', lat: 43.2870, lng: 5.4010 },
  { name: 'Hôp. La Timone', type: 'hospital', lat: 43.2890, lng: 5.4032 },
  { name: 'Hôp. Nord', type: 'hospital', lat: 43.3580, lng: 5.3640 },
  { name: 'Commissariat', type: 'police', lat: 43.2955, lng: 5.3750 },
];

function dispatchCall() {
  const state = window.gameState;
  const call = state.calls.find(x => x.id === state.activeCallId);
  if (!call) return;

  // Collect selected vehicles
  const selectedVehicles = [];
  document.querySelectorAll('.vehicle-select.active-2').forEach(b => {
    selectedVehicles.push(b.dataset.vehicle);
  });
  const vehicles = selectedVehicles.length > 0 ? selectedVehicles : call.suggestedVehicles || ['VSAV'];

  // Send to server
  socketDispatch(call.id, vehicles);

  // Immediate local update for responsiveness
  state.calls = state.calls.filter(x => x.id !== state.activeCallId);

  const intervention = {
    id: 'INT-' + Date.now().toString(36).toUpperCase(),
    nature: call.nature,
    address: call.address,
    lat: call.lat,
    lng: call.lng,
    severity: call.severity,
    status: 'en_route',
    vehicles: vehicles,
  };

  state.interventions.unshift(intervention);
  state.vehiclesEngaged += vehicles.length;

  // Map markers & animation
  if (window.gameMap) {
    intervention._marker = addInterventionMarker(window.gameMap, intervention);

    const fireStations = DEFAULT_STATIONS.filter(s => s.type === 'fire');
    const nearest = fireStations.sort((a, b) =>
      Math.hypot(a.lat - call.lat, a.lng - call.lng) - Math.hypot(b.lat - call.lat, b.lng - call.lng)
    )[0];

    const vehicleMarker = addVehicleMarker(window.gameMap, nearest, { lat: call.lat, lng: call.lng });
    animateMarker(vehicleMarker, [nearest.lat, nearest.lng], [call.lat, call.lng], 8000, () => {
      intervention.status = 'on_scene';
      renderInterventions();
      updateBadges(state);
      showToast('✅ Sur place — ' + intervention.nature);

      setTimeout(() => {
        intervention.status = 'resolved';
        state.resolved++;
        state.vehiclesEngaged -= vehicles.length;
        state.interventions = state.interventions.filter(i => i.id !== intervention.id);
        if (intervention._marker) window.gameMap.removeLayer(intervention._marker);
        window.gameMap.removeLayer(vehicleMarker);
        renderInterventions();
        updateStats(state);
        updateBadges(state);
        showToast('🏁 Résolue — ' + intervention.nature);
      }, 15000 + Math.random() * 10000);
    });
  }

  closeModal();
  renderCalls();
  renderInterventions();
  updateStats(state);
  updateBadges(state);
  showToast('🚒 ' + vehicles.join(', '));

  // Switch to map on mobile
  if (window.innerWidth < 900) {
    document.querySelector('[data-tab="tabMap"]').click();
  }
  if (window.gameMap) {
    window.gameMap.flyTo([call.lat, call.lng], 15, { duration: 1 });
  }
}

function renderInterventions() {
  const el = document.getElementById('interventionsList');
  const state = window.gameState;
  document.getElementById('interventionCount').textContent = state.interventions.length;

  if (!state.interventions.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚒</div><div class="empty-state-text">Aucune intervention en cours</div></div>';
    return;
  }

  el.innerHTML = state.interventions.map(i => {
    const sc = i.severity >= 4 ? 'critique' : i.status === 'on_scene' ? 'sur-place' : 'en-cours';
    const sl = i.status === 'en_route' ? 'EN ROUTE' : 'SUR PLACE';
    const sb = i.status === 'en_route' ? 'status-en-route' : i.severity >= 4 ? 'status-critique' : 'status-sur-place';
    return `
      <div class="intervention-card ${sc}" onclick="goTo(${i.lat},${i.lng})">
        <div class="intervention-header">
          <span class="intervention-id">${i.id}</span>
          <span class="intervention-status ${sb}">${sl}</span>
        </div>
        <div class="intervention-nature">${i.nature}</div>
        <div class="intervention-address">📍 ${i.address}</div>
        <div class="intervention-vehicles">
          ${i.vehicles.map(v => `<span class="vehicle-tag ${i.status === 'on_scene' ? 'on-scene' : 'dispatched'}">${v}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');
}
