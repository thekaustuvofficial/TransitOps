import type { PermissionMatrix, Role, Module, Permission } from '../types';

// Mirrors the Settings → Role-Based Access screen exactly. Keeping this as
// one flat table (rather than scattered `if role === ...` checks through the
// app) is what makes it possible to enforce the same matrix again server-side
// later (e.g. as Postgres RLS policies or Express middleware) without having
// to go hunting through every component.
//
// Role Design:
// - fleet_manager  → Full operational control: fleet, drivers, trips, maintenance, analytics, settings
// - dispatcher     → Trip creation & dispatch: trips (full), fleet/drivers (view only)
// - safety_officer → Driver compliance + maintenance oversight: drivers, maintenance (full), trips/analytics (view)
// - financial_analyst → Cost analysis: fuel/expenses (full), analytics (full), trips/maintenance (view)
export const PERMISSIONS: PermissionMatrix = {
  fleet_manager: {
    fleet: 'full', drivers: 'full', trips: 'full', fuel_exp: 'view',
    analytics: 'view', maintenance: 'full', settings: 'full',
  },
  dispatcher: {
    fleet: 'view', drivers: 'view', trips: 'full', fuel_exp: 'none',
    analytics: 'none', maintenance: 'none', settings: 'none',
  },
  safety_officer: {
    fleet: 'view', drivers: 'full', trips: 'view', fuel_exp: 'none',
    analytics: 'view', maintenance: 'full', settings: 'none',
  },
  financial_analyst: {
    fleet: 'view', drivers: 'none', trips: 'view', fuel_exp: 'full',
    analytics: 'full', maintenance: 'view', settings: 'none',
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  fleet_manager:    'Fleet Manager',
  dispatcher:       'Dispatcher',
  safety_officer:   'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

export const ROLE_INITIALS: Record<Role, string> = {
  fleet_manager:    'FM',
  dispatcher:       'DS',
  safety_officer:   'SO',
  financial_analyst: 'FA',
};

export function can(role: Role, module: Module): Permission {
  return PERMISSIONS[role][module];
}

export function canEdit(role: Role, module: Module): boolean {
  return can(role, module) === 'full';
}

export function canView(role: Role, module: Module): boolean {
  return can(role, module) !== 'none';
}

// First module a role should land on after login.
export const HOME_ROUTE: Record<Role, string> = {
  fleet_manager:    '/fleet',
  dispatcher:       '/trips',
  safety_officer:   '/drivers',
  financial_analyst: '/analytics',
};
