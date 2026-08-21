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
    <div className={cn('bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700', className)}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">
        Order Summary ({items.length})
      </p>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
              <p className="text-xs text-slate-400">Qty {item.quantity}</p>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {formatMoney(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Subtotal</span>
          <span>{formatMoney(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span>Discount</span>
            <span>-{formatMoney(totals.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Shipping</span>
          <span>{totals.shipping === 0 ? 'Free' : formatMoney(totals.shipping)}</span>
        </div>
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Tax</span>
          <span>{formatMoney(totals.tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white pt-1.5">
          <span>Total</span>
          <span>{formatMoney(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
