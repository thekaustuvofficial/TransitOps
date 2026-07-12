import { useState, useEffect } from 'react';
import { useDb } from '../hooks/useDb';
import { Card, Select } from '../components/primitives';
import { fmtCurrency, fmtNumber } from '../lib/format';
import { Smartphone, Bell, Clock, Package, MapPin, CreditCard, History, Truck } from 'lucide-react';

export default function DriverPortal() {
  const { trips, drivers, vehicles } = useDb();
  
  // Select active driver profile in the portal
  const availableDrivers = drivers.filter(d => d.status !== 'Suspended');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  useEffect(() => {
    if (availableDrivers.length > 0 && !selectedDriverId) {
      setSelectedDriverId(availableDrivers[0].id);
    }
  }, [availableDrivers, selectedDriverId]);

  const activeDriver = drivers.find(d => d.id === selectedDriverId);

  // Get active trip (Dispatched status) for the selected driver
  const activeTrip = trips.find(t => t.driver_id === selectedDriverId && t.status === 'Dispatched');

  // Get past history logs for this driver
  const driverTripsHistory = trips.filter(t => t.driver_id === selectedDriverId && (t.status === 'Completed' || t.status === 'Cancelled'));

  // Calculate ETA relative to dispatched_at timestamp or current time
  const getEtaString = (trip: typeof trips[0]) => {
    if (!trip.dispatched_at) return '—';
    const dispatchTime = new Date(trip.dispatched_at).getTime();
    // 50 km/h average speed calculation
    const durationMinutes = Math.round((trip.planned_distance_km / 50) * 60);
    const etaDate = new Date(dispatchTime + durationMinutes * 60000);
    return `${etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${durationMinutes} mins)`;
  };

  const activeVehicle = activeTrip ? vehicles.find(v => v.id === activeTrip.vehicle_id) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Driver Hub & Audit logs
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Auditing records, active assignments, and digital transparency portal for operators.
          </p>
        </div>

        {/* Driver Selector */}
        <div className="flex items-center gap-2.5 bg-[var(--color-panel)] px-3 py-2 rounded-xl border border-[var(--color-border)] shadow-sm">
          <span className="text-xs font-bold text-[var(--color-text-muted)] font-display">Operator Profile:</span>
          <Select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="w-48 py-1.5 text-xs bg-[var(--color-panel-2)]"
          >
            {availableDrivers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {activeDriver ? (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Column 1 & 2: Main Active Job & Logs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active Assignment / Job Card */}
            {activeTrip ? (
              <Card className="p-6 overflow-hidden relative border-[var(--color-border)] bg-[var(--color-panel)] shadow-md" accent="#3b82f6">
                <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                    <h2 className="font-display text-sm font-bold text-[var(--color-text)]">
                      Current Dispatched Assignment
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/25 px-2 py-0.5 rounded uppercase">
                    {activeTrip.trip_code}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[var(--color-panel-2)] text-orange-500 border border-[var(--color-border)]">
                        <MapPin size={15} />
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase">Route Path</div>
                        <div className="text-xs font-bold text-[var(--color-text)] mt-0.5">
                          {activeTrip.source} &rarr; {activeTrip.destination}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[var(--color-panel-2)] text-orange-500 border border-[var(--color-border)]">
                        <Truck size={15} />
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase">Assigned Truck</div>
                        <div className="text-xs font-bold text-[var(--color-text)] mt-0.5">
                          {activeVehicle ? `${activeVehicle.name} (${activeVehicle.reg_no})` : '—'}
                        </div>
                        {activeVehicle && (
                          <div className="text-[9px] text-[var(--color-text-faint)] font-semibold mt-0.5 uppercase tracking-wide">
                            {activeVehicle.type} • {fmtNumber(activeVehicle.odometer_km)} km on odometer
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[var(--color-panel-2)] text-orange-500 border border-[var(--color-border)]">
                        <Clock size={15} />
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase">ETA (Estimated Time)</div>
                        <div className="text-xs font-bold text-[var(--color-text)] mt-0.5">
                          {getEtaString(activeTrip)}
                        </div>
                        <div className="text-[9px] text-[var(--color-text-faint)] font-semibold mt-0.5 uppercase">
                          Planned Distance: {activeTrip.planned_distance_km} km
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[var(--color-panel-2)] text-orange-500 border border-[var(--color-border)]">
                        <Package size={15} />
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase">Payload Carriage</div>
                        <div className="text-xs font-mono font-bold text-[var(--color-text)] mt-0.5">
                          {fmtNumber(activeTrip.cargo_weight_kg)} kg
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--color-border-soft)] flex items-center justify-between bg-[var(--color-panel-2)]/30 -mx-6 -mb-6 p-4 px-6">
                  <div className="flex items-center gap-2">
                    <CreditCard className="text-[var(--color-text-muted)]" size={16} />
                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">Order Valuation Billing:</span>
                  </div>
                  <span className="text-sm font-mono font-extrabold text-emerald-500">
                    {fmtCurrency(activeTrip.revenue)}
                  </span>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center border-dashed border-2 border-[var(--color-border)] bg-[var(--color-panel)]/40">
                <Bell className="mx-auto text-[var(--color-text-faint)] mb-3 animate-bounce" size={32} />
                <h3 className="font-display text-sm font-bold text-[var(--color-text)]">No Active Assignments</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xs mx-auto">
                  You are currently listed as <strong>Available</strong>. Once the Dispatcher assigns a route, details will push here and alert your phone automatically.
                </p>
              </Card>
            )}

            {/* Audit Logs / Past history */}
            <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-orange-500" />
                <h2 className="font-display text-sm font-bold text-[var(--color-text)]">
                  Completed Work Logs & Transparency Audit
                </h2>
              </div>

              {driverTripsHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-bold uppercase tracking-wider text-[9px] bg-[var(--color-panel-2)]/40">
                        <th className="px-4 py-3">Trip Code</th>
                        <th className="px-4 py-3">Route Path</th>
                        <th className="px-4 py-3">Distance & Payload</th>
                        <th className="px-4 py-3">Revenue Billing</th>
                        <th className="px-4 py-3">Audit Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-soft)]">
                      {driverTripsHistory.map(trip => (
                        <tr key={trip.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                          <td className="px-4 py-3 font-mono font-bold">{trip.trip_code}</td>
                          <td className="px-4 py-3 font-medium">
                            {trip.source} &rarr; {trip.destination}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {trip.planned_distance_km} km • {fmtNumber(trip.cargo_weight_kg)} kg
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-emerald-500">
                            {fmtCurrency(trip.revenue)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                              trip.status === 'Completed'
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            }`}>
                              {trip.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[var(--color-text-faint)]">
                  No completed operations recorded in the log repository.
                </div>
              )}
            </Card>
          </div>

          {/* Column 3: Smartphone mockup showing notification */}
          <div className="flex flex-col items-center justify-start">
            <div className="font-display text-xs font-bold text-[var(--color-text-muted)] uppercase mb-3 flex items-center gap-1.5">
              <Smartphone size={13} />
              <span>Driver Smartphone Mockup</span>
            </div>

            {/* Smart Phone Device Wrapper */}
            <div className="relative w-[280px] h-[540px] rounded-[36px] border-8 border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col justify-between p-3.5 select-none ring-4 ring-slate-800/10">
              
              {/* Notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-4.5 bg-slate-850 rounded-b-xl z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-black rounded-full mb-0.5"></div>
              </div>

              {/* Locked Screen / Notification Overlay */}
              <div className="flex-1 w-full h-full flex flex-col justify-between pt-8 pb-3 relative z-10 font-sans text-white">
                
                {/* Clock */}
                <div className="text-center mt-3">
                  <div className="text-4xl font-extralight tracking-tight text-slate-100">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                    {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Notification Area */}
                <div className="flex-1 flex flex-col justify-start pt-6 space-y-2 overflow-y-auto px-1">
                  {activeTrip ? (
                    <div className="bg-slate-800/90 border border-slate-700/50 backdrop-blur-md rounded-2xl p-3 shadow-md border-l-4 border-l-orange-500 animate-slide-in">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1">
                          <div className="h-4.5 w-4.5 rounded-md bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-[9px] font-extrabold text-white">T</div>
                          <span className="text-[9px] font-bold text-slate-300">TransitOps Drive</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold">Just Now</span>
                      </div>
                      
                      <div className="text-xs font-bold text-slate-100 mb-0.5">🔔 New Dispatch Assigned!</div>
                      <p className="text-[9.5px] leading-relaxed text-slate-300">
                        Truck: <strong className="text-orange-400 font-mono">{activeVehicle?.reg_no || '—'}</strong><br />
                        To: <strong>{activeTrip.destination}</strong><br />
                        ETA: <strong>{getEtaString(activeTrip)}</strong><br />
                        Payload: <strong>{fmtNumber(activeTrip.cargo_weight_kg)} kg</strong><br />
                        Valuation: <strong>{fmtCurrency(activeTrip.revenue)}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 space-y-1.5">
                      <Bell size={20} className="text-slate-600 opacity-60" />
                      <div className="text-[10px] font-semibold">No New Alerts</div>
                    </div>
                  )}
                </div>

                {/* Lockscreen Swipe hint */}
                <div className="text-center text-[9px] text-slate-400 font-bold tracking-wide animate-pulse mt-auto pt-2">
                  🔒 Swipe up to unlock
                </div>
              </div>

              {/* Home Indicator Line */}
              <div className="w-24 h-1 bg-slate-600 rounded-full mx-auto mt-1 relative z-20"></div>
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-12 text-xs text-[var(--color-text-faint)]">
          No available drivers to view in database logs.
        </div>
      )}
    </div>
  );
}
