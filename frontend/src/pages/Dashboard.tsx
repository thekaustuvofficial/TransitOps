import { useState } from 'react';
import { useDb } from '../hooks/useDb';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { ActivityFeed } from '../components/ActivityFeed';
import { Card } from '../components/primitives';
import { Filter } from 'lucide-react';

export default function Dashboard() {
  const db = useDb();

  // Filters state
  const [vehicleType, setVehicleType] = useState<string>('All');
  const [vehicleStatus, setVehicleStatus] = useState<string>('All');
  const [region, setRegion] = useState<string>('All');

  const vehicles = db.vehicles;
  const trips = db.trips;
  const drivers = db.drivers;

  // Derive filter options
  const regions = Array.from(new Set(vehicles.map((v) => v.region).filter(Boolean)));

  // Filtered vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (vehicleType !== 'All' && v.type !== vehicleType) return false;
    if (vehicleStatus !== 'All' && v.status !== vehicleStatus) return false;
    if (region !== 'All' && v.region !== region) return false;
    return true;
  });

  // KPI Calculations (Filtered based on active filters)
  const activeVehiclesCount = filteredVehicles.filter((v) => v.status === 'On Trip').length;
  const availableVehiclesCount = filteredVehicles.filter((v) => v.status === 'Available').length;
  const inMaintenanceCount = filteredVehicles.filter((v) => v.status === 'In Shop').length;
  const totalNonRetiredCount = filteredVehicles.filter((v) => v.status !== 'Retired').length;

  const fleetUtilization = totalNonRetiredCount > 0 
    ? Math.round((activeVehiclesCount / totalNonRetiredCount) * 100) 
    : 0;

  // Filtered Trips (if vehicle is in filtered list)
  const filteredTrips = trips.filter((t) => {
    if (!t.vehicle_id) return true; // Draft/unassigned trips bypass vehicle filter
    const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
    if (!vehicle) return true;
    if (vehicleType !== 'All' && vehicle.type !== vehicleType) return false;
    if (region !== 'All' && vehicle.region !== region) return false;
    return true;
  });

  const activeTripsCount = filteredTrips.filter((t) => t.status === 'Dispatched').length;
  const pendingTripsCount = filteredTrips.filter((t) => t.status === 'Draft').length;

  // Drivers on duty
  const activeDriversCount = drivers.filter((d) => d.status === 'On Trip' || d.status === 'Available').length;

  // Vehicle Status distribution for progress bars
  const statusDistribution = {
    Available: filteredVehicles.filter((v) => v.status === 'Available').length,
    'On Trip': filteredVehicles.filter((v) => v.status === 'On Trip').length,
    'In Shop': filteredVehicles.filter((v) => v.status === 'In Shop').length,
    Retired: filteredVehicles.filter((v) => v.status === 'Retired').length,
  };
  const totalFilteredVehicles = filteredVehicles.length;

  const getPercent = (count: number) => {
    if (totalFilteredVehicles === 0) return 0;
    return Math.round((count / totalFilteredVehicles) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
            Operations Dashboard
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Real-time fleet state machine monitoring, trip dispatch status and KPIs.
          </p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium mr-2">
            <Filter size={14} />
            <span>FILTERS</span>
          </div>

          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1 text-xs text-[var(--color-text)] focus:border-amber-500 focus:outline-none"
          >
            <option value="All">Type: All</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Mini">Mini</option>
          </select>

          <select
            value={vehicleStatus}
            onChange={(e) => setVehicleStatus(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1 text-xs text-[var(--color-text)] focus:border-amber-500 focus:outline-none"
          >
            <option value="All">Status: All</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>

          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1 text-xs text-[var(--color-text)] focus:border-amber-500 focus:outline-none"
          >
            <option value="All">Region: All</option>
            {regions.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        <KpiCard
          label="Active Vehicles"
          value={activeVehiclesCount}
          accent="var(--color-status-ontrip)"
          sub={`out of ${totalNonRetiredCount} non-retired`}
        />
        <KpiCard
          label="Available"
          value={availableVehiclesCount}
          accent="var(--color-status-available)"
          sub="ready for dispatch"
        />
        <KpiCard
          label="In Shop"
          value={inMaintenanceCount}
          accent="var(--color-status-shop)"
          sub="under maintenance"
        />
        <KpiCard
          label="Active Trips"
          value={activeTripsCount}
          accent="var(--color-status-ontrip)"
          sub="trips currently dispatched"
        />
        <KpiCard
          label="Pending Trips"
          value={pendingTripsCount}
          accent="var(--color-status-draft)"
          sub="waiting for dispatch"
        />
        <KpiCard
          label="Drivers On Duty"
          value={activeDriversCount}
          accent="var(--color-status-available)"
          sub="available & on trip"
        />
        <KpiCard
          label="Fleet Utilization"
          value={`${fleetUtilization}%`}
          accent={fleetUtilization > 75 ? 'var(--color-status-available)' : 'var(--color-status-shop)'}
          sub="active / total active fleet"
        />
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recent Trips Table */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold tracking-wide uppercase text-[var(--color-text)]">
                Recent Operations Ledger
              </h2>
              <span className="text-[11px] text-[var(--color-text-faint)]">Showing latest 8 trips</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th className="pb-2.5 font-medium">TRIP CODE</th>
                    <th className="pb-2.5 font-medium">ROUTE</th>
                    <th className="pb-2.5 font-medium">VEHICLE</th>
                    <th className="pb-2.5 font-medium">DRIVER</th>
                    <th className="pb-2.5 font-medium">CARGO</th>
                    <th className="pb-2.5 font-medium">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {filteredTrips.slice(0, 8).map((trip) => {
                    const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
                    const driver = drivers.find((d) => d.id === trip.driver_id);
                    return (
                      <tr key={trip.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                        <td className="font-display py-3 font-semibold text-[var(--color-text)]">{trip.trip_code}</td>
                        <td className="py-3">
                          <div className="font-medium text-[var(--color-text)]">{trip.destination}</div>
                          <div className="text-[10px] text-[var(--color-text-faint)]">from {trip.source}</div>
                        </td>
                        <td className="py-3">
                          {vehicle ? (
                            <div>
                              <div className="font-medium">{vehicle.name}</div>
                              <div className="text-[10px] font-display text-[var(--color-text-faint)]">{vehicle.reg_no}</div>
                            </div>
                          ) : (
                            <span className="text-[var(--color-text-faint)]">—</span>
                          )}
                        </td>
                        <td className="py-3 font-medium">{driver?.name ?? <span className="text-[var(--color-text-faint)]">—</span>}</td>
                        <td className="py-3 font-display">{trip.cargo_weight_kg} kg</td>
                        <td className="py-3">
                          <StatusBadge status={trip.status} />
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTrips.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--color-text-faint)]">
                        No trips found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Fleet Status Chart / Breakdown */}
          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)]">
            <h3 className="font-display mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
              Fleet Status Distribution
            </h3>
            <div className="space-y-4">
              {/* Available */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Available
                  </span>
                  <span className="font-display font-semibold text-[var(--color-text)]">
                    {statusDistribution.Available} ({getPercent(statusDistribution.Available)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${getPercent(statusDistribution.Available)}%` }}
                  />
                </div>
              </div>

              {/* On Trip */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    On Trip
                  </span>
                  <span className="font-display font-semibold text-[var(--color-text)]">
                    {statusDistribution['On Trip']} ({getPercent(statusDistribution['On Trip'])}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${getPercent(statusDistribution['On Trip'])}%` }}
                  />
                </div>
              </div>

              {/* In Shop */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    In Shop
                  </span>
                  <span className="font-display font-semibold text-[var(--color-text)]">
                    {statusDistribution['In Shop']} ({getPercent(statusDistribution['In Shop'])}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${getPercent(statusDistribution['In Shop'])}%` }}
                  />
                </div>
              </div>

              {/* Retired */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Retired
                  </span>
                  <span className="font-display font-semibold text-[var(--color-text)]">
                    {statusDistribution.Retired} ({getPercent(statusDistribution.Retired)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{ width: `${getPercent(statusDistribution.Retired)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Activity Feed Sidebar */}
        <div className="lg:col-span-4 h-[500px] lg:h-auto">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
