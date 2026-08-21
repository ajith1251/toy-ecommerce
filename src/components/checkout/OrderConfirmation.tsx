import { motion } from 'framer-motion';
import { Check, PackageCheck, Truck } from 'lucide-react';
import { PAYMENT_METHOD_LABELS } from '../../constants/checkout';
import type { Order } from '../../types';
import { formatDeliveryRange, formatOrderDate } from '../../services/orderService';
import { formatMoney } from '../../utils/orderCalculations';
import Button from '../ui/Button';

interface OrderConfirmationProps {
  order: Order;
  onViewOrders: () => void;
  onContinue: () => void;
}

export default function OrderConfirmation({ order, onViewOrders, onContinue }: OrderConfirmationProps) {
  const firstName = order.customer.firstName || 'there';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="text-center py-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-green-200 dark:shadow-green-900/40"
      >
        <Check size={40} className="text-white" aria-hidden />
      </motion.div>

      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Order Confirmed! 🎉</h3>
      <p className="text-slate-500 dark:text-slate-400 mt-1 mb-4">
        Thank you for your purchase, {firstName}!
      </p>

      <div className="inline-flex flex-col items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-6 py-3 my-3 border border-slate-100 dark:border-slate-700">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Order ID</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{order.id}</p>
        <p className="text-xs text-slate-400 mt-1">{formatOrderDate(order.createdAt)}</p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
        <Truck size={16} className="text-red-500" aria-hidden />
        Estimated delivery: <span className="font-semibold text-slate-900 dark:text-white">{formatDeliveryRange(order.createdAt)}</span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Total paid: <span className="font-bold text-slate-900 dark:text-white">{formatMoney(order.pricing.grandTotal)}</span>
        {' · '}
        {PAYMENT_METHOD_LABELS[order.payment.method]}
        {order.payment.last4 ? ` · •••• ${order.payment.last4}` : ''}
      </p>

      <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
        {order.items.slice(0, 6).map(item => (
          <img
            key={item.id}
            src={item.image}
            alt={item.name}
            title={`${item.name} × ${item.quantity}`}
            className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
          />
        ))}
        {order.items.length > 6 && (
          <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-300">
            +{order.items.length - 6}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 flex items-center justify-center gap-1.5">
        <PackageCheck size={14} className="text-green-500" aria-hidden />
        A receipt was sent to {order.customer.email || 'your email'}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onViewOrders}>View Orders</Button>
        <Button variant="outline" onClick={onContinue}>Continue Shopping</Button>
      </div>
    </motion.div>
  );
}
