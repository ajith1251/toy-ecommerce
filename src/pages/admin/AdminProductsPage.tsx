import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import PageLoader from '../../components/ui/PageLoader';
import { useShop } from '../../context/ShopContext';
import { isApiError } from '../../lib/api/errors';
import { deleteAdminProduct, listAdminProducts, updateAdminProduct } from '../../services/adminService';
import type { AdminPage, AdminProduct } from '../../types/admin';

const PAGE_SIZE = 20;

function formatMoney(value: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}

export default function AdminProductsPage() {
 const { addToast } = useShop();
 const [page, setPage] = useState(1);
 const [search, setSearch] = useState('');
 const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
 const [result, setResult] = useState<AdminPage<AdminProduct> | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [reloadKey, setReloadKey] = useState(0);
 const [busyId, setBusyId] = useState<number | null>(null);

 useEffect(() => {
 let cancelled = false;
 listAdminProducts({ page, limit: PAGE_SIZE, search: search || undefined, status: status || undefined })
 .then(res => {
 if (!cancelled) { setResult(res); setError(null); }
 })
 .catch(err => {
 if (!cancelled) setError(isApiError(err) ? err.message : 'Unable to load products.');
 });
 return () => {
 cancelled = true;
 };
 }, [page, search, status, reloadKey]);

 const withBusy = async (id: number, action: () => Promise<unknown>, successMessage: string) => {
 setBusyId(id);
 try {
 await action();
 addToast(successMessage, 'success');
 setReloadKey(k => k + 1);
 } catch (err) {
 addToast(isApiError(err) ? err.message : 'Action failed — please try again', 'error');
 } finally {
 setBusyId(null);
 }
 };

 if (error && !result) {
 return <ErrorState title="Unable to load products"description={error} onRetry={() => setReloadKey(k => k + 1)} />;
 }
 if (!result) {
 return <PageLoader label="Loading products…"/>;
 }

 const products = result?.data ?? [];
 const pagination = result?.pagination;

 return (
 <div className="flex flex-col gap-4">
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-light)]"aria-hidden />
 <input
 type="search"
 aria-label="Search products"
 placeholder="Search by name or description…"
 value={search}
 onChange={e => {
 setPage(1);
 setSearch(e.target.value);
 }}
 className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-[var(--hairline)] bg-[var(--surface)] text-sm text-[var(--ink-strong)] placeholder:text-[var(--muted-light)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue)]/20 transition-all"
 />
 </div>
 <select
 aria-label="Filter by status"
 value={status}
 onChange={e => {
 setPage(1);
 setStatus(e.target.value as '' | 'active' | 'inactive');
 }}
 className="rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
 >
 <option value="">All statuses</option>
 <option value="active">Active</option>
 <option value="inactive">Inactive</option>
 </select>
 </div>

 {error ? (
 <ErrorState description={error} onRetry={() => setReloadKey(k => k + 1)} />
 ) : products.length === 0 ? (
 <p className="text-[var(--muted)] py-12 text-center">No products match these filters.</p>
 ) : (
 <div className="bg-[var(--surface)] rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="text-left text-[var(--muted)] border-b border-[var(--hairline)]">
 <th scope="col"className="px-4 py-3 font-semibold">Product</th>
 <th scope="col"className="px-4 py-3 font-semibold">Price</th>
 <th scope="col"className="px-4 py-3 font-semibold">Stock</th>
 <th scope="col"className="px-4 py-3 font-semibold">Status</th>
 <th scope="col"className="px-4 py-3 font-semibold text-right">Actions</th>
 </tr>
 </thead>
 <tbody>
 {products.map(product => (
 <tr key={product.id} className="border-b border-[var(--hairline)] last:border-0">
 <td className="px-4 py-3">
 <p className="font-semibold text-[var(--ink-strong)]">{product.name}</p>
 <p className="text-xs text-[var(--muted-light)]">{product.brand} · {product.slug}</p>
 </td>
 <td className="px-4 py-3 text-[var(--ink)]">{formatMoney(product.price)}</td>
 <td className="px-4 py-3">
 <span className={product.stockQuantity === 0 ? 'text-[var(--accent-coral)] font-semibold' : product.stockQuantity <= 10 ? 'text-[var(--accent-yellow)] font-semibold' : 'text-[var(--ink)] '}>
 {product.stockQuantity}
 </span>
 </td>
 <td className="px-4 py-3">
 <span
 className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
 product.inStock
 ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] '
 : 'bg-[var(--surface-soft)] text-[var(--muted)] '
 }`}
 >
 {product.inStock ? 'Active' : 'Inactive'}
 </span>
 </td>
 <td className="px-4 py-3">
 <div className="flex justify-end gap-2">
 <Button
 size="sm"
 variant="outline"
 loading={busyId === product.id}
 onClick={() =>
 withBusy(
 product.id,
 () => updateAdminProduct(product.id, { isActive: !product.inStock }),
 product.inStock ? 'Product deactivated' : 'Product activated'
 )
 }
 >
 {product.inStock ? 'Deactivate' : 'Activate'}
 </Button>
 <Button
 size="sm"
 variant="danger"
 loading={busyId === product.id}
 onClick={() =>
 withBusy(product.id, () => deleteAdminProduct(product.id), 'Product deleted')
 }
 >
 Delete
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {pagination && pagination.totalPages > 1 && (
 <nav aria-label="Products pagination"className="flex items-center justify-center gap-3">
 <Button size="sm"variant="outline"disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
 Previous
 </Button>
 <span className="text-sm text-[var(--muted)]">
 Page {pagination.page} of {pagination.totalPages}
 </span>
 <Button
 size="sm"
 variant="outline"
 disabled={page >= pagination.totalPages}
 onClick={() => setPage(p => p + 1)}
 >
 Next
 </Button>
 </nav>
 )}
 </div>
 );
}
