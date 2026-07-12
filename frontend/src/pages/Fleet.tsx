import { useState, useEffect } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canEdit } from '../lib/permissions';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, Input, Select, Field, Modal, Banner, CustomSelect } from '../components/primitives';
import { fmtCurrency, fmtNumber } from '../lib/format';
import { Plus, Edit2, AlertTriangle, ArrowUpDown } from 'lucide-react';
import type { Vehicle, VehicleType, VehicleStatus } from '../types';
import { RuleViolation } from '../lib/db';

type SortHeaderProps = Readonly<{
  field: keyof Vehicle;
  children: React.ReactNode;
  activeField: keyof Vehicle | null;
  onToggle: (field: keyof Vehicle) => void;
}>;

function SortHeader({ field, children, activeField, onToggle }: SortHeaderProps) {
  return (
    <th
      className="px-4 py-3 font-medium cursor-pointer select-none hover:text-[var(--color-text)] transition-colors"
      onClick={() => onToggle(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown size={10} className={activeField === field ? 'text-amber-500' : 'opacity-30'} />
      </span>
    </th>
  );
}

export default function Fleet() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();

  const isEditable = user ? canEdit(user.role, 'fleet') : false;

  // Filter States
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    return sessionStorage.getItem('fleet_status_filter') || 'All';
  });
  const [searchReg, setSearchReg] = useState<string>('');

  useEffect(() => {
    sessionStorage.removeItem('fleet_status_filter');
  }, []);

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
  const [currentLocation, setCurrentLocation] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('Available');

  // Sort State
  const [sortKey, setSortKey] = useState<keyof Vehicle | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const vehicles = db.vehicles;

  // Filter Logic
  const filteredVehicles = vehicles.filter((v) => {
    if (typeFilter !== 'All' && v.type !== typeFilter) return false;
    if (statusFilter !== 'All' && v.status !== statusFilter) return false;
    if (searchReg.trim() !== '' && !v.reg_no.toLowerCase().includes(searchReg.toLowerCase())) return false;
    return true;
  });

  // Sort Logic
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const toggleSort = (key: keyof Vehicle) => {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setRegNo('');
    setName('');
    setType('Van');
    setMaxCapacity(1000);
    setOdometer(0);
    setAcqCost(500000);
    setRegion('');
    setCurrentLocation('');
    setInsuranceExpiry(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
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
    setCurrentLocation(v.current_location);
    setInsuranceExpiry(new Date(v.insurance_expiry).toISOString().slice(0, 10));
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
          current_location: currentLocation,
          insurance_expiry: new Date(insuranceExpiry).toISOString(),
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
          current_location: currentLocation,
          insurance_expiry: new Date(insuranceExpiry).toISOString(),
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
      <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:grid-cols-3">
        <Field label="Search Registration No">
          <Input
            placeholder="e.g. GJ01AB4521..."
            value={searchReg}
            onChange={(e) => setSearchReg(e.target.value)}
          />
        </Field>

        <Field label="Filter by Type">
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            options={[
              { value: 'All', label: 'All Types' },
              { value: 'Van', label: 'Van' },
              { value: 'Truck', label: 'Truck' },
              { value: 'Mini', label: 'Mini' }
            ]}
          />
        </Field>

        <Field label="Filter by Status">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Available', label: 'Available' },
              { value: 'On Trip', label: 'On Trip' },
              { value: 'In Shop', label: 'In Shop' },
              { value: 'Retired', label: 'Retired' }
            ]}
          />
        </Field>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-semibold tracking-tight text-[11px] bg-[var(--color-panel-2)]">
                <SortHeader field="reg_no" activeField={sortKey} onToggle={toggleSort}>Reg No</SortHeader>
                <SortHeader field="name" activeField={sortKey} onToggle={toggleSort}>Model / Name</SortHeader>
                <th className="px-4 py-3 font-semibold">Type</th>
                <SortHeader field="max_capacity_kg" activeField={sortKey} onToggle={toggleSort}>Capacity</SortHeader>
                <SortHeader field="odometer_km" activeField={sortKey} onToggle={toggleSort}>Odometer</SortHeader>
                <SortHeader field="acquisition_cost" activeField={sortKey} onToggle={toggleSort}>Cost</SortHeader>
                <th className="px-4 py-3 font-semibold">Depot / Region</th>
                <th className="px-4 py-3 font-semibold">Current Location</th>
                <th className="px-4 py-3 font-semibold">Insurance Expiry</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Alerts</th>
                {isEditable && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {sortedVehicles.map((veh) => {
                // Compute maintenance nudge (e.g. 10,000 km since last service)
                const kmSinceService = veh.odometer_km - veh.last_service_odometer_km;
                const serviceDue = kmSinceService >= 10000 && veh.status !== 'Retired';

                return (
                  <tr key={veh.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <td className="px-4 py-3.5 font-mono text-[var(--color-text)] font-semibold">
                      {veh.reg_no}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">
                      {veh.name}
                    </td>
                    <td className="px-4 py-3.5">{veh.type}</td>
                    <td className="px-4 py-3.5 font-mono tabular-nums">
                      {fmtNumber(veh.max_capacity_kg)} kg
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums">
                      {fmtNumber(veh.odometer_km)} km
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums">
                      {fmtCurrency(veh.acquisition_cost)}
                    </td>
                    <td className="px-4 py-3.5">{veh.region || '—'}</td>
                    <td className="px-4 py-3.5">{veh.current_location || '—'}</td>
                    <td className="px-4 py-3.5 font-mono">{new Date(veh.insurance_expiry).toISOString().slice(0, 10)}</td>
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
              {sortedVehicles.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-[var(--color-text-faint)]">
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

            <Field label="Current Location" hint="Used for proximity matching">
              <Input
                required
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder="Ahmedabad Hub"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Insurance Expiry">
              <Input
                required
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
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
