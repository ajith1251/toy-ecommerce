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
        <div className="grid md:grid-cols-2 gap-10 bg-[var(--surface)] rounded-[24px] border border-[var(--hairline)] shadow-sm overflow-hidden">
          {/* Image */}
          <div className="relative bg-[var(--surface-soft)]">
            <img
              src={toy.image}
              alt={toy.name}
              loading="lazy"
              decoding="async"
              className="w-full h-[400px] md:h-[600px] object-cover mix-blend-multiply"
            />
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {toy.isNew && <Badge variant="new">New</Badge>}
              {toy.isBestseller && <Badge variant="bestseller">Bestseller</Badge>}
              {discount > 0 && <Badge variant="sale">-{discount}%</Badge>}
            </div>
          </div>

          {/* Info */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-[var(--accent-blue)] font-bold text-xs tracking-widest uppercase">{toy.brand}</span>
              <span className="w-1 h-1 rounded-full bg-[var(--hairline)]" />
              <span className="text-[var(--muted)] text-xs font-semibold">{toy.ageGroup === 'adults' ? '18+' : toy.ageRange}</span>
              {category && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[var(--hairline)]" />
                  <Link
                    to={`/category/${category.id}`}
                    className="text-[var(--muted)] hover:text-[var(--accent-coral)] text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    {category.icon} {category.name}
                  </Link>
                </>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--ink-strong)] mb-4 leading-tight">{toy.name}</h1>

            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-0.5 text-[var(--accent-yellow)]">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < Math.floor(toy.rating) ? 'currentColor' : 'none'}
                    className={i < Math.floor(toy.rating) ? 'text-[var(--accent-yellow)]' : 'text-[var(--hairline)]'}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-[var(--ink)]">{toy.rating}</span>
              <span className="text-sm text-[var(--muted)]">({toy.reviewCount} reviews)</span>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <span className="text-4xl font-extrabold text-[var(--ink-strong)]">{formatMoney(toy.price)}</span>
              {toy.originalPrice && (
                <span className="text-xl text-[var(--muted-light)] line-through">{formatMoney(toy.originalPrice)}</span>
              )}
            </div>

            <p className="text-[var(--muted)] text-lg mb-10 leading-relaxed font-medium">{toy.description}</p>

            <div className="flex items-center gap-2 mb-8">
              <span
                className={cn(
                  'inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border',
                  toy.inStock
                    ? 'bg-[var(--surface-soft)] text-[var(--accent-green)] border-[var(--hairline)]'
                    : 'bg-[var(--surface-soft)] text-[var(--accent-coral)] border-[var(--hairline)]'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', toy.inStock ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-coral)]')} />
                {toy.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <span className="text-sm font-bold text-[var(--ink)]">Quantity</span>
              <div className="flex items-center border border-[var(--hairline)] rounded-[var(--radius-button,8px)] bg-[var(--surface-soft)] overflow-hidden shadow-sm">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                  className="p-3 text-[var(--ink)] hover:bg-[rgba(0,0,0,0.05)] transition-colors cursor-pointer active:bg-[rgba(0,0,0,0.1)]"
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2 font-bold text-[15px] min-w-[48px] text-center text-[var(--ink-strong)]">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                  className="p-3 text-[var(--ink)] hover:bg-[rgba(0,0,0,0.05)] transition-colors cursor-pointer active:bg-[rgba(0,0,0,0.1)]"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="flex gap-4 mb-10">
              <Button
                onClick={() => shop.addToCart(toy, quantity)}
                disabled={!toy.inStock}
                className="flex-1 shadow-md shadow-[var(--accent-blue)]/20"
                size="lg"
              >
                <ShoppingCart size={20} /> {toy.inStock ? 'Add to Cart' : 'Sold Out'}
              </Button>
              <button
                onClick={() => shop.toggleWishlist(toy)}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                className={cn(
                  'p-4 rounded-[var(--radius-button,8px)] border-2 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center',
                  inWishlist
                    ? 'border-[var(--accent-coral)] bg-[var(--accent-coral)]/10 text-[var(--accent-coral)]'
                    : 'border-[var(--hairline)] bg-[var(--surface-soft)] hover:border-[var(--accent-coral)] text-[var(--muted)] hover:text-[var(--accent-coral)]'
                )}
              >
                <Heart size={24} fill={inWishlist ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[var(--hairline)]">
              <div className="text-center group">
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Truck size={20} className="text-[var(--ink)]" aria-hidden />
                </div>
                <p className="text-xs font-bold text-[var(--ink)]">Free Shipping</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Shield size={20} className="text-[var(--ink)]" aria-hidden />
                </div>
                <p className="text-xs font-bold text-[var(--ink)]">2 Year Warranty</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <RotateCcw size={20} className="text-[var(--ink)]" aria-hidden />
                </div>
                <p className="text-xs font-bold text-[var(--ink)]">30-Day Returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product information */}
        <div className="mt-12 bg-[var(--surface)] rounded-[24px] border border-[var(--hairline)] p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[var(--ink-strong)] mb-6">Product Details</h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4 text-sm">
            <div>
              <dt className="text-[var(--muted-light)] text-xs font-bold uppercase tracking-widest mb-2">Brand</dt>
              <dd className="font-semibold text-[var(--ink)] text-base">{toy.brand}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-light)] text-xs font-bold uppercase tracking-widest mb-2">Category</dt>
              <dd className="font-semibold text-[var(--ink)] text-base">
                {category ? (
                  <Link to={`/category/${category.id}`} className="hover:text-[var(--accent-blue)] transition-colors">
                    {category.name}
                  </Link>
                ) : toy.category}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted-light)] text-xs font-bold uppercase tracking-widest mb-2">Age Group</dt>
              <dd className="font-semibold text-[var(--ink)] text-base">
                {toy.ageGroup === 'adults' ? 'Adults (18+)' : toy.ageGroup === 'teens' ? `Teens (${toy.ageRange})` : `Kids (${toy.ageRange})`}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted-light)] text-xs font-bold uppercase tracking-widest mb-2">Rating</dt>
              <dd className="font-semibold text-[var(--ink)] text-base">{toy.rating} / 5 ({toy.reviewCount} reviews)</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-light)] text-xs font-bold uppercase tracking-widest mb-2">Availability</dt>
              <dd className="font-semibold text-[var(--ink)] text-base">{toy.inStock ? 'In Stock' : 'Out of Stock'}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-light)] text-xs font-bold uppercase tracking-widest mb-2">Product ID</dt>
              <dd className="font-semibold text-[var(--ink)] text-base">#{toy.id}</dd>
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
              className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-[var(--hairline)] hover:border-[var(--accent-blue)] text-[var(--ink)] hover:text-[var(--accent-blue)] font-medium transition-all shadow-sm"
            >
              Back to ToyBox
            </Link>
          </>
        }
      />
    </div>
  );
}
