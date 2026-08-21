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
      <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value as SortOption)}
        aria-label="Sort products"
        className={cn(
          'pl-9 pr-4 py-2.5 rounded-xl text-sm font-medium appearance-none cursor-pointer',
          'bg-white border border-slate-200 text-slate-700',
          'focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300',
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
