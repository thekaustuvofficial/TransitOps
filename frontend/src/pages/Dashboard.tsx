import { useState } from 'react';
import { useDb } from '../hooks/useDb';
import { KpiCard } from '../components/KpiCard';
import { Card, CustomSelect } from '../components/primitives';
import { Search } from 'lucide-react';

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
    if (status === 'Draft') return 'Awaiting';
    const hash = tripCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const mins = (hash % 50) + 15;
    return mins > 60 ? `1h ${mins - 60}m` : `${mins}m`;
  };

  // Status badge classes
  const getBadgeCls = (status: string) => {
    switch (status) {
      case 'Dispatched': return 'bg-blue-500/15 text-blue-500 border border-blue-500/25';
      case 'Completed':  return 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25';
      case 'Draft':      return 'bg-[var(--color-panel-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]';
      case 'Cancelled':  return 'bg-red-500/15 text-red-500 border border-red-500/25';
      default:           return 'bg-slate-500/15 text-[var(--color-text-muted)] border border-[var(--color-border)]';
    }
  };

  const statusBarData = [
    { label: 'Available', count: statusDistribution.Available, color: 'bg-emerald-500' },
    { label: 'On Trip',   count: statusDistribution['On Trip'], color: 'bg-blue-500' },
    { label: 'In Shop',   count: statusDistribution['In Shop'], color: 'bg-amber-500' },
    { label: 'Retired',   count: statusDistribution.Retired,   color: 'bg-red-500' },
  ];

  return (
    <div className="flex flex-col gap-5 animate-fade-in h-full">

      {/* ── Single-line Filter Bar ── */}
      <div className="flex items-center gap-2 flex-nowrap overflow-x-auto hide-scrollbar shrink-0">
        {/* Search */}
        <div className="relative shrink-0 w-56">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search trips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] pl-8 pr-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
          />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)] shrink-0 pl-1">Filters:</span>
        <CustomSelect value={vehicleType} onChange={setVehicleType}
          options={[
            { value: 'All', label: 'All Types' },
            { value: 'Van', label: 'Van' },
            { value: 'Truck', label: 'Truck' },
            { value: 'Mini', label: 'Mini' },
          ]}
          className="w-32 shrink-0"
        />
        <CustomSelect value={vehicleStatus} onChange={setVehicleStatus}
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: 'Available', label: 'Available' },
            { value: 'On Trip', label: 'On Trip' },
            { value: 'In Shop', label: 'In Shop' },
            { value: 'Retired', label: 'Retired' },
          ]}
          className="w-36 shrink-0"
        />
        {regions.length > 0 && (
          <CustomSelect value={region} onChange={setRegion}
            options={[
              { value: 'All', label: 'All Regions' },
              ...regions.map((r) => ({ value: r, label: r })),
            ]}
            className="w-36 shrink-0"
          />
        )}
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 shrink-0 stagger-children">
        <KpiCard label="ACTIVE VEHICLES"      value={activeVehiclesCount}    accent="#3b82f6" onClick={() => handleKpiClick('fleet', 'fleet_status_filter', 'On Trip')} />
        <KpiCard label="AVAILABLE VEHICLES"   value={availableVehiclesCount} accent="#10b981" onClick={() => handleKpiClick('fleet', 'fleet_status_filter', 'Available')} />
        <KpiCard label="IN MAINTENANCE"       value={inMaintenanceCount}     accent="#f59e0b" onClick={() => handleKpiClick('fleet', 'fleet_status_filter', 'In Shop')} />
        <KpiCard label="ACTIVE TRIPS"         value={activeTripsCount}       accent="#3b82f6" onClick={() => handleKpiClick('trips')} />
        <KpiCard label="PENDING TRIPS"        value={pendingTripsCount}      accent="#6366f1" onClick={() => handleKpiClick('trips')} />
        <KpiCard label="DRIVERS ON DUTY"      value={activeDriversCount}     accent="#10b981" onClick={() => handleKpiClick('drivers')} />
        <KpiCard label="FLEET UTILIZATION"    value={`${fleetUtilization}%`} accent={fleetUtilization > 75 ? '#10b981' : '#f59e0b'} onClick={() => handleKpiClick('analytics')} />
      </div>

      {/* ── Main Content: Trips Table + Fleet Overview ── */}
      <div className="grid gap-4 lg:grid-cols-12 min-h-0 flex-1">

        {/* Recent Trips */}
        <div className="lg:col-span-8 min-h-0 flex flex-col">
          <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)] flex flex-col min-h-0 h-full">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3 bg-[var(--color-panel-2)] shrink-0">
              <h2 className="font-display text-xs font-bold uppercase tracking-widest text-[var(--color-text)]">
                Recent Trips
              </h2>
              <span className="text-[10px] font-mono text-[var(--color-text-faint)]">{filteredTrips.length} total</span>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-text-faint)] text-[10px] uppercase tracking-wider">
                    <th className="px-5 py-3 font-semibold">Trip</th>
                    <th className="px-5 py-3 font-semibold">Route</th>
                    <th className="px-5 py-3 font-semibold">Vehicle</th>
                    <th className="px-5 py-3 font-semibold">Driver</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedTrips.slice(0, 10).map((trip) => {
                    const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
                    const driver  = drivers.find((d) => d.id === trip.driver_id);
                    return (
                      <tr
                        key={trip.id}
                        className="border-b border-[var(--color-border-soft)] hover:bg-[var(--color-panel-2)] transition-colors duration-150 cursor-default group"
                      >
                        <td className="px-5 py-3 font-display font-bold text-xs text-[var(--color-text)] tracking-tight whitespace-nowrap">
                          {trip.trip_code}
                        </td>
                        <td className="px-5 py-3 max-w-[140px]">
                          <div className="text-xs text-[var(--color-text)] font-medium truncate">
                            {trip.source}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-faint)] truncate">→ {trip.destination}</div>
                        </td>
                        <td className="px-5 py-3 text-xs font-medium text-[var(--color-text)] whitespace-nowrap">
                          {vehicle ? vehicle.name : <span className="text-[var(--color-text-faint)]">—</span>}
                        </td>
                        <td className="px-5 py-3 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                          {driver ? driver.name : <span className="text-[var(--color-text-faint)]">—</span>}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getBadgeCls(trip.status)}`}>
                            {trip.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[10px] text-[var(--color-text-muted)] text-right whitespace-nowrap group-hover:text-[var(--color-text)] transition-colors">
                          {getEta(trip.trip_code, trip.status)}
                        </td>
                      </tr>
                    );
                  })}
                  {searchedTrips.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-[var(--color-text-faint)] text-xs">
                        No trips found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Fleet Overview */}
        <div className="lg:col-span-4 min-h-0">
          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)] h-full flex flex-col">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h3 className="font-display text-xs font-bold uppercase tracking-widest text-[var(--color-text)]">
                Fleet Overview
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[var(--color-panel-2)] rounded border border-[var(--color-border)] text-[var(--color-text-muted)]">
                {totalFilteredVehicles}
              </span>
            </div>

            <div className="space-y-4 flex-1">
              {statusBarData.map(({ label, count, color }) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--color-text-muted)]">{label}</span>
                    <span className="font-mono font-bold text-[var(--color-text)]">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-700`}
                      style={{ width: `${getPercent(count)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
