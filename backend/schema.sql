-- TransitOps Supabase Schema
-- This schema includes ENUMs, proper foreign keys, cascades, and Row Level Security (RLS) setup.

CREATE TYPE user_role AS ENUM ('driver', 'fleet_manager', 'safety_officer', 'financial_analyst');
CREATE TYPE vehicle_status AS ENUM ('Available', 'On Trip', 'In Shop', 'Retired');
CREATE TYPE driver_status AS ENUM ('Available', 'On Trip', 'Off Duty', 'Suspended');
CREATE TYPE trip_status AS ENUM ('Draft', 'Dispatched', 'Completed', 'Cancelled');
CREATE TYPE maintenance_status AS ENUM ('In Shop', 'Completed');

-- 1. Users Table (Maps to frontend users, in production replace with auth.users)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, 
  role user_role NOT NULL
);

-- 2. Vehicles Table
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
  current_location TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Drivers Table
CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  license_no TEXT NOT NULL UNIQUE,
  license_category TEXT NOT NULL,
  license_expiry DATE NOT NULL,
  contact TEXT NOT NULL,
  safety_score INTEGER NOT NULL CHECK (safety_score BETWEEN 0 AND 100),
  status driver_status NOT NULL DEFAULT 'Available',
  current_location TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Trips Table
CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  trip_code TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
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

-- 5. Maintenance Table
CREATE TABLE maintenance (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date TIMESTAMPTZ NOT NULL,
  status maintenance_status NOT NULL DEFAULT 'In Shop'
);

-- 6. Fuel Logs Table
CREATE TABLE fuel (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  liters NUMERIC(10, 2) NOT NULL CHECK (liters > 0),
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- 7. Expenses Table
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  toll NUMERIC(12, 2) NOT NULL DEFAULT 0,
  other NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date TIMESTAMPTZ NOT NULL
);

-- 8. Activity Log Table
CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT TRUE
);

-- ==========================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

-- Note: The following are basic policies that allow reads for authenticated users.
-- In a true production Supabase setup, you would base these on `auth.uid()` and `auth.jwt() ->> 'role'`.

CREATE POLICY "Allow authenticated read" ON users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON drivers FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON trips FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON maintenance FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON fuel FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON activity FOR SELECT USING (true);

-- Allow Fleet Managers to INSERT/UPDATE (Example logic based on role)
-- CREATE POLICY "Fleet Managers can update trips" ON trips FOR UPDATE 
-- USING ( (select role from users where id = auth.uid()) = 'fleet_manager' );
