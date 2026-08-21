import { useMemo, useState } from 'react';
import Hero from '../components/sections/Hero';
import Categories from '../components/sections/Categories';
import FeaturedProducts from '../components/sections/FeaturedProducts';
import AllProducts from '../components/sections/AllProducts';
import Newsletter from '../components/sections/Newsletter';
import FilterBar from '../components/sections/FilterBar';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import MobileFilterDrawer from '../components/layout/MobileFilterDrawer';
import { useShop } from '../context/ShopContext';
import {
  getCategoriesByAgeGroup,
  getCategoryBySlug,
  getProductById,
  getProductsByAgeGroup,
} from '../services/productService';
import type { Toy } from '../types';

export default function HomePage() {
  const shop = useShop();
  const { filters, filteredProducts, availableBrands, priceRange, activeFilterCount, recentIds } = shop;
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const filteredCategories = useMemo(
    () => getCategoriesByAgeGroup(filters.ageGroup),
    [filters.ageGroup]
  );

  const featured = useMemo(() => {
    const products = getProductsByAgeGroup(filters.ageGroup);
    return products.filter(p => p.isBestseller || p.isNew);
  }, [filters.ageGroup]);

  const recentProducts = useMemo(
    () => recentIds.map(id => getProductById(id)).filter(Boolean) as Toy[],
    [recentIds]
  );

  const ageLabel = filters.ageGroup === 'kids' ? 'Kids' : filters.ageGroup === 'teens' ? 'Teens' : 'Adults';

  return (
    <>
      <Hero activeTab={filters.ageGroup} />

      <FilterBar
        filters={filters}
        setFilter={shop.setFilter}
        clearFilters={shop.clearFilters}
        activeFilterCount={activeFilterCount}
        availableBrands={availableBrands}
        priceRange={priceRange}
        productCount={filteredProducts.length}
        totalCount={getProductsByAgeGroup(filters.ageGroup).length}
        onMobileFilterOpen={() => setMobileFilterOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-6 pt-6">
        <Breadcrumbs
          items={[
            { label: ageLabel },
            ...(filters.category !== 'all'
              ? [{ label: getCategoryBySlug(filters.category)?.name || filters.category }]
              : []),
          ]}
        />
      </div>

      <Categories categories={filteredCategories} />

      <FeaturedProducts
        toys={featured.length > 0 ? featured : filteredProducts.slice(0, 4)}
        onAddToCart={shop.addToCart}
        title={filters.ageGroup === 'kids' ? '🧒 Popular Kids Toys' : filters.ageGroup === 'teens' ? '🧑 Trending for Teens' : '🎯 Trending for Adults'}
        subtitle={
          filters.ageGroup === 'kids'
            ? 'Toys that make learning fun and spark creativity'
            : filters.ageGroup === 'teens'
            ? 'Cool gadgets and gear for the next generation'
            : 'Premium collectibles and enthusiast-grade sets'
        }
      />

      <AllProducts
        toys={filteredProducts}
        onAddToCart={shop.addToCart}
        onToggleWishlist={shop.toggleWishlist}
        isInWishlist={shop.isInWishlist}
        onQuickView={shop.openQuickView}
      />

      {recentProducts.length > 0 && (
        <FeaturedProducts
          toys={recentProducts}
          onAddToCart={shop.addToCart}
          title="🕐 Recently Viewed"
          subtitle="Items you recently checked out"
        />
      )}

      <Newsletter />

      <MobileFilterDrawer
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        setFilter={shop.setFilter}
        clearFilters={shop.clearFilters}
        availableBrands={availableBrands}
        priceRange={priceRange}
      />
    </>
  );
}
