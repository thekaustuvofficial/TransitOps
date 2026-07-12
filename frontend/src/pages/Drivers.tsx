import { useState, useEffect } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canEdit } from '../lib/permissions';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, Input, Select, Field, Modal, Banner, CustomSelect } from '../components/primitives';
import { fmtDate, daysUntil } from '../lib/format';
import { Plus, Edit2, AlertOctagon, ShieldAlert, Award } from 'lucide-react';
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
    setLicenseExpiry(new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)); // Default 6 months from now
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
    if (score >= 95) return { color: '#22c55e', text: 'Elite', icon: <Award size={12} /> };
    if (score >= 88) return { color: '#3b82f6', text: 'Good', icon: null };
    if (score >= 80) return { color: '#f59e0b', text: 'Standard', icon: null };
    return { color: '#ef4444', text: 'At Risk', icon: <ShieldAlert size={12} /> };
  };

  // Helper to determine License Expiry Badge Color/Text
  const getExpiryBadge = (expiryDateIso: string) => {
    const daysLeft = daysUntil(expiryDateIso);
    if (daysLeft <= 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
          <AlertOctagon size={10} />
          EXPIRED ({Math.abs(daysLeft)}d ago)
        </span>
      );
    }
    if (daysLeft < 30) {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/5 px-2 py-0.5 text-[10px] font-semibold text-red-400">
          <AlertOctagon size={10} />
          EXPIRY CRITICAL ({daysLeft}d left)
        </span>
      );
    }
    if (daysLeft < 90) {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          Expiry Nearing ({daysLeft}d left)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
        Valid ({daysLeft}d left)
      </span>
    );
  };

  return (
    <div className="space-y-6">
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
      <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:grid-cols-2">
        <Field label="Search by Name or License No.">
          <Input
            placeholder="e.g. Alex Fernandes or DL-88..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Field>

        <Field label="Filter by Duty Status">
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
          />
        </Field>
      </div>

      {/* Drivers List Card */}
      <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-semibold tracking-tight text-[11px] bg-[var(--color-panel-2)]">
                <th className="px-4 py-3 font-semibold">Driver Name</th>
                <th className="px-4 py-3 font-semibold">License No</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">License Expiry</th>
                <th className="px-4 py-3 font-semibold">Expiry Status</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Current Location</th>
                <th className="px-4 py-3 font-semibold">Safety Score</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {isEditable && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filteredDrivers.map((drv) => {
                const safety = getSafetyBadgeStyle(drv.safety_score);

                return (
                  <tr key={drv.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">
                      {drv.name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[var(--color-text)] font-semibold">
                      {drv.license_no}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-medium text-[var(--color-text)]">
                      {drv.license_category}
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      {fmtDate(drv.license_expiry)}
                    </td>
                    <td className="px-4 py-3.5">
                      {getExpiryBadge(drv.license_expiry)}
                    </td>
                    <td className="px-4 py-3.5 font-mono">{drv.contact}</td>
                    <td className="px-4 py-3.5">{drv.current_location || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold" style={{ color: safety.color }}>
                          {drv.safety_score}/100
                        </span>
                        {safety.icon}
                        <span className="text-[10px] font-semibold text-[var(--color-text-faint)]">
                          {safety.text}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={drv.status} />
                    </td>
                    {isEditable && (
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(drv)}
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
                  <td colSpan={10} className="px-4 py-8 text-center text-[var(--color-text-faint)]">
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
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Driver Full Name">
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Fernandes"
              />
            </Field>

            <Field label="License Number">
              <Input
                required
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                placeholder="DL-88213"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="License Category">
              <Select
                value={licenseCategory}
                onChange={(e) => setLicenseCategory(e.target.value as LicenseCategory)}
              >
                <option value="LMV">Light Motor Vehicle (LMV)</option>
                <option value="HMV">Heavy Motor Vehicle (HMV)</option>
              </Select>
            </Field>

            <Field label="License Expiry Date">
              <Input
                required
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact Number" hint="e.g. 98765xxxxx">
              <Input
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="98765xxxxx"
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
              />
            </Field>
          </div>

          <Field label="Current Location" hint="Used for proximity matching">
            <Input
              required
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="Ahmedabad Hub"
            />
          </Field>

          {editingDriver && (
            <Field label="Force Status override" hint="State machine status override">
              <Select value={status} onChange={(e) => setStatus(e.target.value as DriverStatus)}>
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="Off Duty">Off Duty</option>
                <option value="Suspended">Suspended</option>
              </Select>
            </Field>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingDriver ? 'Save Changes' : 'Register Driver'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
