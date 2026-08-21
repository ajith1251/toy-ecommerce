/**
 * Seeds the ToyBox catalog from the frontend static dataset
 * (src/data/products.ts) so the API serves the exact same 54 products,
 * categories and brands the UI already knows. Deterministic and idempotent
 * (upserts) — safe to run repeatedly.
 *
 * Run via tsx: `npm run db:seed` (tsx resolves the frontend TS import).
 */
import { CATEGORIES, PRODUCTS } from '../../src/data/products.ts';
import type { DbPool } from '../src/db/pool.js';

/** Deterministic stock level per product (25–94). */
function stockFor(id: number): number {
  return 25 + ((id * 7) % 70);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface SeedResult {
  categories: number;
  brands: number;
  products: number;
}

export async function seedDatabase(pool: DbPool): Promise<SeedResult> {
  // ── Categories (id is the URL slug) ────────────────────────────────────
  let categories = 0;
  for (const category of CATEGORIES) {
    const res = await pool.query(
      `INSERT INTO categories (id, name, icon, color, age_group)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color, age_group = EXCLUDED.age_group
       RETURNING id`,
      [category.id, category.name, category.icon, category.color, category.ageGroup]
    );
    if ((res.rowCount ?? 0) > 0) categories += 1;
  }

  // ── Brands (alphabetical, stable ids) ──────────────────────────────────
  const brandNames = Array.from(new Set(PRODUCTS.map(p => p.brand))).sort();
  const brandIds = new Map<string, number>();
  let brands = 0;
  for (const name of brandNames) {
    const res = await pool.query<{ id: number }>(
      `INSERT INTO brands (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, slugify(name)]
    );
    const id = res.rows[0]?.id;
    if (id === undefined) throw new Error(`Failed to upsert brand ${name}`);
    brandIds.set(name, id);
    brands += 1;
  }

  // ── Products (explicit ids keep the frontend /product/:id contract) ────
  let products = 0;
  for (const product of PRODUCTS) {
    const brandId = brandIds.get(product.brand);
    if (brandId === undefined) throw new Error(`Missing brand ${product.brand}`);
    const res = await pool.query(
      `INSERT INTO products (
         id, slug, name, description, price, original_price,
         category_id, brand_id, age_group, age_range,
         rating, review_count, image, stock_quantity,
         is_active, is_new, is_bestseller
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id) DO UPDATE SET
         slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description,
         price = EXCLUDED.price, original_price = EXCLUDED.original_price,
         category_id = EXCLUDED.category_id, brand_id = EXCLUDED.brand_id,
         age_group = EXCLUDED.age_group, age_range = EXCLUDED.age_range,
         rating = EXCLUDED.rating, review_count = EXCLUDED.review_count,
         image = EXCLUDED.image, is_active = EXCLUDED.is_active,
         is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
       RETURNING id`,
      [
        product.id,
        slugify(product.name),
        product.name,
        product.description,
        product.price,
        product.originalPrice ?? null,
        product.category,
        brandId,
        product.ageGroup,
        product.ageRange,
        product.rating,
        product.reviewCount,
        product.image,
        stockFor(product.id),
        true,
        product.isNew ?? false,
        product.isBestseller ?? false,
      ]
    );
    if ((res.rowCount ?? 0) > 0) products += 1;
  }

  return { categories, brands, products };
}
