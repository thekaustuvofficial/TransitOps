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
        'relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 animate-rise-in',
        'transition-all duration-300 ease-out flex flex-col justify-between shadow-sm',
        onClick && 'cursor-pointer group',
        onClick && 'hover:-translate-y-1 hover:shadow-xl hover:border-[var(--color-border-soft)]',
      )}
    >
      {/* Dynamic gradient background */}
      <div 
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.09] dark:group-hover:opacity-[0.14]"
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
        {/* Full label — no truncation, wraps to 2 lines max */}
        <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2 leading-tight line-clamp-2" title={label}>
          {label}
        </p>
        <p
          className="text-2xl font-black tabular-nums tracking-tight font-display drop-shadow-sm leading-none"
          style={{ color: accent }}
        >
          {value}
        </p>
        {sub && (
          <p className="mt-1.5 text-[10px] text-[var(--color-text-faint)] font-medium">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
