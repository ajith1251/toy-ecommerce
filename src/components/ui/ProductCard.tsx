import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Star, ShoppingCart, Eye } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../utils/orderCalculations';
import type { Toy } from '../../types';
import Badge from './Badge';
import Button from './Button';

interface ProductCardProps {
  toy: Toy;
  onAddToCart: (toy: Toy) => void;
  onToggleWishlist: (toy: Toy) => void;
  isInWishlist: boolean;
  /** Secondary interaction — opens the quick-view modal. */
  onQuickView: (toy: Toy) => void;
}

export default function ProductCard({ toy, onAddToCart, onToggleWishlist, isInWishlist, onQuickView }: ProductCardProps) {
  const discount = toy.originalPrice
    ? Math.round(((toy.originalPrice - toy.price) / toy.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:shadow-2xl transition-all duration-500"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <Link
          to={`/product/${toy.id}`}
          aria-label={`View ${toy.name}`}
          className="block w-full h-full"
        >
          <img
            src={toy.image}
            alt={toy.name}
            loading="lazy"
            decoding="async"
            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
          />
        </Link>
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {toy.isNew && <Badge variant="new">New</Badge>}
          {toy.isBestseller && <Badge variant="bestseller">Bestseller</Badge>}
          {discount > 0 && <Badge variant="sale">-{discount}%</Badge>}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(toy); }}
          aria-label={isInWishlist ? `Remove ${toy.name} from wishlist` : `Add ${toy.name} to wishlist`}
          className={cn(
            'absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-full transition-all opacity-0 group-hover:opacity-100 cursor-pointer',
            isInWishlist ? 'text-red-500' : 'text-slate-900 hover:text-red-500'
          )}
        >
          <Heart size={20} fill={isInWishlist ? 'currentColor' : 'none'} />
        </button>

        <div className="absolute top-4 right-4 mt-12 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => { e.stopPropagation(); onQuickView(toy); }}
            title="Quick View"
            aria-label={`Quick view ${toy.name}`}
            className="p-2 bg-white/80 backdrop-blur-md rounded-full text-slate-900 hover:text-blue-500 transition-colors cursor-pointer"
          >
            <Eye size={20} />
          </button>
        </div>

        <div className="absolute bottom-4 left-0 right-0 px-4 translate-y-12 group-hover:translate-y-0 transition-transform duration-300">
          <Button onClick={() => onAddToCart(toy)} className="w-full py-2 text-sm shadow-xl">
            <ShoppingCart size={16} /> Add to Cart
          </Button>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              toy.ageGroup === 'adults'
                ? 'bg-slate-900 text-white'
                : toy.ageGroup === 'teens'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            )}
          >
            {toy.ageGroup === 'adults' ? '18+' : toy.ageRange}
          </span>
          <span className="text-slate-400 dark:text-slate-500 text-xs">{toy.brand}</span>
        </div>
        <Link to={`/product/${toy.id}`} className="block">
          <h3 className="font-semibold text-slate-900 dark:text-white text-lg group-hover:text-red-500 transition-colors mt-2">
            {toy.name}
          </h3>
        </Link>
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 line-clamp-1">{toy.description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900 dark:text-white">{formatMoney(toy.price)}</span>
            {toy.originalPrice && (
              <span className="text-sm text-slate-400 line-through">{formatMoney(toy.originalPrice)}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Star size={14} fill="currentColor" />
            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{toy.rating}</span>
            <span className="text-slate-400 text-xs">({toy.reviewCount})</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
