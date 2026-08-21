import type { DbPool } from '../db/pool.js';
import type { ProductRepository } from '../repositories/productRepository.js';
import type { InventoryTransactionRepository } from '../repositories/inventoryTransactionRepository.js';
import { InsufficientStockError, NotFoundError } from '../errors.js';

export interface InventoryTransactionDeps {
  pool: DbPool;
  productRepo: ProductRepository;
  inventoryTransactionRepo: InventoryTransactionRepository;
}

/** Records an inventory adjustment and updates product stock atomically. */
export function createInventoryTransactionService({
  pool,
  productRepo,
  inventoryTransactionRepo
}: InventoryTransactionDeps) {
  /**
   * Adjusts inventory stock for a product and records the transaction.
   * 
   * @param productId - The ID of the product to adjust
   * @param quantityDelta - The amount to change stock by (can be negative)
   * @param reason - The reason for the adjustment
   * @param referenceType - Optional reference type (e.g., 'order', 'adjustment')
   * @param referenceId - Optional reference ID (e.g., order number)
   * @param performedBy - Optional ID of the user performing the action
   */
  async function adjustStock(
    productId: number,
    quantityDelta: number,
    reason: string,
    referenceType: string | null = null,
    referenceId: string | null = null,
    performedBy: number | null = null
  ): Promise<{ newStock: number; transactionId: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the product row to prevent race conditions
      const productRes = await client.query<{ 
        id: number; 
        stock_quantity: number; 
        is_active: boolean 
      }>(
        `SELECT id, stock_quantity, is_active FROM products WHERE id = $1 FOR UPDATE`,
        [productId]
      );

      const product = productRes.rows[0];
      if (!product) {
        throw new NotFoundError(`Product ${productId} not found`);
      }

      if (!product.is_active) {
        throw new Error(`Product ${productId} is not active`);
      }

      const currentStock = product.stock_quantity;
      const newStock = currentStock + quantityDelta;

      // Prevent negative stock
      if (newStock < 0) {
        throw new InsufficientStockError({
          productId,
          requested: quantityDelta < 0 ? Math.abs(quantityDelta) : 0,
          available: currentStock
        });
      }

      // Update the product stock
      await client.query(
        `UPDATE products SET stock_quantity = $1, updated_at = now() WHERE id = $2`,
        [newStock, productId]
      );

      // Record the inventory transaction
      const transactionRes = await inventoryTransactionRepo.createTransaction(client, {
        productId,
        changeQuantity: quantityDelta,
        reason,
        referenceType,
        referenceId,
        performedBy
      });

      await client.query('COMMIT');
      
      return { newStock, transactionId: transactionRes.id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Lists inventory transactions for a product. */
  async function listTransactions(
    productId: number,
    options: { page?: number; limit?: number } = {}
  ) {
    return inventoryTransactionRepo.listTransactionsForProduct(productId, options);
  }

  /** Gets a specific inventory transaction. */
  async function getTransaction(id: number) {
    return inventoryTransactionRepo.getTransactionById(id);
  }

  return {
    adjustStock,
    listTransactions,
    getTransaction
  };
}

export type InventoryTransactionService = ReturnType<typeof createInventoryTransactionService>;