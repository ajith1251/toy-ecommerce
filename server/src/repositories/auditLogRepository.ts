import type { DbPool } from '../db/pool.js';

/** Anything that can run parameterized queries (pool or a transaction client). */
type Queryable = DbPool | import('pg').PoolClient;

interface AuditLogRow {
  id: number;
  admin_user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface NewAuditLogRecord {
  adminUserId: number | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuditLogDto {
  id: number;
  adminUserId: number | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

function mapAuditLogRow(row: AuditLogRow): AuditLogDto {
  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    changes: row.changes ? row.changes : null,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at
  };
}

export function createAuditLogRepository(pool: DbPool) {
  /** Creates a new audit log record. */
  async function createLog(q: Queryable, record: NewAuditLogRecord): Promise<{ id: number }> {
    const res = await q.query(
      `INSERT INTO admin_audit_logs (
        admin_user_id, action, entity_type, entity_id, changes, ip_address, user_agent
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING id`,
      [
        record.adminUserId,
        record.action,
        record.entityType,
        record.entityId,
        record.changes ? JSON.stringify(record.changes) : null,
        record.ipAddress,
        record.userAgent
      ]
    );
    return { id: res.rows[0].id };
  }

  /** Gets audit logs with filtering and pagination. */
  async function listLogs(
    {
      page = 1,
      limit = 20,
      entityType,
      adminUserId,
      startDate,
      endDate
    }: {
      page?: number;
      limit?: number;
      entityType?: string;
      adminUserId?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ rows: AuditLogDto[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const whereConditions: string[] = [];
    const queryParams: unknown[] = [];
    
    if (entityType) {
      queryParams.push(entityType);
      whereConditions.push(`entity_type = $${queryParams.length}`);
    }
    
    if (adminUserId !== undefined && adminUserId !== null) {
      queryParams.push(adminUserId);
      whereConditions.push(`admin_user_id = $${queryParams.length}`);
    }
    
    if (startDate) {
      queryParams.push(startDate);
      whereConditions.push(`created_at >= $${queryParams.length}`);
    }
    
    if (endDate) {
      queryParams.push(endDate);
      whereConditions.push(`created_at <= $${queryParams.length}`);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    const logsQuery = `
      SELECT 
        id,
        admin_user_id,
        action,
        entity_type,
        entity_id,
        changes,
        ip_address,
        user_agent,
        created_at
      FROM admin_audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM admin_audit_logs
      ${whereClause}
    `;
    
    const params = [...queryParams, limit, offset];
    const logsResult = await pool.query(logsQuery, params);
    const countResult = await pool.query(countQuery, queryParams);
    
    return {
      rows: logsResult.rows.map(mapAuditLogRow),
      total: Number(countResult.rows[0].total)
    };
  }

  /** Gets an audit log by its internal ID. */
  async function getLogById(id: number): Promise<AuditLogDto | null> {
    const res = await pool.query<AuditLogRow>(
      `SELECT * FROM admin_audit_logs WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? mapAuditLogRow(res.rows[0]) : null;
  }

  return {
    createLog,
    listLogs,
    getLogById
  };
}

export type AuditLogRepository = ReturnType<typeof createAuditLogRepository>;