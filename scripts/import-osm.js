/**
 * Import real stations (fire, hospital, police) from OpenStreetMap
 * via the Overpass API into PostgreSQL.
 *
 * Usage: node scripts/import-osm.js [department_code]
 * Example: node scripts/import-osm.js 13
 */
require('dotenv').config();
const pool = require('../server/db/pool');

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Default department: 13 (Bouches-du-Rhône)
const departmentCode = process.argv[2] || '13';

/**
 * Overpass queries for each station type.
 * We search within the administrative boundary of the department.
 */
const queries = {
  fire: `
    [out:json][timeout:60];
    area["ref:INSEE:DEP"="${departmentCode}"]->.dept;
    (
      node["amenity"="fire_station"](area.dept);
      way["amenity"="fire_station"](area.dept);
      relation["amenity"="fire_station"](area.dept);
    );
    out center;
  `,
  hospital: `
    [out:json][timeout:60];
    area["ref:INSEE:DEP"="${departmentCode}"]->.dept;
    (
      node["amenity"="hospital"](area.dept);
      way["amenity"="hospital"](area.dept);
      relation["amenity"="hospital"](area.dept);
    );
    out center;
  `,
  police: `
    [out:json][timeout:60];
    area["ref:INSEE:DEP"="${departmentCode}"]->.dept;
    (
      node["amenity"="police"](area.dept);
      way["amenity"="police"](area.dept);
      relation["amenity"="police"](area.dept);
    );
    out center;
  `,
};

/** Vehicle templates per station type */
const VEHICLE_TEMPLATES = {
  fire: [
    { type: 'VSAV', label: 'VSAV' },
    { type: 'FPT', label: 'FPT' },
    { type: 'EPA', label: 'EPA' },
    { type: 'VLCG', label: 'VLCG' },
    { type: 'CCF', label: 'CCF' },
  ],
  hospital: [
    { type: 'SMUR', label: 'SMUR' },
    { type: 'UMH', label: 'UMH' },
  ],
  police: [
    { type: 'PATROL', label: 'Patrouille' },
    { type: 'BAC', label: 'BAC' },
  ],
};

async function fetchOverpass(query) {
  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const data = await res.json();
  return data.elements;
}

function getCoords(el) {
  if (el.type === 'node') return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

async function importStations(type) {
  console.log(`[import] Fetching ${type} stations for department ${departmentCode}...`);
  const elements = await fetchOverpass(queries[type]);
  console.log(`[import]   Found ${elements.length} ${type} station(s)`);

  let imported = 0;
  for (const el of elements) {
    const coords = getCoords(el);
    if (!coords) continue;

    const name = el.tags?.name || `${type} station (OSM ${el.id})`;
    const osmId = el.id;

    const { rows } = await pool.query(
      `INSERT INTO stations (department_code, type, name, location, osm_id)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [departmentCode, type, name, coords.lon, coords.lat, osmId]
    );

    if (rows.length > 0) {
      const stationId = rows[0].id;
      // Create fictive vehicles for this station
      const templates = VEHICLE_TEMPLATES[type] || [];
      for (const tpl of templates) {
        await pool.query(
          `INSERT INTO vehicles (station_id, type, label)
           VALUES ($1, $2, $3)`,
          [stationId, tpl.type, `${tpl.label} ${name.substring(0, 20)}`]
        );
      }
      imported++;
    }
  }

  console.log(`[import]   Imported ${imported} new ${type} station(s) with vehicles`);
  return imported;
}

async function createDefaultGameCenter() {
  const deptNames = {
    '13': 'CTA Bouches-du-Rhône',
    '75': 'CTA Paris',
    '69': 'CTA Rhône',
    '31': 'CTA Haute-Garonne',
    '33': 'CTA Gironde',
  };

  const name = deptNames[departmentCode] || `CTA Département ${departmentCode}`;

  const { rows } = await pool.query(
    `INSERT INTO game_centers (department_code, name)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [departmentCode, name]
  );

  if (rows.length > 0) {
    console.log(`[import] Created game center: ${name} (id=${rows[0].id})`);
  } else {
    console.log(`[import] Game center already exists for department ${departmentCode}`);
  }
}

async function main() {
  console.log(`\n=== Urgence Dispatch — OSM Import ===`);
  console.log(`Department: ${departmentCode}\n`);

  try {
    await importStations('fire');
    await importStations('hospital');
    await importStations('police');
    await createDefaultGameCenter();
    console.log('\n[import] Done.');
  } catch (err) {
    console.error('[import] Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
