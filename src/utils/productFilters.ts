import type { AgeGroup, Toy, ToyCategory } from '../types';

export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'bestseller';

export interface FilterState {
  searchQuery: string;
  category: ToyCategory | 'all';
  ageGroup: AgeGroup;
  priceRange: { min: number; max: number };
  sortBy: SortOption;
  brand: string | 'all';
  inStockOnly: boolean;
  minRating: number;
}

/**
 * Single source of truth for product filtering and sorting. Every page that
 * shows a product grid (home, /products, /category/:slug, /brand/:slug,
 * /search) derives its results from this function — never re-implemented.
 */
export function filterAndSortProducts(products: Toy[], filters: FilterState): Toy[] {
  let result = products.filter(p => p.ageGroup === filters.ageGroup);

  const query = (filters.searchQuery ?? '').trim();
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
    );
  }

  if (filters.category !== 'all') {
    result = result.filter(p => p.category === filters.category);
  }

  result = result.filter(
    p => p.price >= filters.priceRange.min && p.price <= filters.priceRange.max
  );

  if (filters.brand !== 'all') {
    result = result.filter(p => p.brand === filters.brand);
  }

  if (filters.inStockOnly) {
    result = result.filter(p => p.inStock);
  }

  if (filters.minRating > 0) {
    result = result.filter(p => p.rating >= filters.minRating);
  }

  switch (filters.sortBy) {
    case 'price-asc':
      result = [...result].sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result = [...result].sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      result = [...result].sort((a, b) => b.rating - a.rating);
      break;
    case 'bestseller':
      result = [...result].sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0));
      break;
    case 'newest':
    default:
      result = [...result].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      break;
  }

  return result;
}

export function getAvailableBrands(products: Toy[]): string[] {
  const brands = new Set(products.map(p => p.brand));
  return Array.from(brands).sort();
}

export function getPriceRange(products: Toy[]): { min: number; max: number } {
  if (products.length === 0) return { min: 0, max: 1000 };
  const prices = products.map(p => p.price);
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
}

export function countActiveFilters(
  filters: FilterState,
  priceRange: { min: number; max: number }
): number {
  let count = 0;
  if (filters.searchQuery) count++;
  if (filters.category !== 'all') count++;
  if (filters.brand !== 'all') count++;
  if (filters.inStockOnly) count++;
  if (filters.minRating > 0) count++;
  if (filters.priceRange.min > priceRange.min || filters.priceRange.max < priceRange.max) count++;
  return count;
}

/** Lowercases and hyphenates a name into a URL-safe slug, e.g. "Hot Wheels" → "hot-wheels". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Finds a brand name whose slug matches, e.g. "hot-wheels" → "Hot Wheels". */
export function findBrandBySlug(brands: string[], slug: string): string | undefined {
  return brands.find(b => slugify(b) === slug);
}
