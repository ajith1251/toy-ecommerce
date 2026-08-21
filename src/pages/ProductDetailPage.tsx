import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingCart, Star, Truck, Shield, RotateCcw, PackageSearch } from 'lucide-react';
import { cn } from '../lib/cn';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import FeaturedProducts from '../components/sections/FeaturedProducts';
import { useShop } from '../context/ShopContext';
import {
  getCategoryBySlug,
  getProductById,
  getProductsByCategory,
} from '../services/productService';
import { slugify } from '../utils/productFilters';
import { formatMoney } from '../utils/orderCalculations';

export default function ProductDetailPage() {
  const { id } = useParams();
  const productId = Number(id);
  const toy = useMemo(
    () => (Number.isInteger(productId) ? getProductById(productId) : undefined),
    [productId]
  );
  const shop = useShop();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);

  // Destructure so the effect only depends on the stable callback — depending
  // on the whole `shop` object would re-run this effect on every state change.
  const markViewed = shop.markViewed;

  useEffect(() => {
    if (toy) markViewed(toy.id);
  }, [toy, markViewed]);

  const related = useMemo(
    () => (toy ? getProductsByCategory(toy.category).filter(p => p.id !== toy.id).slice(0, 4) : []),
    [toy]
  );

  if (!toy) {
    return <ProductNotFound onExplore={() => navigate('/products')} />;
  }

  const category = getCategoryBySlug(toy.category);
  const discount = toy.originalPrice
    ? Math.round(((toy.originalPrice - toy.price) / toy.originalPrice) * 100)
    : 0;

  const inWishlist = shop.isInWishlist(toy.id);

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs
          items={[
            { label: 'Toys', to: '/products' },
            ...(category ? [{ label: category.name, to: `/category/${category.id}` }] : []),
            { label: toy.name },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid md:grid-cols-2 gap-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          {/* Image */}
          <div className="relative">
            <img
              src={toy.image}
              alt={toy.name}
              loading="lazy"
              decoding="async"
              className="w-full h-72 md:h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {toy.isNew && <Badge variant="new">New</Badge>}
              {toy.isBestseller && <Badge variant="bestseller">Bestseller</Badge>}
              {discount > 0 && <Badge variant="sale">-{discount}%</Badge>}
            </div>
          </div>

          {/* Info */}
          <div className="p-6 md:p-8 flex flex-col">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-full',
                  toy.ageGroup === 'adults'
                    ? 'bg-slate-900 text-white'
                    : toy.ageGroup === 'teens'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                )}
              >
                {toy.ageGroup === 'adults' ? '18+' : toy.ageRange}
              </span>
              {category && (
                <Link
                  to={`/category/${category.id}`}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
                >
                  {category.icon} {category.name}
                </Link>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">{toy.name}</h1>
            <p className="text-slate-400 text-sm mb-3">
              <Link to={`/brand/${slugify(toy.brand)}`} className="hover:text-red-500 transition-colors">
                {toy.brand}
              </Link>
            </p>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < Math.floor(toy.rating) ? 'currentColor' : 'none'}
                    className={i < Math.floor(toy.rating) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{toy.rating}</span>
              <span className="text-sm text-slate-400">({toy.reviewCount} reviews)</span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{formatMoney(toy.price)}</span>
              {toy.originalPrice && (
                <span className="text-lg text-slate-400 line-through">{formatMoney(toy.originalPrice)}</span>
              )}
            </div>

            <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">{toy.description}</p>

            <div className="flex items-center gap-2 mb-6">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full',
                  toy.inStock
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', toy.inStock ? 'bg-green-500' : 'bg-red-500')} />
                {toy.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity:</span>
              <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                  className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2 font-semibold text-sm min-w-[40px] text-center text-slate-900 dark:text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                  className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                onClick={() => shop.addToCart(toy, quantity)}
                disabled={!toy.inStock}
                className="flex-1"
              >
                <ShoppingCart size={18} /> {toy.inStock ? 'Add to Cart' : 'Sold Out'}
              </Button>
              <button
                onClick={() => shop.toggleWishlist(toy)}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                className={cn(
                  'p-3 rounded-full border-2 transition-all cursor-pointer',
                  inWishlist
                    ? 'border-red-500 bg-red-50 text-red-500'
                    : 'border-slate-200 dark:border-slate-600 hover:border-red-300 text-slate-400 dark:text-slate-400 hover:text-red-500'
                )}
              >
                <Heart size={20} fill={inWishlist ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="text-center">
                <Truck size={18} className="mx-auto text-slate-400 mb-1" aria-hidden />
                <p className="text-xs text-slate-500 dark:text-slate-400">Free Shipping</p>
              </div>
              <div className="text-center">
                <Shield size={18} className="mx-auto text-slate-400 mb-1" aria-hidden />
                <p className="text-xs text-slate-500 dark:text-slate-400">2 Year Warranty</p>
              </div>
              <div className="text-center">
                <RotateCcw size={18} className="mx-auto text-slate-400 mb-1" aria-hidden />
                <p className="text-xs text-slate-500 dark:text-slate-400">30-Day Returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product information */}
        <div className="mt-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Product Information</h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Brand</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{toy.brand}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Category</dt>
              <dd className="font-medium text-slate-900 dark:text-white">
                {category ? (
                  <Link to={`/category/${category.id}`} className="hover:text-red-500 transition-colors">
                    {category.name}
                  </Link>
                ) : toy.category}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Age Group</dt>
              <dd className="font-medium text-slate-900 dark:text-white">
                {toy.ageGroup === 'adults' ? 'Adults (18+)' : toy.ageGroup === 'teens' ? `Teens (${toy.ageRange})` : `Kids (${toy.ageRange})`}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Rating</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{toy.rating} / 5 ({toy.reviewCount} reviews)</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Availability</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{toy.inStock ? 'In Stock' : 'Out of Stock'}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Product ID</dt>
              <dd className="font-medium text-slate-900 dark:text-white">#{toy.id}</dd>
            </div>
          </dl>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <FeaturedProducts
            toys={related}
            onAddToCart={shop.addToCart}
            title="Related Products"
            subtitle="You might also like"
            onToggleWishlist={shop.toggleWishlist}
            isInWishlist={shop.isInWishlist}
            onQuickView={shop.openQuickView}
          />
        )}
      </div>
    </div>
  );
}

function ProductNotFound({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="pt-32 pb-24">
      <EmptyState
        icon={<PackageSearch size={64} />}
        title="Product not found"
        description="We couldn't find that toy. It may have been removed or the link may be incorrect."
        titleTag="h1"
        actions={
          <>
            <Button onClick={onExplore}>Explore Toys</Button>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-slate-200 hover:border-red-500 hover:text-red-500 font-medium transition-all"
            >
              Back to ToyBox
            </Link>
          </>
        }
      />
    </div>
  );
}
