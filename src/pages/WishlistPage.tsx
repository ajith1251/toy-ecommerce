import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ProductCard from '../components/ui/ProductCard';
import { useShop } from '../context/ShopContext';
import { getProductById } from '../services/productService';
import type { Toy } from '../types';

export default function WishlistPage() {
  const shop = useShop();

  const wishlistToys = useMemo(
    () => shop.wishlistIds.map(id => getProductById(id)).filter(Boolean) as Toy[],
    [shop.wishlistIds]
  );

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs items={[{ label: 'Wishlist' }]} />
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <Heart size={28} className="text-red-500" aria-hidden />
          My Wishlist
          {wishlistToys.length > 0 && (
            <span className="text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full">
              {wishlistToys.length} item{wishlistToys.length === 1 ? '' : 's'}
            </span>
          )}
        </h1>
      </div>

      {wishlistToys.length === 0 ? (
        <div className="max-w-7xl mx-auto px-6">
          <EmptyState
            icon={<Heart size={64} />}
            title="Your wishlist is empty"
            description="Tap the heart on any toy to save it here for later."
            actions={
              <Link to="/products">
                <Button>Explore Toys</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {wishlistToys.map(toy => (
              <ProductCard
                key={toy.id}
                toy={toy}
                onAddToCart={shop.addToCart}
                onToggleWishlist={shop.toggleWishlist}
                isInWishlist={shop.isInWishlist(toy.id)}
                onQuickView={shop.openQuickView}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
