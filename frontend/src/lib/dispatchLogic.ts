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
    // 1. Status Check
    if (truck.status !== 'Available') return false;

    // 2. Service Needed Check (If driven > 10,000km since last service)
    const kmSinceLastService = truck.odometer_km - truck.last_service_odometer_km;
    if (kmSinceLastService >= SERVICE_INTERVAL_KM) return false;

    // 3. Insurance Check
    if (new Date(truck.insurance_expiry) < currentDate) return false;

    // (Phase C pre-requisite) Capacity Matching
    if (truck.max_capacity_kg < order.cargoWeightKg) return false;

    return true;
  });

  const eligibleDrivers = drivers.filter(driver => {
    // 1. Status Check
    if (driver.status !== 'Available') return false;

    // 2. License Expiry Check
    if (new Date(driver.license_expiry) < currentDate) return false;

    // 3. Legal Hours Check
    const hoursWorked = driverHoursWorkedToday[driver.id] || 0;
    if (hoursWorked + order.estimatedDurationHours > LEGAL_DAILY_LIMIT_HOURS) return false;

    return true;
  });

  // ==========================================
  // PHASE C: The Smart Matchmaker
  // ==========================================
  const matches: MatchResult[] = [];

  for (const truck of eligibleVehicles) {
    for (const driver of eligibleDrivers) {
      // License Category compatibility Check
      // Trucks generally require HMV, while Vans/Minis can be driven on LMV
      const needsHMV = truck.type === 'Truck';
      if (needsHMV && driver.license_category !== 'HMV') continue;
      
      const reasons: string[] = [];
      let score = 0;

      // 1. Proximity Matching (Scoring System: Lower is better)
      if (truck.current_location === order.source) {
        score -= 50; 
        reasons.push('Truck already at source');
      } else {
        score += 100; // Penalty for deadhead truck routing
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

      // 2. Cost Optimization
      // Base calculation on abstract rates for ranking purposes
      const truckCostPerKm = truck.acquisition_cost / 1000000; 
      const driverCostPerHour = driver.license_category === 'HMV' ? 200 : 150;
      
      const estimatedCost = (truckCostPerKm * order.plannedDistanceKm) + (driverCostPerHour * order.estimatedDurationHours);
      
      score += estimatedCost;
      reasons.push(`Estimated optimal cost: ₹${estimatedCost.toFixed(2)}`);

      // 3. Capacity Efficiency 
      // Calculate how much space we are wasting if we use a big truck for a small load
      const wastedCapacity = truck.max_capacity_kg - order.cargoWeightKg;
      if (wastedCapacity > 1000) {
         score += (wastedCapacity / 100); 
         reasons.push('Warning: Large unused capacity');
      } else {
         reasons.push('Optimal capacity match');
      }

      matches.push({
        driver,
        vehicle: truck,
        score,
        costEstimate: estimatedCost,
        reasons
      });
    }
  }

  // ==========================================
  // PHASE D: The Final Output
  // ==========================================
  
  // Sort combinations by score (lowest score = highest efficiency)
  matches.sort((a, b) => a.score - b.score);
  
  // Return the top 3 best Driver + Truck combinations
  return matches.slice(0, 3);
}
