import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import ProductCard from '../ui/ProductCard';
import EmptyState from '../ui/EmptyState';
import { ProductCardSkeleton } from '../ui/Skeleton';
import type { Toy } from '../../types';

interface AllProductsProps {
  toys: Toy[];
  onAddToCart: (toy: Toy) => void;
  onToggleWishlist: (toy: Toy) => void;
  isInWishlist: (id: number) => boolean;
  onQuickView: (toy: Toy) => void;
}

const ITEMS_PER_PAGE = 12;

export default function AllProducts({
  toys,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  onQuickView,
}: AllProductsProps) {
  const [page, setPage] = useState(1);
  const [loading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(toys.length / ITEMS_PER_PAGE));
  // Clamp the current page during render so filters that narrow the result
  // set never leave the grid on an out-of-range page.
  const safePage = Math.min(page, totalPages);

  const paginatedToys = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return toys.slice(start, start + ITEMS_PER_PAGE);
  }, [toys, safePage]);

  return (
    <section className="py-12 max-w-7xl mx-auto px-6">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : paginatedToys.length === 0 ? (
        <EmptyState
          icon={<SearchX size={64} />}
          title="No products found"
          description="Try adjusting your filters or search query"
          titleTag="h3"
          className="py-20"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {paginatedToys.map(toy => (
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  aria-label={`Page ${i + 1}`}
                  aria-current={safePage === i + 1 ? 'page' : undefined}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    safePage === i + 1
                      ? 'bg-red-500 text-white shadow-md'
                      : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
