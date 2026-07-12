import express from 'express';
import cors from 'cors';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect to your local PostgreSQL database
const pool = new Pool({
  user: process.env.USER,
  host: 'localhost',
  database: 'postgres',
  password: 'postgres', 
  port: 5432,
});

// We keep users static here because they were not included in the schema.sql draft
const STATIC_USERS = [
  { id: "usr_1", name: 'Raven K.', email: 'raven.k@transitops.in', password: 'demo1234', role: 'driver' },
  { id: "usr_2", name: 'Meera Shah', email: 'meera.s@transitops.in', password: 'demo1234', role: 'fleet_manager' },
  { id: "usr_3", name: 'Arjun Nair', email: 'arjun.n@transitops.in', password: 'demo1234', role: 'safety_officer' },
  { id: "usr_4", name: 'Priyanka Desai', email: 'priyanka.d@transitops.in', password: 'demo1234', role: 'financial_analyst' }
];

// Hybrid mode: Support both demo (db.json) and production (PostgreSQL)
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

    res.json({
      users: readDb().users,
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
    // LEGAL_DAILY_LIMIT_HOURS is mocked as 12

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
      // In production mode, we filter via PostgreSQL (Supabase) query
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
          score += 100; // Penalty for deadhead routing
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

    // Sort combinations by score (lowest score = highest efficiency)
    matches.sort((a, b) => a.score - b.score);

    res.json({
      status: "success",
      matches: matches.slice(0, 5) // Return top 5 best Driver + Truck combinations
    });
  } catch (err) {
    console.error("Matchmaker error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Placeholder for frontend compatibility
app.post('/api/save', (req, res) => {
  // Note: To fully move away from db.json, the frontend needs to be refactored 
  // to send specific INSERT/UPDATE requests (e.g., POST /api/trips) rather than 
  // sending the entire database state at once. 
  console.log("Save request received. Requires SQL INSERT/UPDATE mapping.");
  res.json({ success: true });
});

app.post('/api/reset', (req, res) => {
  console.log("Reset request received.");
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TransitOps backend listening on port ${PORT} connected to PostgreSQL`);
});