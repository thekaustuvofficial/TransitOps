import { useState } from 'react';
import { useDb } from '../hooks/useDb';
import { KpiCard } from '../components/KpiCard';
import { Card, CustomSelect } from '../components/primitives';

export default function Dashboard() {
  const db = useDb();

  // Filter states
  const [vehicleType, setVehicleType] = useState<string>('All');
  const [vehicleStatus, setVehicleStatus] = useState<string>('All');
  const [region, setRegion] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // KPI Calculations
  const activeVehiclesCount = filteredVehicles.filter((v) => v.status === 'On Trip').length;
  const availableVehiclesCount = filteredVehicles.filter((v) => v.status === 'Available').length;
  const inMaintenanceCount = filteredVehicles.filter((v) => v.status === 'In Shop').length;
  const totalNonRetiredCount = filteredVehicles.filter((v) => v.status !== 'Retired').length;

  const fleetUtilization = totalNonRetiredCount > 0
    ? Math.round((activeVehiclesCount / totalNonRetiredCount) * 100)
    : 0;

  // Filtered Trips
  const filteredTrips = trips.filter((t) => {
    if (!t.vehicle_id) return true;
    const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
    if (!vehicle) return true;
    if (vehicleType !== 'All' && vehicle.type !== vehicleType) return false;
    if (region !== 'All' && vehicle.region !== region) return false;
    return true;
  });

  const activeTripsCount = filteredTrips.filter((t) => t.status === 'Dispatched').length;
  const pendingTripsCount = filteredTrips.filter((t) => t.status === 'Draft').length;
  const activeDriversCount = drivers.filter((d) => d.status === 'On Trip' || d.status === 'Available').length;

  // Vehicle status bars
  const statusDistribution = {
    Available: filteredVehicles.filter((v) => v.status === 'Available').length,
    'On Trip': filteredVehicles.filter((v) => v.status === 'On Trip').length,
    'In Shop': filteredVehicles.filter((v) => v.status === 'In Shop').length,
    Retired: filteredVehicles.filter((v) => v.status === 'Retired').length,
  };
  const totalFilteredVehicles = filteredVehicles.length;
  const getPercent = (count: number) =>
    totalFilteredVehicles === 0 ? 0 : Math.round((count / totalFilteredVehicles) * 100);

  // Search filtered trips
  const searchedTrips = filteredTrips.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
    const driver = drivers.find((d) => d.id === t.driver_id);
    return (
      t.trip_code.toLowerCase().includes(q) ||
      t.source.toLowerCase().includes(q) ||
      t.destination.toLowerCase().includes(q) ||
      (vehicle && vehicle.name.toLowerCase().includes(q)) ||
      (driver && driver.name.toLowerCase().includes(q))
    );
  });

  const handleKpiClick = (module: string, filterKey?: string, filterValue?: string) => {
    if (filterKey && filterValue) sessionStorage.setItem(filterKey, filterValue);
    window.location.hash = `#/${module}`;
  };

  // ETA estimator
  const getEta = (tripCode: string, status: string) => {
    if (status === 'Completed' || status === 'Cancelled') return '—';
    if (status === 'Draft') return 'Awaiting vehicle';
    const hash = tripCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const mins = (hash % 50) + 15;
    return mins > 60 ? `1h ${mins - 60}m` : `${mins} min`;
  };

  // Status badge classes matching the mockup
  const getBadgeCls = (status: string) => {
    switch (status) {
      case 'On Trip':    return 'bg-blue-500 text-white';
      case 'Completed':  return 'bg-emerald-600 text-white';
      case 'Dispatched': return 'bg-sky-500 text-white';
      case 'Draft':      return 'bg-[var(--color-panel-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]';
      case 'Cancelled':  return 'bg-red-500 text-white';
      default:           return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Search + Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center border-b border-[var(--color-border)] pb-5">
        {/* Search */}
        <div className="w-full sm:max-w-[260px]">
          <input
            type="text"
            placeholder="Search trips, vehicles, drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all duration-200"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">Filters</span>
          <CustomSelect
            value={vehicleType}
            onChange={setVehicleType}
            options={[
              { value: 'All', label: 'Vehicle Type: All' },
              { value: 'Van', label: 'Van' },
              { value: 'Truck', label: 'Truck' },
              { value: 'Mini', label: 'Mini' },
            ]}
            className="w-44"
          />
          <CustomSelect
            value={vehicleStatus}
            onChange={setVehicleStatus}
            options={[
              { value: 'All', label: 'Status: All' },
              { value: 'Available', label: 'Available' },
              { value: 'On Trip', label: 'On Trip' },
              { value: 'In Shop', label: 'In Shop' },
              { value: 'Retired', label: 'Retired' },
            ]}
            className="w-40"
          />
          <CustomSelect
            value={region}
            onChange={setRegion}
            options={[
              { value: 'All', label: 'Region: All' },
              ...regions.map((r) => ({ value: r, label: r })),
            ]}
            className="w-40"
          />
        </div>
      </div>

      {/* KPI Grid — 7 compact cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="ACTIVE VEHICLES"        value={activeVehiclesCount}     accent="#3b82f6" onClick={() => handleKpiClick('fleet', 'fleet_status_filter', 'On Trip')} />
        <KpiCard label="AVAILABLE VEHICLES"     value={availableVehiclesCount}  accent="#10b981" onClick={() => handleKpiClick('fleet', 'fleet_status_filter', 'Available')} />
        <KpiCard label="VEHICLES IN MAINTENANCE" value={inMaintenanceCount}     accent="#f59e0b" onClick={() => handleKpiClick('fleet', 'fleet_status_filter', 'In Shop')} />
        <KpiCard label="ACTIVE TRIPS"           value={activeTripsCount}        accent="#3b82f6" onClick={() => handleKpiClick('trips')} />
        <KpiCard label="PENDING TRIPS"          value={pendingTripsCount}       accent="#6366f1" onClick={() => handleKpiClick('trips')} />
        <KpiCard label="DRIVERS ON DUTY"        value={activeDriversCount}      accent="#10b981" onClick={() => handleKpiClick('drivers')} />
        <KpiCard label="FLEET UTILIZATION"      value={`${fleetUtilization}%`}  accent={fleetUtilization > 75 ? '#10b981' : '#f59e0b'} onClick={() => handleKpiClick('analytics')} />
      </div>

      {/* Main Content: Recent Trips (left) + Vehicle Status (right) */}
      <div className="grid gap-5 lg:grid-cols-12">

        {/* Recent Trips */}
        <div className="lg:col-span-8">
          <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)] hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5 bg-[var(--color-panel-2)]">
              <h2 className="font-display text-[11px] font-bold uppercase tracking-widest text-[var(--color-text)]">
                Recent Trips
              </h2>
              <span className="text-[10px] font-mono text-[var(--color-text-faint)]">{filteredTrips.length} total</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel-2)] text-[var(--color-text-faint)] text-[10px] uppercase tracking-wider">
                    <th className="px-5 py-2.5 font-semibold">Trip</th>
                    <th className="px-4 py-2.5 font-semibold">Vehicle</th>
                    <th className="px-4 py-2.5 font-semibold">Driver</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedTrips.slice(0, 8).map((trip) => {
                    const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
                    const driver  = drivers.find((d) => d.id === trip.driver_id);
                    return (
                      <tr
                        key={trip.id}
                        className="border-b border-[var(--color-border-soft)] hover:bg-[var(--color-panel-2)] transition-colors duration-150 cursor-default"
                      >
                        <td className="px-5 py-3.5 font-display font-bold text-[var(--color-text)] tracking-tight">
                          {trip.trip_code}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">
                          {vehicle ? vehicle.name : <span className="text-[var(--color-text-faint)]">—</span>}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[var(--color-text-muted)]">
                          {driver ? driver.name : <span className="text-[var(--color-text-faint)]">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getBadgeCls(trip.status)}`}>
                            {trip.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-[var(--color-text-muted)]">
                          {getEta(trip.trip_code, trip.status)}
                        </td>
                      </tr>
                    );
                  })}
                  {searchedTrips.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-[var(--color-text-faint)]">
                        No trips found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Vehicle Status sidebar */}
        <div className="lg:col-span-4">
          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)] hover:shadow-lg transition-shadow duration-300 h-full">
            <h3 className="font-display text-[11px] font-bold uppercase tracking-widest text-[var(--color-text)] mb-6">
              Vehicle Status
            </h3>

            <div className="space-y-5">
              {/* Available */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--color-text-muted)]">Available</span>
                  <span className="font-mono font-bold text-[var(--color-text)]">{statusDistribution.Available}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${getPercent(statusDistribution.Available)}%` }} />
                </div>
              </div>

              {/* On Trip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--color-text-muted)]">On Trip</span>
                  <span className="font-mono font-bold text-[var(--color-text)]">{statusDistribution['On Trip']}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${getPercent(statusDistribution['On Trip'])}%` }} />
                </div>
              </div>

              {/* In Shop */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--color-text-muted)]">In Shop</span>
                  <span className="font-mono font-bold text-[var(--color-text)]">{statusDistribution['In Shop']}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all duration-700"
                    style={{ width: `${getPercent(statusDistribution['In Shop'])}%` }} />
                </div>
              </div>

              {/* Retired */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--color-text-muted)]">Retired</span>
                  <span className="font-mono font-bold text-[var(--color-text)]">{statusDistribution.Retired}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-red-500 transition-all duration-700"
                    style={{ width: `${getPercent(statusDistribution.Retired)}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
