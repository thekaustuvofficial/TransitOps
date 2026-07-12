import type { ReactNode } from 'react';
import { Card, cx } from './primitives';

export function KpiCard({ label, value, accent, sub, onClick }: { label: string; value: ReactNode; accent: string; sub?: string; onClick?: () => void }) {
  return (
    <Card
      onClick={onClick}
      className={cx(
        "px-5 py-4 hover-glow border-[var(--color-border)] relative overflow-hidden transition-all duration-200",
        onClick && "cursor-pointer active:scale-[0.98]"
      )}
      accent={accent}
    >
      <p className="text-xs font-semibold text-[var(--color-text-muted)] tracking-tight">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-text)] font-display tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-[var(--color-text-faint)] leading-normal font-medium">{sub}</p>}
    </Card>
  );
}
