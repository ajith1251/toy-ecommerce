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
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  shipped: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

function paymentLine(order: Order): string {
  const label = PAYMENT_METHOD_LABELS[order.payment.method];
  if (order.payment.method === 'card' && order.payment.last4) return `${label} · •••• ${order.payment.last4}`;
  if (order.payment.method === 'upi' && order.payment.upiId) return `${label} · ${order.payment.upiId}`;
  return label;
}

export default function OrderDetails({ order, onBack, onReorder }: OrderDetailsProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} aria-hidden /> All orders
        </button>
        <Button size="sm" variant="outline" onClick={() => onReorder(order)}>
          <RotateCcw size={14} aria-hidden /> Reorder
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-bold text-lg text-slate-900 dark:text-white">{order.id}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatOrderDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', statusStyles[order.status])}>
            {order.status}
          </span>
          <span className="font-bold text-lg text-slate-900 dark:text-white">
            {formatMoney(order.pricing.grandTotal)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Truck size={16} className="text-red-500" aria-hidden />
        Estimated delivery: <span className="font-semibold text-slate-900 dark:text-white">{formatDeliveryRange(order.createdAt)}</span>
      </div>

      <div className="space-y-2">
        {order.items.map(item => (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5">
            <User size={12} aria-hidden /> Customer
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {order.customer.firstName} {order.customer.lastName}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{order.customer.email}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{order.customer.phone}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5">
            <MapPin size={12} aria-hidden /> Shipping Address
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{order.shippingAddress.country}</p>
        </div>
        <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5">
            <CreditCard size={12} aria-hidden /> Payment
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{paymentLine(order)}</p>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2 text-sm">
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Subtotal</span>
          <span>{formatMoney(order.pricing.subtotal)}</span>
        </div>
        {order.pricing.discount > 0 && (
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span>Discount</span>
            <span>-{formatMoney(order.pricing.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Shipping</span>
          <span>{order.pricing.shipping === 0 ? 'Free' : formatMoney(order.pricing.shipping)}</span>
        </div>
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Tax</span>
          <span>{formatMoney(order.pricing.tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white pt-2">
          <span>Total</span>
          <span>{formatMoney(order.pricing.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
