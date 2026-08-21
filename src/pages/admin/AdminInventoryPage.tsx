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
    return <ErrorState title="Unable to load inventory" description={error} onRetry={() => setReloadKey(k => k + 1)} />;
  }
  if (!result) {
    return <PageLoader label="Loading inventory…" />;
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
          className="flex-1 px-4 py-2.5 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 transition-all"
        />
        <select
          aria-label="Filter by stock level"
          value={stockFilter}
          onChange={e => {
            setPage(1);
            setStockFilter(e.target.value as typeof stockFilter);
          }}
          className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
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
        <p className="text-slate-500 dark:text-slate-400 py-12 text-center">No inventory matches these filters.</p>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th scope="col" className="px-4 py-3 font-semibold">Product</th>
                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.brand}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.stockQuantity === 0
                          ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                          : item.stockQuantity <= 10
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
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
                          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Minus size={14} aria-hidden />
                        </button>
                        <input
                          type="number"
                          aria-label={`Quantity change for ${item.name}`}
                          value={delta}
                          onChange={e => setDelta(e.target.value)}
                          className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-sm text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          aria-label="Increase adjustment by one"
                          onClick={() => setDelta(d => String((parseInt(d, 10) || 0) + 1))}
                          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Plus size={14} aria-hidden />
                        </button>
                        <input
                          type="text"
                          aria-label={`Reason for adjusting ${item.name}`}
                          placeholder="Reason…"
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          className="w-32 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                        <Button size="sm" loading={busyId === item.id} onClick={() => void submitAdjustment(item)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAdjustingId(null)}>
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
        <nav aria-label="Inventory pagination" className="flex items-center justify-center gap-3">
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
