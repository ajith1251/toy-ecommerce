import type { DbPool } from '../db/pool.js';

/** Anything that can run parameterized queries (pool or a transaction client). */
type Queryable = DbPool | import('pg').PoolClient;

interface InventoryTransactionRow {
  id: number;
  product_id: number;
  change_quantity: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: number | null;
  created_at: string;
}

export interface NewInventoryTransactionRecord {
  productId: number;
  changeQuantity: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  performedBy: number | null;
}

export interface InventoryTransactionDto {
  id: number;
  productId: number;
  changeQuantity: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  performedBy: number | null;
  createdAt: string;
}

function mapInventoryTransactionRow(row: InventoryTransactionRow): InventoryTransactionDto {
  return {
    id: row.id,
    productId: row.product_id,
    changeQuantity: row.change_quantity,
    reason: row.reason,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    performedBy: row.performed_by,
    createdAt: row.created_at,
  };
}

export function createInventoryTransactionRepository(pool: DbPool) {
  /** Creates a new inventory transaction record. */
  async function createTransaction(q: Queryable, record: NewInventoryTransactionRecord): Promise<{ id: number }> {
    const res = await q.query(
      `INSERT INTO inventory_transactions (
        product_id, change_quantity, reason, reference_type, reference_id, performed_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING id`,
      [
        record.productId,
        record.changeQuantity,
        record.reason,
        record.referenceType,
        record.referenceId,
        record.performedBy
      ]
    );
    return { id: res.rows[0].id };
  }

  /** Gets inventory transactions for a product with pagination. */
  async function listTransactionsForProduct(
    productId: number,
    { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
  ): Promise<{ rows: InventoryTransactionDto[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const whereConditions = ['product_id = $1'];
    const queryParams = [productId];
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const transactionsQuery = `
      SELECT 
        id,
        product_id,
        change_quantity,
        reason,
        reference_type,
        reference_id,
        performed_by,
        created_at
      FROM inventory_transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM inventory_transactions
      ${whereClause}
    `;
    
    const params = [...queryParams, limit, offset];
    const transactionsResult = await pool.query(transactionsQuery, params);
    const countResult = await pool.query(countQuery, queryParams);
    
    return {
      rows: transactionsResult.rows.map(mapInventoryTransactionRow),
      total: Number(countResult.rows[0].total)
    };
  }

  /** Gets a transaction by its internal ID. */
  async function getTransactionById(id: number): Promise<InventoryTransactionDto | null> {
    const res = await pool.query<InventoryTransactionRow>(
      `SELECT * FROM inventory_transactions WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? mapInventoryTransactionRow(res.rows[0]) : null;
  }

  return {
    createTransaction,
    listTransactionsForProduct,
    getTransactionById
  };
}

export type InventoryTransactionRepository = ReturnType<typeof createInventoryTransactionRepository>;