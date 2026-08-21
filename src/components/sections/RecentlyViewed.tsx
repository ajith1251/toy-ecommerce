import type { Toy } from '../../types';
import ProductCard from '../ui/ProductCard';

interface RecentlyViewedProps {
  toys: Toy[];
  onAddToCart: (toy: Toy) => void;
  onToggleWishlist: (toy: Toy) => void;
  isInWishlist: (id: number) => boolean;
  onQuickView: (toy: Toy) => void;
}

export default function RecentlyViewed({
  toys,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  onQuickView,
}: RecentlyViewedProps) {
  if (toys.length === 0) return null;

  return (
    <section className="py-24 max-w-7xl mx-auto px-6">
      <div className="mb-12">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">🕐 Recently Viewed</h2>
        <p className="text-slate-500 dark:text-slate-400">Items you recently checked out</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {toys.map(toy => (
          <ProductCard
            key={toy.id}
            toy={toy}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            isInWishlist={isInWishlist(toy.id)}
            onQuickView={onQuickView}
          />
        ))}
      </div>
    </section>
  );
}
