import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type ButtonHTMLAttributes, forwardRef } from 'react';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ---- Button ----------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}
const VARIANT_CLS: Record<ButtonVariant, string> = {
  primary: 'bg-amber-600 hover:bg-amber-500 text-black font-semibold disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-faint)]',
  secondary: 'bg-[var(--color-panel-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)]',
  ghost: 'bg-transparent hover:bg-[var(--color-panel-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
  danger: 'bg-red-600/90 hover:bg-red-600 text-white',
};
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        VARIANT_CLS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

// ---- Input / Select ----------------------------------------------------------
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--color-text-faint)]">{hint}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cx(
        'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]',
        'focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600/40',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={cx(
        'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-sm text-[var(--color-text)]',
        'focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600/40',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

// ---- Card --------------------------------------------------------------------
export function Card({ children, className, accent }: { children: ReactNode; className?: string; accent?: string }) {
  return (
    <div
      className={cx('rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)]', className)}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}
    >
      {children}
    </div>
  );
}

// ---- Badge ---------------------------------------------------------------------
export function Badge({ children, color, className }: { children: ReactNode; color: string; className?: string }) {
  return (
    <span
      className={cx('inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium', className)}
      style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}40` }}
    >
      {children}
    </span>
  );
}

// ---- Modal -----------------------------------------------------------------
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className={cx('relative w-full animate-slide-in rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] shadow-2xl', width)}>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--color-text)]">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text)]" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ---- Empty state -------------------------------------------------------------
export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{title}</p>
      {detail && <p className="max-w-xs text-xs text-[var(--color-text-faint)]">{detail}</p>}
    </div>
  );
}

// ---- Inline banner (rule violation / success) ---------------------------------
export function Banner({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const cls = {
    error: 'border-red-500/40 bg-red-500/10 text-red-300',
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    info: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  }[tone];
  return <div className={cx('rounded-md border px-3 py-2.5 text-sm leading-snug', cls)}>{children}</div>;
}
