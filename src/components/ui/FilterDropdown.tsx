import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/cn';

interface FilterDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}

export default function FilterDropdown({ label, value, options, onChange, className }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || label;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button,8px)] text-sm font-semibold transition-all cursor-pointer',
          'border hover:border-[rgba(0,0,0,0.15)] shadow-sm',
          'bg-[var(--surface)] text-[var(--ink)]',
          value !== 'all' ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]' : 'border-[var(--hairline)]'
        )}
      >
        {selectedLabel}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            className="absolute top-full left-0 mt-2 w-48 bg-[var(--surface)] rounded-[var(--radius-card,16px)] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[var(--hairline)] py-2 z-50 max-h-60 overflow-y-auto"
          >
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors cursor-pointer',
                  option.value === value
                    ? 'bg-[var(--surface-soft)] text-[var(--accent-blue)] font-semibold'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink-strong)]'
                )}
              >
                {option.label}
                {option.value === value && <Check size={14} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
