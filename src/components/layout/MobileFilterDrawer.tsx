import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal } from 'lucide-react';
import FilterDropdown from '../ui/FilterDropdown';
import type { FilterState } from '../../hooks/useFilters';
import type { ToyCategory } from '../../types';
import { getCategoriesByAgeGroup } from '../../services/productService';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  availableBrands: string[];
  priceRange: { min: number; max: number };
}

export default function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  setFilter,
  clearFilters,
  availableBrands,
  priceRange,
}: MobileFilterDrawerProps) {
  const categories = getCategoriesByAgeGroup(filters.ageGroup);

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` })),
  ];

  const brandOptions = [
    { value: 'all', label: 'All Brands' },
    ...availableBrands.map(b => ({ value: b, label: b })),
  ];

  const ratingOptions = [
    { value: '0', label: 'All Ratings' },
    { value: '4.5', label: '4.5+ Stars' },
    { value: '4', label: '4+ Stars' },
    { value: '3.5', label: '3.5+ Stars' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'bestseller', label: 'Bestsellers' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-full max-w-sm bg-white z-[101] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <SlidersHorizontal size={20} />
                Filters
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">Category</label>
                <FilterDropdown
                  label="Category"
                  value={filters.category}
                  options={categoryOptions}
                  onChange={v => setFilter('category', v as ToyCategory | 'all')}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">Brand</label>
                <FilterDropdown
                  label="Brand"
                  value={filters.brand}
                  options={brandOptions}
                  onChange={v => setFilter('brand', v)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">Sort By</label>
                <FilterDropdown
                  label="Sort By"
                  value={filters.sortBy}
                  options={sortOptions}
                  onChange={v => setFilter('sortBy', v as FilterState['sortBy'])}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">Minimum Rating</label>
                <FilterDropdown
                  label="Rating"
                  value={String(filters.minRating)}
                  options={ratingOptions}
                  onChange={v => setFilter('minRating', Number(v))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Price Range: ${filters.priceRange.min} - ${filters.priceRange.max}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={filters.priceRange.min}
                    onChange={e => setFilter('priceRange', { ...filters.priceRange, min: Number(e.target.value) })}
                    min={priceRange.min}
                    max={filters.priceRange.max}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    placeholder="Min"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    value={filters.priceRange.max}
                    onChange={e => setFilter('priceRange', { ...filters.priceRange, max: Number(e.target.value) })}
                    min={filters.priceRange.min}
                    max={priceRange.max}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    placeholder="Max"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.inStockOnly}
                  onChange={e => setFilter('inStockOnly', e.target.checked)}
                  className="rounded border-slate-300 text-red-500 focus:ring-red-300"
                />
                <span className="text-sm font-medium text-slate-700">In Stock Only</span>
              </label>
            </div>

            <div className="border-t border-slate-100 p-6 flex gap-3">
              <button
                onClick={clearFilters}
                className="flex-1 py-3 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Clear All
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
              >
                Show Results
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
