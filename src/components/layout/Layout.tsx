import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import ProductDetailModal from './ProductDetailModal';
import ToastContainer from '../ui/Toast';
import { useShop } from '../../context/ShopContext';

export default function Layout() {
  const shop = useShop();
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);

  const handleCheckout = () => {
    if (shop.cartItems.length === 0) {
      shop.addToast('Your cart is empty — add some toys first!', 'error');
      return;
    }
    setCartOpen(false);
    navigate('/checkout/shipping');
  };

  return (
    <div className="min-h-screen">
      <Navbar onCartOpen={() => setCartOpen(true)} />

      <main>
        <Outlet />
      </main>

      <Footer />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={shop.cartItems}
        onUpdateQuantity={shop.updateCartQuantity}
        onRemove={shop.removeFromCart}
        totalPrice={shop.cartTotalPrice}
        onCheckout={handleCheckout}
      />

      <ProductDetailModal
        isOpen={!!shop.quickViewToy}
        onClose={shop.closeQuickView}
        toy={shop.quickViewToy}
        onAddToCart={shop.addToCart}
        onToggleWishlist={shop.toggleWishlist}
        isInWishlist={shop.isInWishlist}
      />

      <ToastContainer toasts={shop.toasts} onRemove={shop.removeToast} />
    </div>
  );
}
