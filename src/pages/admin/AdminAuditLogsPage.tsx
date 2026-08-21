import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import PageLoader from '../../components/ui/PageLoader';
import { isApiError } from '../../lib/api/errors';
import { listAuditLogs } from '../../services/adminService';
import type { AdminPage, AuditLogEntry } from '../../types/admin';

const PAGE_SIZE = 20;

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [result, setResult] = useState<AdminPage<AuditLogEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listAuditLogs({ page, limit: PAGE_SIZE, entityType: entityFilter || undefined })
      .then(res => {
        if (!cancelled) { setResult(res); setError(null); }
      })
      .catch(err => {
        if (!cancelled) setError(isApiError(err) ? err.message : 'Unable to load audit logs.');
      });
    return () => {
      cancelled = true;
    };
  }, [page, entityFilter, reloadKey]);

  if (error && !result) {
    return <ErrorState title="Unable to load audit logs" description={error} onRetry={() => setReloadKey(k => k + 1)} />;
  }
  if (!result) {
    return <PageLoader label="Loading audit logs…" />;
  }

  const logs = result.data;
  const pagination = result.pagination;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex">
        <select
          aria-label="Filter by entity type"
          value={entityFilter}
          onChange={e => {
            setPage(1);
            setEntityFilter(e.target.value);
          }}
          className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          <option value="">All entities</option>
          {['product', 'category', 'brand', 'order', 'user', 'inventory'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={() => setReloadKey(k => k + 1)} />
      ) : logs.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 py-12 text-center">No audit activity recorded yet.</p>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th scope="col" className="px-4 py-3 font-semibold">When</th>
                <th scope="col" className="px-4 py-3 font-semibold">Admin</th>
                <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                <th scope="col" className="px-4 py-3 font-semibold">Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{log.adminEmail ?? 'System'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <nav aria-label="Audit log pagination" className="flex items-center justify-center gap-3">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
