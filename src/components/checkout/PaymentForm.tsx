import { Banknote, CreditCard, Lock, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PAYMENT_METHOD_LABELS } from '../../constants/checkout';
import { cn } from '../../lib/cn';
import type { CardFormData, PaymentErrors, PaymentFormData } from '../../types/checkout';
import type { PaymentMethod } from '../../types/order';
import Input from '../ui/Input';

interface PaymentFormProps {
  value: PaymentFormData;
  errors: PaymentErrors;
  onMethodChange: (method: PaymentMethod) => void;
  onCardChange: (field: keyof CardFormData, value: string) => void;
  onUpiChange: (value: string) => void;
}

const METHODS: { key: PaymentMethod; icon: LucideIcon; description: string }[] = [
  { key: 'card', icon: CreditCard, description: 'Visa, Mastercard, Amex' },
  { key: 'upi', icon: Smartphone, description: 'Google Pay, PhonePe, Paytm' },
  { key: 'cod', icon: Banknote, description: 'Pay when it arrives' },
];

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PaymentForm({
  value,
  errors,
  onMethodChange,
  onCardChange,
  onUpiChange,
}: PaymentFormProps) {
  return (
    <div className="space-y-6 bg-[var(--surface)] p-8 rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm">
      <h3 className="font-extrabold text-xl text-[var(--ink-strong)] flex items-center gap-3 border-b border-[var(--hairline)] pb-4 mb-2">
        <CreditCard size={24} className="text-[var(--accent-coral)]" aria-hidden />
        Payment Details
      </h3>

      <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {METHODS.map(({ key, icon: Icon, description }) => {
          const selected = value.method === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onMethodChange(key)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-[var(--radius-card,16px)] border-2 p-4 text-left transition-all cursor-pointer shadow-sm active:scale-95',
                selected
                  ? 'border-[var(--accent-coral)] bg-[var(--accent-coral)]/10'
                  : 'border-[var(--hairline)] bg-[var(--surface-soft)] hover:border-[var(--accent-coral)]'
              )}
            >
              <span className="flex items-center gap-2 font-bold text-sm text-[var(--ink-strong)]">
                <Icon size={18} className={selected ? 'text-[var(--accent-coral)]' : 'text-[var(--muted)]'} aria-hidden />
                {PAYMENT_METHOD_LABELS[key]}
              </span>
              <span className={cn("text-xs font-medium mt-1", selected ? 'text-[var(--accent-coral)]/80' : 'text-[var(--muted-light)]')}>{description}</span>
            </button>
          );
        })}
      </div>

{value.method === 'card' && (
         <div className="space-y-4 pt-2">
           <Input
             label="Cardholder Name"
             name="cardName"
             autoComplete="cc-name"
             placeholder="Jane Doe"
             value={value.card.cardName}
             onChange={e => onCardChange('cardName', e.target.value)}
             error={errors.card.cardName}
           />
           <Input
             label="Card Number"
             name="cardNumber"
             autoComplete="cc-number"
             inputMode="numeric"
             placeholder="4242 4242 4242 4242"
             value={value.card.cardNumber}
             onChange={e => onCardChange('cardNumber', formatCardNumber(e.target.value))}
             error={errors.card.cardNumber}
             hint="Secure payment processing via Razorpay"
           />
           <div className="grid grid-cols-2 gap-4">
             <Input
               label="Expiry (MM/YY)"
               name="expiry"
               autoComplete="cc-exp"
               inputMode="numeric"
               placeholder="08/28"
               value={value.card.expiry}
               onChange={e => onCardChange('expiry', formatExpiry(e.target.value))}
               error={errors.card.expiry}
             />
             <Input
               label="CVV"
               name="cvv"
               autoComplete="cc-csc"
               inputMode="numeric"
               type="password"
               placeholder="123"
               value={value.card.cvv}
               onChange={e => onCardChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
               error={errors.card.cvv}
             />
           </div>
         </div>
       )}
       
       {value.method === 'upi' && (
         <div className="pt-2">
           <Input
             label="UPI ID"
             name="upiId"
             autoComplete="off"
             placeholder="yourname@bank"
             value={value.upiId}
             onChange={e => onUpiChange(e.target.value)}
             error={errors.upiId}
             hint="Secure UPI payment processing via Razorpay"
           />
         </div>
       )}
       
       {value.method === 'cod' && (
         <div className="bg-[var(--surface-soft)] border border-[var(--hairline)] rounded-[var(--radius-button,8px)] p-4 text-sm font-medium text-[var(--ink)] mt-2">
           Pay in cash or by card when your order arrives. No payment credentials needed.
         </div>
       )}
       
       <p className="flex items-center gap-2 text-xs font-bold text-[var(--muted-light)] pt-4 border-t border-[var(--hairline)] mt-4">
         <Lock size={14} aria-hidden className="text-[var(--accent-coral)]" />
         Payments processed securely via Razorpay
       </p>
    </div>
  );
}
