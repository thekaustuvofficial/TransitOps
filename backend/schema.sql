-- TransitOps Postgres schema draft

CREATE TYPE vehicle_status AS ENUM ('Available', 'On Trip', 'In Shop', 'Retired');
CREATE TYPE driver_status AS ENUM ('Available', 'On Trip', 'Off Duty', 'Suspended');
CREATE TYPE trip_status AS ENUM ('Draft', 'Dispatched', 'Completed', 'Cancelled');
CREATE TYPE maintenance_status AS ENUM ('In Shop', 'Completed');

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  reg_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  max_capacity_kg INTEGER NOT NULL CHECK (max_capacity_kg > 0),
  odometer_km INTEGER NOT NULL DEFAULT 0,
  acquisition_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  insurance_expiry DATE NOT NULL,
  status vehicle_status NOT NULL DEFAULT 'Available',
  last_service_odometer_km INTEGER NOT NULL DEFAULT 0,
  region TEXT NOT NULL,
  current_location TEXT NOT NULL
);

CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  license_no TEXT NOT NULL UNIQUE,
  license_category TEXT NOT NULL,
  license_expiry DATE NOT NULL,
  contact TEXT NOT NULL,
  safety_score INTEGER NOT NULL CHECK (safety_score BETWEEN 0 AND 100),
  status driver_status NOT NULL DEFAULT 'Available',
  current_location TEXT NOT NULL
);

CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  trip_code TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  vehicle_id TEXT NULL REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id TEXT NULL REFERENCES drivers(id) ON DELETE SET NULL,
  cargo_weight_kg INTEGER NOT NULL CHECK (cargo_weight_kg > 0),
  planned_distance_km INTEGER NOT NULL CHECK (planned_distance_km > 0),
  status trip_status NOT NULL DEFAULT 'Draft',
  revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  final_odometer_km INTEGER NULL,
  fuel_consumed_l NUMERIC(10, 2) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL
);

CREATE TABLE maintenance (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date TIMESTAMPTZ NOT NULL,
  status maintenance_status NOT NULL DEFAULT 'In Shop'
);

CREATE TABLE fuel (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE SET NULL,
  trip_id TEXT NULL REFERENCES trips(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  liters NUMERIC(10, 2) NOT NULL CHECK (liters > 0),
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE SET NULL,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE SET NULL,
  toll NUMERIC(12, 2) NOT NULL DEFAULT 0,
  other NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date TIMESTAMPTZ NOT NULL
);

CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT TRUE
);
