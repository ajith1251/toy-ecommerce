import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Order, OrderStatus } from '../../types';
import { formatOrderDate } from '../../services/orderService';
import { formatMoney } from '../../utils/orderCalculations';

const statusStyles: Record<OrderStatus, string> = {
  confirmed: 'bg-[var(--surface)] border border-[var(--accent-blue)] text-[var(--accent-blue)]',
  shipped: 'bg-[var(--surface)] border border-[var(--accent-yellow)] text-[var(--accent-yellow)]',
  delivered: 'bg-[var(--surface)] border border-[var(--accent-green)] text-[var(--accent-green)]',
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
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="font-extrabold text-[var(--ink-strong)]">{order.id}</p>
          <p className="text-xs font-semibold text-[var(--muted-light)] mt-1">{formatOrderDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full', statusStyles[order.status])}>
            {order.status}
          </span>
          <span className="font-extrabold text-lg text-[var(--ink-strong)]">{formatMoney(order.pricing.grandTotal)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {order.items.slice(0, 4).map(item => (
          <img
            key={item.id}
            src={item.image}
            alt={item.name}
            title={item.name}
            className="w-12 h-12 object-cover rounded-[8px] border border-[var(--hairline)] mix-blend-multiply bg-[var(--surface)]"
          />
        ))}
        {order.items.length > 4 && (
          <div className="w-12 h-12 rounded-[8px] border border-[var(--hairline)] bg-[var(--surface)] flex items-center justify-center text-xs font-bold text-[var(--muted)]">
            +{order.items.length - 4}
          </div>
        )}
        <span className="text-xs font-bold text-[var(--muted-light)] ml-2 flex-1">
          {order.items.reduce((n, i) => n + i.quantity, 0)} item(s)
        </span>
        <span className="text-sm font-bold text-[var(--accent-blue)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          Details <ChevronRight size={16} aria-hidden />
        </span>
      </div>
    </>
  );

  const baseClass =
    'block w-full text-left bg-[var(--surface-soft)] rounded-[var(--radius-card,16px)] p-6 border border-[var(--hairline)] shadow-sm hover:border-[var(--accent-blue)] hover:shadow-md transition-all cursor-pointer group';

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
