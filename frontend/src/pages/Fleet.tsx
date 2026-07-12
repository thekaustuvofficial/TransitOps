import { useState, useEffect } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canEdit } from '../lib/permissions';
import { Button, Card, Input, Select, Field, Modal, Banner, CustomSelect } from '../components/primitives';
import { fmtCurrency, fmtNumber } from '../lib/format';
import { Plus, Edit2, AlertTriangle, ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react';
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
    <span
      className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-[var(--color-text)] transition-colors"
      onClick={() => onToggle(field)}
    >
      {children}
      <ArrowUpDown size={10} className={activeField === field ? 'text-amber-500' : 'opacity-30'} />
    </span>
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
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
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
    const insDate = new Date(v.insurance_expiry);
    setInsuranceExpiry(isNaN(insDate.getTime()) ? '' : insDate.toISOString().slice(0, 10));
    setStatus(v.status);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleStatusChange = (vehicleId: string, newStatus: VehicleStatus) => {
    if (!user) return;
    try {
      const veh = vehicles.find((v) => v.id === vehicleId);
      if (!veh) return;
      db.updateVehicle(user, vehicleId, { status: newStatus });
      toast.push('success', `Status of ${veh.name} changed to ${newStatus}.`);
    } catch (err) {
      if (err instanceof RuleViolation) {
        toast.push('error', err.message);
      } else {
        toast.push('error', 'Failed to update status.');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    try {
      if (editingVehicle) {
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
          status,
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

  const getBadgeCls = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-500 text-white dark:bg-emerald-600';
      case 'On Trip':   return 'bg-blue-500 text-white dark:bg-blue-600';
      case 'In Shop':   return 'bg-amber-500 text-white dark:bg-amber-600';
      case 'Retired':   return 'bg-red-500 text-white dark:bg-red-600';
      default:          return 'bg-slate-400 text-white';
    }
  };

  const getStatusBadge = (veh: Vehicle) => {
    if (!isEditable) {
      return (
        <span className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${getBadgeCls(veh.status)}`}>
          {veh.status}
        </span>
      );
    }

    return (
      <div className="relative inline-block w-36">
        <select
          value={veh.status}
          onChange={(e) => handleStatusChange(veh.id, e.target.value as VehicleStatus)}
          className={`w-full appearance-none rounded-full px-4 py-1.5 pr-8 text-xs font-bold uppercase tracking-wider cursor-pointer border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all ${getBadgeCls(veh.status)}`}
        >
          <option value="Available">Available</option>
          <option value="On Trip">On Trip</option>
          <option value="In Shop">In Shop</option>
          <option value="Retired">Retired</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-white">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-rise-in">
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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div className="w-full xl:max-w-xs shrink-0 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--color-text-faint)]">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search by Registration No..."
            value={searchReg}
            onChange={(e) => setSearchReg(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 shadow-sm"
          />
        </div>

        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto hide-scrollbar w-full xl:w-auto pb-2 xl:pb-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)] shrink-0 px-2 flex items-center gap-1.5">
            <SlidersHorizontal size={12} />
            Filters
          </span>
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            options={[
              { value: 'All', label: 'All Types' },
              { value: 'Van', label: 'Van' },
              { value: 'Truck', label: 'Truck' },
              { value: 'Mini', label: 'Mini' }
            ]}
            className="w-40 shrink-0"
          />
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
            className="w-40 shrink-0"
          />
        </div>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)] hover:shadow-xl transition-shadow duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-bold tracking-wider text-[10px] uppercase bg-[var(--color-panel-2)]/50">
                <th className="px-6 py-4">
                  <SortHeader field="name" activeField={sortKey} onToggle={toggleSort}>Vehicle Details</SortHeader>
                </th>
                <th className="px-6 py-4">
                  <SortHeader field="max_capacity_kg" activeField={sortKey} onToggle={toggleSort}>Odometer & Capacity</SortHeader>
                </th>
                <th className="px-6 py-4">
                  <SortHeader field="acquisition_cost" activeField={sortKey} onToggle={toggleSort}>Financials</SortHeader>
                </th>
                <th className="px-6 py-4 font-semibold">Depot & Location</th>
                <th className="px-6 py-4 font-semibold">Insurance Expiry</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Alerts</th>
                {isEditable && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {sortedVehicles.map((veh) => {
                // Compute maintenance nudge (e.g. 10,000 km since last service)
                const kmSinceService = veh.odometer_km - veh.last_service_odometer_km;
                const serviceDue = kmSinceService >= 10000 && veh.status !== 'Retired';

                return (
                  <tr key={veh.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[var(--color-text)] text-sm">{veh.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-xs text-[var(--color-text-faint)] font-semibold">{veh.reg_no}</span>
                        <span className="inline-flex rounded bg-[var(--color-panel-2)] px-1.5 py-0.5 text-[9px] font-bold border border-[var(--color-border)]">
                          {veh.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-medium text-[var(--color-text)]">{fmtNumber(veh.odometer_km)} km</div>
                      <div className="text-[10px] text-[var(--color-text-faint)] mt-0.5 font-semibold">Cap: {fmtNumber(veh.max_capacity_kg)} kg</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {fmtCurrency(veh.acquisition_cost)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-[var(--color-text)] font-semibold">{veh.region || '—'}</div>
                      <div className="text-[10px] text-[var(--color-text-faint)] mt-0.5">{veh.current_location || '—'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {(() => { const d = new Date(veh.insurance_expiry); return isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10); })()}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(veh)}
                    </td>
                    <td className="px-6 py-4">
                      {serviceDue ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-500 dark:text-amber-400 border border-amber-500/20">
                          <AlertTriangle size={10} />
                          Service Due
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-faint)]">—</span>
                      )}
                    </td>
                    {isEditable && (
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(veh)}
                          className="hover:bg-[var(--color-panel-2)]"
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
                  <td colSpan={8} className="px-6 py-12 text-center text-[var(--color-text-faint)]">
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
        width="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-2 animate-fade-in">
          {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

          <div className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Registration Number">
                <Input
                  required
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="GJ01AB1234"
                  className="py-2 text-xs"
                />
              </Field>

              <Field label="Name / Model">
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="TRUCK-12"
                  className="py-2 text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Vehicle Type">
                <Select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as VehicleType)}
                  className="py-2 text-xs"
                >
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
                  className="py-2 text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Odometer (km)">
                <Input
                  required
                  type="number"
                  min={0}
                  value={odometer}
                  onChange={(e) => setOdometer(Number(e.target.value))}
                  className="py-2 text-xs"
                />
              </Field>

              <Field label="Acquisition Cost (₹)">
                <Input
                  required
                  type="number"
                  min={1}
                  value={acqCost}
                  onChange={(e) => setAcqCost(Number(e.target.value))}
                  className="py-2 text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Region Depot">
                <Input
                  required
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Ahmedabad Depot"
                  className="py-2 text-xs"
                />
              </Field>

              <Field label="Current Location">
                <Input
                  required
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="Ahmedabad Hub"
                  className="py-2 text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Insurance Expiry">
                <Input
                  required
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="py-2 text-xs"
                />
              </Field>

              {editingVehicle && (
                <Field label="Force Status override">
                  <Select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                    className="py-2 text-xs"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </Select>
                </Field>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)] mt-6">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" className="text-xs">
              {editingVehicle ? 'Save Changes' : 'Register Vehicle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
