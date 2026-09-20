import { ArrowLeft, CreditCard, MapPin, RotateCcw, Truck, User } from 'lucide-react';
import { PAYMENT_METHOD_LABELS } from '../../constants/checkout';
import { cn } from '../../lib/cn';
import type { Order, OrderStatus } from '../../types';
import { formatDeliveryRange, formatOrderDate } from '../../services/orderService';
import { formatMoney } from '../../utils/orderCalculations';
import Button from '../ui/Button';

interface OrderDetailsProps {
  order: Order;
  onBack: () => void;
  onReorder: (order: Order) => void;
}

const statusStyles: Record<OrderStatus, string> = {
  confirmed: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20',
  shipped: 'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/20',
  delivered: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20',
};

function paymentLine(order: Order): string {
  const label = PAYMENT_METHOD_LABELS[order.payment.method];
  if (order.payment.method === 'card' && order.payment.last4) return `${label} · •••• ${order.payment.last4}`;
  if (order.payment.method === 'upi' && order.payment.upiId) return `${label} · ${order.payment.upiId}`;
  return label;
}

export default function OrderDetails({ order, onBack, onReorder }: OrderDetailsProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink-strong)] transition-colors cursor-pointer bg-[var(--surface)] border border-[var(--hairline)] px-4 py-2 rounded-full shadow-sm"
        >
          <ArrowLeft size={16} aria-hidden /> All orders
        </button>
        <Button size="sm" variant="outline" onClick={() => onReorder(order)} className="shadow-sm">
          <RotateCcw size={14} aria-hidden className="mr-1.5" /> Reorder
        </Button>
      </div>

      <div className="bg-[var(--surface)] p-6 rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-light)] mb-1">Order ID</p>
            <p className="font-extrabold text-2xl text-[var(--ink-strong)] mb-1">{order.id}</p>
            <p className="text-sm font-semibold text-[var(--muted)]">{formatOrderDate(order.createdAt)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={cn('text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full', statusStyles[order.status])}>
              {order.status}
            </span>
            <span className="font-extrabold text-2xl text-[var(--ink-strong)]">
              {formatMoney(order.pricing.grandTotal)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-bold text-[var(--muted)] bg-[var(--surface-soft)] p-3 rounded-[var(--radius-button,8px)] border border-[var(--hairline)]">
          <Truck size={16} className="text-[var(--accent-blue)]" aria-hidden />
          Estimated delivery: <span className="text-[var(--ink-strong)]">{formatDeliveryRange(order.createdAt)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-lg text-[var(--ink-strong)]">Items in your order</h3>
        <div className="space-y-3">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--hairline)] shadow-sm rounded-[var(--radius-card,16px)] p-4">
              <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-[12px] flex-shrink-0 mix-blend-multiply bg-[var(--surface-soft)] border border-[var(--hairline)]" />
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-coral)] mb-3 flex items-center gap-2">
            <User size={14} aria-hidden /> Customer
          </p>
          <p className="text-sm font-bold text-[var(--ink-strong)] mb-1">
            {order.customer.firstName} {order.customer.lastName}
          </p>
          <p className="text-sm font-medium text-[var(--ink)]">{order.customer.email}</p>
          <p className="text-sm font-medium text-[var(--ink)]">{order.customer.phone}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--hairline)] shadow-sm rounded-[var(--radius-card,16px)] p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-green)] mb-3 flex items-center gap-2">
            <MapPin size={14} aria-hidden /> Shipping Address
          </p>
          <p className="text-sm font-bold text-[var(--ink-strong)] mb-1">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
          </p>
          <p className="text-sm font-medium text-[var(--ink)]">
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
          </p>
          <p className="text-sm font-medium text-[var(--ink)]">{order.shippingAddress.country}</p>
        </div>
        <div className="sm:col-span-2 bg-[var(--surface)] border border-[var(--hairline)] shadow-sm rounded-[var(--radius-card,16px)] p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-yellow)] mb-3 flex items-center gap-2">
            <CreditCard size={14} aria-hidden /> Payment
          </p>
          <p className="text-sm font-bold text-[var(--ink-strong)]">{paymentLine(order)}</p>
        </div>
      </div>

      <div className="bg-[var(--surface-soft)] p-6 rounded-[var(--radius-card,16px)] border border-[var(--hairline)] space-y-3 text-sm">
        <div className="flex justify-between font-semibold text-[var(--ink)]">
          <span>Subtotal</span>
          <span>{formatMoney(order.pricing.subtotal)}</span>
        </div>
        {order.pricing.discount > 0 && (
          <div className="flex justify-between font-bold text-[var(--accent-green)]">
            <span>Discount</span>
            <span>-{formatMoney(order.pricing.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-[var(--ink)]">
          <span>Shipping</span>
          <span>{order.pricing.shipping === 0 ? 'Free' : formatMoney(order.pricing.shipping)}</span>
        </div>
        <div className="flex justify-between font-semibold text-[var(--ink)]">
          <span>Tax</span>
          <span>{formatMoney(order.pricing.tax)}</span>
        </div>
        <div className="flex justify-between font-extrabold text-xl text-[var(--ink-strong)] pt-4 border-t border-[var(--hairline)] mt-2">
          <span>Total</span>
          <span>{formatMoney(order.pricing.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
