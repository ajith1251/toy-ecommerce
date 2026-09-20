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
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                active
                  ? 'bg-[var(--accent-blue)] text-[var(--page)] shadow-md shadow-[var(--accent-blue)]/20'
                  : completed
                    ? 'bg-[var(--surface-soft)] border border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'bg-[var(--surface-soft)] border border-[var(--hairline)] text-[var(--muted-light)]'
              }`}
            >
              {completed ? <Check size={16} aria-hidden /> : <Icon size={16} aria-hidden />}
              <span>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                aria-hidden
                className={`w-8 h-1 rounded-full ${completed ? 'bg-[var(--accent-green)]' : 'bg-[var(--surface-soft)]'}`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
