/**
 * Geographic utilities for distance calculations and coordinate handling.
 */

const EARTH_RADIUS_KM = 6371;

/** Convert degrees to radians */
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two points in km.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in km
 */
function haversine(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest station to a given point.
 * @param {number} lat
 * @param {number} lng
 * @param {Array<{lat:number, lng:number}>} stations
 * @returns {{station: object, distance: number}}
 */
function findNearest(lat, lng, stations) {
  let nearest = null;
  let minDist = Infinity;
  for (const s of stations) {
    const d = haversine(lat, lng, s.lat, s.lng);
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  }
  return { station: nearest, distance: minDist };
}

/**
 * Estimate travel time in minutes based on distance.
 * Uses average emergency vehicle speed (50 km/h urban).
 * @param {number} distanceKm
 * @param {number} avgSpeedKmh
 * @returns {number} minutes
 */
function estimateTravelTime(distanceKm, avgSpeedKmh = 50) {
  return (distanceKm / avgSpeedKmh) * 60;
}

module.exports = {
  haversine,
  findNearest,
  estimateTravelTime,
};
