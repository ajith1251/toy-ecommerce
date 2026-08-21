import type { ProductQuery } from '../schemas/common.js';
import type { BrandRepository, CategoryRepository } from '../repositories/catalogRepository.js';
import type { ProductRepository } from '../repositories/productRepository.js';
import type { BrandDto, CategoryDto, Paged, ProductDto } from '../types.js';

export interface CatalogDeps {
  productRepo: ProductRepository;
  categoryRepo: CategoryRepository;
  brandRepo: BrandRepository;
}

export function createCatalogService({ productRepo, categoryRepo, brandRepo }: CatalogDeps) {
  async function listProducts(query: ProductQuery): Promise<Paged<ProductDto>> {
    const { rows, total } = await productRepo.listProducts(query);
    return {
      data: rows,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async function getProductById(id: number): Promise<ProductDto | null> {
    return productRepo.getProductById(id);
  }

  async function getProductBySlug(slug: string): Promise<ProductDto | null> {
    return productRepo.getProductBySlug(slug);
  }

  async function listCategories(): Promise<CategoryDto[]> {
    return categoryRepo.listCategories();
  }

  async function getCategoryBySlug(slug: string): Promise<CategoryDto | null> {
    return categoryRepo.getCategoryBySlug(slug);
  }

  async function listBrands(): Promise<BrandDto[]> {
    return brandRepo.listBrands();
  }

  async function getBrandBySlug(slug: string): Promise<BrandDto | null> {
    return brandRepo.getBrandBySlug(slug);
  }

  return { listProducts, getProductById, getProductBySlug, listCategories, getCategoryBySlug, listBrands, getBrandBySlug };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
