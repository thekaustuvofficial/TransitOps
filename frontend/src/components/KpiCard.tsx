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
        'relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 animate-rise-in',
        'transition-all duration-300 ease-out flex flex-col justify-between h-full shadow-sm',
        onClick && 'cursor-pointer group',
        onClick && 'hover:-translate-y-1 hover:shadow-xl hover:border-[var(--color-border-soft)]',
      )}
    >
      {/* Dynamic gradient background */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.08] dark:group-hover:opacity-[0.12]"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, transparent 100%)` }}
      />
      
      {/* Hover glow line */}
      {onClick && (
        <div 
          className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }}
        />
      )}
      
      {/* Default top line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[3px] transition-opacity duration-300 group-hover:opacity-0"
        style={{ backgroundColor: accent }}
      />

      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2 line-clamp-1 break-all" title={label}>
          {label}
        </p>
        <p
          className="text-3xl font-black tabular-nums tracking-tight font-display drop-shadow-sm"
          style={{ color: accent }}
        >
          {value}
        </p>
        {sub && (
          <p className="mt-2 text-xs text-[var(--color-text-faint)] font-medium">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
