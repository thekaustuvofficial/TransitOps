import { useDb } from '../hooks/useDb';
import { useToast } from '../context/ToastContext';
import { Card, Button, Badge } from '../components/primitives';
import { PERMISSIONS, ROLE_LABEL } from '../lib/permissions';
import type { Role, Module, Permission } from '../types';
import { RefreshCw, ShieldAlert, KeyRound } from 'lucide-react';

export default function Settings() {
  const db = useDb();
  const toast = useToast();

  const roles: Role[] = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'];
  const modules: { id: Module; label: string; desc: string }[] = [
    { id: 'fleet', label: 'Fleet Registry', desc: 'Add, edit, retire vehicles and check maintenance triggers' },
    { id: 'drivers', label: 'Drivers Registry', desc: 'Manage driver records, categories, and license compliance' },
    { id: 'trips', label: 'Trip Dispatcher', desc: 'Draft trips, allocate vehicles & drivers, complete and log trips' },
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
          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)]">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="text-amber-500" size={16} />
              <h2 className="font-display text-sm font-semibold tracking-wide uppercase text-[var(--color-text)]">
                Role-Based Permission Matrix
              </h2>
            </div>
            
            <p className="text-xs text-[var(--color-text-muted)] mb-5">
              These rules are enforced both visual-side (components visibility) and transaction-side (state transitions inside the Database class reject unlawful mutations).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th className="pb-3.5 font-medium w-1/3">MODULE SYSTEM</th>
                    {roles.map((role) => (
                      <th key={role} className="pb-3.5 font-medium text-center">
                        {ROLE_LABEL[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {modules.map((mod) => (
                    <tr key={mod.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                      <td className="py-4">
                        <div className="font-semibold text-[var(--color-text)]">{mod.label}</div>
                        <div className="text-[10px] text-[var(--color-text-faint)] mt-0.5">{mod.desc}</div>
                      </td>
                      {roles.map((role) => {
                        const perm = PERMISSIONS[role][mod.id];
                        return (
                          <td key={role} className="py-4 text-center">
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
          <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)]" accent="#ef4444">
            <div className="mb-4 flex items-center gap-2 text-red-400">
              <ShieldAlert size={16} />
              <h2 className="font-display text-sm font-semibold tracking-wide uppercase">
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
