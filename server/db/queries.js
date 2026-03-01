const pool = require('./pool');

// ── Users ──────────────────────────────────────────────────

async function createUser(username, email, passwordHash) {
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, created_at`,
    [username, email, passwordHash]
  );
  return rows[0];
}

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, username, email, xp, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

// ── Stations ───────────────────────────────────────────────

async function getStationsByDepartment(departmentCode) {
  const { rows } = await pool.query(
    `SELECT id, department_code, type, name,
            ST_X(location::geometry) AS lng,
            ST_Y(location::geometry) AS lat,
            osm_id
     FROM stations
     WHERE department_code = $1
     ORDER BY type, name`,
    [departmentCode]
  );
  return rows;
}

// ── Vehicles ───────────────────────────────────────────────

async function getVehiclesByStation(stationId) {
  const { rows } = await pool.query(
    `SELECT id, station_id, type, label, status
     FROM vehicles
     WHERE station_id = $1
     ORDER BY type, label`,
    [stationId]
  );
  return rows;
}

async function updateVehicleStatus(vehicleId, status) {
  await pool.query(
    'UPDATE vehicles SET status = $2 WHERE id = $1',
    [vehicleId, status]
  );
}

// ── Game centers / sessions ────────────────────────────────

async function getGameCenters(departmentCode) {
  const { rows } = await pool.query(
    `SELECT * FROM game_centers WHERE department_code = $1 ORDER BY name`,
    [departmentCode]
  );
  return rows;
}

async function joinSession(userId, centerId, service, socketId) {
  const { rows } = await pool.query(
    `INSERT INTO active_sessions (user_id, center_id, service, socket_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, centerId, service, socketId]
  );
  return rows[0];
}

async function leaveSession(socketId) {
  await pool.query(
    'DELETE FROM active_sessions WHERE socket_id = $1',
    [socketId]
  );
}

async function getSessionsForCenter(centerId) {
  const { rows } = await pool.query(
    `SELECT s.*, u.username
     FROM active_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.center_id = $1`,
    [centerId]
  );
  return rows;
}

// ── Interventions ──────────────────────────────────────────

async function createIntervention({ centerId, type, severity, lat, lng, status, serviceOrigin, address, nature }) {
  const { rows } = await pool.query(
    `INSERT INTO interventions (center_id, type, severity, location, status, service_origin, address, nature)
     VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography, $6, $7, $8, $9)
     RETURNING *`,
    [centerId, type, severity, lat, lng, status, serviceOrigin, address, nature]
  );
  return rows[0];
}

async function updateInterventionStatus(interventionId, status) {
  await pool.query(
    'UPDATE interventions SET status = $2, updated_at = NOW() WHERE id = $1',
    [interventionId, status]
  );
}

async function dispatchVehicle(interventionId, vehicleId) {
  const { rows } = await pool.query(
    `INSERT INTO intervention_vehicles (intervention_id, vehicle_id, dispatched_at)
     VALUES ($1, $2, NOW())
     RETURNING *`,
    [interventionId, vehicleId]
  );
  return rows[0];
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getStationsByDepartment,
  getVehiclesByStation,
  updateVehicleStatus,
  getGameCenters,
  joinSession,
  leaveSession,
  getSessionsForCenter,
  createIntervention,
  updateInterventionStatus,
  dispatchVehicle,
};
