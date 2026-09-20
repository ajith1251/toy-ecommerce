import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Shows an inline spinner and disables the button. */
  loading?: boolean;
}

const variants = {
  primary: 'bg-[var(--accent-blue)] text-white hover:brightness-110 shadow-sm border border-transparent',
  secondary: 'bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)] border border-[var(--hairline)]',
  outline: 'border border-[var(--hairline)] text-[var(--ink)] hover:bg-[var(--surface-soft)]',
  ghost: 'text-[var(--ink)] hover:bg-[var(--surface-soft)]',
  danger: 'bg-[var(--accent-coral)] text-white hover:brightness-110 shadow-sm border border-transparent',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-[var(--radius-button,8px)] font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)]',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
