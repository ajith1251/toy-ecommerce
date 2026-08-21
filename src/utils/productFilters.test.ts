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

describe('filterAndSortProducts', () => {
  it('applies the age group first', () => {
    expect(filterAndSortProducts(fixtures, filters({ ageGroup: 'kids' })).map(p => p.id)).toEqual([1, 2, 3]);
    expect(filterAndSortProducts(fixtures, filters({ ageGroup: 'adults' })).map(p => p.id)).toEqual([4, 5, 6]);
  });

  it('filters by search query (case-insensitive, across fields)', () => {
    const results = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', searchQuery: 'robo' }));
    expect(results.map(p => p.id)).toEqual([1, 2]);
    // Case-insensitive: matches the description field too.
    const desc = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', searchQuery: 'TEST TOY' }));
    expect(desc.length).toBe(3);
  });

  it('filters by category', () => {
    const results = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', category: 'stem-toys' }));
    expect(results.map(p => p.id)).toEqual([1, 2]);
  });

  it('filters by brand', () => {
    const results = filterAndSortProducts(fixtures, filters({ ageGroup: 'adults', brand: 'AeroTech' }));
    expect(results.map(p => p.id)).toEqual([4]);
  });

  it('filters by price range', () => {
    const results = filterAndSortProducts(fixtures, filters({ ageGroup: 'adults', priceRange: { min: 30, max: 100 } }));
    expect(results.map(p => p.id)).toEqual([5]);
  });

  it('filters by minimum rating', () => {
    const results = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', minRating: 4.5 }));
    expect(results.map(p => p.id)).toEqual([1]);
  });

  it('filters by stock', () => {
    const results = filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', inStockOnly: true }));
    expect(results.map(p => p.id)).toEqual([1, 2]);
  });

  it('sorts by each option', () => {
    const adults = filters({ ageGroup: 'adults' });
    expect(filterAndSortProducts(fixtures, { ...adults, sortBy: 'price-asc' }).map(p => p.id)).toEqual([6, 5, 4]);
    expect(filterAndSortProducts(fixtures, { ...adults, sortBy: 'price-desc' }).map(p => p.id)).toEqual([4, 5, 6]);
    expect(filterAndSortProducts(fixtures, { ...adults, sortBy: 'rating' }).map(p => p.id)).toEqual([4, 5, 6]);

    const kids = filters({ ageGroup: 'kids' });
    expect(filterAndSortProducts(fixtures, { ...kids, sortBy: 'bestseller' }).map(p => p.id)).toEqual([1, 3, 2]);
    expect(filterAndSortProducts(fixtures, { ...kids, sortBy: 'newest' }).map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('combines several filters deterministically', () => {
    const results = filterAndSortProducts(
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
    expect(results.map(p => p.id)).toEqual([2, 1]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterAndSortProducts(fixtures, filters({ ageGroup: 'kids', searchQuery: 'zzz' }))).toEqual([]);
  });
});

describe('catalog helpers', () => {
  it('collects sorted unique brands', () => {
    expect(getAvailableBrands(fixtures)).toEqual(['AeroTech', 'CodeBuddy', 'ElectroKit', 'FidgetLab', 'PlayTime', 'PuzzleCraft', 'TechMini']);
  });

  it('computes the price range', () => {
    expect(getPriceRange(fixtures)).toEqual({ min: 10, max: 300 });
    expect(getPriceRange([])).toEqual({ min: 0, max: 1000 });
  });

  it('counts active filters', () => {
    const priceRange = { min: 10, max: 300 };
    expect(countActiveFilters(filters(), priceRange)).toBe(0);
    expect(countActiveFilters(filters({ searchQuery: 'x', category: 'stem-toys', inStockOnly: true }), priceRange)).toBe(3);
    expect(countActiveFilters(filters({ priceRange: { min: 50, max: 300 } }), priceRange)).toBe(1);
  });

  it('slugifies names and resolves brands by slug', () => {
    expect(slugify('Hot Wheels')).toBe('hot-wheels');
    expect(slugify('  Multi--Word  Name! ')).toBe('multi-word-name');
    expect(findBrandBySlug(['Hot Wheels', 'PlayTime'], 'hot-wheels')).toBe('Hot Wheels');
    expect(findBrandBySlug(['Hot Wheels'], 'missing')).toBeUndefined();
  });
});
