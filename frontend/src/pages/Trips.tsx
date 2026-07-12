import { useState } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canEdit } from '../lib/permissions';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, Input, Select, Field, Modal, Banner } from '../components/primitives';
import { RuleViolation } from '../lib/db';
import { fmtCurrency, fmtNumber } from '../lib/format';
import { Navigation, Plus, Send, CheckSquare, XCircle, ArrowRight } from 'lucide-react';


export default function Trips() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();

  const isEditable = user ? canEdit(user.role, 'trips') : false;

  // Active select state for inspector
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Create Trip States
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

    if (!source || !destination) {
      setFormErrorMsg('Source and Destination are required.');
      return;
    }

    try {
      const trip = db.createTripDraft(user, {
        source,
        destination,
        cargo_weight_kg: cargoWeight,
        planned_distance_km: plannedDistance,
        revenue,
      });
      toast.push('success', `Trip ${trip.trip_code} created as Draft.`);
      setSelectedTripId(trip.id);
      // Reset form
      setSource('');
      setDestination('');
      setCargoWeight(100);
      setPlannedDistance(10);
      setRevenue(5000);
    } catch (err) {
      setFormErrorMsg(err instanceof Error ? err.message : 'Failed to create trip.');
    }
  };

  // Dispatch Form Setup
  const openDispatch = () => {
    setDispatchVehicleId('');
    setDispatchDriverId('');
    setDispatchErrorMsg(null);
    setDispatchModalOpen(true);
  };

  // Dispatch Assist: Compute Eligible Assets
  // Rule: Vehicles/Drivers status must be Available, driver license not expired, capacity >= cargo
  const eligibleVehicles = vehicles.filter((v) => {
    // Show only Available vehicles. 
    // Wait, for smart assist, we also filter by max capacity >= cargo weight!
    if (v.status !== 'Available') return false;
    if (selectedTrip && v.max_capacity_kg < selectedTrip.cargo_weight_kg) return false;
    return true;
  });

  const eligibleDrivers = drivers.filter((d) => {
    if (d.status !== 'Available') return false;
    // Expiry check
    if (new Date(d.license_expiry) <= new Date()) return false;
    return true;
  });

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTripId) return;
    setDispatchErrorMsg(null);

    if (!dispatchVehicleId || !dispatchDriverId) {
      setDispatchErrorMsg('Please select a vehicle and a driver.');
      return;
    }

    try {
      db.dispatchTrip(user, selectedTripId, dispatchVehicleId, dispatchDriverId);
      toast.push('success', `Trip dispatched successfully.`);
      setDispatchModalOpen(false);
    } catch (err) {
      if (err instanceof RuleViolation) {
        setDispatchErrorMsg(err.message);
      } else {
        setDispatchErrorMsg('An unexpected error occurred.');
      }
    }
  };

  // Complete Form Setup
  const openComplete = () => {
    if (!selectedTrip) return;
    const vehicle = vehicles.find((v) => v.id === selectedTrip.vehicle_id);
    setFinalOdometer(vehicle ? vehicle.odometer_km + selectedTrip.planned_distance_km : 0);
    setFuelConsumed(Math.round(selectedTrip.planned_distance_km * 0.15)); // rough guess
    setCompleteErrorMsg(null);
    setCompleteModalOpen(true);
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTripId) return;
    setCompleteErrorMsg(null);

    const vehicle = vehicles.find((v) => v.id === selectedTrip?.vehicle_id);
    if (vehicle && finalOdometer < vehicle.odometer_km) {
      setCompleteErrorMsg(`Final odometer cannot be less than vehicle's current odometer (${fmtNumber(vehicle.odometer_km)} km).`);
      return;
    }

    try {
      db.completeTrip(user, selectedTripId, finalOdometer, fuelConsumed);
      toast.push('success', `Trip marked as Completed.`);
      setCompleteModalOpen(false);
    } catch (err) {
      setCompleteErrorMsg(err instanceof Error ? err.message : 'Failed to complete trip.');
    }
  };

  // Cancel Handler
  const handleCancel = () => {
    if (!user || !selectedTripId) return;
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
    try {
      db.cancelTrip(user, selectedTripId);
      toast.push('success', `Trip cancelled.`);
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'Failed to cancel trip.');
    }
  };

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
          Trip Management
        </h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          Draft new trips, assign eligible vehicles & drivers with smart capacity checking, and complete dispatch routes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: Creation Form / Inspector */}
        <div className="lg:col-span-5 space-y-6">
          {/* Create Trip Card */}
          {isEditable && (
            <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)]">
              <h2 className="font-display text-sm font-bold tracking-tight text-[var(--color-text)]">
                Create Trip Route
              </h2>
              <form onSubmit={handleCreateTrip} className="space-y-4">
                {formErrorMsg && <Banner tone="error">{formErrorMsg}</Banner>}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Source Depot">
                    <Input
                      required
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="e.g. Gandhinagar Depot"
                    />
                  </Field>

                  <Field label="Destination Hub">
                    <Input
                      required
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. Ahmedabad Hub"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Cargo Weight (kg)">
                    <Input
                      required
                      type="number"
                      min={1}
                      value={cargoWeight}
                      onChange={(e) => setCargoWeight(Number(e.target.value))}
                    />
                  </Field>

                  <Field label="Planned Distance (km)">
                    <Input
                      required
                      type="number"
                      min={1}
                      value={plannedDistance}
                      onChange={(e) => setPlannedDistance(Number(e.target.value))}
                    />
                  </Field>

                  <Field label="Revenue (₹)">
                    <Input
                      required
                      type="number"
                      min={0}
                      value={revenue}
                      onChange={(e) => setRevenue(Number(e.target.value))}
                    />
                  </Field>
                </div>

                <Button type="submit" className="w-full font-display">
                  <Plus size={16} />
                  Draft Route
                </Button>
              </form>
            </Card>
          )}

          {/* Trip Inspector / State Controller */}
          {selectedTrip ? (
            <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)]" accent={selectedTrip.status === 'Draft' ? 'var(--color-status-draft)' : selectedTrip.status === 'Dispatched' ? 'var(--color-status-ontrip)' : 'var(--color-status-available)'}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--color-text-faint)] tracking-tight">Selected Dispatch</span>
                  <h3 className="font-mono text-base font-bold text-[var(--color-text)]">
                    {selectedTrip.trip_code}
                  </h3>
                </div>
                <StatusBadge status={selectedTrip.status} />
              </div>

              {/* Transition Status Flow Chart */}
              <div className="mb-6 flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3 text-[10px]">
                <div className="flex flex-col items-center">
                  <span className={`h-2 w-2 rounded-full ${selectedTrip.status === 'Draft' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="mt-1 font-semibold text-[var(--color-text)]">Draft</span>
                </div>
                <ArrowRight size={12} className="text-[var(--color-text-faint)]" />
                <div className="flex flex-col items-center">
                  <span className={`h-2 w-2 rounded-full ${selectedTrip.status === 'Dispatched' ? 'bg-blue-500 animate-pulse' : selectedTrip.status === 'Completed' || selectedTrip.status === 'Cancelled' ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                  <span className="mt-1 text-[var(--color-text-muted)]">Dispatched</span>
                </div>
                <ArrowRight size={12} className="text-[var(--color-text-faint)]" />
                <div className="flex flex-col items-center">
                  <span className={`h-2 w-2 rounded-full ${selectedTrip.status === 'Completed' ? 'bg-emerald-500' : selectedTrip.status === 'Cancelled' ? 'bg-red-500' : 'bg-gray-700'}`} />
                  <span className="mt-1 text-[var(--color-text-muted)]">
                    {selectedTrip.status === 'Cancelled' ? 'Cancelled' : 'Completed'}
                  </span>
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-2.5 text-xs text-[var(--color-text-muted)]">
                <div className="flex justify-between border-b border-[var(--color-border-soft)] pb-2">
                  <span>Route</span>
                  <span className="font-medium text-[var(--color-text)]">
                    {selectedTrip.source} → {selectedTrip.destination}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--color-border-soft)] pb-2">
                  <span>Cargo Weight</span>
                  <span className="font-mono font-medium text-[var(--color-text)]">
                    {fmtNumber(selectedTrip.cargo_weight_kg)} kg
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--color-border-soft)] pb-2">
                  <span>Revenue</span>
                  <span className="font-mono font-medium text-[var(--color-text)]">
                    {fmtCurrency(selectedTrip.revenue)}
                  </span>
                </div>

                {selectedTrip.vehicle_id && (
                  <div className="flex justify-between border-b border-[var(--color-border-soft)] pb-2">
                    <span>Vehicle</span>
                    <span className="font-medium text-[var(--color-text)]">
                      {vehicles.find((v) => v.id === selectedTrip.vehicle_id)?.name} (
                      {vehicles.find((v) => v.id === selectedTrip.vehicle_id)?.reg_no})
                    </span>
                  </div>
                )}

                {selectedTrip.driver_id && (
                  <div className="flex justify-between border-b border-[var(--color-border-soft)] pb-2">
                    <span>Driver Assigned</span>
                    <span className="font-medium text-[var(--color-text)]">
                      {drivers.find((d) => d.id === selectedTrip.driver_id)?.name}
                    </span>
                  </div>
                )}
              </div>

              {/* State Machine Transition Actions */}
              {isEditable && (
                <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-[var(--color-border)]">
                  {selectedTrip.status === 'Draft' && (
                    <Button onClick={openDispatch} className="flex-1">
                      <Send size={14} />
                      Dispatch Asset
                    </Button>
                  )}

                  {selectedTrip.status === 'Dispatched' && (
                    <Button onClick={openComplete} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white">
                      <CheckSquare size={14} />
                      Complete Trip
                    </Button>
                  )}

                  {(selectedTrip.status === 'Draft' || selectedTrip.status === 'Dispatched') && (
                    <Button variant="danger" onClick={handleCancel}>
                      <XCircle size={14} />
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-8 text-center border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-text-faint)] text-xs">
              <Navigation className="mx-auto mb-2 opacity-30" size={24} />
              <span>Select an operation from the Live Board to review details and trigger transitions.</span>
            </Card>
          )}
        </div>

        {/* Right Side: Live Board */}
        <div className="lg:col-span-7">
          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)] h-full flex flex-col">
            <h2 className="font-display mb-4 text-sm font-bold tracking-tight text-[var(--color-text)]">
              Operations Board
            </h2>

            <div className="flex-1 space-y-3">
              {trips.map((trip) => {
                const assignedVehicle = vehicles.find((v) => v.id === trip.vehicle_id);
                const assignedDriver = drivers.find((d) => d.id === trip.driver_id);
                const isSelected = trip.id === selectedTripId;

                return (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`relative flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/5 shadow-xs'
                        : 'border-[var(--color-border)] hover:border-[var(--color-text-faint)] bg-[var(--color-panel-2)]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--color-text)]">
                          {trip.trip_code}
                        </span>
                        <StatusBadge status={trip.status} />
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {trip.source} <span className="text-[var(--color-text-faint)]">→</span> {trip.destination}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5 text-[10px] text-[var(--color-text-faint)] font-mono">
                        <span>Cargo: {fmtNumber(trip.cargo_weight_kg)} kg</span>
                        <span>Dist: {trip.planned_distance_km} km</span>
                        {assignedVehicle && <span className="font-sans">Veh: {assignedVehicle.name}</span>}
                        {assignedDriver && <span className="font-sans">Drv: {assignedDriver.name}</span>}
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs font-semibold text-[var(--color-text)]">
                      {fmtCurrency(trip.revenue)}
                    </div>
                  </div>
                );
              })}

              {trips.length === 0 && (
                <div className="py-8 text-center text-xs text-[var(--color-text-faint)]">
                  No trips registered in database.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Dispatch Asset Modal */}
      <Modal
        open={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        title={`Smart Dispatch Asset: ${selectedTrip?.trip_code}`}
      >
        <form onSubmit={handleDispatch} className="space-y-4">
          {dispatchErrorMsg && <Banner tone="error">{dispatchErrorMsg}</Banner>}

          <Banner tone="info">
            <strong>Smart Dispatch Assist:</strong> Dropdowns are auto-filtered to show only eligible vehicles (available, capacity &gt;= {selectedTrip?.cargo_weight_kg}kg) and drivers (available, license active).
          </Banner>

          <Field label="Assign Eligible Vehicle" hint="Showing Available vehicles with sufficient weight capacity">
            <Select
              required
              value={dispatchVehicleId}
              onChange={(e) => setDispatchVehicleId(e.target.value)}
            >
              <option value="">Select a Vehicle...</option>
              {eligibleVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.reg_no}) — Type: {v.type}, Max Load: {v.max_capacity_kg} kg
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Assign Eligible Driver" hint="Showing Available drivers with valid licenses">
            <Select
              required
              value={dispatchDriverId}
              onChange={(e) => setDispatchDriverId(e.target.value)}
            >
              <option value="">Select a Driver...</option>
              {eligibleDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — Category: {d.license_category}, Safety Score: {d.safety_score}
                </option>
              ))}
            </Select>
          </Field>

          {/* Manual / Over-ride Validation preview (Matches wireframe capacity error box instinct) */}
          {selectedTrip && dispatchVehicleId && (
            (() => {
              const selectedV = vehicles.find((v) => v.id === dispatchVehicleId);
              if (selectedV && selectedTrip.cargo_weight_kg > selectedV.max_capacity_kg) {
                return (
                  <Banner tone="error">
                    <div className="font-semibold text-red-200">Capacity Violation:</div>
                    Vehicle Capacity: {selectedV.max_capacity_kg} kg <br />
                    Cargo Weight: {selectedTrip.cargo_weight_kg} kg <br />
                    Capacity exceeded by {selectedTrip.cargo_weight_kg - selectedV.max_capacity_kg} kg — dispatch blocked.
                  </Banner>
                );
              }
              return null;
            })()
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setDispatchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                (() => {
                  if (!dispatchVehicleId) return true;
                  const v = vehicles.find((x) => x.id === dispatchVehicleId);
                  return v ? (selectedTrip ? selectedTrip.cargo_weight_kg > v.max_capacity_kg : true) : true;
                })()
              }
            >
              Dispatch Trip
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Trip Modal */}
      <Modal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title={`Complete Dispatched Route: ${selectedTrip?.trip_code}`}
      >
        <form onSubmit={handleComplete} className="space-y-4">
          {completeErrorMsg && <Banner tone="error">{completeErrorMsg}</Banner>}

          <Banner tone="info">
            Complete route logging: entering final odometer will update the vehicle's mileage registry. Entering fuel consumed will write an auto-calculated fuel expense.
          </Banner>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Final Odometer Reading (km)" hint={`Must be >= ${vehicles.find((v) => v.id === selectedTrip?.vehicle_id)?.odometer_km} km`}>
              <Input
                required
                type="number"
                value={finalOdometer}
                onChange={(e) => setFinalOdometer(Number(e.target.value))}
              />
            </Field>

            <Field label="Fuel Consumed (Liters)" hint="Saves fuel expense at ₹75/L">
              <Input
                required
                type="number"
                value={fuelConsumed}
                onChange={(e) => setFuelConsumed(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setCompleteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Complete Route
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
