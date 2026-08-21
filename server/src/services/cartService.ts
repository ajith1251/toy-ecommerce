import { NotFoundError } from '../errors.js';
import type { CartRepository } from '../repositories/cartRepository.js';
import type { ProductRepository } from '../repositories/productRepository.js';
import type { CartItemDto } from '../types.js';
import { resolveOwnerKey, type Owner } from './ownership.js';

export interface CartDeps {
  cartRepo: CartRepository;
  productRepo: ProductRepository;
}

export function createCartService({ cartRepo, productRepo }: CartDeps) {
  async function getCart(owner: Owner): Promise<CartItemDto[]> {
    const items = await cartRepo.getCart(resolveOwnerKey(owner));
    const products = await productRepo.getProductsByIds(items.map(i => i.product_id));
    const byId = new Map(products.map(p => [p.id, p]));
    return items
      .map(item => {
        const product = byId.get(item.product_id);
        return product ? { productId: item.product_id, quantity: item.quantity, product } : null;
      })
      .filter((i): i is CartItemDto => i !== null);
  }

  async function addItem(owner: Owner, productId: number, quantity: number): Promise<CartItemDto[]> {
    const product = await productRepo.getProductById(productId);
    if (!product) throw new NotFoundError(`Product ${productId} not found`);
    await cartRepo.upsertItem(resolveOwnerKey(owner), productId, quantity);
    return getCart(owner);
  }

  async function updateItem(owner: Owner, productId: number, quantity: number): Promise<CartItemDto[]> {
    const product = await productRepo.getProductById(productId);
    if (!product) throw new NotFoundError(`Product ${productId} not found`);
    const key = resolveOwnerKey(owner);
    if (quantity === 0) {
      await cartRepo.removeItem(key, productId);
    } else {
      await cartRepo.upsertItem(key, productId, quantity);
    }
    return getCart(owner);
  }

  async function removeItem(owner: Owner, productId: number): Promise<CartItemDto[]> {
    await cartRepo.removeItem(resolveOwnerKey(owner), productId);
    return getCart(owner);
  }

  async function clearCart(owner: Owner): Promise<void> {
    await cartRepo.clearCart(resolveOwnerKey(owner));
  }

  return { getCart, addItem, updateItem, removeItem, clearCart };
}

export type CartService = ReturnType<typeof createCartService>;
