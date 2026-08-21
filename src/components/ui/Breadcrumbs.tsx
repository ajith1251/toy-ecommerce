import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface BreadcrumbItem {
  label: string;
  /** When provided, the crumb renders as a real navigation link. */
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)}>
      <Link
        to="/"
        className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <Home size={14} aria-hidden />
        <span>Home</span>
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={14} className="text-slate-300" aria-hidden />
          {item.to ? (
            <Link
              to={item.to}
              className={cn(
                'transition-colors',
                i === items.length - 1
                  ? 'text-slate-900 dark:text-white font-medium pointer-events-none'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              )}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                'transition-colors',
                i === items.length - 1
                  ? 'text-slate-900 dark:text-white font-medium'
                  : 'text-slate-400'
              )}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
