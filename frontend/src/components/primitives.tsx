import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type ButtonHTMLAttributes, forwardRef, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check } from 'lucide-react';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ---- Portal Dropdown Select -------------------------------------------------
// Renders the dropdown via a React portal at document.body so it's never
// clipped by overflow:hidden / overflow-x-auto ancestor containers.
export function CustomSelect({ value, onChange, options, placeholder, className }: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Recompute position whenever opening
  const openDropdown = () => {
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setDropPos({
        top: r.bottom + window.scrollY + 4,
        left: r.left + window.scrollX,
        width: r.width,
      });
    }
    setIsOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropRef.current && !dropRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    // Close on scroll so the dropdown doesn't float away
    const handleScroll = () => setIsOpen(false);
    document.addEventListener('mousedown', handleDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const selectedOpt = options.find(o => o.value === value);

  return (
    <div className={cx('relative w-full text-left font-sans', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-xs text-[var(--color-text)] cursor-pointer hover:border-orange-500/50 focus:border-orange-500/80 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
      >
        <span className="truncate text-[var(--color-text)]">{selectedOpt ? selectedOpt.label : placeholder || 'Select...'}</span>
        <ChevronDown className={cx('ml-2 h-3.5 w-3.5 shrink-0 text-[var(--color-text-faint)] transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropRef}
          className="fixed z-[9999] max-h-60 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] py-1 shadow-2xl animate-slide-in"
          style={{
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={cx(
                'flex w-full items-center justify-between px-3 py-2 text-xs text-left hover:bg-[var(--color-panel-2)] transition-colors',
                opt.value === value ? 'text-orange-500 font-semibold bg-orange-500/5' : 'text-[var(--color-text-muted)]'
              )}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={11} className="text-orange-500 shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
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
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:scale-100 focus-visible:ring-2 focus-visible:ring-orange-500/50',
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
    <div className="space-y-1.5 text-left w-full">
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
        'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]',
        'focus:border-orange-500/80 focus:bg-[var(--color-panel)] focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200',
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
        'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2.5 text-sm text-[var(--color-text)] cursor-pointer appearance-none',
        'focus:border-orange-500/80 focus:bg-[var(--color-panel)] focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200',
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
      style={{ color, backgroundColor: `${color}18`, borderColor: `${color}30` }}
    >
      {children}
    </span>
  );
}

// ---- Modal -----------------------------------------------------------------
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string;
}) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      />
      {/* Panel */}
      <div className={cx(
        'relative w-full animate-slide-in rounded-2xl overflow-hidden shadow-2xl',
        'border border-[var(--color-border)] bg-[var(--color-panel)]',
        width
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-panel-2)]">
          <h2 className="font-display text-sm font-bold tracking-tight text-[var(--color-text)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-all"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        {/* Body — scrolls internally, never overflows the viewport */}
        <div className="max-h-[calc(90vh-60px)] overflow-y-auto px-6 py-5">{children}</div>
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
    error:   'border-red-500/25 bg-red-500/8 text-red-500 dark:text-red-400',
    success: 'border-emerald-500/25 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400',
    info:    'border-blue-500/25 bg-blue-500/8 text-blue-500 dark:text-blue-300',
  }[tone];
  return <div className={cx('rounded-xl border px-4 py-3 text-xs sm:text-sm leading-relaxed', cls)}>{children}</div>;
}
