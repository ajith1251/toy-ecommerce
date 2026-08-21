import { Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search products...', className }: SearchBarProps) {
  return (
    <div className={cn('relative flex-1 max-w-md', className)}>
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-11 pr-10 py-2.5 rounded-xl text-sm',
          'bg-white border border-slate-200 text-slate-900 placeholder-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300',
          'transition-all'
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={14} className="text-slate-400" />
        </button>
      )}
    </div>
  );
}
