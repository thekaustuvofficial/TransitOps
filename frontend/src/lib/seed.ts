import type { User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense, ActivityEntry } from '../types';
import { uid } from './id';

const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export const SEED_USERS: User[] = [
  { id: uid('usr'), name: 'Raven K.', email: 'raven.k@transitops.in', password: 'demo1234', role: 'dispatcher' },
  { id: uid('usr'), name: 'Meera Shah', email: 'meera.s@transitops.in', password: 'demo1234', role: 'fleet_manager' },
  { id: uid('usr'), name: 'Arjun Nair', email: 'arjun.n@transitops.in', password: 'demo1234', role: 'safety_officer' },
  { id: uid('usr'), name: 'Priyanka Desai', email: 'priyanka.d@transitops.in', password: 'demo1234', role: 'financial_analyst' },
];

const v1 = uid('veh'), v2 = uid('veh'), v3 = uid('veh'), v4 = uid('veh'), v5 = uid('veh');

export const SEED_VEHICLES: Vehicle[] = [
  { id: v1, reg_no: 'GJ01AB4521', name: 'VAN-05', type: 'Van', max_capacity_kg: 500, odometer_km: 74000, acquisition_cost: 620000, status: 'Available', last_service_odometer_km: 70000, region: 'Ahmedabad' },
  { id: v2, reg_no: 'GJ01AB9987', name: 'TRUCK-11', type: 'Truck', max_capacity_kg: 5000, odometer_km: 182000, acquisition_cost: 2450000, status: 'On Trip', last_service_odometer_km: 175000, region: 'Ahmedabad' },
  { id: v3, reg_no: 'GJ01AB1120', name: 'MINI-03', type: 'Mini', max_capacity_kg: 1000, odometer_km: 66000, acquisition_cost: 410000, status: 'In Shop', last_service_odometer_km: 60000, region: 'Gandhinagar' },
  { id: v4, reg_no: 'GJ01AB0087', name: 'VAN-09', type: 'Van', max_capacity_kg: 750, odometer_km: 241900, acquisition_cost: 590000, status: 'Retired', last_service_odometer_km: 240000, region: 'Vatva' },
  { id: v5, reg_no: 'GJ01AB2244', name: 'TRUCK-04', type: 'Truck', max_capacity_kg: 4500, odometer_km: 98000, acquisition_cost: 2100000, status: 'Available', last_service_odometer_km: 90000, region: 'Sanand' },
];

const d1 = uid('drv'), d2 = uid('drv'), d3 = uid('drv'), d4 = uid('drv');

export const SEED_DRIVERS: Driver[] = [
  { id: d1, name: 'Alex Fernandes', license_no: 'DL-88213', license_category: 'LMV', license_expiry: daysFromNow(540), contact: '98765xxxxx', safety_score: 96, status: 'Available' },
  { id: d2, name: 'John Mathew', license_no: 'DL-44120', license_category: 'HMV', license_expiry: daysFromNow(-90), contact: '98220xxxxx', safety_score: 81, status: 'Suspended' },
  { id: d3, name: 'Priya Patel', license_no: 'DL-77031', license_category: 'LMV', license_expiry: daysFromNow(30), contact: '99110xxxxx', safety_score: 99, status: 'On Trip' },
  { id: d4, name: 'Suresh Kumar', license_no: 'DL-90045', license_category: 'HMV', license_expiry: daysFromNow(200), contact: '97440xxxxx', safety_score: 88, status: 'Available' },
];

const t1 = uid('trp');

export const SEED_TRIPS: Trip[] = [
  { id: t1, trip_code: 'TR001', source: 'Gandhinagar Depot', destination: 'Ahmedabad Hub', vehicle_id: v2, driver_id: d3, cargo_weight_kg: 3200, planned_distance_km: 38, status: 'Dispatched', revenue: 18000, final_odometer_km: null, fuel_consumed_l: null, created_at: daysAgo(1), dispatched_at: daysAgo(1), completed_at: null },
  { id: uid('trp'), trip_code: 'TR002', source: 'Vatva Industrial Area', destination: 'Sanand Warehouse', vehicle_id: v1, driver_id: d1, cargo_weight_kg: 410, planned_distance_km: 22, status: 'Completed', revenue: 9200, final_odometer_km: 74210, fuel_consumed_l: 26, created_at: daysAgo(4), dispatched_at: daysAgo(4), completed_at: daysAgo(3) },
  { id: uid('trp'), trip_code: 'TR003', source: 'Mansa', destination: 'Kalol Depot', vehicle_id: null, driver_id: null, cargo_weight_kg: 600, planned_distance_km: 45, status: 'Cancelled', revenue: 0, final_odometer_km: null, fuel_consumed_l: null, created_at: daysAgo(2), dispatched_at: null, completed_at: null },
  { id: uid('trp'), trip_code: 'TR004', source: 'Vatva Industrial Area', destination: 'Sanand Warehouse', vehicle_id: null, driver_id: null, cargo_weight_kg: 3800, planned_distance_km: 31, status: 'Draft', revenue: 0, final_odometer_km: null, fuel_consumed_l: null, created_at: daysAgo(0), dispatched_at: null, completed_at: null },
];

export const SEED_MAINTENANCE: MaintenanceLog[] = [
  { id: uid('mnt'), vehicle_id: v1, service_type: 'Oil Change', cost: 2500, date: daysAgo(5), status: 'Completed' },
  { id: uid('mnt'), vehicle_id: v2, service_type: 'Engine Repair', cost: 18000, date: daysAgo(6), status: 'Completed' },
  { id: uid('mnt'), vehicle_id: v3, service_type: 'Tyre Replace', cost: 6200, date: daysAgo(1), status: 'In Shop' },
];

export const SEED_FUEL: FuelLog[] = [
  { id: uid('fuel'), vehicle_id: v1, trip_id: null, date: daysAgo(7), liters: 42, cost: 3150 },
  { id: uid('fuel'), vehicle_id: v2, trip_id: null, date: daysAgo(6), liters: 110, cost: 8400 },
  { id: uid('fuel'), vehicle_id: v3, trip_id: null, date: daysAgo(6), liters: 28, cost: 2050 },
];

export const SEED_EXPENSES: Expense[] = [
  { id: uid('exp'), trip_id: t1, vehicle_id: v2, toll: 340, other: 150, date: daysAgo(1) },
];

export const SEED_ACTIVITY: ActivityEntry[] = [
  { id: uid('act'), timestamp: daysAgo(6), actor: 'Meera Shah', role: 'fleet_manager', action: 'vehicle.created', detail: 'Registered VAN-05 (GJ01AB4521)', ok: true },
  { id: uid('act'), timestamp: daysAgo(4), actor: 'Raven K.', role: 'dispatcher', action: 'trip.completed', detail: 'TR002: Vatva Industrial Area → Sanand Warehouse — Van-05 & Alex back to Available', ok: true },
  { id: uid('act'), timestamp: daysAgo(1), actor: 'Raven K.', role: 'dispatcher', action: 'trip.dispatched', detail: 'TR001: Truck-11 / Priya — cargo 3200/5000kg OK', ok: true },
  { id: uid('act'), timestamp: daysAgo(1), actor: 'Meera Shah', role: 'fleet_manager', action: 'maintenance.opened', detail: 'MINI-03 → Tyre Replace — vehicle set to In Shop', ok: true },
];
