-- Urgence Dispatch — Initial schema
-- Requires: PostgreSQL 14+ with PostGIS extension

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Users ──────────────────────────────────────────────────

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  xp            INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_ranks (
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  service    VARCHAR(5) NOT NULL CHECK (service IN ('18','15','17')),
  rank_level INTEGER DEFAULT 1,
  xp         INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, service)
);

-- ── Geography — real data from OSM ─────────────────────────

CREATE TABLE stations (
  id              SERIAL PRIMARY KEY,
  department_code VARCHAR(3)  NOT NULL,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('fire','hospital','police')),
  name            VARCHAR(255) NOT NULL,
  location        GEOGRAPHY(Point, 4326) NOT NULL,
  osm_id          BIGINT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stations_dept ON stations(department_code);
CREATE INDEX idx_stations_location ON stations USING GIST(location);

CREATE TABLE vehicles (
  id         SERIAL PRIMARY KEY,
  station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
  type       VARCHAR(20) NOT NULL,
  label      VARCHAR(50) NOT NULL,
  status     VARCHAR(20) DEFAULT 'available'
               CHECK (status IN ('available','dispatched','on_scene','returning','maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_station ON vehicles(station_id);

-- ── Game rooms ─────────────────────────────────────────────

CREATE TABLE game_centers (
  id                SERIAL PRIMARY KEY,
  department_code   VARCHAR(3) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  max_operators_18  INTEGER DEFAULT 4,
  max_operators_15  INTEGER DEFAULT 2,
  max_operators_17  INTEGER DEFAULT 2,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE active_sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  center_id  INTEGER REFERENCES game_centers(id) ON DELETE CASCADE,
  service    VARCHAR(5) NOT NULL CHECK (service IN ('18','15','17')),
  socket_id  VARCHAR(50) NOT NULL,
  joined_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_center ON active_sessions(center_id);

-- ── Interventions ──────────────────────────────────────────

CREATE TABLE interventions (
  id              SERIAL PRIMARY KEY,
  center_id       INTEGER REFERENCES game_centers(id) ON DELETE CASCADE,
  type            VARCHAR(20) NOT NULL,
  nature          VARCHAR(100),
  severity        INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  location        GEOGRAPHY(Point, 4326) NOT NULL,
  address         VARCHAR(255),
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','dispatched','en_route','on_scene','resolved','escalated')),
  service_origin  VARCHAR(5) NOT NULL CHECK (service_origin IN ('18','15','17')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interventions_center ON interventions(center_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_location ON interventions USING GIST(location);

CREATE TABLE intervention_vehicles (
  id               SERIAL PRIMARY KEY,
  intervention_id  INTEGER REFERENCES interventions(id) ON DELETE CASCADE,
  vehicle_id       INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  dispatched_at    TIMESTAMPTZ DEFAULT NOW(),
  arrived_at       TIMESTAMPTZ,
  returned_at      TIMESTAMPTZ
);

CREATE INDEX idx_iv_intervention ON intervention_vehicles(intervention_id);
CREATE INDEX idx_iv_vehicle ON intervention_vehicles(vehicle_id);
