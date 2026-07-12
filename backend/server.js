import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Dynamic Postgres Connection Pool
const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({
    connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : false
  })
  : new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
  });

// Handle pool connection errors gracefully to prevent process crash
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

// API endpoint to fetch all database records
app.get('/api/data', async (req, res) => {
  const isDemoMode = req.query.demo === 'true';

  if (isDemoMode) {
    return res.json(readDb());
  }

  try {
    const [vehicles, drivers, trips, maintenance, fuel, expenses, activity] = await Promise.all([
      pool.query('SELECT * FROM vehicles'),
      pool.query('SELECT * FROM drivers'),
      pool.query('SELECT * FROM trips'),
      pool.query('SELECT * FROM maintenance'),
      pool.query('SELECT * FROM fuel'),
      pool.query('SELECT * FROM expenses'),
      pool.query('SELECT * FROM activity')
    ]);

    // Read users table, fall back to seed users if table is empty or missing
    let usersList = [];
    try {
      const usersRes = await pool.query('SELECT * FROM users');
      usersList = usersRes.rows;
    } catch (userErr) {
      console.warn("Could not query users table, using static seeds:", userErr.message);
    }
    if (usersList.length === 0) {
      usersList = readDb().users;
    }

    res.json({
      users: usersList,
      vehicles: vehicles.rows,
      drivers: drivers.rows,
      trips: trips.rows,
      maintenance: maintenance.rows,
      fuel: fuel.rows,
      expenses: expenses.rows,
      activity: activity.rows
    });
  } catch (err) {
    console.error("Database read error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Smart Matchmaker API: Hybrid mode supporting both demo and production
app.post('/api/dispatch/recommend', async (req, res) => {
  const isDemoMode = req.query.demo === 'true';
  const { cargoWeightKg, source, destination, estimatedDurationHours = 2, plannedDistanceKm = 50 } = req.body;

  if (!cargoWeightKg || !source) {
    return res.status(400).json({ error: "Missing cargoWeightKg or source" });
  }

  try {
    let eligibleVehicles, eligibleDrivers;
    const currentDate = new Date();
    const SERVICE_INTERVAL_KM = 10000;

    if (isDemoMode) {
      const db = readDb();
      eligibleVehicles = db.vehicles.filter(v =>
        v.status === 'Available' &&
        v.max_capacity_kg >= cargoWeightKg &&
        (v.odometer_km - v.last_service_odometer_km) < SERVICE_INTERVAL_KM &&
        new Date(v.insurance_expiry) >= currentDate
      );
      eligibleDrivers = db.drivers.filter(d =>
        d.status === 'Available' &&
        new Date(d.license_expiry) >= currentDate
      );
    } else {
      const vRes = await pool.query(
        `SELECT * FROM vehicles 
         WHERE status = 'Available' 
         AND max_capacity_kg >= $1
         AND (odometer_km - last_service_odometer_km) < $2
         AND insurance_expiry >= CURRENT_DATE`,
        [cargoWeightKg, SERVICE_INTERVAL_KM]
      );
      const dRes = await pool.query(
        `SELECT * FROM drivers 
         WHERE status = 'Available' 
         AND license_expiry >= CURRENT_DATE`
      );
      eligibleVehicles = vRes.rows;
      eligibleDrivers = dRes.rows;
    }

    const matches = [];

    for (const truck of eligibleVehicles) {
      for (const driver of eligibleDrivers) {
        // License Category Check
        const needsHMV = truck.type === 'Truck';
        if (needsHMV && driver.license_category !== 'HMV') continue;

        const reasons = [];
        let score = 0; // Lower score is better

        // Proximity Matching
        if (truck.current_location === source) {
          score -= 50;
          reasons.push('Truck already at source');
        } else {
          score += 100;
        }

        if (driver.current_location === source) {
          score -= 50;
          reasons.push('Driver already at source');
        } else if (driver.current_location === truck.current_location) {
          score -= 20;
          reasons.push('Driver at truck location');
        } else {
          score += 100;
        }

        // Cost Optimization
        const truckCostPerKm = Number(truck.acquisition_cost) / 1000000;
        const driverCostPerHour = driver.license_category === 'HMV' ? 200 : 150;
        const estimatedCost = (truckCostPerKm * plannedDistanceKm) + (driverCostPerHour * estimatedDurationHours);

        score += estimatedCost;
        reasons.push(`Estimated optimal cost: ₹${estimatedCost.toFixed(2)}`);

        // Capacity Efficiency 
        const wastedCapacity = truck.max_capacity_kg - cargoWeightKg;
        if (wastedCapacity > 1000) {
          score += (wastedCapacity / 100);
          reasons.push('Warning: Large unused capacity');
        } else {
          reasons.push('Optimal capacity match');
        }

        matches.push({
          driver: { id: driver.id, name: driver.name, license_category: driver.license_category, current_location: driver.current_location },
          vehicle: { id: truck.id, name: truck.name, reg_no: truck.reg_no, type: truck.type, current_location: truck.current_location },
          score,
          costEstimate: estimatedCost,
          reasons
        });
      }
    }

    matches.sort((a, b) => a.score - b.score);

    res.json({
      status: "success",
      matches: matches.slice(0, 5)
    });
  } catch (err) {
    console.error("Matchmaker error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Full state transaction upsert
app.post('/api/save', async (req, res) => {
  const { users, vehicles, drivers, trips, maintenance, fuel, expenses, activity } = req.body;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Users
    if (Array.isArray(users)) {
      for (const u of users) {
        await client.query(
          `INSERT INTO users (id, name, email, password, role)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             password = EXCLUDED.password,
             role = EXCLUDED.role`,
          [u.id, u.name, u.email, u.password, u.role]
        );
      }
    }

    // 2. Vehicles
    if (Array.isArray(vehicles)) {
      for (const v of vehicles) {
        await client.query(
          `INSERT INTO vehicles (
             id, reg_no, name, type, max_capacity_kg, odometer_km, acquisition_cost,
             insurance_expiry, status, last_service_odometer_km, region, current_location, emi
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO UPDATE SET
             reg_no = EXCLUDED.reg_no,
             name = EXCLUDED.name,
             type = EXCLUDED.type,
             max_capacity_kg = EXCLUDED.max_capacity_kg,
             odometer_km = EXCLUDED.odometer_km,
             acquisition_cost = EXCLUDED.acquisition_cost,
             insurance_expiry = EXCLUDED.insurance_expiry,
             status = EXCLUDED.status,
             last_service_odometer_km = EXCLUDED.last_service_odometer_km,
             region = EXCLUDED.region,
             current_location = EXCLUDED.current_location,
             emi = EXCLUDED.emi`,
          [
            v.id, v.reg_no, v.name, v.type, v.max_capacity_kg, v.odometer_km, v.acquisition_cost,
            new Date(v.insurance_expiry).toISOString().slice(0, 10), v.status, v.last_service_odometer_km, v.region, v.current_location,
            v.emi || 0
          ]
        );
      }
    }

    // 3. Drivers
    if (Array.isArray(drivers)) {
      for (const d of drivers) {
        await client.query(
          `INSERT INTO drivers (
             id, name, license_no, license_category, license_expiry, contact, safety_score, status, current_location
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             license_no = EXCLUDED.license_no,
             license_category = EXCLUDED.license_category,
             license_expiry = EXCLUDED.license_expiry,
             contact = EXCLUDED.contact,
             safety_score = EXCLUDED.safety_score,
             status = EXCLUDED.status,
             current_location = EXCLUDED.current_location`,
          [
            d.id, d.name, d.license_no, d.license_category,
            new Date(d.license_expiry).toISOString().slice(0, 10), d.contact, d.safety_score, d.status, d.current_location
          ]
        );
      }
    }

    // 4. Trips
    if (Array.isArray(trips)) {
      for (const t of trips) {
        await client.query(
          `INSERT INTO trips (
             id, trip_code, source, destination, vehicle_id, driver_id, cargo_weight_kg,
             planned_distance_km, status, revenue, final_odometer_km, fuel_consumed_l,
             dispatched_at, completed_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
             trip_code = EXCLUDED.trip_code,
             source = EXCLUDED.source,
             destination = EXCLUDED.destination,
             vehicle_id = EXCLUDED.vehicle_id,
             driver_id = EXCLUDED.driver_id,
             cargo_weight_kg = EXCLUDED.cargo_weight_kg,
             planned_distance_km = EXCLUDED.planned_distance_km,
             status = EXCLUDED.status,
             revenue = EXCLUDED.revenue,
             final_odometer_km = EXCLUDED.final_odometer_km,
             fuel_consumed_l = EXCLUDED.fuel_consumed_l,
             dispatched_at = EXCLUDED.dispatched_at,
             completed_at = EXCLUDED.completed_at`,
          [
            t.id, t.trip_code, t.source, t.destination, t.vehicle_id || null, t.driver_id || null, t.cargo_weight_kg,
            t.planned_distance_km, t.status, t.revenue, t.final_odometer_km || null, t.fuel_consumed_l || null,
            t.dispatched_at || null, t.completed_at || null
          ]
        );
      }
    }

    // 5. Maintenance
    if (Array.isArray(maintenance)) {
      for (const m of maintenance) {
        await client.query(
          `INSERT INTO maintenance (
             id, vehicle_id, service_type, cost, date, status
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             vehicle_id = EXCLUDED.vehicle_id,
             service_type = EXCLUDED.service_type,
             cost = EXCLUDED.cost,
             date = EXCLUDED.date,
             status = EXCLUDED.status`,
          [m.id, m.vehicle_id, m.service_type, m.cost, m.date, m.status]
        );
      }
    }

    // 6. Fuel
    if (Array.isArray(fuel)) {
      for (const f of fuel) {
        await client.query(
          `INSERT INTO fuel (
             id, vehicle_id, trip_id, date, liters, cost
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             vehicle_id = EXCLUDED.vehicle_id,
             trip_id = EXCLUDED.trip_id,
             date = EXCLUDED.date,
             liters = EXCLUDED.liters,
             cost = EXCLUDED.cost`,
          [f.id, f.vehicle_id, f.trip_id || null, new Date(f.date).toISOString().slice(0, 10), f.liters, f.cost]
        );
      }
    }

    // 7. Expenses
    if (Array.isArray(expenses)) {
      for (const e of expenses) {
        await client.query(
          `INSERT INTO expenses (
             id, trip_id, vehicle_id, toll, other, date
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             trip_id = EXCLUDED.trip_id,
             vehicle_id = EXCLUDED.vehicle_id,
             toll = EXCLUDED.toll,
             other = EXCLUDED.other,
             date = EXCLUDED.date`,
          [e.id, e.trip_id, e.vehicle_id, e.toll, e.other, e.date]
        );
      }
    }

    // 8. Activity
    if (Array.isArray(activity)) {
      for (const act of activity) {
        await client.query(
          `INSERT INTO activity (
             id, timestamp, actor, role, action, detail, ok
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             timestamp = EXCLUDED.timestamp,
             actor = EXCLUDED.actor,
             role = EXCLUDED.role,
             action = EXCLUDED.action,
             detail = EXCLUDED.detail,
             ok = EXCLUDED.ok`,
          [act.id, act.timestamp, act.actor, act.role, act.action, act.detail, act.ok]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rbErr) { console.error("Rollback failed:", rbErr); }
    }
    console.error("Database save transaction error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

// Database reseed and reset
app.post('/api/reset', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    await client.query('TRUNCATE expenses, fuel, maintenance, trips, drivers, vehicles, users, activity CASCADE');

    const dbData = readDb();

    // 1. Users
    for (const u of dbData.users) {
      await client.query(
        `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)`,
        [u.id, u.name, u.email, u.password, u.role]
      );
    }

    // 2. Vehicles
    for (const v of dbData.vehicles) {
      await client.query(
        `INSERT INTO vehicles (id, reg_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, insurance_expiry, status, last_service_odometer_km, region, current_location, emi)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [v.id, v.reg_no, v.name, v.type, v.max_capacity_kg, v.odometer_km, v.acquisition_cost, new Date(v.insurance_expiry).toISOString().slice(0, 10), v.status, v.last_service_odometer_km, v.region, v.current_location, v.emi || 0]
      );
    }

    // 3. Drivers
    for (const d of dbData.drivers) {
      await client.query(
        `INSERT INTO drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, status, current_location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [d.id, d.name, d.license_no, d.license_category, new Date(d.license_expiry).toISOString().slice(0, 10), d.contact, d.safety_score, d.status, d.current_location]
      );
    }

    // 4. Trips
    for (const t of dbData.trips) {
      await client.query(
        `INSERT INTO trips (id, trip_code, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, status, revenue, final_odometer_km, fuel_consumed_l, dispatched_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [t.id, t.trip_code, t.source, t.destination, t.vehicle_id || null, t.driver_id || null, t.cargo_weight_kg, t.planned_distance_km, t.status, t.revenue, t.final_odometer_km || null, t.fuel_consumed_l || null, t.dispatched_at || null, t.completed_at || null]
      );
    }

    // 5. Maintenance
    for (const m of dbData.maintenance) {
      await client.query(
        `INSERT INTO maintenance (id, vehicle_id, service_type, cost, date, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [m.id, m.vehicle_id, m.service_type, m.cost, m.date, m.status]
      );
    }

    // 6. Fuel
    for (const f of dbData.fuel) {
      await client.query(
        `INSERT INTO fuel (id, vehicle_id, trip_id, date, liters, cost)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [f.id, f.vehicle_id, f.trip_id || null, new Date(f.date).toISOString().slice(0, 10), f.liters, f.cost]
      );
    }

    // 7. Expenses
    for (const e of dbData.expenses) {
      await client.query(
        `INSERT INTO expenses (id, trip_id, vehicle_id, toll, other, date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [e.id, e.trip_id, e.vehicle_id, e.toll, e.other, e.date]
      );
    }

    // 8. Activity
    for (const act of dbData.activity) {
      await client.query(
        `INSERT INTO activity (id, timestamp, actor, role, action, detail, ok)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [act.id, act.timestamp, act.actor, act.role, act.action, act.detail, act.ok]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: "Database reset and reseeded successfully" });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rbErr) { console.error("Rollback failed:", rbErr); }
    }
    console.error("Database reset/reseed error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TransitOps backend listening on port ${PORT} connected to PostgreSQL/Supabase`);
});