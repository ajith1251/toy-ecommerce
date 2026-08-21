import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import ProductListing from '../components/sections/ProductListing';
import { useShop } from '../context/ShopContext';
import { getProducts } from '../services/productService';
import type { ToyCategory } from '../types';
import type { FilterState, SortOption } from '../utils/productFilters';

const SORT_OPTIONS: SortOption[] = ['newest', 'price-asc', 'price-desc', 'rating', 'bestseller'];

/**
 * /products supports shareable URL state for the most valuable browsing
 * dimensions: ?category=…, ?brand=…, ?sort=… and ?q=…. Other filter state
 * (age group, rating, price, stock) stays in the shared filter store — it is
 * session preference, not shareable browsing state.
 */
export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setFilter } = useShop();

  // The URL is the source of truth when parameters are present: sync them
  // into the shared filter state whenever the URL changes.
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) setFilter('category', category as ToyCategory | 'all');

    const brand = searchParams.get('brand');
    if (brand) setFilter('brand', brand);

    const sort = searchParams.get('sort');
    if (sort && (SORT_OPTIONS as string[]).includes(sort)) setFilter('sortBy', sort as SortOption);

    const q = searchParams.get('q');
    if (q !== null) setFilter('searchQuery', q);
  }, [searchParams, setFilter]);

  // Push shareable filter changes back into the URL.
  const handleSetFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilter(key, value);
    if (key === 'category' || key === 'brand' || key === 'sortBy' || key === 'searchQuery') {
      const next = new URLSearchParams(searchParams);
      const paramKey = key === 'sortBy' ? 'sort' : key;
      const str = String(value);
      if (str && str !== 'all') {
        next.set(paramKey, str);
      } else {
        next.delete(paramKey);
      }
      setSearchParams(next, { replace: true });
    }
  }, [setFilter, searchParams, setSearchParams]);

  return (
    <div className="pt-24">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs items={[{ label: 'Toys', to: '/products' }]} />
      </div>
      <ProductListing
        baseProducts={getProducts()}
        title="All Toys"
        subtitle="Browse the full ToyBox collection"
        setFilterOverride={handleSetFilter}
      />
    </div>
  );
}
