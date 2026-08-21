import { ClipboardCheck } from 'lucide-react';
import { PAYMENT_METHOD_LABELS } from '../../constants/checkout';
import type { CartItem } from '../../types';
import type { PaymentFormData, ShippingFormData } from '../../types/checkout';
import type { OrderTotals } from '../../utils/orderCalculations';
import { formatMoney } from '../../utils/orderCalculations';

interface OrderReviewProps {
  items: CartItem[];
  shipping: ShippingFormData;
  payment: PaymentFormData;
  totals: OrderTotals;
}

function paymentSummary(payment: PaymentFormData): string {
  if (payment.method === 'card') {
    const digits = payment.card.cardNumber.replace(/\D/g, '');
    const last4 = digits.length > 0 ? digits.slice(-4) : '••••';
    return `${PAYMENT_METHOD_LABELS.card} · •••• ${last4} · Exp ${payment.card.expiry || 'MM/YY'}`;
  }
  if (payment.method === 'upi') {
    return `${PAYMENT_METHOD_LABELS.upi} · ${payment.upiId || '—'}`;
  }
  return PAYMENT_METHOD_LABELS.cod;
}

export default function OrderReview({ items, shipping, payment, totals }: OrderReviewProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <ClipboardCheck size={18} className="text-red-500" aria-hidden />
          Order Summary
        </h3>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
              <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                <p className="text-xs text-slate-400">
                  {item.brand} · Qty {item.quantity} · {formatMoney(item.price)} each
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatMoney(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Customer</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {shipping.firstName} {shipping.lastName}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{shipping.email}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{shipping.phone}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Shipping To</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {shipping.line1}
            {shipping.line2 ? `, ${shipping.line2}` : ''}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {shipping.city}, {shipping.state} {shipping.postalCode}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{shipping.country}</p>
        </div>
        <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Payment</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{paymentSummary(payment)}</p>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2 text-sm">
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
        <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white pt-2">
          <span>Total</span>
          <span>{formatMoney(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
