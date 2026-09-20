import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant = 'new' | 'bestseller' | 'sale';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, string> = {
  new: 'bg-[var(--accent-blue)] text-white uppercase tracking-wider',
  bestseller: 'bg-[var(--accent-yellow)] text-[var(--ink-strong)] uppercase tracking-wider',
  sale: 'bg-[var(--accent-coral)] text-white',
};

/** Shared product flag badge (New / Bestseller / -% off). */
export default function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-xs font-bold px-2 py-1 rounded-[var(--radius-badge,6px)]',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
