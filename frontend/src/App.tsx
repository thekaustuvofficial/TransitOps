import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';

import { canView, ROLE_LABEL, ROLE_INITIALS } from './lib/permissions';
import type { Module, Role } from './types';

// Page Imports
import Dashboard from './pages/Dashboard';
import Fleet from './pages/Fleet';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelExpenses from './pages/FuelExpenses';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

// Icon Imports
import {
  Truck, Users, Navigation, Wrench, Fuel, BarChart3, Settings as SettingsIcon, LogOut, ShieldAlert, Key, HelpCircle
} from 'lucide-react';

function AppContent() {
  const { user, login, logout, setRole } = useAuth();
  const toast = useToast();

  // SPA Route State
  const [currentModule, setCurrentModule] = useState<Module>('settings');

  // Login Form States
  const [email, setEmail] = useState('meera.s@transitops.in');
  const [password, setPassword] = useState('demo1234');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sync route hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '') as Module;
      if (hash && ['fleet', 'drivers', 'trips', 'fuel_exp', 'analytics', 'maintenance', 'settings'].includes(hash)) {
        setCurrentModule(hash);
      } else {
        setCurrentModule('fleet'); // fallback
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // initial run

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when tab clicked
  const navigateTo = (mod: Module) => {
    window.location.hash = `#/${mod}`;
  };

  // Redirect on user login
  useEffect(() => {
    if (user) {
      // Determine starting tab based on role
      const roleStart: Record<Role, Module> = {
        fleet_manager: 'fleet',
        dispatcher: 'trips',
        safety_officer: 'drivers',
        financial_analyst: 'analytics',
      };
      navigateTo(roleStart[user.role]);
    }
  }, [user?.id]); // Only run on actual login shift

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (failedAttempts >= 5) {
      setLoginError('Account locked after 5 failed attempts. Please reset DB in settings if needed.');
      return;
    }

    const session = login(email, password);
    if (session) {
      setFailedAttempts(0);
      toast.push('success', `Welcome back, ${session.name}!`);
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLoginError('Invalid credentials. Account locked after 5 failed attempts.');
      } else {
        setLoginError(`Invalid credentials. Account will lock after ${5 - newAttempts} more failed attempts.`);
      }
    }
  };

  const handleQuickLogin = (emailStr: string) => {
    setEmail(emailStr);
    setPassword('demo1234');
    const session = login(emailStr, 'demo1234');
    if (session) {
      setFailedAttempts(0);
      toast.push('success', `Welcome back, ${session.name}!`);
    }
  };

  // Login Screen layout
  if (!user) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#0a0c0f]">
        {/* Left branding pane */}
        <div className="hidden w-2/5 flex-col justify-between bg-[#171b21] p-10 border-r border-[var(--color-border)] lg:flex">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600 text-black font-bold font-display text-xl shadow-lg">
              T
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--color-text)]">
                TransitOps
              </h1>
              <p className="font-display text-xs font-semibold tracking-wider text-amber-500 uppercase mt-0.5">
                Smart Transport Operations Platform
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                State-Machine Fleet Ops
              </h2>
              <p className="mt-2 text-xs text-[var(--color-text-faint)] leading-relaxed">
                A formal state transition system ensuring absolute safety, load compliance, and maintenance registry lockdowns with complete transaction audit logs.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                One login, four roles:
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => handleQuickLogin('meera.s@transitops.in')} className="flex flex-col items-start rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2.5 hover:border-amber-500 transition-colors">
                  <span className="font-semibold text-[var(--color-text)]">Fleet Manager</span>
                  <span className="text-[10px] text-[var(--color-text-faint)]">Meera Shah</span>
                </button>
                <button onClick={() => handleQuickLogin('raven.k@transitops.in')} className="flex flex-col items-start rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2.5 hover:border-amber-500 transition-colors">
                  <span className="font-semibold text-[var(--color-text)]">Dispatcher</span>
                  <span className="text-[10px] text-[var(--color-text-faint)]">Raven K.</span>
                </button>
                <button onClick={() => handleQuickLogin('arjun.n@transitops.in')} className="flex flex-col items-start rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2.5 hover:border-amber-500 transition-colors">
                  <span className="font-semibold text-[var(--color-text)]">Safety Officer</span>
                  <span className="text-[10px] text-[var(--color-text-faint)]">Arjun Nair</span>
                </button>
                <button onClick={() => handleQuickLogin('priyanka.d@transitops.in')} className="flex flex-col items-start rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2.5 hover:border-amber-500 transition-colors">
                  <span className="font-semibold text-[var(--color-text)]">Financial Analyst</span>
                  <span className="text-[10px] text-[var(--color-text-faint)]">Priyanka Desai</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-display text-[var(--color-text-faint)]">
            TRANSITOPS © 2026 • GUJARAT LOGISTICS PORTAL
          </div>
        </div>

        {/* Right login form pane */}
        <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
                Sign in to your account
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Enter your credentials or click a role card on the left to initialize a demo session.
              </p>
            </div>

            {/* Red error state box (Matching wireframe auth error box) */}
            {loginError && (
              <div className="rounded border-2 border-dashed border-red-500/50 bg-red-500/10 p-3.5 text-xs text-red-200">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-red-400">
                  <ShieldAlert size={14} />
                  Security Warning
                </div>
                <div className="mt-1 font-semibold">{loginError}</div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  EMAIL ADDRESS
                </label>
                <input
                  required
                  type="email"
                  placeholder="name@transitops.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    PASSWORD
                  </label>
                  <span className="text-[10px] text-amber-500 hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-[var(--color-text-muted)] select-none">
                  <input type="checkbox" defaultChecked className="accent-amber-500" />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={failedAttempts >= 5}
                className="w-full rounded bg-amber-600 hover:bg-amber-500 py-2.5 text-sm font-bold text-black shadow-lg transition-colors font-display disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-faint)] disabled:cursor-not-allowed"
              >
                Sign In
              </button>
            </form>

            {/* Mobile Helper Info */}
            <div className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-[11px] text-[var(--color-text-muted)] lg:hidden">
              <div className="font-semibold text-[var(--color-text)] flex items-center gap-1">
                <Key size={12} className="text-amber-500" />
                Demo Credentials:
              </div>
              <ul className="mt-1 space-y-1 pl-4 list-disc text-[10px] text-[var(--color-text-faint)]">
                <li>Manager: meera.s@transitops.in / demo1234</li>
                <li>Dispatcher: raven.k@transitops.in / demo1234</li>
                <li>Safety: arjun.n@transitops.in / demo1234</li>
                <li>Financial: priyanka.d@transitops.in / demo1234</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RBAC validation: Can they view the active route?
  const isViewable = canView(user.role, currentModule);

  // Nav Items
  const NAVIGATION_ITEMS: { id: Module; label: string; icon: React.ReactNode }[] = [
    { id: 'fleet', label: 'Fleet Registry', icon: <Truck size={16} /> },
    { id: 'drivers', label: 'Drivers Registry', icon: <Users size={16} /> },
    { id: 'trips', label: 'Trip Dispatcher', icon: <Navigation size={16} /> },
    { id: 'maintenance', label: 'Maintenance Log', icon: <Wrench size={16} /> },
    { id: 'fuel_exp', label: 'Fuel & Expenses', icon: <Fuel size={16} /> },
    { id: 'analytics', label: 'Reports & Analytics', icon: <BarChart3 size={16} /> },
    { id: 'settings', label: 'Access Settings', icon: <SettingsIcon size={16} /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0c0f] text-[var(--color-text)]">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-[var(--color-border)] bg-[#12151a] md:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-600 text-black font-bold font-display text-sm">
            T
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-[var(--color-text)]">TransitOps</h2>
            <span className="text-[9px] font-semibold text-amber-500 uppercase tracking-widest">GUJARAT FLEET</span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {NAVIGATION_ITEMS.map((item) => {
            const hasAccess = canView(user.role, item.id);
            if (!hasAccess) return null; // Hide links with 'none' permission

            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3.5 py-2.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-600/10 text-amber-500 border-l-2 border-amber-500 font-semibold'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text)]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Dashboard link override */}
        <div className="p-3 border-t border-[var(--color-border)] space-y-1">
          <button
            onClick={() => navigateTo('settings')} // Go to settings (Dashboard isn't mapped to module directly)
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[11px] text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
          >
            <HelpCircle size={14} />
            Operations Help
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[#12151a] px-6">
          {/* Quick SPA Module breadcrumb or Dashboard Switcher */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                // Dashboard is not a gated module per se, it aggregates everything, let's redirect to dashboard
                // To do this, we can set currentModule to a pseudo-module 'dashboard'
                setCurrentModule('fleet'); // fallback route
                window.location.hash = '#/dashboard';
                setCurrentModule('fleet'); // triggers hook hashcheck
              }}
              className="rounded bg-[var(--color-panel-2)] border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-400 font-display"
            >
              📊 Live Stats Dashboard
            </button>
          </div>

          {/* User Widget + Role Overrides (RLS demo switcher) */}
          <div className="flex items-center gap-3.5">
            {/* Realtime Role Overrider - THE X-FACTOR DEMO ASSET */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2.5 py-1.5">
              <span className="text-[10px] font-semibold text-[var(--color-text-faint)] font-display uppercase tracking-wider">DEMO OVERRIDE:</span>
              <select
                value={user.role}
                onChange={(e) => {
                  const targetRole = e.target.value as Role;
                  setRole(targetRole);
                  toast.push('success', `Role override: Switched to ${ROLE_LABEL[targetRole]} permissions.`);
                }}
                className="bg-transparent text-[11px] font-semibold text-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="fleet_manager">Fleet Manager</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="safety_officer">Safety Officer</option>
                <option value="financial_analyst">Financial Analyst</option>
              </select>
            </div>

            {/* Profile badge */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-panel-2)] border border-[var(--color-border)] font-display text-xs font-bold text-[var(--color-text)]">
                {ROLE_INITIALS[user.role]}
              </div>
              <div className="hidden flex-col text-left xl:flex">
                <span className="text-xs font-bold text-[var(--color-text)]">{user.name}</span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--color-text-faint)]">
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={() => {
                logout();
                toast.push('success', 'Logged out of operations system.');
              }}
              className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-panel-2)] hover:text-red-400 transition-colors"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Content Router Pane */}
        <main className="flex-1 overflow-y-auto bg-[#0a0c0f] p-6">
          {/* SPA Route Selector */}
          {!isViewable ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShieldAlert className="mb-4 text-red-500" size={48} />
              <h2 className="font-display text-lg font-bold text-[var(--color-text)]">
                Access Restriction Guard
              </h2>
              <p className="mt-1.5 max-w-sm text-xs text-[var(--color-text-muted)]">
                Your currently assumed role <strong>{ROLE_LABEL[user.role]}</strong> is denied permission to view this interface under active RBAC rules.
              </p>
            </div>
          ) : (
            (() => {
              // Custom SPA Router mapping
              const hash = window.location.hash;
              if (hash === '#/dashboard') return <Dashboard />;
              
              switch (currentModule) {
                case 'fleet': return <Fleet />;
                case 'drivers': return <Drivers />;
                case 'trips': return <Trips />;
                case 'maintenance': return <Maintenance />;
                case 'fuel_exp': return <FuelExpenses />;
                case 'analytics': return <Analytics />;
                case 'settings': return <Settings />;
                default: return <Fleet />;
              }
            })()
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
