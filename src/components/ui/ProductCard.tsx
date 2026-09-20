import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Star, Eye } from 'lucide-react';
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
      whileHover={{ y: -4 }}
      className="group bg-[var(--surface)] rounded-[var(--radius-card,16px)] overflow-hidden border border-[var(--hairline)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col h-full"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--surface-soft)]">
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
            className="object-cover w-full h-full group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          />
        </Link>
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {toy.isNew && <Badge variant="new">New</Badge>}
          {toy.isBestseller && <Badge variant="bestseller">Bestseller</Badge>}
          {discount > 0 && <Badge variant="sale">-{discount}%</Badge>}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(toy); }}
          aria-label={isInWishlist ? `Remove ${toy.name} from wishlist` : `Add ${toy.name} to wishlist`}
          className={cn(
            'absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm hover:scale-105 active:scale-95 z-10',
            isInWishlist ? 'text-[var(--accent-coral)] opacity-100' : 'text-[var(--ink)] hover:text-[var(--accent-coral)]'
          )}
        >
          <Heart size={18} fill={isInWishlist ? 'currentColor' : 'none'} className={isInWishlist ? 'scale-110 transition-transform' : 'transition-transform'} />
        </button>

        <div className="absolute top-16 right-4 mt-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onQuickView(toy); }}
            title="Quick View"
            aria-label={`Quick view ${toy.name}`}
            className="p-2.5 bg-white/90 backdrop-blur-md rounded-full text-[var(--ink)] hover:text-[var(--accent-blue)] transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
          >
            <Eye size={18} />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
          <Button onClick={() => onAddToCart(toy)} className="w-full py-3 text-sm shadow-lg font-semibold tracking-wide">
            Add to Cart
          </Button>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-wider',
              toy.ageGroup === 'adults'
                ? 'text-[var(--ink-strong)]'
                : toy.ageGroup === 'teens'
                ? 'text-[var(--accent-purple)]'
                : 'text-[var(--accent-blue)]'
            )}
          >
            {toy.ageGroup === 'adults' ? '18+' : toy.ageRange}
          </span>
          <span className="text-[var(--muted-light)] text-xs font-medium">•</span>
          <span className="text-[var(--muted)] text-xs font-medium uppercase tracking-wider">{toy.brand}</span>
        </div>
        
        <Link to={`/product/${toy.id}`} className="block mb-2 group-hover:u-link">
          <h3 className="font-semibold text-[var(--ink-strong)] text-lg leading-snug">
            {toy.name}
          </h3>
        </Link>
        
        <p className="text-[var(--muted)] text-sm line-clamp-1 mb-4 flex-1">{toy.description}</p>
        
        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col gap-0.5">
            {toy.originalPrice && (
              <span className="text-xs text-[var(--muted-light)] line-through font-medium">{formatMoney(toy.originalPrice)}</span>
            )}
            <span className="text-xl font-semibold text-[var(--ink-strong)] tracking-tight">{formatMoney(toy.price)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[var(--surface-soft)] px-2 py-1 rounded-[var(--radius-badge,6px)]">
            <Star size={12} className="text-[var(--accent-yellow)]" fill="currentColor" />
            <span className="text-[var(--ink)] text-xs font-semibold">{toy.rating}</span>
            <span className="text-[var(--muted-light)] text-xs">({toy.reviewCount})</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
