import { useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ProductListing from '../components/sections/ProductListing';
import { useShop } from '../context/ShopContext';
import {
  getAgeGroupForBrand,
  getBrandBySlug,
  getProductsByBrand,
} from '../services/productService';
import type { FilterState } from '../utils/productFilters';
import { slugify } from '../utils/productFilters';

export default function BrandPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const shop = useShop();
  const { setFilter } = shop;

  const brand = useMemo(() => getBrandBySlug(slug ?? ''), [slug]);

  // Anchor the brand + age group so the shared filters never contradict the route.
  useEffect(() => {
    if (brand) {
      const ageGroup = getAgeGroupForBrand(brand);
      if (ageGroup) setFilter('ageGroup', ageGroup);
      setFilter('brand', brand);
    }
  }, [brand, setFilter]);

  const handleSetFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    if (key === 'brand') {
      navigate(value === 'all' ? '/products' : `/brand/${slugify(String(value))}`);
      return;
    }
    setFilter(key, value);
  }, [navigate, setFilter]);

  const baseProducts = useMemo(
    () => (brand ? getProductsByBrand(brand) : []),
    [brand]
  );

  if (!brand) {
    return <BrandNotFound />;
  }

  return (
    <div className="pt-24">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs items={[{ label: 'Toys', to: '/products' }, { label: brand }]} />
      </div>
      <ProductListing
        baseProducts={baseProducts}
        title={brand}
        subtitle={`${baseProducts.length} product${baseProducts.length === 1 ? '' : 's'} from ${brand}`}
        showBrand={false}
        setFilterOverride={handleSetFilter}
      />
    </div>
  );
}

function BrandNotFound() {
  return (
    <div className="pt-32 pb-24">
      <EmptyState
        icon={<PackageSearch size={64} />}
        title="Brand not found"
        description="We don't carry that brand — check out the full catalog instead."
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
