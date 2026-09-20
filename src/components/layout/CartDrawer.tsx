import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { formatMoney } from '../../utils/orderCalculations';
import type { CartItem } from '../../types';
import Button from '../ui/Button';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  totalPrice: number;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemove,
  totalPrice,
  onCheckout,
}: CartDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[var(--page)] z-[101] shadow-2xl flex flex-col border-l border-[var(--hairline)]"
          >
            <div className="flex items-center justify-between p-6 border-b border-[var(--hairline)] bg-[var(--surface)]">
              <h2 className="text-xl font-extrabold flex items-center gap-2 text-[var(--ink-strong)]">
                <ShoppingCart size={20} className="text-[var(--accent-blue)]" />
                Cart ({items.length})
              </h2>
              <button
                onClick={onClose}
                aria-label="Close cart"
                className="p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--accent-coral)] rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-20 h-20 mx-auto bg-[var(--surface-soft)] rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart size={32} className="text-[var(--muted)]" />
                  </div>
                  <p className="text-[var(--ink-strong)] font-bold text-xl mb-2">Your cart is empty</p>
                  <p className="text-[var(--muted)] font-medium">Start shopping to add some play.</p>
                  <Button onClick={onClose} className="mt-8 rounded-full">Explore Toys</Button>
                </div>
              ) : (
                items.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex gap-4 bg-[var(--surface)] border border-[var(--hairline)] shadow-sm rounded-[var(--radius-card,16px)] p-4 relative group"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-24 h-24 object-cover rounded-[12px] bg-[var(--surface-soft)] mix-blend-multiply"
                    />
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--accent-blue)] mb-1">{item.brand}</p>
                      <h4 className="font-extrabold text-[var(--ink-strong)] text-sm truncate mb-1">{item.name}</h4>
                      <p className="text-[var(--ink)] font-bold text-lg mb-2">{formatMoney(item.price)}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-[var(--hairline)] rounded-[var(--radius-button,8px)] bg-[var(--surface-soft)] overflow-hidden">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${item.name}`}
                            className="p-1.5 text-[var(--ink)] hover:bg-[rgba(0,0,0,0.05)] transition-colors cursor-pointer active:bg-[rgba(0,0,0,0.1)]"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold w-8 text-center text-[var(--ink-strong)]">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                            className="p-1.5 text-[var(--ink)] hover:bg-[rgba(0,0,0,0.05)] transition-colors cursor-pointer active:bg-[rgba(0,0,0,0.1)]"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="absolute top-4 right-4 p-1.5 text-[var(--muted)] hover:text-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/10 rounded-full transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[var(--hairline)] bg-[var(--surface)] p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[var(--muted)] font-bold">Subtotal</span>
                  <span className="text-2xl font-extrabold text-[var(--ink-strong)]">{formatMoney(totalPrice)}</span>
                </div>
                <p className="text-xs font-medium text-[var(--muted-light)] mb-6">Shipping & taxes calculated at checkout</p>
                <Button className="w-full py-4 text-lg shadow-md shadow-[var(--accent-blue)]/20" size="lg" onClick={onCheckout}>Checkout securely</Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
