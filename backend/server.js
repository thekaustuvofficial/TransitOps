import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initial seed data matching seed.ts
const SEED_DATA = {
  users: [
    { id: "usr_1", name: 'Raven K.', email: 'raven.k@transitops.in', password: 'demo1234', role: 'driver' },
    { id: "usr_2", name: 'Meera Shah', email: 'meera.s@transitops.in', password: 'demo1234', role: 'fleet_manager' },
    { id: "usr_3", name: 'Arjun Nair', email: 'arjun.n@transitops.in', password: 'demo1234', role: 'safety_officer' },
    { id: "usr_4", name: 'Priyanka Desai', email: 'priyanka.d@transitops.in', password: 'demo1234', role: 'financial_analyst' }
  ],
  vehicles: [
    { id: "veh_1", reg_no: 'GJ01AB4521', name: 'VAN-05', type: 'Van', max_capacity_kg: 500, odometer_km: 74000, acquisition_cost: 620000, status: 'Available', last_service_odometer_km: 70000, region: 'Ahmedabad' },
    { id: "veh_2", reg_no: 'GJ01AB9987', name: 'TRUCK-11', type: 'Truck', max_capacity_kg: 5000, odometer_km: 182000, acquisition_cost: 2450000, status: 'On Trip', last_service_odometer_km: 175000, region: 'Ahmedabad' },
    { id: "veh_3", reg_no: 'GJ01AB1120', name: 'MINI-03', type: 'Mini', max_capacity_kg: 1000, odometer_km: 66000, acquisition_cost: 410000, status: 'In Shop', last_service_odometer_km: 60000, region: 'Gandhinagar' },
    { id: "veh_4", reg_no: 'GJ01AB0087', name: 'VAN-09', type: 'Van', max_capacity_kg: 750, odometer_km: 241900, acquisition_cost: 590000, status: 'Retired', last_service_odometer_km: 240000, region: 'Vatva' },
    { id: "veh_5", reg_no: 'GJ01AB2244', name: 'TRUCK-04', type: 'Truck', max_capacity_kg: 4500, odometer_km: 98000, acquisition_cost: 2100000, status: 'Available', last_service_odometer_km: 90000, region: 'Sanand' }
  ],
  drivers: [
    { id: "drv_1", name: 'Alex Fernandes', license_no: 'DL-88213', license_category: 'LMV', license_expiry: new Date(Date.now() + 540 * 86400000).toISOString().slice(0, 10), contact: '98765xxxxx', safety_score: 96, status: 'Available' },
    { id: "drv_2", name: 'John Mathew', license_no: 'DL-44120', license_category: 'HMV', license_expiry: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10), contact: '98220xxxxx', safety_score: 81, status: 'Suspended' },
    { id: "drv_3", name: 'Priya Patel', license_no: 'DL-77031', license_category: 'LMV', license_expiry: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), contact: '99110xxxxx', safety_score: 99, status: 'On Trip' },
    { id: "drv_4", name: 'Suresh Kumar', license_no: 'DL-90045', license_category: 'HMV', license_expiry: new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10), contact: '97440xxxxx', safety_score: 88, status: 'Available' }
  ],
  trips: [
    { id: "trp_1", trip_code: 'TR001', source: 'Gandhinagar Depot', destination: 'Ahmedabad Hub', vehicle_id: "veh_2", driver_id: "drv_3", cargo_weight_kg: 3200, planned_distance_km: 38, status: 'Dispatched', revenue: 18000, final_odometer_km: null, fuel_consumed_l: null, created_at: new Date(Date.now() - 86400000).toISOString(), dispatched_at: new Date(Date.now() - 86400000).toISOString(), completed_at: null },
    { id: "trp_2", trip_code: 'TR002', source: 'Vatva Industrial Area', destination: 'Sanand Warehouse', vehicle_id: "veh_1", driver_id: "drv_1", cargo_weight_kg: 410, planned_distance_km: 22, status: 'Completed', revenue: 9200, final_odometer_km: 74210, fuel_consumed_l: 26, created_at: new Date(Date.now() - 4 * 86400000).toISOString(), dispatched_at: new Date(Date.now() - 4 * 86400000).toISOString(), completed_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: "trp_3", trip_code: 'TR003', source: 'Mansa', destination: 'Kalol Depot', vehicle_id: null, driver_id: null, cargo_weight_kg: 600, planned_distance_km: 45, status: 'Cancelled', revenue: 0, final_odometer_km: null, fuel_consumed_l: null, created_at: new Date(Date.now() - 2 * 86400000).toISOString(), dispatched_at: null, completed_at: null },
    { id: "trp_4", trip_code: 'TR004', source: 'Vatva Industrial Area', destination: 'Sanand Warehouse', vehicle_id: null, driver_id: null, cargo_weight_kg: 3800, planned_distance_km: 31, status: 'Draft', revenue: 0, final_odometer_km: null, fuel_consumed_l: null, created_at: new Date().toISOString(), dispatched_at: null, completed_at: null }
  ],
  maintenance: [
    { id: "mnt_1", vehicle_id: "veh_1", service_type: 'Oil Change', cost: 2500, date: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'Completed' },
    { id: "mnt_2", vehicle_id: "veh_2", service_type: 'Engine Repair', cost: 18000, date: new Date(Date.now() - 6 * 86400000).toISOString(), status: 'Completed' },
    { id: "mnt_3", vehicle_id: "veh_3", service_type: 'Tyre Replace', cost: 6200, date: new Date(Date.now() - 86400000).toISOString(), status: 'In Shop' }
  ],
  fuel: [
    { id: "fuel_1", vehicle_id: "veh_1", trip_id: null, date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), liters: 42, cost: 3150 },
    { id: "fuel_2", vehicle_id: "veh_2", trip_id: null, date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), liters: 110, cost: 8400 },
    { id: "fuel_3", vehicle_id: "veh_3", trip_id: null, date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), liters: 28, cost: 2050 }
  ],
  expenses: [
    { id: "exp_1", trip_id: "trp_1", vehicle_id: "veh_2", toll: 340, other: 150, date: new Date(Date.now() - 86400000).toISOString() }
  ],
  activity: [
    { id: "act_1", timestamp: new Date(Date.now() - 6 * 86400000).toISOString(), actor: 'Meera Shah', role: 'fleet_manager', action: 'vehicle.created', detail: 'Registered VAN-05 (GJ01AB4521)', ok: true },
    { id: "act_2", timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), actor: 'Raven K.', role: 'driver', action: 'trip.completed', detail: 'TR002: Vatva Industrial Area → Sanand Warehouse — Van-05 & Alex back to Available', ok: true },
    { id: "act_3", timestamp: new Date(Date.now() - 86400000).toISOString(), actor: 'Raven K.', role: 'driver', action: 'trip.dispatched', detail: 'TR001: Truck-11 / Priya — cargo 3200/5000kg OK', ok: true },
    { id: "act_4", timestamp: new Date(Date.now() - 86400000).toISOString(), actor: 'Meera Shah', role: 'fleet_manager', action: 'maintenance.opened', detail: 'MINI-03 → Tyre Replace — vehicle set to In Shop', ok: true }
  ]
};

// Helper: Read or Initialize DB
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
      return SEED_DATA;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read DB file, returning seed data", err);
    return SEED_DATA;
  }
}

// Helper: Write DB
function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Routes
app.get('/api/data', (req, res) => {
  const data = readDb();
  res.json(data);
});

app.post('/api/save', (req, res) => {
  try {
    const data = req.body;
    writeDb(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset', (req, res) => {
  try {
    writeDb(SEED_DATA);
    res.json({ success: true, data: SEED_DATA });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TransitOps backend listening on port ${PORT}`);
});
