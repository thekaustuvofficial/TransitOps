import type { ReactNode } from 'react';
import { cx } from './primitives';

export function KpiCard({
  label,
  value,
  accent,
  sub,
  onClick,
}: {
  label: string;
  value: ReactNode;
  accent: string;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-4 animate-rise-in',
        'transition-all duration-200 ease-out',
        onClick && 'cursor-pointer group',
        onClick && 'hover:-translate-y-0.5 hover:shadow-lg hover:border-[var(--color-border)]',
      )}
      style={{
        borderTopWidth: 2,
        borderTopColor: accent,
      }}
    >
      {/* Subtle accent glow overlay on hover */}
      {onClick && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}10 0%, transparent 70%)` }}
        />
      )}

      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-faint)] leading-none mb-2.5">
        {label}
      </p>
      <p
        className="text-2xl font-black tabular-nums tracking-tight font-display leading-none"
        style={{ color: accent }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 text-[10px] text-[var(--color-text-faint)] font-medium leading-tight">
          {sub}
        </p>
      )}
    </div>
  );
}
