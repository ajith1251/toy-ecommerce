import type { CartItem } from '../../types';
import type { OrderTotals } from '../../utils/orderCalculations';
import { formatMoney } from '../../utils/orderCalculations';
import { cn } from '../../lib/cn';

interface OrderSummaryProps {
  items: CartItem[];
  totals: OrderTotals;
  className?: string;
}

export default function OrderSummary({ items, totals, className }: OrderSummaryProps) {
  return (
    <div className={cn('bg-[var(--surface-soft)] rounded-[var(--radius-card,16px)] p-6 border border-[var(--hairline)] shadow-sm', className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-blue)] mb-4">
        Order Summary ({items.length})
      </p>

      <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-4 group">
            <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-[8px] flex-shrink-0 border border-[var(--hairline)] mix-blend-multiply bg-[var(--surface)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--ink-strong)] truncate mb-0.5">{item.name}</p>
              <p className="text-xs font-semibold text-[var(--muted-light)]">Qty {item.quantity}</p>
            </div>
            <span className="text-sm font-bold text-[var(--ink-strong)]">
              {formatMoney(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--hairline)] mt-5 pt-5 space-y-3 text-sm">
        <div className="flex justify-between font-semibold text-[var(--ink)]">
          <span>Subtotal</span>
          <span>{formatMoney(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between font-bold text-[var(--accent-green)]">
            <span>Discount</span>
            <span>-{formatMoney(totals.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-[var(--ink)]">
          <span>Shipping</span>
          <span>{totals.shipping === 0 ? 'Free' : formatMoney(totals.shipping)}</span>
        </div>
        <div className="flex justify-between font-semibold text-[var(--ink)]">
          <span>Tax</span>
          <span>{formatMoney(totals.tax)}</span>
        </div>
        <div className="flex justify-between font-extrabold text-lg text-[var(--ink-strong)] pt-3 border-t border-[var(--hairline)]">
          <span>Total</span>
          <span>{formatMoney(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
