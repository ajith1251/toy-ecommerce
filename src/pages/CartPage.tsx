import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useShop } from '../context/ShopContext';
import { calcTotals, formatMoney } from '../utils/orderCalculations';

export default function CartPage() {
  const shop = useShop();
  const navigate = useNavigate();
  const totals = useMemo(() => calcTotals(shop.cartItems), [shop.cartItems]);

  const handleCheckout = () => {
    if (shop.cartItems.length === 0) {
      shop.addToast('Your cart is empty — add some toys first!', 'error');
      return;
    }
    navigate('/checkout/shipping');
  };

  const moveToWishlist = (id: number) => {
    const item = shop.cartItems.find(i => i.id === id);
    if (!item) return;
    shop.toggleWishlist(item);
    shop.removeFromCart(id);
    shop.addToast(`${item.name} moved to wishlist`, 'info');
  };

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs items={[{ label: 'Cart' }]} />
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <ShoppingCart size={28} className="text-red-500" aria-hidden />
          Your Cart
          {shop.cartItems.length > 0 && (
            <span className="text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full">
              {shop.cartItems.length} item{shop.cartItems.length === 1 ? '' : 's'}
            </span>
          )}
        </h1>
      </div>

      {shop.cartItems.length === 0 ? (
        <div className="max-w-7xl mx-auto px-6">
          <EmptyState
            icon={<ShoppingCart size={64} />}
            title="Your cart is empty"
            description="Add some toys before checking out."
            actions={
              <Link to="/products">
                <Button>Start Shopping</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Items */}
            <div className="flex-1 min-w-0 space-y-4">
              {shop.cartItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700"
                >
                  <Link to={`/product/${item.id}`} className="flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-24 object-cover rounded-lg"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.id}`} className="block">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate hover:text-red-500 transition-colors">
                        {item.name}
                      </h4>
                    </Link>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.brand}</p>
                    <p className="text-red-500 font-bold mt-1">{formatMoney(item.price)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => shop.updateCartQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="p-1 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 hover:border-red-400 transition-colors cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                      <button
                        onClick={() => shop.updateCartQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="p-1 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 hover:border-red-400 transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => shop.removeFromCart(item.id)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => moveToWishlist(item.id)}
                      title="Move to wishlist"
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Heart size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Summary */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Order Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span className="text-slate-900 dark:text-white font-medium">{formatMoney(totals.subtotal)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Discount</span>
                      <span>-{formatMoney(totals.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Shipping</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {totals.shipping === 0 ? 'Free' : formatMoney(totals.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Tax</span>
                    <span className="text-slate-900 dark:text-white font-medium">{formatMoney(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span>Total</span>
                    <span>{formatMoney(totals.grandTotal)}</span>
                  </div>
                </div>
                <Button className="w-full py-4 text-lg" onClick={handleCheckout}>
                  Checkout Now 🚀
                </Button>
                <Link
                  to="/products"
                  className="block text-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
