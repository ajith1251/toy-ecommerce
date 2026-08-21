import { Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  className?: string;
}

export default function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'p-2 rounded-full transition-all cursor-pointer',
        'hover:bg-slate-100 dark:hover:bg-slate-800',
        className
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={20} className="text-slate-600" />
      ) : (
        <Sun size={20} className="text-amber-400" />
      )}
    </button>
  );
}
