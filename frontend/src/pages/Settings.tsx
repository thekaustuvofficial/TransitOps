import { useRef } from 'react';
import { useDb } from '../hooks/useDb';
import { useToast } from '../context/ToastContext';
import { Card, Button, Badge } from '../components/primitives';
import { PERMISSIONS, ROLE_LABEL } from '../lib/permissions';
import type { Role, Module, Permission } from '../types';
import { RefreshCw, ShieldAlert, KeyRound, Download, Upload } from 'lucide-react';

export default function Settings() {
  const db = useDb();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roles: Role[] = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'];
  const modules: { id: Module; label: string; desc: string }[] = [
    { id: 'fleet', label: 'Fleet Registry', desc: 'Add, edit, retire vehicles and check maintenance triggers' },
    { id: 'drivers', label: 'Drivers Registry', desc: 'Manage driver records, categories, and license compliance' },
    { id: 'trips', label: 'Trip Management', desc: 'Creates trips, assigns vehicles and drivers, and monitors active deliveries.' },
    { id: 'fuel_exp', label: 'Fuel & Expenses', desc: 'Log fuel refills, tolls, and other on-road expenses' },
    { id: 'maintenance', label: 'Maintenance Log', desc: 'Log check-ins, service types, costs, and check-out actions' },
    { id: 'analytics', label: 'Reports & Analytics', desc: 'Profitability calculations, fuel efficiency, ROI, and cost anomalies' },
    { id: 'settings', label: 'RBAC Security Settings', desc: 'View global permission matrix and database controls' },
  ];

  const handleResetData = () => {
    if (window.confirm('WARNING: This will delete all your local modifications and reset the database to the default seed dataset. Proceed?')) {
      db.reset();
      toast.push('success', 'Database reset to initial seeds successfully. Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleExportData = () => {
    const data = db.exportSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transitops_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.push('success', 'Database snapshot exported successfully.');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = db.importSnapshot(json);
        if (success) {
          toast.push('success', 'Database snapshot imported successfully. Reloading...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          toast.push('error', 'Invalid JSON snapshot format.');
        }
      } catch (err) {
        toast.push('error', 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getPermissionBadge = (perm: Permission) => {
    if (perm === 'full') {
      return <Badge color="#22c55e" className="font-display font-semibold uppercase tracking-wide text-[9px]">Full Access</Badge>;
    }
    if (perm === 'view') {
      return <Badge color="#3b82f6" className="font-display font-semibold uppercase tracking-wide text-[9px]">Read Only</Badge>;
    }
    return <Badge color="#565d69" className="font-display font-semibold uppercase tracking-wide text-[9px]">No Access</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
          System & Security Settings
        </h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          Review Role-Based Access Control (RBAC) configurations and system database controls.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Permission Matrix */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)] shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="text-orange-500" size={16} />
              <h2 className="font-display text-sm font-bold tracking-tight text-[var(--color-text)]">
                Role Permission Matrix
              </h2>
            </div>
            
            <p className="text-xs text-[var(--color-text-muted)] mb-5">
              These rules are enforced both client-side and transaction-side inside the database layer to reject invalid mutations.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-semibold tracking-tight text-[11px] bg-[var(--color-panel-2)]">
                    <th className="p-3.5 w-1/3 font-semibold">Module / System</th>
                    {roles.map((role) => (
                      <th key={role} className="p-3.5 font-semibold text-center">
                        {ROLE_LABEL[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {modules.map((mod) => (
                    <tr key={mod.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                      <td className="p-3.5">
                        <div className="font-semibold text-[var(--color-text)]">{mod.label}</div>
                        <div className="text-[11px] text-[var(--color-text-faint)] mt-0.5">{mod.desc}</div>
                      </td>
                      {roles.map((role) => {
                        const perm = PERMISSIONS[role][mod.id];
                        return (
                          <td key={role} className="p-3.5 text-center">
                            {getPermissionBadge(perm)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Database Controls */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)] shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-orange-500">
              <KeyRound size={16} />
              <h2 className="font-display text-sm font-bold tracking-tight">
                Data Management
              </h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-6 leading-relaxed">
              Export your current database state to a JSON file, or import an existing snapshot to restore data.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                className="w-full font-display py-2.5"
                onClick={handleExportData}
              >
                <Download size={14} className="mr-1" />
                Export to JSON
              </Button>
              <Button
                variant="secondary"
                className="w-full font-display py-2.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} className="mr-1" />
                Import from JSON
              </Button>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImportData}
              />
            </div>
          </Card>

          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)] shadow-sm" accent="#ef4444">
            <div className="mb-4 flex items-center gap-2 text-red-500">
              <ShieldAlert size={16} />
              <h2 className="font-display text-sm font-bold tracking-tight">
                Danger Zone
              </h2>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] mb-6 leading-relaxed">
              Resetting database will clear all locally saved modifications, active trip dispatches, logged expenses, and restored fleet vehicle odometers. All records will revert back to Gujarat seeds.
            </p>

            <Button
              variant="danger"
              className="w-full font-display py-2.5"
              onClick={handleResetData}
            >
              <RefreshCw size={14} className="mr-1" />
              Reset DB to Seeds
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
