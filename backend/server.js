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
  const { cargo_weight_kg, source_location } = req.body;

  if (!cargo_weight_kg || !source_location) {
    return res.status(400).json({ error: "Missing cargo_weight_kg or source_location" });
  }

  try {
    let eligibleVehicles, eligibleDrivers;

    if (isDemoMode) {
      const db = readDb();
      eligibleVehicles = db.vehicles.filter(v => v.status === 'Available' && v.max_capacity_kg >= cargo_weight_kg);
      eligibleDrivers = db.drivers.filter(d => d.status === 'Available');
    } else {
      const vRes = await pool.query(
        "SELECT * FROM vehicles WHERE status = 'Available' AND max_capacity_kg >= $1",
        [cargo_weight_kg]
      );
      const dRes = await pool.query("SELECT * FROM drivers WHERE status = 'Available'");
      eligibleVehicles = vRes.rows;
      eligibleDrivers = dRes.rows;
    }

    // Score Vehicles
    eligibleVehicles = eligibleVehicles.map(v => {
      let score = 0;
      if (v.region === source_location || v.current_location === source_location) {
        score += 50; 
      }
      score -= (v.odometer_km / 100000); 
      return { ...v, matchScore: score };
    }).sort((a, b) => b.matchScore - a.matchScore);

    // Score Drivers
    eligibleDrivers = eligibleDrivers.map(d => {
      let score = 0;
      if (d.current_location === source_location) {
        score += 50;
      }
      score += (d.safety_score * 0.5);
      return { ...d, matchScore: score };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      status: "success",
      best_match: {
        vehicle: eligibleVehicles[0] || null,
        driver: eligibleDrivers[0] || null
      },
      alternatives: {
        vehicles: eligibleVehicles.slice(1, 3),
        drivers: eligibleDrivers.slice(1, 3)
      }
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