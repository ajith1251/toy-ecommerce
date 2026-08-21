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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 z-[101] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                🛒 Cart ({items.length})
              </h2>
              <button
                onClick={onClose}
                aria-label="Close cart"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingCart size={64} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Your cart is empty</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Start shopping to add items</p>
                </div>
              ) : (
                items.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4 bg-slate-50 dark:bg-slate-800 rounded-xl p-3"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.brand}</p>
                      <p className="text-red-500 font-bold mt-1">{formatMoney(item.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="p-1 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 hover:border-red-400 transition-colors cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="p-1 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 hover:border-red-400 transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors self-start cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatMoney(totalPrice)}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Shipping & taxes calculated at checkout</p>
                <Button className="w-full py-4 text-lg" onClick={onCheckout}>Checkout Now 🚀</Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
