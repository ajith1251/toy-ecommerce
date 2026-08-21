import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Order, OrderStatus } from '../../types';
import { formatOrderDate } from '../../services/orderService';
import { formatMoney } from '../../utils/orderCalculations';

const statusStyles: Record<OrderStatus, string> = {
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  shipped: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

interface OrderCardProps {
  order: Order;
  index?: number;
  /** When provided, the card renders as a navigation link. */
  to?: string;
  /** When provided, the card renders as a button. */
  onClick?: () => void;
}

export default function OrderCard({ order, index = 0, to, onClick }: OrderCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{order.id}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatOrderDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', statusStyles[order.status])}>
            {order.status}
          </span>
          <span className="font-bold text-slate-900 dark:text-white">{formatMoney(order.pricing.grandTotal)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {order.items.slice(0, 4).map(item => (
          <img
            key={item.id}
            src={item.image}
            alt={item.name}
            title={item.name}
            className="w-11 h-11 object-cover rounded-lg border border-white dark:border-slate-700"
          />
        ))}
        {order.items.length > 4 && (
          <div className="w-11 h-11 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-300">
            +{order.items.length - 4}
          </div>
        )}
        <span className="text-xs text-slate-400 ml-1 flex-1">
          {order.items.reduce((n, i) => n + i.quantity, 0)} item(s)
        </span>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          View Details <ChevronRight size={14} aria-hidden />
        </span>
      </div>
    </>
  );

  const baseClass =
    'block w-full text-left bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500/50 transition-colors cursor-pointer';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {to ? (
        <Link to={to} className={baseClass}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={baseClass}>
          {content}
        </button>
      )}
    </motion.div>
  );
}
