import { useState } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canEdit } from '../lib/permissions';
import { Button, Card, Input, Select, Field, Modal } from '../components/primitives';
import { fmtCurrency, fmtNumber, fmtDate } from '../lib/format';
import { Fuel, DollarSign } from 'lucide-react';

export default function FuelExpenses() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();

  const isEditable = user ? canEdit(user.role, 'fuel_exp') : false;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses' | 'vehicles'>('vehicles');

  // Fuel Modal States
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelTripId, setFuelTripId] = useState('');
  const [fuelLiters, setFuelLiters] = useState(50);
  const [fuelCost, setFuelCost] = useState(3750);
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().slice(0, 10));

  // Expense Modal States
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expTripId, setExpTripId] = useState('');
  const [expToll, setExpToll] = useState(250);
  const [expOther, setExpOther] = useState(150);
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));

  const vehicles = db.vehicles;
  const trips = db.trips;
  const fuelLogs = db.fuel;
  const expenses = db.expenses;
  const maintenance = db.maintenance;

  // Handle Fuel Submit
  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fuelVehicleId) return;

    db.logFuel(user, {
      vehicle_id: fuelVehicleId,
      trip_id: fuelTripId || null,
      date: fuelDate,
      liters: fuelLiters,
      cost: fuelCost,
    });

    const vName = vehicles.find((v) => v.id === fuelVehicleId)?.name ?? 'Vehicle';
    toast.push('success', `Logged ${fuelLiters}L fuel for ${vName} costing ${fmtCurrency(fuelCost)}.`);
    setFuelModalOpen(false);
  };

  // Handle Expense Submit
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !expTripId) return;

    const trip = trips.find((t) => t.id === expTripId);
    if (!trip) return;

    db.logExpense(user, {
      trip_id: expTripId,
      vehicle_id: trip.vehicle_id || '',
      toll: expToll,
      other: expOther,
      date: expDate,
    });

    toast.push('success', `Expenses logged for trip ${trip.trip_code}: Toll ${fmtCurrency(expToll)}, Other ${fmtCurrency(expOther)}.`);
    setExpModalOpen(false);
  };

  // Calculate Operational Cost details per vehicle
  const vehicleCostBreakdown = vehicles.map((v) => {
    const fuelCost = fuelLogs.filter((f) => f.vehicle_id === v.id).reduce((sum, f) => sum + f.cost, 0);
    const maintCost = maintenance.filter((m) => m.vehicle_id === v.id).reduce((sum, m) => sum + m.cost, 0);
    const total = fuelCost + maintCost;

    return {
      vehicle: v,
      fuelCost,
      maintCost,
      total,
    };
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
            Fuel & Expenses Ledger
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Log fuel usage and travel expenses. Track the auto-calculated operational costs of your fleet.
          </p>
        </div>

        {isEditable && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setFuelModalOpen(true)} className="font-display">
              <Fuel size={14} />
              Log Fuel
            </Button>
            <Button onClick={() => setExpModalOpen(true)} className="font-display">
              <DollarSign size={14} />
              Log Expense
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 font-display ${
            activeTab === 'vehicles'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Operational Costs Breakdown
        </button>
        <button
          onClick={() => setActiveTab('fuel')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 font-display ${
            activeTab === 'fuel'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Fuel Logs
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 font-display ${
            activeTab === 'expenses'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Trip Expenses
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'vehicles' && (
        <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-panel-2)]">
            <h3 className="font-display text-xs font-semibold text-[var(--color-text)]">
              Operational Cost Formula: Fuel + Maintenance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-semibold tracking-tight text-[11px] bg-[var(--color-panel-2)]">
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Reg No</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Fuel Cost</th>
                  <th className="px-4 py-3 font-semibold">Maintenance Cost</th>
                  <th className="px-4 py-3 font-semibold">Total Op. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {vehicleCostBreakdown.map(({ vehicle, fuelCost, maintCost, total }) => (
                  <tr key={vehicle.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">{vehicle.name}</td>
                    <td className="px-4 py-3.5 font-mono font-semibold">{vehicle.reg_no}</td>
                    <td className="px-4 py-3.5">{vehicle.type}</td>
                    <td className="px-4 py-3.5 font-mono">{fmtCurrency(fuelCost)}</td>
                    <td className="px-4 py-3.5 font-mono">{fmtCurrency(maintCost)}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-[var(--color-text)]">
                      {fmtCurrency(total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'fuel' && (
        <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-semibold tracking-tight text-[11px] bg-[var(--color-panel-2)]">
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Reg No</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Liters</th>
                  <th className="px-4 py-3 font-semibold">Cost</th>
                  <th className="px-4 py-3 font-semibold">Trip / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {fuelLogs.map((log) => {
                  const vehicle = vehicles.find((v) => v.id === log.vehicle_id);
                  const trip = trips.find((t) => t.id === log.trip_id);

                  return (
                    <tr key={log.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                      <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">{vehicle?.name || '—'}</td>
                      <td className="px-4 py-3.5 font-mono">{vehicle?.reg_no || '—'}</td>
                      <td className="px-4 py-3.5 font-mono">{fmtDate(log.date)}</td>
                      <td className="px-4 py-3.5 font-mono">{fmtNumber(log.liters)} L</td>
                      <td className="px-4 py-3.5 font-mono text-[var(--color-text)]">{fmtCurrency(log.cost)}</td>
                      <td className="px-4 py-3.5">{trip ? <span className="font-mono">{trip.trip_code}</span> : <span className="text-[var(--color-text-faint)]">Refuel Log</span>}</td>
                    </tr>
                  );
                })}
                {fuelLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-faint)]">
                      No fuel logs recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'expenses' && (
        <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-semibold tracking-tight text-[11px] bg-[var(--color-panel-2)]">
                  <th className="px-4 py-3 font-semibold">Trip Code</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Toll Fee</th>
                  <th className="px-4 py-3 font-semibold">Other Charges</th>
                  <th className="px-4 py-3 font-semibold">Total Expense</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {expenses.map((exp) => {
                  const vehicle = vehicles.find((v) => v.id === exp.vehicle_id);
                  const trip = trips.find((t) => t.id === exp.trip_id);

                  return (
                    <tr key={exp.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                      <td className="px-4 py-3.5 font-mono font-semibold text-[var(--color-text)]">{trip?.trip_code || '—'}</td>
                      <td className="px-4 py-3.5 font-medium">{vehicle?.name || '—'}</td>
                      <td className="px-4 py-3.5 font-mono">{fmtDate(exp.date)}</td>
                      <td className="px-4 py-3.5 font-mono">{fmtCurrency(exp.toll)}</td>
                      <td className="px-4 py-3.5 font-mono">{fmtCurrency(exp.other)}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-[var(--color-text)]">
                        {fmtCurrency(exp.toll + exp.other)}
                      </td>
                    </tr>
                  );
                })}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-faint)]">
                      No trip expenses recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Log Fuel Modal */}
      <Modal open={fuelModalOpen} onClose={() => setFuelModalOpen(false)} title="Log Refuel Event">
        <form onSubmit={handleFuelSubmit} className="space-y-4">
          <Field label="Select Vehicle">
            <Select required value={fuelVehicleId} onChange={(e) => setFuelVehicleId(e.target.value)}>
              <option value="">Select a Vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.reg_no})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Associated Dispatched Trip (Optional)">
            <Select value={fuelTripId} onChange={(e) => setFuelTripId(e.target.value)}>
              <option value="">No Associated Trip (Refuel Depot)</option>
              {trips
                .filter((t) => t.status === 'Dispatched' && t.vehicle_id === fuelVehicleId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trip_code} — {t.source} to {t.destination}
                  </option>
                ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fuel (Liters)">
              <Input
                required
                type="number"
                min={1}
                value={fuelLiters}
                onChange={(e) => {
                  setFuelLiters(Number(e.target.value));
                  setFuelCost(Number(e.target.value) * 75); // auto guess price
                }}
              />
            </Field>

            <Field label="Refuel Cost (₹)">
              <Input
                required
                type="number"
                min={0}
                value={fuelCost}
                onChange={(e) => setFuelCost(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Refuel Date">
            <Input required type="date" value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setFuelModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!fuelVehicleId}>
              Log Fuel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Log Expense Modal */}
      <Modal open={expModalOpen} onClose={() => setExpModalOpen(false)} title="Log Route Expenses">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <Field label="Select Target Active/Completed Route">
            <Select required value={expTripId} onChange={(e) => setExpTripId(e.target.value)}>
              <option value="">Select a Route...</option>
              {trips
                .filter((t) => t.status === 'Dispatched' || t.status === 'Completed')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trip_code} ({t.source} → {t.destination})
                  </option>
                ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Toll Fee (₹)">
              <Input
                required
                type="number"
                min={0}
                value={expToll}
                onChange={(e) => setExpToll(Number(e.target.value))}
              />
            </Field>

            <Field label="Other Expenses (₹)" hint="Food, minor repairs, police etc.">
              <Input
                required
                type="number"
                min={0}
                value={expOther}
                onChange={(e) => setExpOther(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Date of Expense">
            <Input required type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setExpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!expTripId}>
              Log Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
