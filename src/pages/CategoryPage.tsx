import { useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ProductListing from '../components/sections/ProductListing';
import { useShop } from '../context/ShopContext';
import {
  getCategoryBySlug,
  getProductsByCategory,
} from '../services/productService';
import type { FilterState } from '../utils/productFilters';

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const shop = useShop();
  const { setFilter } = shop;

  const category = getCategoryBySlug(slug ?? '');

  // The route is the source of truth for this page's category + age group.
  useEffect(() => {
    if (category) {
      setFilter('ageGroup', category.ageGroup);
      setFilter('category', category.id);
    }
  }, [category, setFilter]);

  const handleSetFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    if (key === 'category') {
      navigate(value === 'all' ? '/products' : `/category/${value}`);
      return;
    }
    setFilter(key, value);
  }, [navigate, setFilter]);

  const baseProducts = useMemo(
    () => (category ? getProductsByCategory(category.id) : []),
    [category]
  );

  if (!category) {
    return <CategoryNotFound />;
  }

  const ageLabel = category.ageGroup === 'adults' ? 'Adults (18+)' : category.ageGroup === 'teens' ? 'Teens (13-17)' : 'Kids';

  return (
    <div className="pt-24">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs items={[{ label: 'Toys', to: '/products' }, { label: category.name }]} />
      </div>
      <ProductListing
        baseProducts={baseProducts}
        title={`${category.icon} ${category.name}`}
        subtitle={`${category.name} for ${ageLabel} — ${baseProducts.length} product${baseProducts.length === 1 ? '' : 's'}`}
        showCategory={false}
        setFilterOverride={handleSetFilter}
      />
    </div>
  );
}

function CategoryNotFound() {
  return (
    <div className="pt-32 pb-24">
      <EmptyState
        icon={<PackageSearch size={64} />}
        title="Category not found"
        description="This category doesn't exist — but there are plenty of toys to explore."
        titleTag="h1"
        actions={
          <>
            <Link to="/products">
              <Button>Explore Toys</Button>
            </Link>
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
