import type { Vehicle, Driver } from '../types';

export interface DispatchOrder {
  cargoWeightKg: number;
  source: string;
  destination: string;
  estimatedDurationHours: number;
  plannedDistanceKm: number;
}

export interface MatchResult {
  driver: Driver;
  vehicle: Vehicle;
  score: number; // Lower score indicates a better match
  costEstimate: number;
  reasons: string[];
}

/**
 * Executes the Automation Dispatch Network Logic
 * Phase A -> B -> C -> D
 */
export function getDispatchRecommendations(
  order: DispatchOrder,
  vehicles: Vehicle[],
  drivers: Driver[],
  driverHoursWorkedToday: Record<string, number> = {} // Keyed by driver ID
): MatchResult[] {
  const LEGAL_DAILY_LIMIT_HOURS = 12;
  const SERVICE_INTERVAL_KM = 10000;
  const currentDate = new Date();

  // ==========================================
  // PHASE B: The Hard-Stop Filter 
  // ==========================================

  const eligibleVehicles = vehicles.filter(truck => {
    if (truck.status !== 'Available') return false;
    const kmSinceLastService = truck.odometer_km - truck.last_service_odometer_km;
    if (kmSinceLastService >= SERVICE_INTERVAL_KM) return false;
    if (new Date(truck.insurance_expiry) < currentDate) return false;
    if (truck.max_capacity_kg < order.cargoWeightKg) return false;
    return true;
  });

  const eligibleDrivers = drivers.filter(driver => {
    if (driver.status !== 'Available') return false;
    if (new Date(driver.license_expiry) < currentDate) return false;
    const hoursWorked = driverHoursWorkedToday[driver.id] || 0;
    if (hoursWorked + order.estimatedDurationHours > LEGAL_DAILY_LIMIT_HOURS) return false;
    return true;
  });

  const calculateMatches = (vList: Vehicle[], dList: Driver[], isRelaxed = false): MatchResult[] => {
    const list: MatchResult[] = [];
    for (const truck of vList) {
      for (const driver of dList) {
        const needsHMV = truck.type === 'Truck';
        if (needsHMV && driver.license_category !== 'HMV') continue;

        const reasons: string[] = [];
        let score = 0;

        if (isRelaxed) {
          reasons.push('Bypassed strict service/insurance limits');
        }

        if (truck.current_location === order.source) {
          score -= 50; 
          reasons.push('Truck already at source');
        } else {
          score += 100;
        }

        if (driver.current_location === order.source) {
          score -= 50;
          reasons.push('Driver already at source');
        } else if (driver.current_location === truck.current_location) {
          score -= 20; 
          reasons.push('Driver at truck location');
        } else {
          score += 100;
        }

        const truckCostPerKm = truck.acquisition_cost / 1000000; 
        const driverCostPerHour = driver.license_category === 'HMV' ? 200 : 150;
        const estimatedCost = (truckCostPerKm * order.plannedDistanceKm) + (driverCostPerHour * order.estimatedDurationHours);
        
        score += estimatedCost;
        reasons.push(`Estimated optimal cost: ₹${estimatedCost.toFixed(2)}`);

        const wastedCapacity = truck.max_capacity_kg - order.cargoWeightKg;
        if (wastedCapacity > 1000) {
           score += (wastedCapacity / 100); 
           reasons.push('Warning: Large unused capacity');
        } else {
           reasons.push('Optimal capacity match');
        }

        list.push({
          driver,
          vehicle: truck,
          score,
          costEstimate: estimatedCost,
          reasons
        });
      }
    }
    return list;
  };

  let matches = calculateMatches(eligibleVehicles, eligibleDrivers, false);

  // Fallback: If no matches under strict criteria, run relaxed matching (matching manual selector filters)
  if (matches.length === 0) {
    const relaxedVehicles = vehicles.filter(truck => {
      if (truck.status !== 'Available') return false;
      if (truck.max_capacity_kg < order.cargoWeightKg) return false;
      return true;
    });

    const relaxedDrivers = drivers.filter(driver => {
      if (driver.status !== 'Available') return false;
      if (new Date(driver.license_expiry) < currentDate) return false;
      return true;
    });

    matches = calculateMatches(relaxedVehicles, relaxedDrivers, true);
  }

  matches.sort((a, b) => a.score - b.score);
  return matches.slice(0, 3);
}
