import type { PermissionMatrix, Role, Module, Permission } from '../types';

// Mirrors the Settings → Role-Based Access screen exactly. Keeping this as
// one flat table (rather than scattered `if role === ...` checks through the
// app) is what makes it possible to enforce the same matrix again server-side
// later (e.g. as Postgres RLS policies or Express middleware) without having
// to go hunting through every component.
export const PERMISSIONS: PermissionMatrix = {
  fleet_manager: {
    fleet: 'full', drivers: 'full', trips: 'none', fuel_exp: 'none',
    analytics: 'full', maintenance: 'full', settings: 'full',
  },
  dispatcher: {
    fleet: 'view', drivers: 'none', trips: 'full', fuel_exp: 'none',
    analytics: 'none', maintenance: 'view', settings: 'none',
  },
  safety_officer: {
    fleet: 'none', drivers: 'full', trips: 'view', fuel_exp: 'none',
    analytics: 'none', maintenance: 'none', settings: 'none',
  },
  financial_analyst: {
    fleet: 'view', drivers: 'none', trips: 'none', fuel_exp: 'full',
    analytics: 'full', maintenance: 'view', settings: 'none',
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  fleet_manager: 'Fleet Manager',
  dispatcher: 'Dispatcher',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

export const ROLE_INITIALS: Record<Role, string> = {
  fleet_manager: 'FM',
  dispatcher: 'DP',
  safety_officer: 'SO',
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
  fleet_manager: '/fleet',
  dispatcher: '/trips',
  safety_officer: '/drivers',
  financial_analyst: '/analytics',
};
