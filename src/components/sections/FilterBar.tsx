import { SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/cn';
import SearchBar from '../ui/SearchBar';
import FilterDropdown from '../ui/FilterDropdown';
import SortSelect from '../ui/SortSelect';
import ActiveFilters from '../ui/ActiveFilters';
import type { FilterState } from '../../hooks/useFilters';
import type { ToyCategory } from '../../types';
import { getCategoriesByAgeGroup } from '../../services/productService';

interface FilterBarProps {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  availableBrands: string[];
  priceRange: { min: number; max: number };
  productCount: number;
  totalCount: number;
  onMobileFilterOpen: () => void;
  /** Hide the category dropdown (e.g. on /category/:slug where it is fixed by the route). */
  showCategory?: boolean;
  /** Hide the brand dropdown (e.g. on /brand/:slug where it is fixed by the route). */
  showBrand?: boolean;
  className?: string;
}

export default function FilterBar({
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  availableBrands,
  priceRange,
  productCount,
  totalCount,
  onMobileFilterOpen,
  showCategory = true,
  showBrand = true,
  className,
}: FilterBarProps) {
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

  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filters.searchQuery) {
    activeChips.push({ label: `Search: "${filters.searchQuery}"`, onRemove: () => setFilter('searchQuery', '') });
  }
  if (filters.category !== 'all') {
    const cat = categories.find(c => c.id === filters.category);
    activeChips.push({ label: cat?.name || filters.category, onRemove: () => setFilter('category', 'all') });
  }
  if (filters.brand !== 'all') {
    activeChips.push({ label: filters.brand, onRemove: () => setFilter('brand', 'all') });
  }
  if (filters.minRating > 0) {
    activeChips.push({ label: `${filters.minRating}+ Stars`, onRemove: () => setFilter('minRating', 0) });
  }
  if (filters.inStockOnly) {
    activeChips.push({ label: 'In Stock', onRemove: () => setFilter('inStockOnly', false) });
  }
  if (filters.priceRange.min > priceRange.min || filters.priceRange.max < priceRange.max) {
    activeChips.push({
      label: `$${filters.priceRange.min} - $${filters.priceRange.max}`,
      onRemove: () => setFilter('priceRange', priceRange),
    });
  }

  return (
    <div className={cn('bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-[72px] z-40', className)}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-3 flex-wrap">
          <SearchBar
            value={filters.searchQuery}
            onChange={v => setFilter('searchQuery', v)}
            className="flex-shrink-0"
          />

          {showCategory && (
            <FilterDropdown
              label="Category"
              value={filters.category}
              options={categoryOptions}
              onChange={v => setFilter('category', v as ToyCategory | 'all')}
            />
          )}

          {showBrand && (
            <FilterDropdown
              label="Brand"
              value={filters.brand}
              options={brandOptions}
              onChange={v => setFilter('brand', v)}
            />
          )}

          <FilterDropdown
            label="Rating"
            value={String(filters.minRating)}
            options={ratingOptions}
            onChange={v => setFilter('minRating', Number(v))}
          />

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:border-slate-300 bg-white text-slate-700 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={e => setFilter('inStockOnly', e.target.checked)}
              className="rounded border-slate-300 text-red-500 focus:ring-red-300"
            />
            In Stock
          </label>

          <SortSelect
            value={filters.sortBy}
            onChange={v => setFilter('sortBy', v)}
          />
        </div>

        {/* Mobile Filter Button */}
        <div className="flex md:hidden items-center gap-3">
          <SearchBar
            value={filters.searchQuery}
            onChange={v => setFilter('searchQuery', v)}
            className="flex-1"
          />
          <button
            onClick={onMobileFilterOpen}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer',
              activeFilterCount > 0
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            )}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active Filters + Count */}
        <div className="flex items-center justify-between mt-3 gap-4">
          <ActiveFilters chips={activeChips} onClearAll={clearFilters} />
          <p className="text-sm text-slate-500 whitespace-nowrap">
            <span className="font-semibold text-slate-900">{productCount}</span> of {totalCount} products
          </p>
        </div>
      </div>
    </div>
  );
}
