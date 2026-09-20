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
 { key: 'revenue', label: 'Revenue (captured)', icon: DollarSign, tone: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20', format: currency.format },
 { key: 'orders', label: 'Orders', icon: ShoppingCart, tone: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20' },
 { key: 'customers', label: 'Customers', icon: Users, tone: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border border-[var(--accent-purple)]/20' },
 { key: 'products', label: 'Active products', icon: Package, tone: 'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/20' },
 { key: 'lowStock', label: 'Low stock items', icon: AlertTriangle, tone: 'bg-[var(--accent-coral)]/10 text-[var(--accent-coral)] border border-[var(--accent-coral)]/20' },
 { key: 'pendingPayments', label: 'Pending payments', icon: Clock, tone: 'bg-[var(--surface-soft)] text-[var(--muted)] border border-[var(--hairline)]' },
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
 return <ErrorState title="Unable to load the dashboard"description={error} onRetry={() => setReloadKey(k => k + 1)} />;
 }
 if (!stats) {
 return <PageLoader label="Loading dashboard…"/>;
 }

 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
 {cards.map(({ key, label, icon: Icon, tone, format }) => (
 <div
 key={key}
 className="bg-[var(--surface)] rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-shadow"
 >
 <div className={`w-14 h-14 rounded-[var(--radius-button,8px)] flex items-center justify-center ${tone}`}>
 <Icon size={24} aria-hidden />
 </div>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-light)] mb-1">{label}</p>
 <p className="text-3xl font-extrabold text-[var(--ink-strong)]">
 {format ? format(stats[key]) : stats[key]}
 </p>
 </div>
 </div>
 ))}
 </div>
 );
}
