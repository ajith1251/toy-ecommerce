import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Toy } from '../../types';
import ProductCard from '../ui/ProductCard';

interface FeaturedProductsProps {
  toys: Toy[];
  onAddToCart: (toy: Toy) => void;
  title: string;
  subtitle: string;
  onToggleWishlist?: (toy: Toy) => void;
  isInWishlist?: (id: number) => boolean;
  onQuickView?: (toy: Toy) => void;
  viewAllTo?: string;
}

export default function FeaturedProducts({
  toys,
  onAddToCart,
  title,
  subtitle,
  onToggleWishlist,
  isInWishlist,
  onQuickView,
  viewAllTo = '/products',
}: FeaturedProductsProps) {
  const handleToggleWishlist = onToggleWishlist || (() => {});
  const handleIsInWishlist = isInWishlist || (() => false);
  const handleQuickView = onQuickView || (() => {});

  return (
    <section className="py-24 max-w-7xl mx-auto px-6">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <Link
          to={viewAllTo}
          className="text-red-500 font-semibold flex items-center gap-2 hover:gap-4 transition-all group"
        >
          View all <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {toys.map(toy => (
          <ProductCard
            key={toy.id}
            toy={toy}
            onAddToCart={onAddToCart}
            onToggleWishlist={handleToggleWishlist}
            isInWishlist={handleIsInWishlist(toy.id)}
            onQuickView={handleQuickView}
          />
        ))}
      </div>
    </section>
  );
}
