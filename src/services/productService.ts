import { api } from '../lib/api/client';
import type { AgeGroup, CategoryInfo, Toy, ToyCategory } from '../types';
import { findBrandBySlug, slugify } from '../utils/productFilters';

/**
 * Data-access boundary for catalog data (products, categories, brands).
 * The UI, hooks and services read through this module — never fetch() or
 * static data directly.
 *
 *   UI / hooks → productService → apiClient → GET /api/products…
 *
 * The service keeps a synchronous in-memory cache populated by
 * `loadCatalog()` (kicked off once by CatalogBoundary at app boot). The
 * server (PostgreSQL) is the source of truth; the cache simply preserves
 * the existing synchronous UI contract so pages don't need async plumbing.
 * On failure the catalog stays empty and `getCatalogState()` reports
 * 'error' so the UI can show a retry state instead of a fake empty grid.
 */

export interface BrandInfo {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface CatalogData {
  products: Toy[];
  categories: CategoryInfo[];
  brands: BrandInfo[];
}

export type CatalogState = { status: 'idle' } | { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

let catalog: CatalogData | null = null;
let state: CatalogState = { status: 'idle' };
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Maps a server ProductDto to the frontend Toy shape (shared with cart/wishlist sync). */
export function mapProduct(raw: Record<string, unknown>): Toy {
  return {
    id: Number(raw.id),
    name: String(raw.name),
    price: Number(raw.price),
    originalPrice: raw.originalPrice == null ? undefined : Number(raw.originalPrice),
    category: raw.category as ToyCategory,
    ageGroup: raw.ageGroup as AgeGroup,
    ageRange: String(raw.ageRange ?? ''),
    rating: Number(raw.rating),
    reviewCount: Number(raw.reviewCount),
    image: String(raw.image),
    description: String(raw.description ?? ''),
    isNew: Boolean(raw.isNew),
    isBestseller: Boolean(raw.isBestseller),
    inStock: Boolean(raw.inStock),
    brand: String(raw.brand),
  };
}

/** Subscribes to catalog state changes (loading → ready/error). Returns an unsubscribe fn. */
export function subscribeCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCatalogState(): CatalogState {
  return state;
}

/** Number of catalog products currently cached (used by UI/test state). */
export function getCatalogSize(): number {
  return catalog?.products.length ?? 0;
}

/**
 * Fetches the full catalog from the API exactly once (concurrent callers
 * share the same in-flight promise). Products are requested with a high
 * limit because the app filters/sorts client-side over the whole catalog.
 */
export async function loadCatalog(): Promise<void> {
  if (loadPromise) return loadPromise;
  state = { status: 'loading' };
  notify();

  loadPromise = (async () => {
    try {
      const [products, categories, brands] = await Promise.all([
        api.get<Record<string, unknown>[]>('/products?limit=250'),
        api.get<Record<string, unknown>[]>('/categories'),
        api.get<BrandInfo[]>('/brands'),
      ]);
      catalog = {
        products: products.map(mapProduct),
        categories: categories.map(c => ({
          id: String(c.id) as ToyCategory,
          name: String(c.name),
          icon: String(c.icon ?? ''),
          ageGroup: c.ageGroup as AgeGroup,
          color: String(c.color ?? ''),
        })),
        brands,
      };
      state = { status: 'ready' };
    } catch (err) {
      state = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load the catalog.',
      };
    } finally {
      notify();
      loadPromise = null;
    }
  })();

  return loadPromise;
}

// ── Sync accessors (UI contract preserved) ─────────────────────────────────

export function getProducts(): Toy[] {
  return catalog?.products ?? [];
}

export function getProductById(id: number): Toy | undefined {
  return catalog?.products.find(p => p.id === id);
}

export function getProductsByCategory(category: ToyCategory): Toy[] {
  return (catalog?.products ?? []).filter(p => p.category === category);
}

export function getProductsByBrand(brand: string): Toy[] {
  return (catalog?.products ?? []).filter(p => p.brand === brand);
}

export function getProductsByAgeGroup(ageGroup: AgeGroup): Toy[] {
  return (catalog?.products ?? []).filter(p => p.ageGroup === ageGroup);
}

/** Case-insensitive search over name, description and brand. */
export function searchProducts(query: string): Toy[] {
  const q = query.trim().toLowerCase();
  if (!q) return getProducts();
  return (catalog?.products ?? []).filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
  );
}

// ── Categories ─────────────────────────────────────────────────────────────

export function getCategories(): CategoryInfo[] {
  return catalog?.categories ?? [];
}

/** Category ids are also their URL slugs. */
export function getCategoryBySlug(slug: string): CategoryInfo | undefined {
  return getCategories().find(c => c.id === slug);
}

export function getCategoriesByAgeGroup(ageGroup: AgeGroup): CategoryInfo[] {
  return getCategories().filter(c => c.ageGroup === ageGroup);
}

// ── Brands ─────────────────────────────────────────────────────────────────

/** Sorted, de-duplicated list of all brand names in the catalog. */
export function getBrands(): string[] {
  const brands = catalog?.brands.map(b => b.name) ?? [];
  return Array.from(new Set(brands)).sort();
}

/** Resolves a brand name from its URL slug, e.g. "hot-wheels" → "Hot Wheels". */
export function getBrandBySlug(slug: string): string | undefined {
  const brand = catalog?.brands.find(b => b.slug === slug);
  if (brand) return brand.name;
  return findBrandBySlug(getBrands(), slug);
}

export function slugifyBrand(brand: string): string {
  return slugify(brand);
}

// ── Age groups ─────────────────────────────────────────────────────────────

/** The age group a brand's products belong to (assumed uniform per brand). */
export function getAgeGroupForBrand(brand: string): AgeGroup | undefined {
  return (catalog?.products ?? []).find(p => p.brand === brand)?.ageGroup;
}

// ── Test helpers (jsdom unit tests never hit the network) ──────────────────

/** Seeds the catalog cache directly. Used by the test setup to mirror the seeded API data. */
export function __seedCatalogForTests(data: CatalogData): void {
  catalog = data;
  state = { status: 'ready' };
  notify();
}

/** Resets the catalog cache between tests. */
export function __resetCatalogForTests(): void {
  catalog = null;
  state = { status: 'idle' };
  loadPromise = null;
  notify();
}
