import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  /** Lucide icon (or emoji) displayed in the soft circle. */
  icon: ReactNode;
  title: string;
  description?: string;
  /** Buttons / links rendered under the description. */
  actions?: ReactNode;
  /** Heading level — h1 on standalone pages, h2 when a page already has an h1. */
  titleTag?: 'h1' | 'h2' | 'h3';
  className?: string;
}

/**
 * Standardized empty / not-found state used by cart, wishlist, orders, search
 * results and the product/category/brand/order not-found pages. Keeps the
 * ToyBox visual identity (motion, rounded, slate palette).
 */
export default function EmptyState({
  icon,
  title,
  description,
  actions,
  titleTag = 'h2',
  className,
}: EmptyStateProps) {
  const Heading = titleTag;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('text-center py-24 max-w-xl mx-auto px-6', className)}
    >
      <div className="w-20 h-20 mx-auto rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-6 border border-[var(--hairline)] shadow-sm">
        <span className="text-[var(--muted-light)] [&>svg]:w-8 [&>svg]:h-8" aria-hidden>
          {icon}
        </span>
      </div>
      <Heading className="text-2xl font-semibold text-[var(--ink-strong)] mb-3">{title}</Heading>
      {description && <p className="text-[var(--muted)] mb-8 text-base leading-relaxed">{description}</p>}
      {actions && <div className="flex flex-col sm:flex-row gap-3 justify-center">{actions}</div>}
    </motion.div>
  );
}
