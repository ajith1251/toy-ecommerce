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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button,8px)] text-xs font-semibold bg-[var(--surface)] border border-[var(--hairline)] text-[var(--ink)] shadow-sm"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label} filter`}
            className="p-0.5 rounded-full hover:bg-[var(--surface-soft)] hover:text-[var(--accent-coral)] transition-colors cursor-pointer text-[var(--muted)]"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-[var(--muted)] hover:text-[var(--ink-strong)] font-semibold transition-colors cursor-pointer ml-1 u-link"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
