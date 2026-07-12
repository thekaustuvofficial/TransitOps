import { useState } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canEdit } from '../lib/permissions';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, Input, Select, Field, Modal, Banner } from '../components/primitives';
import { RuleViolation } from '../lib/db';
import { fmtCurrency, fmtDate, fmtNumber } from '../lib/format';
import { Wrench, Plus, Check } from 'lucide-react';

export default function Maintenance() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();

  const isEditable = user ? canEdit(user.role, 'maintenance') : false;

  // Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [serviceType, setServiceType] = useState('Oil Change');
  const [cost, setCost] = useState(5000);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const logs = db.maintenance;
  const vehicles = db.vehicles;

  // Filter vehicles: only Available vehicles can enter maintenance
  const maintenanceEligibleVehicles = vehicles.filter((v) => v.status === 'Available');

  const openLogModal = () => {
    setVehicleId('');
    setServiceType('Oil Change');
    setCost(5000);
    setDate(new Date().toISOString().slice(0, 10));
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    if (!vehicleId) {
      setErrorMsg('Please select a vehicle.');
      return;
    }

    try {
      db.openMaintenance(user, vehicleId, serviceType, cost, date);
      const vName = vehicles.find((v) => v.id === vehicleId)?.name ?? 'Vehicle';
      toast.push('success', `${vName} checked in for ${serviceType} (status set to In Shop).`);
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof RuleViolation ? err.message : 'An error occurred.');
    }
  };

  const handleCloseMaintenance = (logId: string) => {
    if (!user) return;
    try {
      db.closeMaintenance(user, logId);
      toast.push('success', 'Maintenance completed. Vehicle is back to Available.');
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'Failed to complete maintenance.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
            Maintenance Registry & Service Logs
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Create active maintenance logs (which auto-pull vehicles from the dispatch pool) and complete services.
          </p>
        </div>

        {isEditable && (
          <Button onClick={openLogModal} className="shrink-0 font-display">
            <Plus size={16} />
            Check-In Vehicle
          </Button>
        )}
      </div>

      {/* Maintenance Logs Ledger */}
      <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="px-4 py-3 font-medium">VEHICLE</th>
                <th className="px-4 py-3 font-medium">REG NO.</th>
                <th className="px-4 py-3 font-medium">SERVICE TYPE</th>
                <th className="px-4 py-3 font-medium">DATE</th>
                <th className="px-4 py-3 font-medium font-display">COST</th>
                <th className="px-4 py-3 font-medium">STATUS</th>
                {isEditable && <th className="px-4 py-3 font-medium text-right">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {logs.map((log) => {
                const vehicle = vehicles.find((v) => v.id === log.vehicle_id);

                return (
                  <tr key={log.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">
                      {vehicle?.name ?? <span className="text-[var(--color-text-faint)]">Unknown Vehicle</span>}
                    </td>
                    <td className="px-4 py-3.5 font-display text-[var(--color-text-faint)]">
                      {vehicle?.reg_no ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[var(--color-text)]">
                      {log.service_type}
                    </td>
                    <td className="px-4 py-3.5 font-display">
                      {fmtDate(log.date)}
                    </td>
                    <td className="px-4 py-3.5 font-display text-[var(--color-text)]">
                      {fmtCurrency(log.cost)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={log.status} />
                    </td>
                    {isEditable && (
                      <td className="px-4 py-3.5 text-right">
                        {log.status === 'In Shop' ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                            onClick={() => handleCloseMaintenance(log.id)}
                          >
                            <Check size={12} />
                            Complete Service
                          </Button>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-500/80">Closed</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-faint)]">
                    No maintenance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Check In Vehicle Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Check-In Vehicle for Maintenance"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

          <Banner tone="info">
            <strong>State Transition Note:</strong> Creating an active maintenance log will instantly lock this vehicle, setting its status to <em>In Shop</em> and removing it from the eligible trip dispatcher pool.
          </Banner>

          <Field label="Select Available Vehicle" hint="Only Available vehicles (not Retired or On Trip) are eligible for maintenance check-in">
            <Select
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Select a Vehicle...</option>
              {maintenanceEligibleVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.reg_no}) — Odometer: {fmtNumber(v.odometer_km)} km
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service Type">
              <Select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                <option value="Oil Change">Oil Change</option>
                <option value="Engine Repair">Engine Repair</option>
                <option value="Tyre Replace">Tyre Replace</option>
                <option value="Brake Service">Brake Service</option>
                <option value="Suspension Repair">Suspension Repair</option>
              </Select>
            </Field>

            <Field label="Service Cost (₹)">
              <Input
                required
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Service Date">
            <Input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!vehicleId}>
              <Wrench size={14} />
              Open Service Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
