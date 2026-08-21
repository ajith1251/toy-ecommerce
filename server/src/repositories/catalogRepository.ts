import type { DbPool } from '../db/pool.js';
import type { BrandDto, CategoryDto } from '../types.js';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  age_group: CategoryDto['ageGroup'];
}

interface BrandRow {
  id: number;
  name: string;
  slug: string;
  description: string;
}

function mapCategory(row: CategoryRow): CategoryDto {
  return { id: row.id, slug: row.id, name: row.name, icon: row.icon, color: row.color, ageGroup: row.age_group };
}

function mapBrand(row: BrandRow): BrandDto {
  return { id: row.id, name: row.name, slug: row.slug, description: row.description };
}

export function createCategoryRepository(pool: DbPool) {
  async function listCategories(): Promise<CategoryDto[]> {
    const res = await pool.query<CategoryRow>('SELECT id, name, icon, color, age_group FROM categories ORDER BY id');
    return res.rows.map(mapCategory);
  }

  async function getCategoryBySlug(slug: string): Promise<CategoryDto | null> {
    const res = await pool.query<CategoryRow>('SELECT id, name, icon, color, age_group FROM categories WHERE id = $1', [
      slug,
    ]);
    return res.rows[0] ? mapCategory(res.rows[0]) : null;
  }

  return { listCategories, getCategoryBySlug };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;

export function createBrandRepository(pool: DbPool) {
  async function listBrands(): Promise<BrandDto[]> {
    const res = await pool.query<BrandRow>('SELECT id, name, slug, description FROM brands ORDER BY name');
    return res.rows.map(mapBrand);
  }

  async function getBrandBySlug(slug: string): Promise<BrandDto | null> {
    const res = await pool.query<BrandRow>('SELECT id, name, slug, description FROM brands WHERE slug = $1', [slug]);
    return res.rows[0] ? mapBrand(res.rows[0]) : null;
  }

  return { listBrands, getBrandBySlug };
}

export type BrandRepository = ReturnType<typeof createBrandRepository>;
