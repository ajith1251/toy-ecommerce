import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import PageLoader from '../../components/ui/PageLoader';
import { isApiError } from '../../lib/api/errors';
import { listAdminPayments } from '../../services/adminService';
import type { AdminPage, AdminPayment } from '../../types/admin';

const PAGE_SIZE = 20;

function formatMoney(value: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}

export default function AdminPaymentsPage() {
 const [page, setPage] = useState(1);
 const [statusFilter, setStatusFilter] = useState('');
 const [methodFilter, setMethodFilter] = useState('');
 const [result, setResult] = useState<AdminPage<AdminPayment> | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [reloadKey, setReloadKey] = useState(0);

 useEffect(() => {
 let cancelled = false;
 listAdminPayments({ page, limit: PAGE_SIZE, status: statusFilter || undefined, method: methodFilter || undefined })
 .then(res => {
 if (!cancelled) { setResult(res); setError(null); }
 })
 .catch(err => {
 if (!cancelled) setError(isApiError(err) ? err.message : 'Unable to load payments.');
 });
 return () => {
 cancelled = true;
 };
 }, [page, statusFilter, methodFilter, reloadKey]);

 if (error && !result) {
 return <ErrorState title="Unable to load payments"description={error} onRetry={() => setReloadKey(k => k + 1)} />;
 }
 if (!result) {
 return <PageLoader label="Loading payments…"/>;
 }

 const payments = result.data;
 const pagination = result.pagination;

 return (
 <div className="flex flex-col gap-4">
 <div className="flex flex-col sm:flex-row gap-3">
 <select
 aria-label="Filter by payment status"
 value={statusFilter}
 onChange={e => {
 setPage(1);
 setStatusFilter(e.target.value);
 }}
 className="rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
 >
 <option value="">All statuses</option>
 {['pending', 'authorized', 'captured', 'failed', 'refunded'].map(s => (
 <option key={s} value={s}>{s}</option>
 ))}
 </select>
 <select
 aria-label="Filter by payment method"
 value={methodFilter}
 onChange={e => {
 setPage(1);
 setMethodFilter(e.target.value);
 }}
 className="rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
 >
 <option value="">All methods</option>
 {['card', 'upi', 'cod'].map(m => (
 <option key={m} value={m}>{m}</option>
 ))}
 </select>
 </div>

 {error ? (
 <ErrorState description={error} onRetry={() => setReloadKey(k => k + 1)} />
 ) : payments.length === 0 ? (
 <p className="text-[var(--muted)] py-12 text-center">No payments match these filters.</p>
 ) : (
 <div className="bg-[var(--surface)] rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="text-left text-[var(--muted)] border-b border-[var(--hairline)]">
 <th scope="col"className="px-4 py-3 font-semibold">Payment</th>
 <th scope="col"className="px-4 py-3 font-semibold">Order</th>
 <th scope="col"className="px-4 py-3 font-semibold">Method</th>
 <th scope="col"className="px-4 py-3 font-semibold">Amount</th>
 <th scope="col"className="px-4 py-3 font-semibold">Status</th>
 </tr>
 </thead>
 <tbody>
 {payments.map(payment => (
 <tr key={payment.id} className="border-b border-[var(--hairline)] last:border-0">
 <td className="px-4 py-3">
 <p className="font-semibold text-[var(--ink-strong)]">#{payment.id}</p>
 <p className="text-xs text-[var(--muted-light)]">
 {new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
 </p>
 </td>
 <td className="px-4 py-3 text-[var(--ink)]">{payment.orderId}</td>
 <td className="px-4 py-3 uppercase text-[var(--ink)]">{payment.method}</td>
 <td className="px-4 py-3 text-[var(--ink)]">{formatMoney(payment.amount)}</td>
 <td className="px-4 py-3">
 <span
 className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
 payment.status === 'captured'
 ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] '
 : payment.status === 'failed'
 ? 'bg-red-100 text-red-600 '
 : 'bg-amber-100 text-amber-700 '
 }`}
 >
 {payment.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {pagination.totalPages > 1 && (
 <nav aria-label="Payments pagination"className="flex items-center justify-center gap-3">
 <Button size="sm"variant="outline"disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
 Previous
 </Button>
 <span className="text-sm text-[var(--muted)]">
 Page {pagination.page} of {pagination.totalPages}
 </span>
 <Button size="sm"variant="outline"disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
 Next
 </Button>
 </nav>
 )}
 </div>
 );
}
