import { useState } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canEdit } from '../lib/permissions';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, Input, Select, Field, Modal, Banner } from '../components/primitives';
import { fmtCurrency, fmtNumber } from '../lib/format';
import { Plus, Edit2, AlertTriangle } from 'lucide-react';
import type { Vehicle, VehicleType, VehicleStatus } from '../types';
import { RuleViolation } from '../lib/db';

export default function Fleet() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();

  const isEditable = user ? canEdit(user.role, 'fleet') : false;

  // Filter States
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchReg, setSearchReg] = useState<string>('');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [regNo, setRegNo] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleType>('Van');
  const [maxCapacity, setMaxCapacity] = useState(1000);
  const [odometer, setOdometer] = useState(0);
  const [acqCost, setAcqCost] = useState(500000);
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('Available');

  const vehicles = db.vehicles;

  // Filter Logic
  const filteredVehicles = vehicles.filter((v) => {
    if (typeFilter !== 'All' && v.type !== typeFilter) return false;
    if (statusFilter !== 'All' && v.status !== statusFilter) return false;
    if (searchReg.trim() !== '' && !v.reg_no.toLowerCase().includes(searchReg.toLowerCase())) return false;
    return true;
  });

  const openAddModal = () => {
    setEditingVehicle(null);
    setRegNo('');
    setName('');
    setType('Van');
    setMaxCapacity(1000);
    setOdometer(0);
    setAcqCost(500000);
    setRegion('');
    setStatus('Available');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setRegNo(v.reg_no);
    setName(v.name);
    setType(v.type);
    setMaxCapacity(v.max_capacity_kg);
    setOdometer(v.odometer_km);
    setAcqCost(v.acquisition_cost);
    setRegion(v.region);
    setStatus(v.status);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    try {
      if (editingVehicle) {
        // Enforce basic state transitions or warning if updating status
        db.updateVehicle(user, editingVehicle.id, {
          reg_no: regNo.toUpperCase(),
          name,
          type,
          max_capacity_kg: maxCapacity,
          odometer_km: odometer,
          acquisition_cost: acqCost,
          region,
          status, // Admin overrides allowed but logs in feed
        });
        toast.push('success', `Vehicle ${name} updated successfully.`);
      } else {
        db.createVehicle(user, {
          reg_no: regNo.toUpperCase(),
          name,
          type,
          max_capacity_kg: maxCapacity,
          odometer_km: odometer,
          acquisition_cost: acqCost,
          region,
        });
        toast.push('success', `Vehicle ${name} registered successfully.`);
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof RuleViolation) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
            Vehicle Registry
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Manage your fleet profile, registration records, and track maintenance-due indicators.
          </p>
        </div>

        {isEditable && (
          <Button onClick={openAddModal} className="shrink-0 font-display">
            <Plus size={16} />
            Add Vehicle
          </Button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="grid gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:grid-cols-3">
        <Field label="Search Registration No">
          <Input
            placeholder="e.g. GJ01AB4521..."
            value={searchReg}
            onChange={(e) => setSearchReg(e.target.value)}
          />
        </Field>

        <Field label="Filter by Type">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Mini">Mini</option>
          </Select>
        </Field>

        <Field label="Filter by Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </Select>
        </Field>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="px-4 py-3 font-medium">REG NO. (UNIQUE)</th>
                <th className="px-4 py-3 font-medium">NAME / MODEL</th>
                <th className="px-4 py-3 font-medium">TYPE</th>
                <th className="px-4 py-3 font-medium">MAX CAPACITY</th>
                <th className="px-4 py-3 font-medium">ODOMETER</th>
                <th className="px-4 py-3 font-medium">ACQUISITION COST</th>
                <th className="px-4 py-3 font-medium">REGION</th>
                <th className="px-4 py-3 font-medium">STATUS</th>
                <th className="px-4 py-3 font-medium">NOTICES</th>
                {isEditable && <th className="px-4 py-3 font-medium text-right">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filteredVehicles.map((veh) => {
                // Compute maintenance nudge (e.g. 10,000 km since last service)
                const kmSinceService = veh.odometer_km - veh.last_service_odometer_km;
                const serviceDue = kmSinceService >= 10000 && veh.status !== 'Retired';

                return (
                  <tr key={veh.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <td className="px-4 py-3.5 font-display font-semibold text-[var(--color-text)]">
                      {veh.reg_no}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">
                      {veh.name}
                    </td>
                    <td className="px-4 py-3.5">{veh.type}</td>
                    <td className="px-4 py-3.5 font-display">
                      {fmtNumber(veh.max_capacity_kg)} kg
                    </td>
                    <td className="px-4 py-3.5 font-display">
                      {fmtNumber(veh.odometer_km)} km
                    </td>
                    <td className="px-4 py-3.5 font-display">
                      {fmtCurrency(veh.acquisition_cost)}
                    </td>
                    <td className="px-4 py-3.5">{veh.region || '—'}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={veh.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      {serviceDue ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                          <AlertTriangle size={10} />
                          Service Due
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-faint)]">—</span>
                      )}
                    </td>
                    {isEditable && (
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(veh)}
                        >
                          <Edit2 size={12} />
                          Edit
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[var(--color-text-faint)]">
                    No vehicles found. Register a vehicle or adjust your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVehicle ? `Edit Vehicle: ${editingVehicle.name}` : 'Register New Vehicle'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registration Number" hint="Unique identifier (e.g. GJ01AB1234)">
              <Input
                required
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="GJ01AB1234"
              />
            </Field>

            <Field label="Name / Model" hint="Vehicle label (e.g. TRUCK-12)">
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="TRUCK-12"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vehicle Type">
              <Select value={type} onChange={(e) => setType(e.target.value as VehicleType)}>
                <option value="Van">Van</option>
                <option value="Truck">Truck</option>
                <option value="Mini">Mini</option>
              </Select>
            </Field>

            <Field label="Max Capacity (kg)">
              <Input
                required
                type="number"
                min={1}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Odometer (km)">
              <Input
                required
                type="number"
                min={0}
                value={odometer}
                onChange={(e) => setOdometer(Number(e.target.value))}
              />
            </Field>

            <Field label="Acquisition Cost (₹)">
              <Input
                required
                type="number"
                min={1}
                value={acqCost}
                onChange={(e) => setAcqCost(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Region Depot" hint="Depot location">
              <Input
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Ahmedabad Depot"
              />
            </Field>

            {editingVehicle && (
              <Field label="Force Status override" hint="State machine status override">
                <Select value={status} onChange={(e) => setStatus(e.target.value as VehicleStatus)}>
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="In Shop">In Shop</option>
                  <option value="Retired">Retired</option>
                </Select>
              </Field>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingVehicle ? 'Save Changes' : 'Register Vehicle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
