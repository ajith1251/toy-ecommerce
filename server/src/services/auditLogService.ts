import type { DbPool } from '../db/pool.js';

export interface AuditLogDeps {
  pool: DbPool;
  auditLogRepo: import('../repositories/auditLogRepository.js').AuditLogRepository;
}

/** Service for managing admin audit logs. */
export function createAuditLogService({ pool, auditLogRepo }: AuditLogDeps) {
  /**
   * Creates an audit log entry for an admin action.
   * 
   * @param adminUserId - ID of the admin user performing the action (null if not available)
   * @param action - Description of the action performed
   * @param entityType - Type of entity affected (e.g., 'product', 'order', 'user')
   * @param entityId - ID of the entity affected
   * @param changes - Optional changes made (as a plain object)
   * @param ipAddress - IP address of the admin
   * @param userAgent - User agent of the admin's browser
   */
  async function logAction(
    adminUserId: number | null,
    action: string,
    entityType: string,
    entityId: string | null,
    changes: Record<string, unknown> | null = null,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<void> {
    await auditLogRepo.createLog(pool, {
      adminUserId,
      action,
      entityType,
      entityId,
      changes,
      ipAddress,
      userAgent
    });
  }

  /** Lists audit logs with filtering and pagination. */
  async function listLogs(
    options: {
      page?: number;
      limit?: number;
      entityType?: string;
      adminUserId?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ) {
    return auditLogRepo.listLogs(options);
  }

  /** Gets a specific audit log by ID. */
  async function getLog(id: number) {
    return auditLogRepo.getLogById(id);
  }

  return {
    logAction,
    listLogs,
    getLog
  };
}

export type AuditLogService = ReturnType<typeof createAuditLogService>;