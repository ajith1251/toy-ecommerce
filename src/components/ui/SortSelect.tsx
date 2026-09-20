import { ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { SortOption } from '../../hooks/useFilters';

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

const options: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'bestseller', label: 'Bestsellers' },
];

export default function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <div className={cn('relative', className)}>
      <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value as SortOption)}
        aria-label="Sort products"
        className={cn(
          'pl-9 pr-4 py-2.5 rounded-[var(--radius-button,8px)] text-sm font-semibold appearance-none cursor-pointer',
          'bg-[var(--surface)] border border-[var(--hairline)] text-[var(--ink)] shadow-sm hover:border-[rgba(0,0,0,0.15)]',
          'focus:outline-none focus:ring-4 focus:ring-[rgba(76,125,255,0.15)] focus:border-[var(--accent-blue)]',
          'transition-all'
        )}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
