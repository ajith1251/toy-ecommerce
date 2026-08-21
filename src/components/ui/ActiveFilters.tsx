import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface FilterChip {
  label: string;
  onRemove: () => void;
}

interface ActiveFiltersProps {
  chips: FilterChip[];
  onClearAll: () => void;
  className?: string;
}

export default function ActiveFilters({ chips, onClearAll, className }: ActiveFiltersProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map(chip => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label} filter`}
            className="p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
