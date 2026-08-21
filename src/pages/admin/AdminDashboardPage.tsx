import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Users, Package, AlertTriangle, Clock } from 'lucide-react';
import ErrorState from '../../components/ui/ErrorState';
import PageLoader from '../../components/ui/PageLoader';
import { fetchDashboardStats } from '../../services/adminService';
import type { AdminDashboardStats } from '../../types/admin';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const cards: {
  key: keyof AdminDashboardStats;
  label: string;
  icon: typeof DollarSign;
  tone: string;
  format?: (value: number) => string;
}[] = [
  { key: 'revenue', label: 'Revenue (captured)', icon: DollarSign, tone: 'bg-green-50 dark:bg-green-500/10 text-green-600', format: currency.format },
  { key: 'orders', label: 'Orders', icon: ShoppingCart, tone: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600' },
  { key: 'customers', label: 'Customers', icon: Users, tone: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600' },
  { key: 'products', label: 'Active products', icon: Package, tone: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' },
  { key: 'lowStock', label: 'Low stock items', icon: AlertTriangle, tone: 'bg-red-50 dark:bg-red-500/10 text-red-500' },
  { key: 'pendingPayments', label: 'Pending payments', icon: Clock, tone: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardStats()
      .then(s => {
        if (!cancelled) setStats(s);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load dashboard stats.');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (error) {
    return <ErrorState title="Unable to load the dashboard" description={error} onRetry={() => setReloadKey(k => k + 1)} />;
  }
  if (!stats) {
    return <PageLoader label="Loading dashboard…" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(({ key, label, icon: Icon, tone, format }) => (
        <div
          key={key}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex items-center gap-4"
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tone}`}>
            <Icon size={24} aria-hidden />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {format ? format(stats[key]) : stats[key]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
