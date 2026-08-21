import { useCallback, useMemo, useState } from 'react';
import type { FilterState } from '../../utils/productFilters';
import {
  countActiveFilters,
  filterAndSortProducts,
  getAvailableBrands,
  getPriceRange,
} from '../../utils/productFilters';
import { useShop } from '../../context/ShopContext';
import type { Toy } from '../../types';
import FilterBar from './FilterBar';
import AllProducts from './AllProducts';
import MobileFilterDrawer from '../layout/MobileFilterDrawer';

interface ProductListingProps {
  /** The product pool this listing filters within (e.g. all products, one category, one brand). */
  baseProducts: Toy[];
  title?: string;
  subtitle?: string;
  showCategory?: boolean;
  showBrand?: boolean;
  /** Allows a page to intercept filter changes (e.g. category → navigate to /category/:slug). */
  setFilterOverride?: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

/**
 * Reusable listing experience: optional heading, FilterBar, product grid and
 * the mobile filter drawer. Used by /products, /category/:slug, /brand/:slug
 * and /search — always filtering through the shared filter state.
 */
export default function ProductListing({
  baseProducts,
  title,
  subtitle,
  showCategory = true,
  showBrand = true,
  setFilterOverride,
}: ProductListingProps) {
  const shop = useShop();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { filters, setFilter, clearFilters, addToCart, toggleWishlist, isInWishlist, openQuickView } = shop;

  const products = useMemo(
    () => filterAndSortProducts(baseProducts, filters),
    [baseProducts, filters]
  );

  const availableBrands = useMemo(() => getAvailableBrands(baseProducts), [baseProducts]);
  const priceRange = useMemo(() => getPriceRange(baseProducts), [baseProducts]);
  const activeFilterCount = useMemo(
    () => countActiveFilters(filters, priceRange),
    [filters, priceRange]
  );

  const handleSetFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    if (setFilterOverride) {
      setFilterOverride(key, value);
      return;
    }
    setFilter(key, value);
  }, [setFilter, setFilterOverride]);

  return (
    <div>
      {title && (
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-2">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
      )}

      <FilterBar
        filters={filters}
        setFilter={handleSetFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        availableBrands={availableBrands}
        priceRange={priceRange}
        productCount={products.length}
        totalCount={baseProducts.length}
        showCategory={showCategory}
        showBrand={showBrand}
        onMobileFilterOpen={() => setMobileFilterOpen(true)}
      />

      <AllProducts
        toys={products}
        onAddToCart={addToCart}
        onToggleWishlist={toggleWishlist}
        isInWishlist={isInWishlist}
        onQuickView={openQuickView}
      />

      <MobileFilterDrawer
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        setFilter={handleSetFilter}
        clearFilters={clearFilters}
        availableBrands={availableBrands}
        priceRange={priceRange}
      />
    </div>
  );
}
