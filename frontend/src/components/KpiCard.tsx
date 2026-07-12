import type { ReactNode } from 'react';
import { Card } from './primitives';

export function KpiCard({ label, value, accent, sub }: { label: string; value: ReactNode; accent: string; sub?: string }) {
  return (
    <Card accent={accent} className="px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="font-display mt-1.5 text-2xl font-semibold tabular-nums text-[var(--color-text)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">{sub}</p>}
    </Card>
  );
}
