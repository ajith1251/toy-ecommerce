import type { DbPool } from '../db/pool.js';
import type { ProductQuery } from '../schemas/common.js';
import type { ProductDto } from '../types.js';

interface ProductRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: string;
  original_price: string | null;
  category_id: string;
  brand_name: string;
  age_group: ProductDto['ageGroup'];
  age_range: string;
  rating: string;
  review_count: number;
  image: string;
  stock_quantity: number;
  is_active: boolean;
  is_new: boolean;
  is_bestseller: boolean;
}

export function mapProductRow(row: ProductRow): ProductDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    originalPrice: row.original_price === null ? null : Number(row.original_price),
    category: row.category_id,
    brand: row.brand_name,
    ageGroup: row.age_group,
    ageRange: row.age_range,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    image: row.image,
    stockQuantity: row.stock_quantity,
    inStock: row.is_active && row.stock_quantity > 0,
    isNew: row.is_new,
    isBestseller: row.is_bestseller,
  };
}

const SELECT_PRODUCT = `
  SELECT p.id, p.slug, p.name, p.description, p.price, p.original_price,
         p.category_id, b.name AS brand_name, p.age_group, p.age_range,
         p.rating, p.review_count, p.image, p.stock_quantity,
         p.is_active, p.is_new, p.is_bestseller
  FROM products p
  JOIN brands b ON b.id = p.brand_id
`;

const ORDER_BY_SQL: Record<NonNullable<ProductQuery['sort']>, string> = {
  newest: 'p.is_new DESC, p.id ASC',
  'price-asc': 'p.price ASC, p.id ASC',
  'price-desc': 'p.price DESC, p.id ASC',
  rating: 'p.rating DESC, p.review_count DESC, p.id ASC',
  bestseller: 'p.is_bestseller DESC, p.rating DESC, p.id ASC',
};

interface WhereClause {
  clause: string;
  params: unknown[];
}

function buildWhere(query: ProductQuery): WhereClause {
  const conditions: string[] = ['p.is_active = true'];
  const params: unknown[] = [];

  if (query.q) {
    params.push(`%${query.q}%`);
    conditions.push(
      `(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR b.name ILIKE $${params.length})`
    );
  }
  if (query.category) {
    params.push(query.category);
    conditions.push(`p.category_id = $${params.length}`);
  }
  if (query.brand) {
    params.push(query.brand);
    conditions.push(`b.slug = $${params.length}`);
  }
  if (query.minPrice !== undefined) {
    params.push(query.minPrice);
    conditions.push(`p.price >= $${params.length}`);
  }
  if (query.maxPrice !== undefined) {
    params.push(query.maxPrice);
    conditions.push(`p.price <= $${params.length}`);
  }
  if (query.minRating !== undefined) {
    params.push(query.minRating);
    conditions.push(`p.rating >= $${params.length}`);
  }
  if (query.inStock === true) {
    conditions.push('p.stock_quantity > 0');
  }

  return { clause: conditions.join(' AND '), params };
}

export interface ListProductsResult {
  rows: ProductDto[];
  total: number;
}

export function createProductRepository(pool: DbPool) {
  async function listProducts(query: ProductQuery): Promise<ListProductsResult> {
    const where = buildWhere(query);
    const totalRes = await pool.query<{ total: string }>(
      `SELECT count(*) AS total FROM products p JOIN brands b ON b.id = p.brand_id WHERE ${where.clause}`,
      where.params
    );
    const total = Number(totalRes.rows[0]?.total ?? 0);

    const offset = (query.page - 1) * query.limit;
    const res = await pool.query<ProductRow>(
      `${SELECT_PRODUCT} WHERE ${where.clause}
       ORDER BY ${ORDER_BY_SQL[query.sort]}
       LIMIT ${query.limit} OFFSET ${offset}`,
      where.params
    );

    return { rows: res.rows.map(mapProductRow), total };
  }

  async function getProductById(id: number): Promise<ProductDto | null> {
    const res = await pool.query<ProductRow>(`${SELECT_PRODUCT} WHERE p.id = $1 AND p.is_active = true`, [id]);
    return res.rows[0] ? mapProductRow(res.rows[0]) : null;
  }

  async function getProductBySlug(slug: string): Promise<ProductDto | null> {
    const res = await pool.query<ProductRow>(`${SELECT_PRODUCT} WHERE p.slug = $1 AND p.is_active = true`, [slug]);
    return res.rows[0] ? mapProductRow(res.rows[0]) : null;
  }

  async function getProductsByIds(ids: number[]): Promise<ProductDto[]> {
    if (ids.length === 0) return [];
    const res = await pool.query<ProductRow>(
      `${SELECT_PRODUCT} WHERE p.id = ANY($1::int[]) AND p.is_active = true`,
      [ids]
    );
    return res.rows.map(mapProductRow);
  }

  return { listProducts, getProductById, getProductBySlug, getProductsByIds };
}

export type ProductRepository = ReturnType<typeof createProductRepository>;
