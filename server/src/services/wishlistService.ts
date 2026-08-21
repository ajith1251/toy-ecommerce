import { NotFoundError } from '../errors.js';
import type { ProductRepository } from '../repositories/productRepository.js';
import type { WishlistRepository } from '../repositories/wishlistRepository.js';
import type { ProductDto } from '../types.js';
import { resolveOwnerKey, type Owner } from './ownership.js';

export interface WishlistDeps {
  wishlistRepo: WishlistRepository;
  productRepo: ProductRepository;
}

export function createWishlistService({ wishlistRepo, productRepo }: WishlistDeps) {
  async function getWishlist(owner: Owner): Promise<ProductDto[]> {
    const ids = await wishlistRepo.getWishlist(resolveOwnerKey(owner));
    return productRepo.getProductsByIds(ids);
  }

  async function addItem(owner: Owner, productId: number): Promise<ProductDto[]> {
    const product = await productRepo.getProductById(productId);
    if (!product) throw new NotFoundError(`Product ${productId} not found`);
    await wishlistRepo.addItem(resolveOwnerKey(owner), productId);
    return getWishlist(owner);
  }

  async function removeItem(owner: Owner, productId: number): Promise<ProductDto[]> {
    await wishlistRepo.removeItem(resolveOwnerKey(owner), productId);
    return getWishlist(owner);
  }

  return { getWishlist, addItem, removeItem };
}

export type WishlistService = ReturnType<typeof createWishlistService>;
