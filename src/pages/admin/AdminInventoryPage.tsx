import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import PageLoader from '../../components/ui/PageLoader';
import { useShop } from '../../context/ShopContext';
import { isApiError } from '../../lib/api/errors';
import { adjustInventory, listAdminInventory } from '../../services/adminService';
import type { AdminInventoryItem, AdminPage } from '../../types/admin';

const PAGE_SIZE = 20;

export default function AdminInventoryPage() {
 const { addToast } = useShop();
 const [page, setPage] = useState(1);
 const [search, setSearch] = useState('');
 const [stockFilter, setStockFilter] = useState<'' | 'in-stock' | 'low-stock' | 'out-of-stock'>('');
 const [result, setResult] = useState<AdminPage<AdminInventoryItem> | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [reloadKey, setReloadKey] = useState(0);
 const [busyId, setBusyId] = useState<number | null>(null);
 const [adjustingId, setAdjustingId] = useState<number | null>(null);
 const [delta, setDelta] = useState('1');
 const [reason, setReason] = useState('');

 useEffect(() => {
 let cancelled = false;
 listAdminInventory({ page, limit: PAGE_SIZE, search: search || undefined, stock: stockFilter || undefined })
 .then(res => {
 if (!cancelled) { setResult(res); setError(null); }
 })
 .catch(err => {
 if (!cancelled) setError(isApiError(err) ? err.message : 'Unable to load inventory.');
 });
 return () => {
 cancelled = true;
 };
 }, [page, search, stockFilter, reloadKey]);

 const submitAdjustment = async (item: AdminInventoryItem) => {
 const quantityDelta = parseInt(delta, 10);
 if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
 addToast('Enter a non-zero whole number', 'error');
 return;
 }
 if (!reason.trim()) {
 addToast('A reason is required for every adjustment', 'error');
 return;
 }
 setBusyId(item.id);
 try {
 await adjustInventory(item.id, { quantityDelta, reason: reason.trim(), referenceType: 'adjustment' });
 addToast(`Stock updated for ${item.name}`, 'success');
 setAdjustingId(null);
 setReason('');
 setReloadKey(k => k + 1);
 } catch (err) {
 addToast(isApiError(err) ? err.message : 'Could not adjust the stock', 'error');
 } finally {
 setBusyId(null);
 }
 };

 if (error && !result) {
 return <ErrorState title="Unable to load inventory"description={error} onRetry={() => setReloadKey(k => k + 1)} />;
 }
 if (!result) {
 return <PageLoader label="Loading inventory…"/>;
 }

 const items = result.data;
 const pagination = result.pagination;

 return (
 <div className="flex flex-col gap-4">
 <div className="flex flex-col sm:flex-row gap-3">
 <input
 type="search"
 aria-label="Search inventory"
 placeholder="Search products…"
 value={search}
 onChange={e => {
 setPage(1);
 setSearch(e.target.value);
 }}
 className="flex-1 px-4 py-2.5 rounded-full border-2 border-[var(--hairline)] bg-[var(--surface)] text-sm text-[var(--ink-strong)] placeholder:text-[var(--muted-light)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue)]/20 transition-all"
 />
 <select
 aria-label="Filter by stock level"
 value={stockFilter}
 onChange={e => {
 setPage(1);
 setStockFilter(e.target.value as typeof stockFilter);
 }}
 className="rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
 >
 <option value="">All stock levels</option>
 <option value="in-stock">In stock</option>
 <option value="low-stock">Low stock</option>
 <option value="out-of-stock">Out of stock</option>
 </select>
 </div>

 {error ? (
 <ErrorState description={error} onRetry={() => setReloadKey(k => k + 1)} />
 ) : items.length === 0 ? (
 <p className="text-[var(--muted)] py-12 text-center">No inventory matches these filters.</p>
 ) : (
 <div className="bg-[var(--surface)] rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="text-left text-[var(--muted)] border-b border-[var(--hairline)]">
 <th scope="col"className="px-4 py-3 font-semibold">Product</th>
 <th scope="col"className="px-4 py-3 font-semibold">Category</th>
 <th scope="col"className="px-4 py-3 font-semibold">Stock</th>
 <th scope="col"className="px-4 py-3 font-semibold text-right">Adjust</th>
 </tr>
 </thead>
 <tbody>
 {items.map(item => (
 <tr key={item.id} className="border-b border-[var(--hairline)] last:border-0">
 <td className="px-4 py-3">
 <p className="font-semibold text-[var(--ink-strong)]">{item.name}</p>
 <p className="text-xs text-[var(--muted-light)]">{item.brand}</p>
 </td>
 <td className="px-4 py-3 text-[var(--ink)]">{item.category}</td>
 <td className="px-4 py-3">
 <span
 className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
 item.stockQuantity === 0
 ? 'bg-red-100 text-red-600 '
 : item.stockQuantity <= 10
 ? 'bg-amber-100 text-amber-700 '
 : 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] '
 }`}
 >
 {item.stockQuantity} units
 </span>
 </td>
 <td className="px-4 py-3">
 {adjustingId === item.id ? (
 <div className="flex items-center justify-end gap-2">
 <button
 type="button"
 aria-label="Decrease adjustment by one"
 onClick={() => setDelta(d => String((parseInt(d, 10) || 0) - 1))}
 className="p-2 rounded-full hover:bg-[var(--surface-soft)] :bg-slate-800 cursor-pointer"
 >
 <Minus size={14} aria-hidden />
 </button>
 <input
 type="number"
 aria-label={`Quantity change for ${item.name}`}
 value={delta}
 onChange={e => setDelta(e.target.value)}
 className="w-16 px-2 py-1.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface)] text-center text-sm text-[var(--ink-strong)]"
 />
 <button
 type="button"
 aria-label="Increase adjustment by one"
 onClick={() => setDelta(d => String((parseInt(d, 10) || 0) + 1))}
 className="p-2 rounded-full hover:bg-[var(--surface-soft)] :bg-slate-800 cursor-pointer"
 >
 <Plus size={14} aria-hidden />
 </button>
 <input
 type="text"
 aria-label={`Reason for adjusting ${item.name}`}
 placeholder="Reason…"
 value={reason}
 onChange={e => setReason(e.target.value)}
 className="w-32 px-2 py-1.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface)] text-sm text-[var(--ink-strong)] placeholder:text-[var(--muted-light)]"
 />
 <Button size="sm"loading={busyId === item.id} onClick={() => void submitAdjustment(item)}>
 Save
 </Button>
 <Button size="sm"variant="ghost"onClick={() => setAdjustingId(null)}>
 Cancel
 </Button>
 </div>
 ) : (
 <div className="flex justify-end">
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setAdjustingId(item.id);
 setDelta('1');
 setReason('');
 }}
 >
 Adjust stock
 </Button>
 </div>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {pagination.totalPages > 1 && (
 <nav aria-label="Inventory pagination"className="flex items-center justify-center gap-3">
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
