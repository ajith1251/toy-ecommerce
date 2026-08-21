import { describe, expect, it } from 'vitest';
import type { Toy } from '../types';
import { makeToy } from '../test/fixtures';
import {
  countActiveFilters,
  filterAndSortProducts,
  findBrandBySlug,
  getAvailableBrands,
  getPriceRange,
  slugify,
} from './productFilters';
import type { FilterState } from './productFilters';
import { defaultFilters } from '../hooks/useFilters';

const fixtures: Toy[] = [
  makeToy({ id: 1, name: 'Robo Builder', price: 60, category: 'stem-toys', ageGroup: 'kids', rating: 4.9, brand: 'CodeBuddy', inStock: true, isNew: true, isBestseller: true }),
  makeToy({ id: 2, name: 'Robot Pet', price: 25, category: 'stem-toys', ageGroup: 'kids', rating: 4.2, brand: 'CodeBuddy', inStock: true }),
  makeToy({ id: 3, name: 'Action Hero', price: 35, category: 'action-figures', ageGroup: 'kids', rating: 3.8, brand: 'PlayTime', inStock: false, isBestseller: true }),
  makeToy({ id: 4, name: 'Luxe Drone', price: 300, category: 'remote-control', ageGroup: 'adults', rating: 4.7, brand: 'AeroTech', inStock: true, isNew: true }),
  makeToy({ id: 5, name: 'Puzzle Box', price: 40, category: 'puzzles', ageGroup: 'adults', rating: 4.1, brand: 'PuzzleCraft', inStock: true }),
  makeToy({ id: 6, name: 'Cheap Fidget', price: 10, category: 'fidget', ageGroup: 'adults', rating: 3.5, brand: 'FidgetLab', inStock: true }),
  makeToy({ id: 7, name: 'Teen Gadget', price: 80, category: 'tech-gadgets', ageGroup: 'teens', rating: 4.4, brand: 'TechMini', inStock: true, isNew: true }),
  makeToy({ id: 8, name: 'Robot Teen', price: 90, category: 'diy-electronics', ageGroup: 'teens', rating: 4.8, brand: 'ElectroKit', inStock: true }),
];

function filters(overrides: Partial<FilterState> = {}): FilterState {
  return { ...defaultFilters, ...overrides };
}

describe('filterAndSortProducts — edge cases', () => {
  it('handles empty products array', () => {
    expect(filterAndSortProducts([], filters({ ageGroup: 'kids' }))).toEqual([]);
  });

  it('handles single product', () => {
    const single = fixtures.slice(0, 1);
    const result = filterAndSortProducts(single, filters({ ageGroup: 'kids' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('does not mutate the original products array', () => {
    const original = [...fixtures];
    filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', sortBy: 'price-asc' }));
    expect(fixtures).toEqual(original);
  });

  it('filters by search query across name, description, brand (case-insensitive)', () => {
    const withDesc = fixtures.map((f, i) => ({
      ...f,
      description: i === 0 ? 'A test toy for kids' : 'Another toy',
    }));

    expect(filterAndSortProducts(withDesc, filters({ ageGroup: 'kids', searchQuery: 'TEST' }))).toHaveLength(1);
    expect(filterAndSortProducts(withDesc, filters({ ageGroup: 'kids', searchQuery: 'codebuddy' }))).toHaveLength(2);
    expect(filterAndSortProducts(withDesc, filters({ ageGroup: 'kids', searchQuery: 'robo' }))).toHaveLength(2);
    expect(filterAndSortProducts(withDesc, filters({ ageGroup: 'kids', searchQuery: 'ROBO' }))).toHaveLength(2);
  });

  it('empty search query returns all age-group products', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', searchQuery: '' }));
    expect(result.map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('search query with only whitespace is treated as empty', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', searchQuery: '   ' }));
    expect(result.map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('category filter with empty category', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', category: 'all' }));
    expect(result.map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('category filter with non-existent category returns empty', () => {
    const result = filterAndSortProducts(
      fixtures,
      filters({ ageGroup: 'kids', category: 'nonexistent' as FilterState['category'] })
    );
    expect(result).toEqual([]);
  });

  it('brand filter with "all" returns all', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'adults', brand: 'all' }));
    expect(result.map(p => p.id)).toEqual([4, 5, 6]);
  });

  it('brand filter with non-existent brand returns empty', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'adults', brand: 'NoSuchBrand' }));
    expect(result).toEqual([]);
  });

  it('price range - min only', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'teens', priceRange: { min: 85, max: 1000 } }));
    expect(result.map(p => p.id)).toEqual([8]);
    const adults = filterAndSortProducts(fixtures, filters({ ageGroup: 'adults', priceRange: { min: 50, max: 1000 } }));
    expect(adults.map(p => p.id)).toEqual([4]);
  });

  it('price range - max only', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'adults', priceRange: { min: 0, max: 50 } }));
    expect(result.map(p => p.id)).toEqual([5, 6]);
  });

  it('price range - exact min/max boundaries', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'adults', priceRange: { min: 40, max: 80 } }));
    expect(result.map(p => p.id)).toEqual([5]);
    const teens = filterAndSortProducts(fixtures, filters({ ageGroup: 'teens', priceRange: { min: 80, max: 90 } }));
    expect(teens.map(p => p.id)).toEqual([7, 8]);
  });

  it('price range with min > max returns empty', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'adults', priceRange: { min: 100, max: 50 } }));
    expect(result).toEqual([]);
  });

  it('rating filter - exact boundary', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', minRating: 4.2 }));
    expect(result.map(p => p.id)).toEqual([1, 2]);
  });

  it('rating filter - no products meet threshold', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', minRating: 5.0 }));
    expect(result).toEqual([]);
  });

  it('inStockOnly removes out-of-stock items', () => {
    const result = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', inStockOnly: true }));
    expect(result.map(p => p.id)).toEqual([1, 2]);
  });

  it('combines multiple filters deterministically', () => {
    const result = filterAndSortProducts(
      fixtures,
      filters({
        ageGroup: 'kids',
        searchQuery: 'r',
        category: 'stem-toys',
        brand: 'CodeBuddy',
        inStockOnly: true,
        minRating: 4,
        priceRange: { min: 0, max: 100 },
        sortBy: 'price-asc',
      })
    );
    expect(result.map(p => p.id)).toEqual([2, 1]);
  });

  it('returns empty list when nothing matches', () => {
    expect(filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', searchQuery: 'zzz' }))).toEqual([]);
  });

  it('sorting does not mutate original array', () => {
    const original = [...fixtures];
    filterAndSortProducts(fixtures, filters({ ageGroup: 'adults', sortBy: 'price-asc' }));
    expect(fixtures).toEqual(original);
  });

  it('price-asc with equal prices maintains stable sort', () => {
    const equalPrice = [
      makeToy({ id: 1, name: 'A', price: 50, ageGroup: 'adults' }),
      makeToy({ id: 2, name: 'B', price: 50, ageGroup: 'adults' }),
      makeToy({ id: 3, name: 'C', price: 50, ageGroup: 'adults' }),
    ];
    const result = filterAndSortProducts(equalPrice, filters({ ageGroup: 'adults', sortBy: 'price-asc' }));
    expect(result.map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('price-desc with equal prices maintains stable sort', () => {
    const equalPrice = [
      makeToy({ id: 1, name: 'A', price: 50, ageGroup: 'adults' }),
      makeToy({ id: 2, name: 'B', price: 50, ageGroup: 'adults' }),
      makeToy({ id: 3, name: 'C', price: 50, ageGroup: 'adults' }),
    ];
    const result = filterAndSortProducts(equalPrice, filters({ ageGroup: 'adults', sortBy: 'price-desc' }));
    expect(result.map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('rating sort with equal ratings maintains stable sort', () => {
    const equalRating = [
      makeToy({ id: 1, name: 'A', price: 50, ageGroup: 'adults', rating: 4.5 }),
      makeToy({ id: 2, name: 'B', price: 50, ageGroup: 'adults', rating: 4.5 }),
      makeToy({ id: 3, name: 'C', price: 50, ageGroup: 'adults', rating: 4.5 }),
    ];
    const result = filterAndSortProducts(equalRating, filters({ ageGroup: 'adults', sortBy: 'rating' }));
    expect(result.map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('bestseller sort puts bestsellers first', () => {
    const mixed = [
      makeToy({ id: 1, name: 'A', price: 50, ageGroup: 'kids', isBestseller: false }),
      makeToy({ id: 2, name: 'B', price: 50, ageGroup: 'kids', isBestseller: true }),
      makeToy({ id: 3, name: 'C', price: 50, ageGroup: 'kids', isBestseller: false }),
    ];
    const result = filterAndSortProducts(mixed, filters({ ageGroup: 'kids', sortBy: 'bestseller' }));
    expect(result.map(p => p.id)).toEqual([2, 1, 3]);
  });

  it('newest sort puts newest first', () => {
    const mixed = [
      makeToy({ id: 1, name: 'A', price: 50, ageGroup: 'kids', isNew: false }),
      makeToy({ id: 2, name: 'B', price: 50, ageGroup: 'kids', isNew: true }),
      makeToy({ id: 3, name: 'C', price: 50, ageGroup: 'kids', isNew: false }),
    ];
    const result = filterAndSortProducts(mixed, filters({ ageGroup: 'kids', sortBy: 'newest' }));
    expect(result.map(p => p.id)).toEqual([2, 1, 3]);
  });

  it('treats an undefined search query as empty', () => {
    const withoutQuery = { ...filters({ ageGroup: 'kids' }), searchQuery: undefined as unknown as string };
    expect(filterAndSortProducts(fixtures, withoutQuery).map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('all age groups work correctly', () => {
    expect(filterAndSortProducts(fixtures, filters({ ageGroup: 'kids' })).length).toBe(3);
    expect(filterAndSortProducts(fixtures, filters({ ageGroup: 'teens' })).length).toBe(2);
    expect(filterAndSortProducts(fixtures, filters({ ageGroup: 'adults' })).length).toBe(3);
  });
});

describe('catalog helpers — edge cases', () => {
  it('getAvailableBrands returns empty for empty array', () => {
    expect(getAvailableBrands([])).toEqual([]);
  });

  it('getAvailableBrands returns unique sorted brands', () => {
    const brands = getAvailableBrands(fixtures);
    expect(new Set(brands).size).toBe(brands.length);
    expect(brands).toEqual([...brands].sort());
  });

  it('getPriceRange returns default for empty array', () => {
    expect(getPriceRange([])).toEqual({ min: 0, max: 1000 });
  });

  it('getPriceRange computes correct min/max', () => {
    expect(getPriceRange(fixtures)).toEqual({ min: 10, max: 300 });
  });

  it('countActiveFilters counts all filter types', () => {
    const priceRange = { min: 10, max: 300 };
    expect(countActiveFilters(filters(), priceRange)).toBe(0);
    expect(countActiveFilters(filters({ searchQuery: 'x' }), priceRange)).toBe(1);
    expect(countActiveFilters(filters({ category: 'stem-toys' }), priceRange)).toBe(1);
    expect(countActiveFilters(filters({ brand: 'CodeBuddy' }), priceRange)).toBe(1);
    expect(countActiveFilters(filters({ inStockOnly: true }), priceRange)).toBe(1);
    expect(countActiveFilters(filters({ minRating: 4 }), priceRange)).toBe(1);
    expect(countActiveFilters(filters({ priceRange: { min: 50, max: 300 } }), priceRange)).toBe(1);
    expect(countActiveFilters(filters({ searchQuery: 'x', category: 'stem-toys', inStockOnly: true }), priceRange)).toBe(3);
  });

  it('slugifies various formats', () => {
    expect(slugify('Hot Wheels')).toBe('hot-wheels');
    expect(slugify('  Multi--Word  Name! ')).toBe('multi-word-name');
    expect(slugify('UPPERCASE')).toBe('uppercase');
    expect(slugify('already-slug')).toBe('already-slug');
    expect(slugify('')).toBe('');
    expect(slugify('Special!@#$%Characters')).toBe('special-characters');
  });

  it('findBrandBySlug matches correctly', () => {
    const brands = ['Hot Wheels', 'PlayTime', 'CodeBuddy'];
    expect(findBrandBySlug(brands, 'hot-wheels')).toBe('Hot Wheels');
    expect(findBrandBySlug(brands, 'playtime')).toBe('PlayTime');
    expect(findBrandBySlug(brands, 'codebuddy')).toBe('CodeBuddy');
    expect(findBrandBySlug(brands, 'missing')).toBeUndefined();
    expect(findBrandBySlug([], 'anything')).toBeUndefined();
  });
});