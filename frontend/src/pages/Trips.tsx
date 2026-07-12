import { useState } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canEdit } from '../lib/permissions';
import { Button, Card, Input, Select, Field, Modal, Banner } from '../components/primitives';
import { RuleViolation } from '../lib/db';
import { fmtCurrency, fmtNumber } from '../lib/format';
import {
  Navigation, Plus, Send, CheckSquare, XCircle,
  MapPin, Package, Truck, User, Clock, CheckCircle2, Circle, Ban, Sparkles
} from 'lucide-react';
import { getDispatchRecommendations } from '../lib/dispatchLogic';

/** Trip Lifecycle Timeline — visual inspired by the reference design */
function TripLifecycle({ status }: { status: string }) {
  const steps = [
    { key: 'Draft',      label: 'Draft',      icon: Circle },
    { key: 'Dispatched', label: 'Dispatched',  icon: Truck },
    { key: 'Completed',  label: 'Completed',   icon: CheckCircle2 },
  ];

  // Cancelled is a terminal branch state
  const isCancelled = status === 'Cancelled';
  
  const getStepState = (stepKey: string): 'completed' | 'active' | 'upcoming' => {
    if (isCancelled) {
      if (stepKey === 'Draft') return 'completed';
      return 'upcoming';
    }
    const order = ['Draft', 'Dispatched', 'Completed'];
    const currentIdx = order.indexOf(status);
    const stepIdx = order.indexOf(stepKey);
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'upcoming';
  };

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const state = getStepState(step.key);
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`
                flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500
                ${state === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                ${state === 'active' && !isCancelled ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/40' : ''}
                ${state === 'upcoming' && !isCancelled ? 'bg-[var(--color-panel-2)] border-[var(--color-border)] text-[var(--color-text-faint)]' : ''}
                ${state === 'upcoming' && isCancelled ? 'bg-[var(--color-panel-2)] border-[var(--color-border)] text-[var(--color-text-faint)] opacity-40' : ''}
              `}>
                {state === 'completed' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Icon size={14} className={state === 'active' ? 'animate-pulse' : ''} />
                )}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-300 ${
                state === 'active' ? 'text-orange-500' :
                state === 'completed' ? 'text-emerald-500' :
                'text-[var(--color-text-faint)]'
              }`}>
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-14px] rounded-full transition-all duration-700 ${
                getStepState(steps[i + 1].key) !== 'upcoming' || (isCancelled && step.key === 'Draft') 
                  ? 'bg-emerald-500' 
                  : 'bg-[var(--color-border)]'
              }`} />
            )}
          </div>
        );
      })}
      {/* Cancelled indicator */}
      {isCancelled && (
        <div className="flex flex-col items-center gap-1.5 shrink-0 ml-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-red-500/15 border-red-500/40 text-red-500">
            <Ban size={13} />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-red-500">Cancelled</span>
        </div>
      )}
    </div>
  );
}

export default function Trips() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();

  const isEditable = user ? canEdit(user.role, 'trips') : false;

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Create Trip States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoWeight, setCargoWeight] = useState(100);
  const [plannedDistance, setPlannedDistance] = useState(10);
  const [revenue, setRevenue] = useState(5000);
  const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);

  // Dispatch States
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchVehicleId, setDispatchVehicleId] = useState('');
  const [dispatchDriverId, setDispatchDriverId] = useState('');
  const [dispatchErrorMsg, setDispatchErrorMsg] = useState<string | null>(null);

  // Complete States
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [finalOdometer, setFinalOdometer] = useState(0);
  const [fuelConsumed, setFuelConsumed] = useState(0);
  const [completeErrorMsg, setCompleteErrorMsg] = useState<string | null>(null);

  const trips = db.trips;
  const vehicles = db.vehicles;
  const drivers = db.drivers;

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  // Create Trip Handler
  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormErrorMsg(null);
    if (!source || !destination) { setFormErrorMsg('Source and Destination are required.'); return; }
    try {
      const trip = db.createTripDraft(user, { source, destination, cargo_weight_kg: cargoWeight, planned_distance_km: plannedDistance, revenue });
      toast.push('success', `Trip ${trip.trip_code} created as Draft.`);
      setSelectedTripId(trip.id);
      setCreateModalOpen(false);
      setSource(''); setDestination(''); setCargoWeight(100); setPlannedDistance(10); setRevenue(5000);
    } catch (err) {
      setFormErrorMsg(err instanceof Error ? err.message : 'Failed to create trip.');
    }
  };

  const eligibleVehicles = vehicles.filter((v) => {
    if (v.status !== 'Available') return false;
    if (selectedTrip && v.max_capacity_kg < selectedTrip.cargo_weight_kg) return false;
    return true;
  });

  const eligibleDrivers = drivers.filter((d) => {
    if (d.status !== 'Available') return false;
    if (new Date(d.license_expiry) <= new Date()) return false;
    return true;
  });

  const recommendations = selectedTrip ? getDispatchRecommendations(
    {
      cargoWeightKg: selectedTrip.cargo_weight_kg,
      source: selectedTrip.source,
      destination: selectedTrip.destination,
      estimatedDurationHours: Math.max(1, Math.ceil(selectedTrip.planned_distance_km / 50)),
      plannedDistanceKm: selectedTrip.planned_distance_km
    },
    vehicles,
    drivers
  ) : [];

  const openDispatch = () => {
    setDispatchErrorMsg(null);
    setDispatchModalOpen(true);

    if (selectedTrip) {
      const recs = getDispatchRecommendations(
        {
          cargoWeightKg: selectedTrip.cargo_weight_kg,
          source: selectedTrip.source,
          destination: selectedTrip.destination,
          estimatedDurationHours: Math.max(1, Math.ceil(selectedTrip.planned_distance_km / 50)),
          plannedDistanceKm: selectedTrip.planned_distance_km
        },
        vehicles,
        drivers
      );
      if (recs.length > 0) {
        setDispatchVehicleId(recs[0].vehicle.id);
        setDispatchDriverId(recs[0].driver.id);
      } else {
        setDispatchVehicleId('');
        setDispatchDriverId('');
      }
    } else {
      setDispatchVehicleId('');
      setDispatchDriverId('');
    }
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTripId) return;
    setDispatchErrorMsg(null);
    if (!dispatchVehicleId || !dispatchDriverId) { setDispatchErrorMsg('Please select a vehicle and a driver.'); return; }
    try {
      db.dispatchTrip(user, selectedTripId, dispatchVehicleId, dispatchDriverId);
      toast.push('success', 'Trip dispatched successfully.');
      setDispatchModalOpen(false);
    } catch (err) {
      if (err instanceof RuleViolation) setDispatchErrorMsg(err.message);
      else setDispatchErrorMsg('An unexpected error occurred.');
    }
  };

  const openComplete = () => {
    if (!selectedTrip) return;
    const vehicle = vehicles.find((v) => v.id === selectedTrip.vehicle_id);
    setFinalOdometer(vehicle ? vehicle.odometer_km + selectedTrip.planned_distance_km : 0);
    setFuelConsumed(Math.round(selectedTrip.planned_distance_km * 0.15));
    setCompleteErrorMsg(null);
    setCompleteModalOpen(true);
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTripId) return;
    setCompleteErrorMsg(null);
    const vehicle = vehicles.find((v) => v.id === selectedTrip?.vehicle_id);
    if (vehicle && finalOdometer < vehicle.odometer_km) {
      setCompleteErrorMsg(`Final odometer must be ≥ ${fmtNumber(vehicle.odometer_km)} km.`);
      return;
    }
    try {
      db.completeTrip(user, selectedTripId, finalOdometer, fuelConsumed);
      toast.push('success', 'Trip marked as Completed.');
      setCompleteModalOpen(false);
    } catch (err) {
      setCompleteErrorMsg(err instanceof Error ? err.message : 'Failed to complete trip.');
    }
  };

  const handleCancel = () => {
    if (!user || !selectedTripId) return;
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
    try {
      db.cancelTrip(user, selectedTripId);
      toast.push('success', 'Trip cancelled.');
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'Failed to cancel trip.');
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Draft':      return 'border-[var(--color-border)] bg-[var(--color-panel-2)]';
      case 'Dispatched': return 'border-blue-500/30 bg-blue-500/5';
      case 'Completed':  return 'border-emerald-500/30 bg-emerald-500/5';
      case 'Cancelled':  return 'border-red-500/20 bg-red-500/5';
      default:           return 'border-[var(--color-border)] bg-[var(--color-panel-2)]';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'Draft':      return 'bg-amber-400';
      case 'Dispatched': return 'bg-blue-500 animate-pulse';
      case 'Completed':  return 'bg-emerald-500';
      case 'Cancelled':  return 'bg-red-500';
      default:           return 'bg-slate-400';
    }
  };

  return (
    <div className="flex flex-col gap-5 h-full animate-rise-in">
      {/* Page Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">
            Trip Management
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Draft routes, dispatch assets with smart capacity checking, and complete operations.
          </p>
        </div>
        {isEditable && (
          <Button onClick={() => setCreateModalOpen(true)} className="shrink-0">
            <Plus size={15} />
            New Trip
          </Button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-12 flex-1 min-h-0">

        {/* Left: Operations Live Board */}
        <div className="lg:col-span-7 min-h-0 flex flex-col">
          <Card className="flex flex-col border-[var(--color-border)] bg-[var(--color-panel)] min-h-0 h-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-panel-2)] shrink-0">
              <h2 className="font-display text-xs font-bold uppercase tracking-widest text-[var(--color-text)]">
                Operations Live Board
              </h2>
              <span className="text-[10px] font-mono text-[var(--color-text-faint)]">{trips.length} routes</span>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {trips.map((trip) => {
                const assignedVehicle = vehicles.find((v) => v.id === trip.vehicle_id);
                const assignedDriver  = drivers.find((d) => d.id === trip.driver_id);
                const isSelected = trip.id === selectedTripId;

                return (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTripId(isSelected ? null : trip.id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected
                        ? 'border-orange-500/50 bg-orange-500/5 shadow-sm ring-1 ring-orange-500/20'
                        : `${getStatusBg(trip.status)} hover:border-[var(--color-text-faint)]`
                    }`}
                  >
                    {/* Trip header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${getStatusDot(trip.status)}`} />
                        <div>
                          <span className="font-mono text-xs font-bold text-[var(--color-text)]">{trip.trip_code}</span>
                          <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] mt-0.5">
                            <MapPin size={9} />
                            <span className="font-medium">{trip.source}</span>
                            <span className="text-[var(--color-text-faint)]">→</span>
                            <span className="font-medium">{trip.destination}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold text-[var(--color-text)]">{fmtCurrency(trip.revenue)}</div>
                        <div className="text-[10px] text-[var(--color-text-faint)] mt-0.5">{trip.planned_distance_km} km</div>
                      </div>
                    </div>

                    {/* Lifecycle Timeline */}
                    <div className="mb-3">
                      <TripLifecycle status={trip.status} />
                    </div>

                    {/* Footer meta */}
                    <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-faint)]">
                      <span className="flex items-center gap-1">
                        <Package size={9} />
                        {fmtNumber(trip.cargo_weight_kg)} kg
                      </span>
                      {assignedVehicle && (
                        <span className="flex items-center gap-1">
                          <Truck size={9} />
                          {assignedVehicle.name}
                        </span>
                      )}
                      {assignedDriver && (
                        <span className="flex items-center gap-1">
                          <User size={9} />
                          {assignedDriver.name}
                        </span>
                      )}
                      {!assignedVehicle && !assignedDriver && (
                        <span className="flex items-center gap-1">
                          <Clock size={9} />
                          Awaiting assignment
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {trips.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Navigation className="mb-3 text-[var(--color-text-faint)] opacity-30" size={32} />
                  <p className="text-sm font-semibold text-[var(--color-text-muted)]">No trips yet</p>
                  <p className="text-xs text-[var(--color-text-faint)] mt-1">Create your first trip route to get started.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Trip Inspector / State Controller */}
        <div className="lg:col-span-5 min-h-0 flex flex-col">
          {selectedTrip ? (
            <Card className="flex flex-col border-[var(--color-border)] bg-[var(--color-panel)] h-full overflow-hidden" accent={
              selectedTrip.status === 'Dispatched' ? '#3b82f6' :
              selectedTrip.status === 'Completed' ? '#10b981' :
              selectedTrip.status === 'Cancelled' ? '#ef4444' : '#f59e0b'
            }>
              {/* Inspector Header */}
              <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-panel-2)] shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Selected Route</span>
                    <h3 className="font-mono text-lg font-bold text-[var(--color-text)] leading-tight mt-0.5">
                      {selectedTrip.trip_code}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    selectedTrip.status === 'Dispatched' ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30' :
                    selectedTrip.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' :
                    selectedTrip.status === 'Cancelled' ? 'bg-red-500/15 text-red-500 border border-red-500/30' :
                    'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(selectedTrip.status)}`} />
                    {selectedTrip.status}
                  </span>
                </div>

                {/* Lifecycle Timeline in Inspector */}
                <div className="mt-4">
                  <TripLifecycle status={selectedTrip.status} />
                </div>
              </div>

              {/* Trip Details */}
              <div className="flex-1 overflow-y-auto p-5 space-y-1">
                {[
                  { label: 'Route', value: `${selectedTrip.source} → ${selectedTrip.destination}` },
                  { label: 'Cargo Weight', value: `${fmtNumber(selectedTrip.cargo_weight_kg)} kg`, mono: true },
                  { label: 'Planned Distance', value: `${selectedTrip.planned_distance_km} km`, mono: true },
                  { label: 'Revenue', value: fmtCurrency(selectedTrip.revenue), mono: true },
                  ...(selectedTrip.vehicle_id ? [{
                    label: 'Vehicle',
                    value: (() => {
                      const v = vehicles.find(v => v.id === selectedTrip.vehicle_id);
                      return v ? `${v.name} (${v.reg_no})` : '—';
                    })()
                  }] : []),
                  ...(selectedTrip.driver_id ? [{
                    label: 'Driver',
                    value: drivers.find(d => d.id === selectedTrip.driver_id)?.name || '—'
                  }] : []),
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-[var(--color-border-soft)] last:border-0">
                    <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
                    <span className={`text-xs font-semibold text-[var(--color-text)] ${mono ? 'font-mono' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              {isEditable && (
                <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-panel-2)] shrink-0">
                  <div className="flex gap-2">
                    {selectedTrip.status === 'Draft' && (
                      <Button onClick={openDispatch} className="flex-1">
                        <Send size={13} />
                        Dispatch
                      </Button>
                    )}
                    {selectedTrip.status === 'Dispatched' && (
                      <Button onClick={openComplete} className="flex-1 !bg-emerald-600 hover:!bg-emerald-500 !from-emerald-600 !to-emerald-600">
                        <CheckSquare size={13} />
                        Complete Route
                      </Button>
                    )}
                    {(selectedTrip.status === 'Draft' || selectedTrip.status === 'Dispatched') && (
                      <Button variant="danger" onClick={handleCancel}>
                        <XCircle size={13} />
                        Cancel
                      </Button>
                    )}
                    {(selectedTrip.status === 'Completed' || selectedTrip.status === 'Cancelled') && (
                      <p className="text-xs text-[var(--color-text-faint)] text-center w-full py-1">
                        This trip is in a terminal state.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center h-full min-h-[280px] border-[var(--color-border)] bg-[var(--color-panel)] p-8 text-center">
              <div className="rounded-full bg-[var(--color-panel-2)] border border-[var(--color-border)] p-4 mb-4">
                <Navigation className="text-[var(--color-text-faint)] opacity-40" size={28} />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-muted)]">Select a Route</p>
              <p className="text-xs text-[var(--color-text-faint)] mt-1.5 max-w-[200px] leading-relaxed">
                Click any trip from the Live Board to inspect and manage it.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ── Create Trip Modal ── */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Trip Route"
        width="max-w-md"
      >
        <form onSubmit={handleCreateTrip} className="space-y-4">
          {formErrorMsg && <Banner tone="error">{formErrorMsg}</Banner>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Source Depot">
              <Input required value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Gandhinagar Depot" />
            </Field>
            <Field label="Destination Hub">
              <Input required value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Ahmedabad Hub" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Cargo (kg)">
              <Input required type="number" min={1} value={cargoWeight} onChange={(e) => setCargoWeight(Number(e.target.value))} />
            </Field>
            <Field label="Distance (km)">
              <Input required type="number" min={1} value={plannedDistance} onChange={(e) => setPlannedDistance(Number(e.target.value))} />
            </Field>
            <Field label="Revenue (₹)">
              <Input required type="number" min={0} value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit">
              <Plus size={14} />
              Draft Route
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Dispatch Asset Modal ── */}
      <Modal
        open={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        title={`Dispatch Asset — ${selectedTrip?.trip_code}`}
        width="max-w-md"
      >
        <form onSubmit={handleDispatch} className="space-y-4">
          {dispatchErrorMsg && <Banner tone="error">{dispatchErrorMsg}</Banner>}

          <Banner tone="info">
            <strong>Smart Dispatch Assist:</strong> Only eligible vehicles (capacity &ge; {selectedTrip?.cargo_weight_kg} kg, Available) and drivers (valid license, Available) are shown.
          </Banner>

          {recommendations.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 uppercase tracking-wider font-display">
                <Sparkles size={14} className="animate-pulse" />
                <span>AI Automated Recommendations</span>
              </div>
              <div className="grid gap-2">
                {recommendations.map((rec, index) => {
                  const isSelected = dispatchVehicleId === rec.vehicle.id && dispatchDriverId === rec.driver.id;
                  return (
                    <button
                      key={`${rec.vehicle.id}-${rec.driver.id}`}
                      type="button"
                      onClick={() => {
                        setDispatchVehicleId(rec.vehicle.id);
                        setDispatchDriverId(rec.driver.id);
                      }}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "border-orange-500 bg-orange-500/10 shadow-sm"
                          : "border-[var(--color-border)] bg-[var(--color-panel-2)]/60 hover:bg-[var(--color-panel-2)]"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                              index === 0 ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20" : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                            }`}>
                              {index === 0 ? "Best Match" : `Option ${index + 1}`}
                            </span>
                            <span>{rec.vehicle.name} + {rec.driver.name}</span>
                          </div>
                          <p className="text-[10px] text-[var(--color-text-faint)] mt-1 font-semibold">
                            {rec.reasons.filter(r => !r.includes("₹")).join(" • ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-[var(--color-text)]">
                            {fmtCurrency(rec.costEstimate)}
                          </span>
                          <div className="text-[9px] text-[var(--color-text-faint)] mt-0.5">Est. Cost</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Field label="Assign Vehicle" hint="Available vehicles with sufficient capacity">
            <Select required value={dispatchVehicleId} onChange={(e) => setDispatchVehicleId(e.target.value)}>
              <option value="">Select a vehicle...</option>
              {eligibleVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.reg_no}) — {v.type}, {v.max_capacity_kg} kg max
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Assign Driver" hint="Available drivers with active licenses">
            <Select required value={dispatchDriverId} onChange={(e) => setDispatchDriverId(e.target.value)}>
              <option value="">Select a driver...</option>
              {eligibleDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.license_category}, Score: {d.safety_score}
                </option>
              ))}
            </Select>
          </Field>

          {/* Capacity validation preview */}
          {selectedTrip && dispatchVehicleId && (() => {
            const v = vehicles.find(v => v.id === dispatchVehicleId);
            if (v && selectedTrip.cargo_weight_kg > v.max_capacity_kg) {
              return (
                <Banner tone="error">
                  <div className="font-bold mb-1">⚠ Capacity Violation</div>
                  Vehicle capacity: {v.max_capacity_kg} kg<br />
                  Cargo weight: {selectedTrip.cargo_weight_kg} kg<br />
                  Exceeded by <strong>{selectedTrip.cargo_weight_kg - v.max_capacity_kg} kg</strong> — dispatch blocked.
                </Banner>
              );
            }
            return null;
          })()}

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setDispatchModalOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={!dispatchVehicleId || (() => {
                const v = vehicles.find(x => x.id === dispatchVehicleId);
                return v ? (selectedTrip ? selectedTrip.cargo_weight_kg > v.max_capacity_kg : true) : true;
              })()}
            >
              <Send size={13} />
              Dispatch Trip
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Complete Trip Modal ── */}
      <Modal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title={`Complete Route — ${selectedTrip?.trip_code}`}
        width="max-w-sm"
      >
        <form onSubmit={handleComplete} className="space-y-4">
          {completeErrorMsg && <Banner tone="error">{completeErrorMsg}</Banner>}

          <Banner tone="info">
            Completing this route will update the vehicle's odometer and log a fuel expense automatically.
          </Banner>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Final Odometer (km)" hint={`Current: ${fmtNumber(vehicles.find(v => v.id === selectedTrip?.vehicle_id)?.odometer_km ?? 0)} km`}>
              <Input required type="number" value={finalOdometer} onChange={(e) => setFinalOdometer(Number(e.target.value))} />
            </Field>
            <Field label="Fuel Consumed (L)" hint="Auto-logged at ₹75/L">
              <Input required type="number" value={fuelConsumed} onChange={(e) => setFuelConsumed(Number(e.target.value))} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setCompleteModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="!bg-emerald-600 hover:!bg-emerald-500 !from-emerald-600 !to-emerald-600">
              <CheckSquare size={13} />
              Complete Route
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
