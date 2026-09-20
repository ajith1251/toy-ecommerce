import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageOpen } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import PageLoader from '../components/ui/PageLoader';
import OrderCard from '../components/orders/OrderCard';
import { getOrders } from '../services/orderService';
import type { Order } from '../types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getOrders()
      .then(list => {
        if (!cancelled) setOrders(list);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load your orders.');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const load = () => {
    setOrders(null);
    setError(null);
    setReloadKey(key => key + 1);
  };

  if (error) {
    return (
      <div className="pt-32 pb-24">
        <ErrorState
          title="Unable to load your orders"
          description={error}
          onRetry={load}
        />
      </div>
    );
  }

  if (orders === null) {
    return <PageLoader label="Loading your orders…" />;
  }

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs items={[{ label: 'Orders' }]} />
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6 mb-12">
        <h1 className="text-4xl font-extrabold text-[var(--ink-strong)] flex items-center gap-4">
          <PackageOpen size={36} className="text-[var(--accent-coral)]" aria-hidden />
          Order History
          {orders.length > 0 && (
            <span className="text-sm font-semibold bg-[var(--surface-soft)] text-[var(--muted)] border border-[var(--hairline)] px-3 py-1.5 rounded-[var(--radius-button,8px)] shadow-sm">
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </span>
          )}
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {orders.length === 0 ? (
          <EmptyState
            icon={<PackageOpen size={64} />}
            title="No orders yet"
            description="Your placed orders will show up here."
            actions={
              <Link to="/products">
                <Button>Start Shopping</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-6 max-w-3xl">
            {orders.map((order, idx) => (
              <OrderCard key={order.id} order={order} index={idx} to={`/orders/${order.id}`} />
            ))}
            <p className="pt-4 text-xs font-bold text-[var(--muted-light)] flex items-center gap-2">
              Orders are stored securely by ToyBox for this browser.
            </p>
          </div>
        )}
        <div className="mt-12">
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-[var(--hairline)] hover:border-[var(--accent-blue)] text-[var(--ink)] hover:text-[var(--accent-blue)] font-medium transition-all text-sm shadow-sm"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
