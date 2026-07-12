import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { useDb } from './hooks/useDb';

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

// Primitives Import
import { Field, Input, Button, cx } from './components/primitives';

// Icon Imports
import {
  Truck, Users, Navigation, Wrench, Fuel, BarChart3, Settings as SettingsIcon, LogOut, ShieldAlert, Key, HelpCircle, Sun, Moon, LayoutDashboard, Menu, X as XIcon
} from 'lucide-react';

function AppContent() {
  const { user, login, logout } = useAuth();
  const toast = useToast();
  const db = useDb();

  // Dark/Light Theme Switcher State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('transitops_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('transitops_theme', theme);
  }, [theme]);

  // SPA Route State
  const [currentModule, setCurrentModule] = useState<Module>('settings');
  const [showDashboard, setShowDashboard] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Backend Toggle State
  const [useBackend, setUseBackend] = useState(false);
  useEffect(() => {
    db.useBackend = useBackend;
    if (useBackend) {
      db.initializeBackend().then(() => {
        toast.push('info', 'Connected to Database Backend Server');
      });
    } else {
      toast.push('info', 'Switched to Local Demo Data');
    }
  }, [useBackend]);

  // Login Form States
  const [email, setEmail] = useState('meera.s@transitops.in');
  const [password, setPassword] = useState('demo1234');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sync route hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '') as string;
      if (hash === 'dashboard') {
        setShowDashboard(true);
      } else if (['fleet', 'drivers', 'trips', 'fuel_exp', 'analytics', 'maintenance', 'settings'].includes(hash)) {
        setShowDashboard(false);
        setCurrentModule(hash as Module);
      } else {
        setShowDashboard(false);
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
        driver: 'trips',
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
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
        {/* Left branding pane */}
        <div className="hidden w-2/5 flex-col justify-between bg-[var(--color-panel)] p-10 border-r border-[var(--color-border)] lg:flex">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold font-display text-xl shadow-md">
              T
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--color-text)]">
                TransitOps
              </h1>
              <p className="font-display text-xs font-semibold tracking-wider text-orange-500 uppercase mt-0.5">
                Fleet & Dispatch Command Center
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
                Unified Fleet Control
              </h2>
              <p className="mt-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
                Integrate real-time status tracking, driver safety scorecards, automated compliance triggers, and expense ledger analysis in one secure workspace.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text-muted)]">
                Select a profile to begin demo session:
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => handleQuickLogin('meera.s@transitops.in')} className="flex flex-col items-start rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3 hover:border-orange-500/50 hover-glow transition-all active:scale-[0.98] text-left">
                  <span className="font-semibold text-[var(--color-text)]">Fleet Manager</span>
                  <span className="text-[10px] text-[var(--color-text-faint)]">Meera Shah</span>
                </button>
                <button onClick={() => handleQuickLogin('raven.k@transitops.in')} className="flex flex-col items-start rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3 hover:border-orange-500/50 hover-glow transition-all active:scale-[0.98] text-left">
                  <span className="font-semibold text-[var(--color-text)] font-display text-xs">Driver</span>
                  <span className="text-[10px] text-[var(--color-text-faint)] mt-0.5">Raven K.</span>
                </button>
                <button onClick={() => handleQuickLogin('arjun.n@transitops.in')} className="flex flex-col items-start rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3 hover:border-orange-500/50 hover-glow transition-all active:scale-[0.98] text-left">
                  <span className="font-semibold text-[var(--color-text)]">Safety Officer</span>
                  <span className="text-[10px] text-[var(--color-text-faint)]">Arjun Nair</span>
                </button>
                <button onClick={() => handleQuickLogin('priyanka.d@transitops.in')} className="flex flex-col items-start rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3 hover:border-orange-500/50 hover-glow transition-all active:scale-[0.98] text-left">
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
        <div className="relative flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
          <div className="absolute top-6 right-6">
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border-soft)] hover:text-[var(--color-text)] transition-colors active:scale-95 shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

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
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-700 dark:text-red-200">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-red-500 dark:text-red-400">
                  <ShieldAlert size={14} />
                  Authentication Failed
                </div>
                <div className="mt-1 font-semibold">{loginError}</div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <Field label="Email Address">
                <Input
                  required
                  type="email"
                  placeholder="name@transitops.in"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                />
              </Field>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="block text-xs font-semibold text-[var(--color-text-muted)] tracking-tight">Password</span>
                  <span className="text-[11px] font-medium text-orange-500 hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <Input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-[var(--color-text-muted)] select-none">
                  <input type="checkbox" defaultChecked className="rounded accent-orange-500" />
                  <span>Remember me</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={failedAttempts >= 5}
                className="w-full font-bold shadow-lg"
              >
                Sign In
              </Button>
            </form>

            {/* Mobile Helper Info */}
            <div className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-[11px] text-[var(--color-text-muted)] lg:hidden">
              <div className="font-semibold text-[var(--color-text)] flex items-center gap-1">
                <Key size={12} className="text-amber-500" />
                Demo Credentials:
              </div>
              <ul className="mt-1 space-y-1 pl-4 list-disc text-[10px] text-[var(--color-text-faint)]">
                <li>Manager: meera.s@transitops.in / demo1234</li>
                <li>Driver: raven.k@transitops.in / demo1234</li>
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
  const NAVIGATION_ITEMS: { id: Module | 'dashboard'; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'fleet', label: 'Fleet Registry', icon: <Truck size={16} /> },
    { id: 'drivers', label: 'Driver Management', icon: <Users size={16} /> },
    { id: 'trips', label: 'Trip Management', icon: <Navigation size={16} /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={16} /> },
    { id: 'fuel_exp', label: 'Fuel & Expenses', icon: <Fuel size={16} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-panel)] md:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold font-display text-sm shadow-sm">
            T
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-tight text-[var(--color-text)]">TransitOps</h2>
            <span className="text-[10px] font-semibold text-orange-500 tracking-tight">Gujarat Logistics</span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAVIGATION_ITEMS.map((item) => {
            // Dashboard is always visible; other items follow RBAC
            if (item.id !== 'dashboard') {
              const hasAccess = canView(user.role, item.id as Module);
              if (!hasAccess) return null;
            }

            const isActive = item.id === 'dashboard' ? showDashboard : (!showDashboard && currentModule === item.id);
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id as Module)}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 border ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-500 border-orange-500/10 shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text)] border-transparent'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border)] space-y-1">
          <button
            onClick={() => navigateTo('settings' as Module)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[11px] text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-colors"
          >
            <HelpCircle size={14} />
            Help & Documentation
          </button>
        </div>
      </aside>

      {/* Mobile Nav Overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button onClick={() => setMobileNavOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-xs" aria-label="Close menu" />
          <aside className="relative w-64 h-full flex flex-col border-r border-[var(--color-border)] bg-[var(--color-panel)] shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold font-display text-sm">T</div>
                <span className="font-display text-sm font-bold text-[var(--color-text)]">TransitOps</span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <XIcon size={16} />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 px-3 py-4">
              {NAVIGATION_ITEMS.map((item) => {
                if (item.id !== 'dashboard') {
                  const hasAccess = canView(user.role, item.id as Module);
                  if (!hasAccess) return null;
                }
                const isActive = item.id === 'dashboard' ? showDashboard : (!showDashboard && currentModule === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigateTo(item.id as Module); setMobileNavOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 border ${
                      isActive ? 'bg-orange-500/10 text-orange-500 border-orange-500/10 shadow-xs' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text)] border-transparent'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)] px-4 sm:px-6">
          {/* Mobile hamburger + Live Ops badge */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text)] transition-colors md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="hidden sm:flex items-center gap-2.5 text-xs font-semibold text-[var(--color-text-muted)] font-display">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${useBackend ? 'bg-orange-400' : 'bg-emerald-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${useBackend ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
              </span>
              <span>{useBackend ? 'Backend Active' : 'Local Demo'}</span>
            </div>
          </div>

          <div className="flex-1 flex justify-center items-center">
            <button
              onClick={() => setUseBackend(!useBackend)}
              className={cx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
                useBackend ? "bg-orange-500" : "bg-[var(--color-border)]"
              )}
            >
              <span className="sr-only">Toggle Backend</span>
              <span
                className={cx(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  useBackend ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
            <span className="ml-2 text-[10px] font-semibold text-[var(--color-text-muted)] hidden sm:block">
              {useBackend ? 'Odoo DB' : 'Local DB'}
            </span>
          </div>

          {/* User Widget + Role Badge */}
          <div className="flex items-center gap-3.5">
            {/* Static Role Badge */}
            <div className={cx(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              user.role === 'fleet_manager' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
              user.role === 'driver' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
              user.role === 'safety_officer' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
              "bg-purple-500/10 text-purple-500 border-purple-500/20"
            )}>
              {user.role === 'fleet_manager' && <SettingsIcon size={12} />}
              {user.role === 'driver' && <Truck size={12} />}
              {user.role === 'safety_officer' && <ShieldAlert size={12} />}
              {user.role === 'financial_analyst' && <BarChart3 size={12} />}
              {ROLE_LABEL[user.role]}
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-panel-2)] border border-[var(--color-border)] font-display text-xs font-bold text-[var(--color-text)]">
                {ROLE_INITIALS[user.role]}
              </div>
              <div className="hidden flex-col text-left xl:flex">
                <span className="text-xs font-bold text-[var(--color-text)]">{user.name}</span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--color-text-faint)]">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Theme switcher */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text)] transition-colors active:scale-95"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

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
        <main className="flex-1 overflow-y-auto bg-[var(--color-bg)] p-6">
          {/* SPA Route Selector */}
          {showDashboard ? (
            <Dashboard />
          ) : !isViewable ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShieldAlert className="mb-4 text-red-500" size={48} />
              <h2 className="font-display text-lg font-bold text-[var(--color-text)]">
                Access Restricted
              </h2>
              <p className="mt-1.5 max-w-sm text-xs text-[var(--color-text-muted)]">
                Your role <strong>{ROLE_LABEL[user.role]}</strong> does not have permission to view this module.
              </p>
            </div>
          ) : (
            (() => {
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
