import { useState, useEffect } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canEdit } from '../lib/permissions';
import { Button, Card, Input, Select, Field, Modal, Banner, CustomSelect } from '../components/primitives';
import { fmtDate, daysUntil } from '../lib/format';
import { Plus, Edit2, AlertOctagon, ShieldAlert, Award, Search, SlidersHorizontal } from 'lucide-react';
import type { Driver, LicenseCategory, DriverStatus } from '../types';
import { RuleViolation } from '../lib/db';

export default function Drivers() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();

  const isEditable = user ? canEdit(user.role, 'drivers') : false;

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    return sessionStorage.getItem('driver_status_filter') || 'All';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    sessionStorage.removeItem('driver_status_filter');
  }, []);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseCategory, setLicenseCategory] = useState<LicenseCategory>('LMV');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [contact, setContact] = useState('');
  const [safetyScore, setSafetyScore] = useState(90);
  const [currentLocation, setCurrentLocation] = useState('');
  const [status, setStatus] = useState<DriverStatus>('Available');

  const drivers = db.drivers;

  // Filter logic
  const filteredDrivers = drivers.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.license_no.toLowerCase().includes(q);
    }
    return true;
  });

  const openAddModal = () => {
    setEditingDriver(null);
    setName('');
    setLicenseNo('');
    setLicenseCategory('LMV');
    setLicenseExpiry(new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10));
    setContact('');
    setSafetyScore(90);
    setCurrentLocation('');
    setStatus('Available');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (d: Driver) => {
    setEditingDriver(d);
    setName(d.name);
    setLicenseNo(d.license_no);
    setLicenseCategory(d.license_category);
    setLicenseExpiry(new Date(d.license_expiry).toISOString().slice(0, 10));
    setContact(d.contact);
    setSafetyScore(d.safety_score);
    setCurrentLocation(d.current_location);
    setStatus(d.status);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleStatusChange = (driverId: string, newStatus: DriverStatus) => {
    if (!user) return;
    try {
      const drv = drivers.find((d) => d.id === driverId);
      if (!drv) return;
      db.updateDriver(user, driverId, { status: newStatus });
      toast.push('success', `Status of ${drv.name} changed to ${newStatus}.`);
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
      if (editingDriver) {
        db.updateDriver(user, editingDriver.id, {
          name,
          license_no: licenseNo.toUpperCase(),
          license_category: licenseCategory,
          license_expiry: new Date(licenseExpiry).toISOString(),
          contact,
          safety_score: safetyScore,
          current_location: currentLocation,
          status,
        });
        toast.push('success', `Driver ${name} updated successfully.`);
      } else {
        db.createDriver(user, {
          name,
          license_no: licenseNo.toUpperCase(),
          license_category: licenseCategory,
          license_expiry: new Date(licenseExpiry).toISOString(),
          contact,
          safety_score: safetyScore,
          current_location: currentLocation,
        });
        toast.push('success', `Driver ${name} registered successfully.`);
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

  // Helper for safety score badge styling
  const getSafetyBadgeStyle = (score: number) => {
    if (score >= 95) return { color: '#10b981', text: 'Elite', icon: <Award size={12} className="text-emerald-500" /> };
    if (score >= 88) return { color: '#3b82f6', text: 'Good', icon: null };
    if (score >= 80) return { color: '#f59e0b', text: 'Standard', icon: null };
    return { color: '#ef4444', text: 'At Risk', icon: <ShieldAlert size={12} className="text-red-500" /> };
  };

  // Helper to determine License Expiry Badge Color/Text
  const getExpiryBadge = (expiryDateIso: string) => {
    const daysLeft = daysUntil(expiryDateIso);
    if (daysLeft <= 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold text-red-500 dark:text-red-400 border border-red-500/20">
          <AlertOctagon size={10} />
          EXPIRED ({Math.abs(daysLeft)}d ago)
        </span>
      );
    }
    if (daysLeft < 30) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-500/5 px-2 py-0.5 text-[9px] font-semibold text-red-500 dark:text-red-400 border border-red-500/20">
          <AlertOctagon size={10} />
          CRITICAL ({daysLeft}d left)
        </span>
      );
    }
    if (daysLeft < 90) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/5 px-2 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Nearing ({daysLeft}d)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/5 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        Valid ({daysLeft}d)
      </span>
    );
  };

  const getBadgeCls = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-500 text-white dark:bg-emerald-600';
      case 'On Trip':   return 'bg-blue-500 text-white dark:bg-blue-600';
      case 'Off Duty':  return 'bg-slate-500 text-white dark:bg-slate-600';
      case 'Suspended': return 'bg-red-500 text-white dark:bg-red-600';
      default:          return 'bg-slate-400 text-white';
    }
  };

  const getStatusBadge = (drv: Driver) => {
    if (!isEditable) {
      return (
        <span className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${getBadgeCls(drv.status)}`}>
          {drv.status}
        </span>
      );
    }

    return (
      <div className="relative inline-block w-36">
        <select
          value={drv.status}
          onChange={(e) => handleStatusChange(drv.id, e.target.value as DriverStatus)}
          className={`w-full appearance-none rounded-full px-4 py-1.5 pr-8 text-xs font-bold uppercase tracking-wider cursor-pointer border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all ${getBadgeCls(drv.status)}`}
        >
          <option value="Available">Available</option>
          <option value="On Trip">On Trip</option>
          <option value="Off Duty">Off Duty</option>
          <option value="Suspended">Suspended</option>
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
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
            Driver Management
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Review driver categories, safety profiles, license compliance tracking, and duty status.
          </p>
        </div>

        {isEditable && (
          <Button onClick={openAddModal} className="shrink-0 font-display">
            <Plus size={16} />
            Add Driver
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
            placeholder="Search by Name or License..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 shadow-sm"
          />
        </div>

        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto hide-scrollbar w-full xl:w-auto pb-2 xl:pb-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)] shrink-0 px-2 flex items-center gap-1.5">
            <SlidersHorizontal size={12} />
            Filters
          </span>
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Available', label: 'Available' },
              { value: 'On Trip', label: 'On Trip' },
              { value: 'Off Duty', label: 'Off Duty' },
              { value: 'Suspended', label: 'Suspended' }
            ]}
            className="w-40 shrink-0"
          />
        </div>
      </div>

      {/* Drivers List Card */}
      <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)] hover:shadow-xl transition-shadow duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-bold tracking-wider text-[10px] uppercase bg-[var(--color-panel-2)]/50">
                <th className="px-6 py-4 font-semibold">Driver Details</th>
                <th className="px-6 py-4 font-semibold">License Profile</th>
                <th className="px-6 py-4 font-semibold">Compliance / Expiry</th>
                <th className="px-6 py-4 font-semibold">Operations / Safety</th>
                <th className="px-6 py-4 font-semibold">Duty Status</th>
                {isEditable && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filteredDrivers.map((drv) => {
                const safety = getSafetyBadgeStyle(drv.safety_score);

                return (
                  <tr key={drv.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[var(--color-text)] text-sm">{drv.name}</div>
                      <div className="font-mono text-xs text-[var(--color-text-faint)] mt-0.5">{drv.contact}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-[var(--color-text)] font-semibold">{drv.license_no}</div>
                      <div className="mt-1">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${drv.license_category === 'HMV' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'}`}>
                          {drv.license_category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-medium">{fmtDate(drv.license_expiry)}</div>
                      <div className="mt-1">{getExpiryBadge(drv.license_expiry)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-[var(--color-text)] font-semibold">{drv.current_location || '—'}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono font-bold text-xs" style={{ color: safety.color }}>
                          {drv.safety_score}/100
                        </span>
                        {safety.icon}
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
                          {safety.text}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(drv)}
                    </td>
                    {isEditable && (
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(drv)}
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
              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--color-text-faint)]">
                    No drivers registered. Register a driver or adjust your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Driver Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Register New Driver'}
        width="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-2 animate-fade-in">
          {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

          <div className="space-y-3.5">
            <Field label="Driver Full Name">
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Fernandes"
                className="py-2 text-xs"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="License Number">
                <Input
                  required
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  placeholder="DL-88213"
                  className="py-2 text-xs"
                />
              </Field>

              <Field label="Contact Number">
                <Input
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="98765xxxxx"
                  className="py-2 text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="License Category">
                <Select
                  value={licenseCategory}
                  onChange={(e) => setLicenseCategory(e.target.value as LicenseCategory)}
                  className="py-2 text-xs"
                >
                  <option value="LMV">Light (LMV)</option>
                  <option value="HMV">Heavy (HMV)</option>
                </Select>
              </Field>

              <Field label="License Expiry Date">
                <Input
                  required
                  type="date"
                  value={licenseExpiry}
                  onChange={(e) => setLicenseExpiry(e.target.value)}
                  className="py-2 text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Current Location">
                <Input
                  required
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="Ahmedabad Hub"
                  className="py-2 text-xs"
                />
              </Field>

              <Field label="Safety Score (0-100)">
                <Input
                  required
                  type="number"
                  min={0}
                  max={100}
                  value={safetyScore}
                  onChange={(e) => setSafetyScore(Number(e.target.value))}
                  className="py-2 text-xs"
                />
              </Field>
            </div>

            {editingDriver && (
              <Field label="Force Status override">
                <Select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value as DriverStatus)}
                  className="py-2 text-xs"
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="Suspended">Suspended</option>
                </Select>
              </Field>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)] mt-6">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" className="text-xs">
              {editingDriver ? 'Save Changes' : 'Register Driver'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
