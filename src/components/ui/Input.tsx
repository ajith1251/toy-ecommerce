import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-[var(--ink-strong)]">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          'w-full px-4 py-3 rounded-[var(--radius-button,8px)] border bg-[var(--surface)]',
          'text-[var(--ink)] text-sm placeholder:text-[var(--muted-light)]',
          'focus:outline-none focus:ring-4 transition-all',
          error
            ? 'border-[var(--accent-coral)] focus:border-[var(--accent-coral)] focus:ring-[rgba(255,107,94,0.15)]'
            : 'border-[var(--hairline)] focus:border-[var(--accent-blue)] focus:ring-[rgba(76,125,255,0.15)] hover:border-[rgba(0,0,0,0.15)]',
          className
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-[var(--accent-coral)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
