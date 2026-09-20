import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../utils/orderCalculations';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import type { Toy } from '../../types';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  toy: Toy | null;
  onAddToCart: (toy: Toy, quantity: number) => void;
  onToggleWishlist: (toy: Toy) => void;
  isInWishlist: (id: number) => boolean;
}

export default function ProductDetailModal({
  isOpen,
  onClose,
  toy,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  if (!toy) return null;

  const discount = toy.originalPrice
    ? Math.round(((toy.originalPrice - toy.price) / toy.originalPrice) * 100)
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="overflow-y-auto">
        <div className="md:flex">
          <div className="relative md:w-1/2 bg-[var(--surface-soft)]">
            <img
              src={toy.image}
              alt={toy.name}
              loading="lazy"
              decoding="async"
              className="w-full h-64 md:h-full object-cover mix-blend-multiply"
            />
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {toy.isNew && <Badge variant="new">New</Badge>}
              {toy.isBestseller && <Badge variant="bestseller">Bestseller</Badge>}
              {discount > 0 && <Badge variant="sale">-{discount}%</Badge>}
            </div>
          </div>

          <div className="p-8 md:w-1/2 flex flex-col bg-[var(--surface)]">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[var(--accent-blue)] font-bold text-xs tracking-widest uppercase">{toy.brand}</span>
              <span className="w-1 h-1 rounded-full bg-[var(--hairline)]" />
              <span className="text-[var(--muted)] text-xs font-semibold">{toy.ageGroup === 'adults' ? '18+' : toy.ageRange}</span>
            </div>

            <h2 className="text-3xl font-extrabold text-[var(--ink-strong)] mb-2 leading-tight">{toy.name}</h2>

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

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-extrabold text-[var(--ink-strong)]">{formatMoney(toy.price)}</span>
              {toy.originalPrice && (
                <span className="text-lg text-[var(--muted-light)] line-through">{formatMoney(toy.originalPrice)}</span>
              )}
            </div>

            <p className="text-[var(--muted)] mb-8 leading-relaxed font-medium">{toy.description}</p>

            <div className="flex items-center gap-4 mb-8">
              <span className="text-sm font-bold text-[var(--ink)]">Quantity</span>
              <div className="flex items-center border border-[var(--hairline)] rounded-[var(--radius-button,8px)] bg-[var(--surface-soft)] overflow-hidden shadow-sm">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-[var(--ink)] hover:bg-[rgba(0,0,0,0.05)] transition-colors cursor-pointer active:bg-[rgba(0,0,0,0.1)]"
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2 font-bold text-[15px] min-w-[48px] text-center text-[var(--ink-strong)]">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 text-[var(--ink)] hover:bg-[rgba(0,0,0,0.05)] transition-colors cursor-pointer active:bg-[rgba(0,0,0,0.1)]"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="flex gap-4 mb-8">
              <Button
                onClick={() => {
                  onAddToCart(toy, quantity);
                  onClose();
                }}
                className="flex-1 shadow-md shadow-[var(--accent-blue)]/20"
                size="lg"
              >
                <ShoppingCart size={20} /> Add to Cart
              </Button>
              <button
                onClick={() => onToggleWishlist(toy)}
                className={cn(
                  'p-4 rounded-[var(--radius-button,8px)] border-2 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center',
                  isInWishlist(toy.id)
                    ? 'border-[var(--accent-coral)] bg-[var(--accent-coral)]/10 text-[var(--accent-coral)]'
                    : 'border-[var(--hairline)] bg-[var(--surface-soft)] hover:border-[var(--accent-coral)] text-[var(--muted)] hover:text-[var(--accent-coral)]'
                )}
              >
                <Heart size={24} fill={isInWishlist(toy.id) ? 'currentColor' : 'none'} />
              </button>
            </div>

            <Link
              to={`/product/${toy.id}`}
              onClick={onClose}
              className="inline-flex items-center justify-center w-full py-4 text-sm font-bold text-[var(--ink)] hover:text-[var(--accent-blue)] transition-colors mb-8 border border-[var(--hairline)] rounded-[var(--radius-button,8px)] hover:bg-[var(--surface-soft)] shadow-sm"
            >
              View Full Details <ExternalLink size={16} className="ml-2" aria-hidden />
            </Link>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[var(--hairline)]">
              <div className="text-center group">
                <div className="w-10 h-10 mx-auto rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Truck size={18} className="text-[var(--ink)]" />
                </div>
                <p className="text-xs font-bold text-[var(--ink)]">Free Shipping</p>
              </div>
              <div className="text-center group">
                <div className="w-10 h-10 mx-auto rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Shield size={18} className="text-[var(--ink)]" />
                </div>
                <p className="text-xs font-bold text-[var(--ink)]">2 Year Warranty</p>
              </div>
              <div className="text-center group">
                <div className="w-10 h-10 mx-auto rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <RotateCcw size={18} className="text-[var(--ink)]" />
                </div>
                <p className="text-xs font-bold text-[var(--ink)]">30-Day Returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
