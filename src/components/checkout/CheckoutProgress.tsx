import { ClipboardCheck, CreditCard, MapPin, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CheckoutStep } from '../../types/checkout';

interface CheckoutProgressProps {
  current: CheckoutStep;
}

const STEPS: { key: CheckoutStep; label: string; icon: LucideIcon }[] = [
  { key: 'shipping', label: 'Shipping', icon: MapPin },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'review', label: 'Review', icon: ClipboardCheck },
];

export default function CheckoutProgress({ current }: CheckoutProgressProps) {
  const currentIndex = STEPS.findIndex(s => s.key === current);

  return (
    <nav aria-label="Checkout progress" className="flex items-center justify-center gap-2 px-6 pt-5">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const active = i === currentIndex;
        const completed = i < currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                active
                  ? 'bg-red-500 text-white shadow-md'
                  : completed
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              {completed ? <Check size={14} aria-hidden /> : <Icon size={14} aria-hidden />}
              <span>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                aria-hidden
                className={`w-6 h-0.5 rounded ${completed ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-700'}`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
