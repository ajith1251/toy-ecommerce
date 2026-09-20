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
    <div className="space-y-6">
      <div className="bg-[var(--surface)] p-6 rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm">
        <h3 className="font-extrabold text-xl text-[var(--ink-strong)] mb-4 flex items-center gap-2">
          <ClipboardCheck size={24} className="text-[var(--accent-blue)]" aria-hidden />
          Order Items
        </h3>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-4 bg-[var(--surface-soft)] border border-[var(--hairline)] rounded-[var(--radius-card,16px)] p-4">
              <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-[12px] flex-shrink-0 mix-blend-multiply bg-[var(--surface)] border border-[var(--hairline)]" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-blue)] mb-0.5">{item.brand}</p>
                <p className="text-sm font-bold text-[var(--ink-strong)] truncate mb-0.5">{item.name}</p>
                <p className="text-xs font-semibold text-[var(--muted-light)]">
                  Qty {item.quantity} · {formatMoney(item.price)} each
                </p>
              </div>
              <span className="text-base font-extrabold text-[var(--ink-strong)]">
                {formatMoney(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--hairline)] shadow-sm rounded-[var(--radius-card,16px)] p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-coral)] mb-2">Customer</p>
          <p className="text-sm font-bold text-[var(--ink-strong)] mb-1">
            {shipping.firstName} {shipping.lastName}
          </p>
          <p className="text-sm font-medium text-[var(--ink)]">{shipping.email}</p>
          <p className="text-sm font-medium text-[var(--ink)]">{shipping.phone}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--hairline)] shadow-sm rounded-[var(--radius-card,16px)] p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-green)] mb-2">Shipping To</p>
          <p className="text-sm font-bold text-[var(--ink-strong)] mb-1">
            {shipping.line1}
            {shipping.line2 ? `, ${shipping.line2}` : ''}
          </p>
          <p className="text-sm font-medium text-[var(--ink)]">
            {shipping.city}, {shipping.state} {shipping.postalCode}
          </p>
          <p className="text-sm font-medium text-[var(--ink)]">{shipping.country}</p>
        </div>
        <div className="sm:col-span-2 bg-[var(--surface)] border border-[var(--hairline)] shadow-sm rounded-[var(--radius-card,16px)] p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-yellow)] mb-2">Payment</p>
          <p className="text-sm font-bold text-[var(--ink-strong)]">{paymentSummary(payment)}</p>
        </div>
      </div>

      <div className="bg-[var(--surface-soft)] p-6 rounded-[var(--radius-card,16px)] border border-[var(--hairline)] space-y-3 text-sm">
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
        <div className="flex justify-between font-extrabold text-xl text-[var(--ink-strong)] pt-4 border-t border-[var(--hairline)] mt-2">
          <span>Total</span>
          <span>{formatMoney(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
