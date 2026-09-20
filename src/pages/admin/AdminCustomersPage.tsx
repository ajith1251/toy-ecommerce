import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import PageLoader from '../../components/ui/PageLoader';
import { useShop } from '../../context/ShopContext';
import { isApiError } from '../../lib/api/errors';
import { listAdminCustomers, updateAdminCustomerStatus } from '../../services/adminService';
import type { AdminCustomer, AdminPage } from '../../types/admin';

const PAGE_SIZE = 20;

export default function AdminCustomersPage() {
 const { addToast } = useShop();
 const [page, setPage] = useState(1);
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
 const [result, setResult] = useState<AdminPage<AdminCustomer> | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [reloadKey, setReloadKey] = useState(0);
 const [busyId, setBusyId] = useState<number | null>(null);

 useEffect(() => {
 let cancelled = false;
 listAdminCustomers({ page, limit: PAGE_SIZE, search: search || undefined, status: statusFilter || undefined })
 .then(res => {
 if (!cancelled) { setResult(res); setError(null); }
 })
 .catch(err => {
 if (!cancelled) setError(isApiError(err) ? err.message : 'Unable to load customers.');
 });
 return () => {
 cancelled = true;
 };
 }, [page, search, statusFilter, reloadKey]);

 const toggleStatus = async (customer: AdminCustomer) => {
 const next = customer.status === 'active' ? 'suspended' : 'active';
 setBusyId(customer.id);
 try {
 await updateAdminCustomerStatus(customer.id, next);
 addToast(
 next === 'suspended' ? `${customer.email} suspended` : `${customer.email} reactivated`,
 'success'
 );
 setReloadKey(k => k + 1);
 } catch (err) {
 addToast(isApiError(err) ? err.message : 'Could not update the customer', 'error');
 } finally {
 setBusyId(null);
 }
 };

 if (error && !result) {
 return <ErrorState title="Unable to load customers"description={error} onRetry={() => setReloadKey(k => k + 1)} />;
 }
 if (!result) {
 return <PageLoader label="Loading customers…"/>;
 }

 const customers = result.data;
 const pagination = result.pagination;

 return (
 <div className="flex flex-col gap-4">
 <div className="flex flex-col sm:flex-row gap-3">
 <input
 type="search"
 aria-label="Search customers"
 placeholder="Search name or email…"
 value={search}
 onChange={e => {
 setPage(1);
 setSearch(e.target.value);
 }}
 className="flex-1 px-4 py-2.5 rounded-full border-2 border-[var(--hairline)] bg-[var(--surface)] text-sm text-[var(--ink-strong)] placeholder:text-[var(--muted-light)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue)]/20 transition-all"
 />
 <select
 aria-label="Filter by account status"
 value={statusFilter}
 onChange={e => {
 setPage(1);
 setStatusFilter(e.target.value as typeof statusFilter);
 }}
 className="rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
 >
 <option value="">All statuses</option>
 <option value="active">Active</option>
 <option value="inactive">Suspended</option>
 </select>
 </div>

 {error ? (
 <ErrorState description={error} onRetry={() => setReloadKey(k => k + 1)} />
 ) : customers.length === 0 ? (
 <p className="text-[var(--muted)] py-12 text-center">No customers match these filters.</p>
 ) : (
 <div className="bg-[var(--surface)] rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="text-left text-[var(--muted)] border-b border-[var(--hairline)]">
 <th scope="col"className="px-4 py-3 font-semibold">Customer</th>
 <th scope="col"className="px-4 py-3 font-semibold">Joined</th>
 <th scope="col"className="px-4 py-3 font-semibold">Last login</th>
 <th scope="col"className="px-4 py-3 font-semibold">Status</th>
 <th scope="col"className="px-4 py-3 font-semibold text-right">Actions</th>
 </tr>
 </thead>
 <tbody>
 {customers.map(customer => (
 <tr key={customer.id} className="border-b border-[var(--hairline)] last:border-0">
 <td className="px-4 py-3">
 <p className="font-semibold text-[var(--ink-strong)]">
 {customer.firstName || customer.lastName
 ? `${customer.firstName} ${customer.lastName}`.trim()
 : '—'}
 </p>
 <p className="text-xs text-[var(--muted-light)]">{customer.email}</p>
 </td>
 <td className="px-4 py-3 text-[var(--ink)]">
 {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
 </td>
 <td className="px-4 py-3 text-[var(--muted)]">
 {customer.lastLoginAt
 ? new Date(customer.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
 : 'Never'}
 </td>
 <td className="px-4 py-3">
 <span
 className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
 customer.isActive
 ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] '
 : 'bg-red-100 text-red-600 '
 }`}
 >
 {customer.isActive ? 'Active' : 'Suspended'}
 </span>
 </td>
 <td className="px-4 py-3">
 <div className="flex justify-end">
 <Button
 size="sm"
 variant={customer.isActive ? 'danger' : 'outline'}
 loading={busyId === customer.id}
 onClick={() => void toggleStatus(customer)}
 >
 {customer.isActive ? 'Suspend' : 'Reactivate'}
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {pagination.totalPages > 1 && (
 <nav aria-label="Customers pagination"className="flex items-center justify-center gap-3">
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
