import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import PageLoader from '../../components/ui/PageLoader';
import { useShop } from '../../context/ShopContext';
import { isApiError } from '../../lib/api/errors';
import { listAdminOrders, updateAdminOrderStatus } from '../../services/adminService';
import type { AdminOrder, AdminOrderStatus } from '../../types/admin';

const PAGE_SIZE = 20;

const ORDER_STATUSES: AdminOrderStatus[] = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled'];

/** Which transitions the server allows from each status (mirrors orderStatus.ts). */
const NEXT_STATUSES: Record<string, AdminOrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

function formatMoney(value: number | undefined): string {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}

export default function AdminOrdersPage() {
  const { addToast } = useShop();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [result, setResult] = useState<{ data: AdminOrder[]; pagination: { page: number; totalPages: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAdminOrders({
      page,
      limit: PAGE_SIZE,
      status: statusFilter || undefined,
      paymentStatus: paymentFilter || undefined,
      customer: customerSearch || undefined,
    })
      .then(res => {
        if (!cancelled) { setResult(res); setError(null); }
      })
      .catch(err => {
        if (!cancelled) setError(isApiError(err) ? err.message : 'Unable to load orders.');
      });
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, paymentFilter, customerSearch, reloadKey]);

  const changeStatus = async (orderNumber: string, status: AdminOrderStatus) => {
    setBusyId(orderNumber);
    try {
      await updateAdminOrderStatus(orderNumber, status);
      addToast(`Order ${orderNumber} marked ${status}`, 'success');
      setReloadKey(k => k + 1);
    } catch (err) {
      addToast(isApiError(err) ? err.message : 'Could not update the order status', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (error && !result) {
    return <ErrorState title="Unable to load orders" description={error} onRetry={() => setReloadKey(k => k + 1)} />;
  }
  if (!result) {
    return <PageLoader label="Loading orders…" />;
  }

  const orders = result.data;
  const pagination = result.pagination;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          aria-label="Search customers"
          placeholder="Search customer name or email…"
          value={customerSearch}
          onChange={e => {
            setPage(1);
            setCustomerSearch(e.target.value);
          }}
          className="flex-1 px-4 py-2.5 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 transition-all"
        />
        <select
          aria-label="Filter by order status"
          value={statusFilter}
          onChange={e => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filter by payment status"
          value={paymentFilter}
          onChange={e => {
            setPage(1);
            setPaymentFilter(e.target.value);
          }}
          className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          <option value="">All payments</option>
          {['pending', 'authorized', 'captured', 'failed', 'refunded'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={() => setReloadKey(k => k + 1)} />
      ) : orders.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 py-12 text-center">No orders match these filters.</p>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th scope="col" className="px-4 py-3 font-semibold">Order</th>
                <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                <th scope="col" className="px-4 py-3 font-semibold">Total</th>
                <th scope="col" className="px-4 py-3 font-semibold">Payment</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">{order.id}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 dark:text-slate-300">
                      {order.customer?.firstName} {order.customer?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{order.customer?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatMoney(order.pricing?.grandTotal)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        order.paymentStatus === 'captured'
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                          : order.paymentStatus === 'failed'
                            ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{order.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {(NEXT_STATUSES[order.status] ?? []).length > 0 ? (
                        <select
                          aria-label={`Update status for order ${order.id}`}
                          disabled={busyId === order.id}
                          value=""
                          onChange={e => {
                            const next = e.target.value as AdminOrderStatus;
                            if (next) void changeStatus(order.id, next);
                          }}
                          className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
                        >
                          <option value="" disabled>Move to…</option>
                          {(NEXT_STATUSES[order.status] ?? []).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">Final</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <nav aria-label="Orders pagination" className="flex items-center justify-center gap-3">
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
