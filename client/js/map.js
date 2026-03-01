/**
 * Leaflet map setup and marker management
 */

function initMap() {
  const map = L.map('map', { zoomControl: false, attributionControl: false })
    .setView([43.2965, 5.3698], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);

  window.gameMap = map;
  return map;
}

/** Add station markers from a list of {name, type, lat, lng} */
function addStationMarkers(map, stations) {
  stations.forEach(s => {
    const cls = s.type === 'fire' ? 'marker-fire'
      : s.type === 'hospital' ? 'marker-hospital'
      : 'marker-police';
    L.marker([s.lat, s.lng], {
      icon: L.divIcon({ className: cls, iconSize: [10, 10] }),
    }).addTo(map).bindTooltip(s.name, { direction: 'top', offset: [0, -8] });
  });
}

/** Add an intervention marker to the map */
function addInterventionMarker(map, intervention) {
  const cls = intervention.severity >= 4
    ? 'marker-intervention critique'
    : 'marker-intervention';
  return L.marker([intervention.lat, intervention.lng], {
    icon: L.divIcon({ className: cls, iconSize: [16, 16] }),
  }).addTo(map).bindTooltip('🚨 ' + intervention.nature, { direction: 'top', offset: [0, -12] });
}

/** Add a vehicle marker and animate it from station to target */
function addVehicleMarker(map, from, to) {
  const marker = L.marker([from.lat, from.lng], {
    icon: L.divIcon({ className: 'marker-vehicle', html: '🚒', iconSize: [18, 18] }),
  }).addTo(map);
  return marker;
}

/** Animate a marker from one point to another */
function animateMarker(marker, from, to, duration, callback) {
  const start = Date.now();
  (function step() {
    const progress = Math.min((Date.now() - start) / duration, 1);
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    marker.setLatLng([
      from[0] + (to[0] - from[0]) * ease,
      from[1] + (to[1] - from[1]) * ease,
    ]);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else if (callback) {
      callback();
    }
  })();
}

/** Navigate map to coordinates */
function goTo(lat, lng) {
  if (window.innerWidth < 900) {
    document.querySelector('[data-tab="tabMap"]').click();
  }
  setTimeout(() => {
    if (window.gameMap) window.gameMap.flyTo([lat, lng], 16, { duration: 0.8 });
  }, 100);
}
