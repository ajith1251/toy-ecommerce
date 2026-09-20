import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Toast } from '../../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const iconColors = {
  success: 'text-[var(--accent-green)]',
  error: 'text-[var(--accent-coral)]',
  info: 'text-[var(--accent-blue)]',
};

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-button,8px)] border border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-w-[280px]'
              )}
            >
              <Icon size={18} className={cn("flex-shrink-0", iconColors[toast.type])} />
              <span className="text-sm font-semibold flex-1">{toast.message}</span>
              <button
                onClick={() => onRemove(toast.id)}
                aria-label="Dismiss notification"
                className="p-1 rounded-full text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
