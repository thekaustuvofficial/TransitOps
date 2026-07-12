import type {
  Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense, ActivityEntry, User,
} from '../types';
import { uid } from './id';
import {
  SEED_USERS, SEED_VEHICLES, SEED_DRIVERS, SEED_TRIPS,
  SEED_MAINTENANCE, SEED_FUEL, SEED_EXPENSES, SEED_ACTIVITY,
} from './seed';

// ---------------------------------------------------------------------------
// STORAGE ENGINE
// ---------------------------------------------------------------------------
// Everything below reads/writes plain arrays kept in memory and mirrored to
// localStorage. This is intentionally the ONLY place that touches storage.
//
// TO MIGRATE TO MYSQL LATER:
//   1. Stand up an Express/Node (or any) API whose routes match the method
//      names below 1:1 (POST /trips/:id/dispatch, etc.) against the schema
//      in sql/schema.sql — the table/column names already match these types.
//   2. Replace the body of each method in the `Database` class with a
//      `fetch()` call to that route instead of an array mutation.
//   3. Nothing outside this file needs to change — every page calls these
//      same method names via the DataContext hook.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'transitops_db_v2';

interface Snapshot {
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  maintenance: MaintenanceLog[];
  fuel: FuelLog[];
  expenses: Expense[];
  activity: ActivityEntry[];
}

function loadSnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  return {
    users: SEED_USERS,
    vehicles: SEED_VEHICLES,
    drivers: SEED_DRIVERS,
    trips: SEED_TRIPS,
    maintenance: SEED_MAINTENANCE,
    fuel: SEED_FUEL,
    expenses: SEED_EXPENSES,
    activity: SEED_ACTIVITY,
  };
}

export class RuleViolation extends Error { }

type Listener = () => void;

class Database {
  private snap: Snapshot = loadSnapshot();
  private readonly listeners = new Set<Listener>();

  public useBackend = false;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async initializeBackend() {
    try {
      const res = await fetch('http://localhost:3001/api/data');
      if (res.ok) {
        this.snap = await res.json();
        this.commit(true);
      }
    } catch (err) {
      console.warn("Express backend offline, falling back to local storage snapshot", err);
    }
  }

  private async commit(skipBackend = false) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snap));
    this.listeners.forEach((fn) => fn());
    
    if (this.useBackend && !skipBackend) {
      try {
        await fetch('http://localhost:3001/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.snap),
        });
      } catch (err) {
        console.warn("Failed to synchronize state to backend server", err);
      }
    }
  }

  exportSnapshot(): Snapshot {
    return this.snap;
  }

  importSnapshot(newSnap: Snapshot): boolean {
    if (newSnap && Array.isArray(newSnap.vehicles) && Array.isArray(newSnap.drivers) && Array.isArray(newSnap.trips)) {
      this.snap = { ...newSnap };
      this.commit();
      return true;
    }
    return false;
  }

  private log(actor: User, action: ActivityEntry['action'], detail: string, ok = true) {
    this.snap.activity = [
      { id: uid('act'), timestamp: new Date().toISOString(), actor: actor.name, role: actor.role, action, detail, ok },
      ...this.snap.activity,
    ].slice(0, 200);
  }

  // ---- READS -------------------------------------------------------------
  get users() { return this.snap.users; }
  get vehicles() { return this.snap.vehicles; }
  get drivers() { return this.snap.drivers; }
  get trips() { return this.snap.trips; }
  get maintenance() { return this.snap.maintenance; }
  get fuel() { return this.snap.fuel; }
  get expenses() { return this.snap.expenses; }
  get activity() { return this.snap.activity; }

  authenticate(email: string, password: string): User | null {
    return this.snap.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    ) ?? null;
  }

  eligibleVehicles(): Vehicle[] {
    return this.snap.vehicles.filter((v) => v.status === 'Available');
  }

  eligibleDrivers(): Driver[] {
    const today = new Date();
    return this.snap.drivers.filter(
      (d) => d.status === 'Available' && new Date(d.license_expiry) > today,
    );
  }

  operationalCost(vehicleId: string): number {
    const fuel = this.snap.fuel.filter((f) => f.vehicle_id === vehicleId).reduce((s, f) => s + f.cost, 0);
    const maint = this.snap.maintenance.filter((m) => m.vehicle_id === vehicleId).reduce((s, m) => s + m.cost, 0);
    return fuel + maint;
  }

  vehicleRevenue(vehicleId: string): number {
    return this.snap.trips
      .filter((t) => t.vehicle_id === vehicleId && t.status === 'Completed')
      .reduce((s, t) => s + t.revenue, 0);
  }

  // ---- VEHICLES ------------------------------------------------------------
  createVehicle(actor: User, input: Omit<Vehicle, 'id' | 'status' | 'last_service_odometer_km'>) {
    if (this.snap.vehicles.some((v) => v.reg_no.toLowerCase() === input.reg_no.toLowerCase())) {
      throw new RuleViolation(`Registration number "${input.reg_no}" is already registered.`);
    }
    const vehicle: Vehicle = { ...input, id: uid('veh'), status: 'Available', last_service_odometer_km: input.odometer_km };
    this.snap.vehicles = [vehicle, ...this.snap.vehicles];
    this.log(actor, 'vehicle.created', `Registered ${vehicle.name} (${vehicle.reg_no})`);
    this.commit();
    return vehicle;
  }

  updateVehicle(actor: User, id: string, patch: Partial<Vehicle>) {
    if (patch.reg_no && this.snap.vehicles.some((v) => v.id !== id && v.reg_no.toLowerCase() === patch.reg_no!.toLowerCase())) {
      throw new RuleViolation(`Registration number "${patch.reg_no}" is already registered.`);
    }
    this.snap.vehicles = this.snap.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v));
    const v = this.snap.vehicles.find((x) => x.id === id)!;
    this.log(actor, 'vehicle.updated', `Updated ${v.name} (${v.reg_no})`);
    this.commit();
  }

  // ---- DRIVERS -------------------------------------------------------------
  createDriver(actor: User, input: Omit<Driver, 'id' | 'status'>) {
    if (this.snap.drivers.some((d) => d.license_no.toLowerCase() === input.license_no.toLowerCase())) {
      throw new RuleViolation(`License number "${input.license_no}" is already registered.`);
    }
    const driver: Driver = { ...input, id: uid('drv'), status: 'Available' };
    this.snap.drivers = [driver, ...this.snap.drivers];
    this.log(actor, 'driver.created', `Added driver ${driver.name} (${driver.license_no})`);
    this.commit();
    return driver;
  }

  updateDriver(actor: User, id: string, patch: Partial<Driver>) {
    this.snap.drivers = this.snap.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d));
    const d = this.snap.drivers.find((x) => x.id === id)!;
    this.log(actor, 'driver.updated', `Updated ${d.name} — status: ${d.status}`);
    this.commit();
  }

  // ---- TRIPS (the rule-heavy surface) --------------------------------------
  createTripDraft(actor: User, input: {
    source: string; destination: string; cargo_weight_kg: number; planned_distance_km: number; revenue: number;
  }) {
    const code = `TR${String(this.snap.trips.length + 1).padStart(3, '0')}`;
    const trip: Trip = {
      id: uid('trp'), trip_code: code, source: input.source, destination: input.destination,
      vehicle_id: null, driver_id: null, cargo_weight_kg: input.cargo_weight_kg,
      planned_distance_km: input.planned_distance_km, status: 'Draft', revenue: input.revenue,
      final_odometer_km: null, fuel_consumed_l: null, created_at: new Date().toISOString(),
      dispatched_at: null, completed_at: null,
    };
    this.snap.trips = [trip, ...this.snap.trips];
    this.log(actor, 'trip.created', `${code}: ${input.source} → ${input.destination} drafted`);
    this.commit();
    return trip;
  }

  /** Validates + applies all 5 dispatch-time business rules atomically. */
  dispatchTrip(actor: User, tripId: string, vehicleId: string, driverId: string) {
    const trip = this.snap.trips.find((t) => t.id === tripId);
    const vehicle = this.snap.vehicles.find((v) => v.id === vehicleId);
    const driver = this.snap.drivers.find((d) => d.id === driverId);
    if (!trip) throw new RuleViolation('Trip not found.');
    if (!vehicle) throw new RuleViolation('Vehicle not found.');
    if (!driver) throw new RuleViolation('Driver not found.');

    if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
      throw new RuleViolation(`${vehicle.name} is ${vehicle.status} and cannot be dispatched.`);
    }
    if (vehicle.status === 'On Trip') {
      throw new RuleViolation(`${vehicle.name} is already on another trip.`);
    }
    if (driver.status === 'Suspended') {
      throw new RuleViolation(`${driver.name} is suspended and cannot be assigned.`);
    }
    if (new Date(driver.license_expiry) <= new Date()) {
      throw new RuleViolation(`${driver.name}'s license expired on ${driver.license_expiry}.`);
    }
    if (driver.status === 'On Trip') {
      throw new RuleViolation(`${driver.name} is already on another trip.`);
    }
    if (trip.cargo_weight_kg > vehicle.max_capacity_kg) {
      throw new RuleViolation(
        `Cargo weight ${trip.cargo_weight_kg}kg exceeds ${vehicle.name}'s capacity of ${vehicle.max_capacity_kg}kg by ${trip.cargo_weight_kg - vehicle.max_capacity_kg}kg.`,
      );
    }

    this.snap.trips = this.snap.trips.map((t) => (t.id === tripId
      ? { ...t, status: 'Dispatched', vehicle_id: vehicleId, driver_id: driverId, dispatched_at: new Date().toISOString() }
      : t));
    this.snap.vehicles = this.snap.vehicles.map((v) => (v.id === vehicleId ? { ...v, status: 'On Trip' } : v));
    this.snap.drivers = this.snap.drivers.map((d) => (d.id === driverId ? { ...d, status: 'On Trip' } : d));

    this.log(actor, 'trip.dispatched', `${trip.trip_code}: ${vehicle.name} / ${driver.name} — cargo ${trip.cargo_weight_kg}/${vehicle.max_capacity_kg}kg OK`);
    this.commit();
  }

  completeTrip(actor: User, tripId: string, finalOdometer: number, fuelConsumedL: number) {
    const trip = this.snap.trips.find((t) => t.id === tripId);
    if (!trip) throw new RuleViolation('Trip not found.');
    if (trip.status !== 'Dispatched') throw new RuleViolation('Only a dispatched trip can be completed.');

    this.snap.trips = this.snap.trips.map((t) => (t.id === tripId
      ? { ...t, status: 'Completed', final_odometer_km: finalOdometer, fuel_consumed_l: fuelConsumedL, completed_at: new Date().toISOString() }
      : t));
    if (trip.vehicle_id) {
      this.snap.vehicles = this.snap.vehicles.map((v) => (v.id === trip.vehicle_id
        ? { ...v, status: 'Available', odometer_km: Math.max(v.odometer_km, finalOdometer) }
        : v));
    }
    if (trip.driver_id) {
      this.snap.drivers = this.snap.drivers.map((d) => (d.id === trip.driver_id ? { ...d, status: 'Available' } : d));
    }
    if (fuelConsumedL > 0 && trip.vehicle_id) {
      this.snap.fuel = [{ id: uid('fuel'), vehicle_id: trip.vehicle_id, trip_id: trip.id, date: new Date().toISOString().slice(0, 10), liters: fuelConsumedL, cost: Math.round(fuelConsumedL * 75) }, ...this.snap.fuel];
    }

    const vName = this.snap.vehicles.find((v) => v.id === trip.vehicle_id)?.name ?? 'vehicle';
    const dName = this.snap.drivers.find((d) => d.id === trip.driver_id)?.name ?? 'driver';
    this.log(actor, 'trip.completed', `${trip.trip_code}: ${trip.source} → ${trip.destination} — ${vName} & ${dName} back to Available`);
    this.commit();
  }

  cancelTrip(actor: User, tripId: string) {
    const trip = this.snap.trips.find((t) => t.id === tripId);
    if (!trip) throw new RuleViolation('Trip not found.');
    if (trip.status !== 'Dispatched' && trip.status !== 'Draft') {
      throw new RuleViolation('Only a draft or dispatched trip can be cancelled.');
    }
    const wasDispatched = trip.status === 'Dispatched';
    this.snap.trips = this.snap.trips.map((t) => (t.id === tripId ? { ...t, status: 'Cancelled' } : t));
    if (wasDispatched) {
      if (trip.vehicle_id) this.snap.vehicles = this.snap.vehicles.map((v) => (v.id === trip.vehicle_id ? { ...v, status: 'Available' } : v));
      if (trip.driver_id) this.snap.drivers = this.snap.drivers.map((d) => (d.id === trip.driver_id ? { ...d, status: 'Available' } : d));
    }
    this.log(actor, 'trip.cancelled', `${trip.trip_code} cancelled${wasDispatched ? ' — vehicle & driver restored to Available' : ''}`);
    this.commit();
  }

  // ---- MAINTENANCE ----------------------------------------------------------
  openMaintenance(actor: User, vehicleId: string, serviceType: string, cost: number, date: string) {
    const vehicle = this.snap.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new RuleViolation('Vehicle not found.');
    if (vehicle.status === 'On Trip') throw new RuleViolation(`${vehicle.name} is on a trip and cannot enter maintenance.`);
    if (vehicle.status === 'Retired') throw new RuleViolation(`${vehicle.name} is retired.`);

    const record: MaintenanceLog = { id: uid('mnt'), vehicle_id: vehicleId, service_type: serviceType, cost, date, status: 'In Shop' };
    this.snap.maintenance = [record, ...this.snap.maintenance];
    this.snap.vehicles = this.snap.vehicles.map((v) => (v.id === vehicleId ? { ...v, status: 'In Shop' } : v));
    this.log(actor, 'maintenance.opened', `${vehicle.name} → ${serviceType} — vehicle set to In Shop`);
    this.commit();
    return record;
  }

  closeMaintenance(actor: User, recordId: string) {
    const record = this.snap.maintenance.find((m) => m.id === recordId);
    if (!record) throw new RuleViolation('Maintenance record not found.');
    if (record.status === 'Completed') return;
    this.snap.maintenance = this.snap.maintenance.map((m) => (m.id === recordId ? { ...m, status: 'Completed' } : m));
    const vehicle = this.snap.vehicles.find((v) => v.id === record.vehicle_id);
    if (vehicle && vehicle.status !== 'Retired') {
      this.snap.vehicles = this.snap.vehicles.map((v) => (v.id === record.vehicle_id
        ? { ...v, status: 'Available', last_service_odometer_km: v.odometer_km }
        : v));
    }
    this.log(actor, 'maintenance.closed', `${vehicle?.name ?? 'Vehicle'} service closed — restored to Available`);
    this.commit();
  }

  // ---- FUEL & EXPENSES --------------------------------------------------
  logFuel(actor: User, input: Omit<FuelLog, 'id'>) {
    const entry: FuelLog = { ...input, id: uid('fuel') };
    this.snap.fuel = [entry, ...this.snap.fuel];
    const v = this.snap.vehicles.find((x) => x.id === input.vehicle_id);
    this.log(actor, 'fuel.logged', `${v?.name ?? 'Vehicle'} — ${input.liters}L logged`);
    this.commit();
    return entry;
  }

  logExpense(actor: User, input: Omit<Expense, 'id'>) {
    const entry: Expense = { ...input, id: uid('exp') };
    this.snap.expenses = [entry, ...this.snap.expenses];
    const v = this.snap.vehicles.find((x) => x.id === input.vehicle_id);
    this.log(actor, 'expense.logged', `${v?.name ?? 'Vehicle'} — toll ₹${input.toll} / other ₹${input.other}`);
    this.commit();
    return entry;
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.snap = {
      users: SEED_USERS, vehicles: SEED_VEHICLES, drivers: SEED_DRIVERS, trips: SEED_TRIPS,
      maintenance: SEED_MAINTENANCE, fuel: SEED_FUEL, expenses: SEED_EXPENSES, activity: SEED_ACTIVITY,
    };
    this.commit();
  }
}

export const db = new Database();
