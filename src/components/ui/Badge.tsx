import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant = 'new' | 'bestseller' | 'sale';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, string> = {
  new: 'bg-red-500 text-white uppercase tracking-wider',
  bestseller: 'bg-amber-500 text-white uppercase tracking-wider',
  sale: 'bg-green-500 text-white',
};

/** Shared product flag badge (New / Bestseller / -% off). */
export default function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-xs font-bold px-3 py-1 rounded-full',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
