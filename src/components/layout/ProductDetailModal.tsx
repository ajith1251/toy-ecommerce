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
          <div className="relative md:w-1/2">
            <img
              src={toy.image}
              alt={toy.name}
              loading="lazy"
              decoding="async"
              className="w-full h-64 md:h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {toy.isNew && <Badge variant="new">New</Badge>}
              {toy.isBestseller && <Badge variant="bestseller">Bestseller</Badge>}
              {discount > 0 && <Badge variant="sale">-{discount}%</Badge>}
            </div>
          </div>

          <div className="p-6 md:w-1/2 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
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
              <span className="text-slate-400 text-sm">{toy.brand}</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">{toy.name}</h2>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < Math.floor(toy.rating) ? 'currentColor' : 'none'}
                    className={i < Math.floor(toy.rating) ? 'text-amber-400' : 'text-slate-200'}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-600">{toy.rating}</span>
              <span className="text-sm text-slate-400">({toy.reviewCount} reviews)</span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-slate-900">{formatMoney(toy.price)}</span>
              {toy.originalPrice && (
                <span className="text-lg text-slate-400 line-through">{formatMoney(toy.originalPrice)}</span>
              )}
            </div>

            <p className="text-slate-600 mb-6 leading-relaxed">{toy.description}</p>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-medium text-slate-700">Quantity:</span>
              <div className="flex items-center border border-slate-200 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2 font-semibold text-sm min-w-[40px] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                onClick={() => {
                  onAddToCart(toy, quantity);
                  onClose();
                }}
                className="flex-1"
              >
                <ShoppingCart size={18} /> Add to Cart
              </Button>
              <button
                onClick={() => onToggleWishlist(toy)}
                className={cn(
                  'p-3 rounded-full border-2 transition-all cursor-pointer',
                  isInWishlist(toy.id)
                    ? 'border-red-500 bg-red-50 text-red-500'
                    : 'border-slate-200 hover:border-red-300 text-slate-400 hover:text-red-500'
                )}
              >
                <Heart size={20} fill={isInWishlist(toy.id) ? 'currentColor' : 'none'} />
              </button>
            </div>

            <Link
              to={`/product/${toy.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors mb-6"
            >
              View Full Details <ExternalLink size={14} aria-hidden />
            </Link>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div className="text-center">
                <Truck size={18} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Free Shipping</p>
              </div>
              <div className="text-center">
                <Shield size={18} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-500">2 Year Warranty</p>
              </div>
              <div className="text-center">
                <RotateCcw size={18} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-500">30-Day Returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
