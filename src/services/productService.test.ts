import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATEGORIES, PRODUCTS } from '../data/products';
import { slugify } from '../utils/productFilters';
import { ApiError } from '../lib/api/errors';
import {
  __resetCatalogForTests,
  __seedCatalogForTests,
  getAgeGroupForBrand,
  getBrandBySlug,
  getBrands,
  getCategories,
  getCategoriesByAgeGroup,
  getCategoryBySlug,
  getCatalogSize,
  getCatalogState,
  getProductById,
  getProducts,
  getProductsByAgeGroup,
  getProductsByBrand,
  getProductsByCategory,
  loadCatalog,
  searchProducts,
  slugifyBrand,
} from './productService';

const api = await import('../lib/api/client');

const brands = Array.from(new Set(PRODUCTS.map(p => p.brand)))
  .sort()
  .map((name, i) => ({ id: i + 1, name, slug: slugify(name), description: '' }));

const apiProducts = PRODUCTS.map(p => ({
  ...p,
  slug: slugify(p.name),
  originalPrice: p.originalPrice ?? null,
  stockQuantity: 30,
  inStock: p.inStock,
  isNew: p.isNew ?? false,
  isBestseller: p.isBestseller ?? false,
}));

function seedRealCatalog() {
  __seedCatalogForTests({ products: PRODUCTS, categories: CATEGORIES, brands });
}

beforeEach(() => {
  seedRealCatalog();
});

afterEach(() => {
  __resetCatalogForTests();
  vi.restoreAllMocks();
});

describe('productService — cache accessors (seeded from static data)', () => {
  it('returns the full catalog', () => {
    expect(getProducts().length).toBe(54);
    expect(getCatalogSize()).toBe(54);
  });

  it('finds a product by id and returns undefined for unknown ids', () => {
    expect(getProductById(1)?.name).toBe('Hero Squad Action Pack');
    expect(getProductById(9999)).toBeUndefined();
  });

  it('filters by category', () => {
    const actionFigures = getProductsByCategory('action-figures');
    expect(actionFigures.length).toBeGreaterThan(0);
    expect(actionFigures.every(p => p.category === 'action-figures')).toBe(true);
  });

  it('filters by brand', () => {
    const playtime = getProductsByBrand('PlayTime');
    expect(playtime.length).toBeGreaterThan(0);
    expect(playtime.every(p => p.brand === 'PlayTime')).toBe(true);
    expect(getProductsByBrand('NoSuchBrand')).toEqual([]);
  });

  it('filters by age group', () => {
    expect(getProductsByAgeGroup('kids').length).toBe(20);
    expect(getProductsByAgeGroup('kids').every(p => p.ageGroup === 'kids')).toBe(true);
    expect(getProductsByAgeGroup('adults').length).toBe(22);
    expect(getProductsByAgeGroup('teens').length).toBe(12);
  });

  it('searches across name, description and brand', () => {
    expect(searchProducts('robot').length).toBeGreaterThan(0);
    expect(searchProducts('ROBOT').length).toBe(searchProducts('robot').length);
    expect(searchProducts('playtime').length).toBeGreaterThan(0);
    expect(searchProducts('zzz-no-match')).toEqual([]);
    expect(searchProducts('')).toHaveLength(54);
  });
});

describe('productService — categories', () => {
  it('lists all categories', () => {
    expect(getCategories().length).toBe(52);
  });

  it('resolves a category by slug and returns undefined for unknown slugs', () => {
    expect(getCategoryBySlug('action-figures')?.name).toBe('Action Figures');
    expect(getCategoryBySlug('nope')).toBeUndefined();
  });

  it('groups categories by age group', () => {
    expect(getCategoriesByAgeGroup('kids').length).toBe(20);
    expect(getCategoriesByAgeGroup('kids').every(c => c.ageGroup === 'kids')).toBe(true);
  });
});

describe('productService — brands', () => {
  it('lists unique sorted brands', () => {
    const list = getBrands();
    expect(list.length).toBeGreaterThan(0);
    expect(new Set(list).size).toBe(list.length);
    expect(list).toEqual([...list].sort());
  });

  it('resolves a brand by slug', () => {
    expect(getBrandBySlug('playtime')).toBe('PlayTime');
    expect(getBrandBySlug('does-not-exist')).toBeUndefined();
  });

  it('slugifies brand names', () => {
    expect(slugifyBrand('Hot Wheels')).toBe('hot-wheels');
  });

  it('resolves the age group for a brand', () => {
    expect(getAgeGroupForBrand('PlayTime')).toBe('kids');
    expect(getAgeGroupForBrand('BrickMaster')).toBe('adults');
    expect(getAgeGroupForBrand('Unknown')).toBeUndefined();
  });
});

describe('productService — loadCatalog (API-backed)', () => {
  let get: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetCatalogForTests();
    get = vi.spyOn(api.api, 'get');
  });

  function mockCatalogSuccess() {
    get.mockResolvedValueOnce(apiProducts);
    get.mockResolvedValueOnce(CATEGORIES);
    get.mockResolvedValueOnce(brands);
  }

  it('loads products, categories and brands from the API and transitions to ready', async () => {
    mockCatalogSuccess();

    expect(getCatalogState()).toEqual({ status: 'idle' });
    const promise = loadCatalog();
    expect(getCatalogState()).toEqual({ status: 'loading' });

    await promise;
    expect(getCatalogState()).toEqual({ status: 'ready' });
    expect(getProducts()).toHaveLength(54);
    expect(getProductById(1)?.name).toBe('Hero Squad Action Pack');
    expect(getCatalogSize()).toBe(54);
    expect(get).toHaveBeenCalledWith('/products?limit=250');
  });

  it('maps API product fields to the frontend Toy shape', async () => {
    get.mockResolvedValueOnce([apiProducts[0]]);
    get.mockResolvedValueOnce([CATEGORIES[0]]);
    get.mockResolvedValueOnce([brands[0]]);

    await loadCatalog();
    const toy = getProductById(1);
    expect(toy).toMatchObject({
      id: 1,
      name: 'Hero Squad Action Pack',
      price: 34.99,
      category: 'action-figures',
      ageGroup: 'kids',
      rating: 4.7,
      inStock: true,
      brand: 'PlayTime',
    });
  });

  it('enters the error state and keeps the cache empty when the API fails', async () => {
    get.mockRejectedValue(new ApiError('Service unreachable', 0, 'network'));

    await loadCatalog();
    const state = getCatalogState();
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.message).toBe('Service unreachable');
    }
    expect(getProducts()).toEqual([]);
    expect(getProductById(1)).toBeUndefined();
  });

  it('retries after an error', async () => {
    // Attempt 1: products rejects; categories/brands still fire (consuming two
    // queued values). Attempt 2 needs a full trio queued afterwards.
    get.mockRejectedValueOnce(new ApiError('boom', 500, 'internal'));
    get.mockResolvedValueOnce(CATEGORIES);
    get.mockResolvedValueOnce(brands);
    mockCatalogSuccess();

    await loadCatalog();
    expect(getCatalogState().status).toBe('error');

    await loadCatalog();
    expect(getCatalogState()).toEqual({ status: 'ready' });
    expect(getProducts()).toHaveLength(54);
  });

  it('notifies subscribers of state changes', async () => {
    mockCatalogSuccess();

    const seen: string[] = [];
    const { subscribeCatalog } = await import('./productService');
    const unsubscribe = subscribeCatalog(() => seen.push(getCatalogState().status));
    await loadCatalog();
    unsubscribe();

    expect(seen).toContain('loading');
    expect(seen).toContain('ready');
  });
});
