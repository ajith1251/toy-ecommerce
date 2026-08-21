import type { Response } from 'express';
import type { ProductQuery } from '../schemas/common.js';
import { NotFoundError } from '../errors.js';
import type { CatalogService } from '../services/catalogService.js';

export function createCatalogController(catalog: CatalogService) {
  async function listProducts(query: ProductQuery, res: Response) {
    res.json(await catalog.listProducts(query));
  }

  async function getProductById(id: number, res: Response) {
    const product = await catalog.getProductById(id);
    if (!product) throw new NotFoundError(`Product ${id} not found`);
    res.json({ data: product });
  }

  async function getProductBySlug(slug: string, res: Response) {
    const product = await catalog.getProductBySlug(slug);
    if (!product) throw new NotFoundError(`Product with slug "${slug}" not found`);
    res.json({ data: product });
  }

  async function listCategories(res: Response) {
    res.json({ data: await catalog.listCategories() });
  }

  async function getCategoryBySlug(slug: string, res: Response) {
    const category = await catalog.getCategoryBySlug(slug);
    if (!category) throw new NotFoundError(`Category "${slug}" not found`);
    res.json({ data: category });
  }

  async function listBrands(res: Response) {
    res.json({ data: await catalog.listBrands() });
  }

  async function getBrandBySlug(slug: string, res: Response) {
    const brand = await catalog.getBrandBySlug(slug);
    if (!brand) throw new NotFoundError(`Brand "${slug}" not found`);
    res.json({ data: brand });
  }

  return { listProducts, getProductById, getProductBySlug, listCategories, getCategoryBySlug, listBrands, getBrandBySlug };
}
