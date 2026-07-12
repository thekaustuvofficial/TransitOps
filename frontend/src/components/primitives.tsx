import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type ButtonHTMLAttributes, forwardRef, useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function CustomSelect({ value, onChange, options, placeholder, className }: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find(o => o.value === value);

  return (
    <div className={cx("relative w-full text-left font-sans", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-text)] cursor-pointer hover:border-orange-500/50 focus:border-orange-500/80 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder || "Select..."}</span>
        <svg className={cx("ml-2 h-4 w-4 shrink-0 text-[var(--color-text-faint)] transition-transform duration-200", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] py-1 shadow-lg animate-slide-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={cx(
                "flex w-full items-center px-3 py-2 text-sm text-left hover:bg-[var(--color-panel-2)] transition-colors",
                opt.value === value ? "text-orange-500 font-semibold bg-orange-500/5" : "text-[var(--color-text-muted)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Button ----------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

const VARIANT_CLS: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium shadow-sm hover:shadow-orange-500/10 active:scale-[0.98] transition-all duration-200',
  secondary: 'bg-[var(--color-panel-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)] active:scale-[0.98] transition-all duration-200',
  ghost: 'bg-transparent hover:bg-[var(--color-panel-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] active:scale-[0.98] transition-all duration-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white font-medium active:scale-[0.98] transition-all duration-200',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100 focus-visible:ring-2 focus-visible:ring-orange-500/50',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5',
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

// ---- Input / Select / Form Field ---------------------------------------------
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1 text-left w-full">
      <span className="block text-xs font-semibold text-[var(--color-text-muted)] tracking-tight">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[var(--color-text-faint)] leading-normal">{hint}</span>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cx(
        'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]',
        'focus:border-orange-500/80 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-250',
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
        'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-text)] cursor-pointer',
        'focus:border-orange-500/80 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-250',
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
export function Card({ children, className, accent, hoverable, onClick }: { children: ReactNode; className?: string; accent?: string; hoverable?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] transition-all duration-300 shadow-sm',
        hoverable && 'hover:shadow-lg hover:border-orange-500/40 hover:-translate-y-0.5 cursor-pointer',
        className
      )}
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
      className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-normal border font-display', className)}
      style={{ color, backgroundColor: `${color}0a`, borderColor: `${color}25` }}
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
      {/* Backdrop with elegant blur */}
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300" />
      <div className={cx('relative w-full animate-slide-in rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-2xl overflow-hidden', width)}>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-panel-2)]">
          <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--color-text)]">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border-soft)] hover:text-[var(--color-text)] transition-all" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

// ---- Empty state -------------------------------------------------------------
export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-sm font-semibold text-[var(--color-text-muted)]">{title}</p>
      {detail && <p className="max-w-xs text-xs text-[var(--color-text-faint)] leading-normal">{detail}</p>}
    </div>
  );
}

// ---- Inline banner (rule violation / success) ---------------------------------
export function Banner({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const cls = {
    error: 'border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400',
    success: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    info: 'border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400',
  }[tone];
  return <div className={cx('rounded-lg border px-4 py-3 text-xs sm:text-sm leading-relaxed', cls)}>{children}</div>;
}
