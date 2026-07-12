export type Role = 'fleet_manager' | 'driver' | 'safety_officer' | 'financial_analyst';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // plaintext mock only — never do this with a real backend
  role: Role;
}

export type VehicleType = 'Van' | 'Truck' | 'Mini';
export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';

export interface Vehicle {
  id: string;
  reg_no: string; // unique
  name: string;
  type: VehicleType;
  max_capacity_kg: number;
  odometer_km: number;
  acquisition_cost: number;
  status: VehicleStatus;
  last_service_odometer_km: number;
  region: string;
}

export type LicenseCategory = 'LMV' | 'HMV';
export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';

export interface Driver {
  id: string;
  name: string;
  license_no: string;
  license_category: LicenseCategory;
  license_expiry: string; // ISO date
  contact: string;
  safety_score: number; // 0-100
  status: DriverStatus;
}

export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

export interface Trip {
  id: string;
  trip_code: string;
  source: string;
  destination: string;
  vehicle_id: string | null;
  driver_id: string | null;
  cargo_weight_kg: number;
  planned_distance_km: number;
  status: TripStatus;
  revenue: number;
  final_odometer_km: number | null;
  fuel_consumed_l: number | null;
  created_at: string;
  dispatched_at: string | null;
  completed_at: string | null;
}

export type MaintenanceStatus = 'In Shop' | 'Completed';

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  service_type: string;
  cost: number;
  date: string;
  status: MaintenanceStatus;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  date: string;
  liters: number;
  cost: number;
}

export interface Expense {
  id: string;
  trip_id: string;
  vehicle_id: string;
  toll: number;
  other: number;
  date: string;
}

export type ActivityAction =
  | 'vehicle.created' | 'vehicle.updated'
  | 'driver.created' | 'driver.updated'
  | 'trip.created' | 'trip.dispatched' | 'trip.completed' | 'trip.cancelled'
  | 'maintenance.opened' | 'maintenance.closed'
  | 'fuel.logged' | 'expense.logged';

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: Role;
  action: ActivityAction;
  detail: string;
  ok: boolean;
}

export type Module = 'fleet' | 'drivers' | 'trips' | 'fuel_exp' | 'analytics' | 'maintenance' | 'settings';
export type Permission = 'full' | 'view' | 'none';
export type PermissionMatrix = Record<Role, Record<Module, Permission>>;
