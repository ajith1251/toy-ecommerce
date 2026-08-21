import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import SearchBar from '../components/ui/SearchBar';
import ProductListing from '../components/sections/ProductListing';
import { useShop } from '../context/ShopContext';
import { getProducts } from '../services/productService';
import type { FilterState } from '../utils/productFilters';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shop = useShop();
  const { setFilter } = shop;

  const q = searchParams.get('q') ?? '';

  // The URL is the source of truth: sync it into the shared search filter.
  useEffect(() => {
    if (shop.filters.searchQuery !== q) {
      setFilter('searchQuery', q);
    }
  }, [q, shop.filters.searchQuery, setFilter]);

  // Keep the URL in sync when the search box (or filters) change.
  const handleSetFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilter(key, value);
    if (key === 'searchQuery') {
      const next = String(value);
      if (next) {
        setSearchParams({ q: next }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }
  }, [setFilter, setSearchParams]);

  const baseProducts = useMemo(() => getProducts(), []);
  const hasQuery = q.trim().length > 0;

  if (!hasQuery) {
    return <EmptySearch />;
  }

  return (
    <div className="pt-24">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs items={[{ label: 'Search' }]} />
      </div>
      <ProductListing
        baseProducts={baseProducts}
        title={`Search results for "${q}"`}
        subtitle="Filter or sort to narrow things down"
        setFilterOverride={handleSetFilter}
      />
    </div>
  );
}

function EmptySearch() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="pt-32 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-xl mx-auto px-6"
      >
        <SearchX size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" aria-hidden />
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">Search ToyBox</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Search toys, brands and categories. Try "robot" or "lego".
        </p>
        <form onSubmit={submit} className="max-w-md mx-auto mb-8">
          <div className="flex items-center gap-2">
            <SearchBar value={value} onChange={setValue} placeholder="Search products..." className="flex-1" />
            <Button type="submit" size="md" aria-label="Search">
              Search
            </Button>
          </div>
        </form>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/products">
            <Button>Explore Toys</Button>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-slate-200 hover:border-red-500 hover:text-red-500 font-medium transition-all"
          >
            Back to ToyBox
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
