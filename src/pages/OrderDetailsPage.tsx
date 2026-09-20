import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, PackageSearch } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import PageLoader from '../components/ui/PageLoader';
import OrderDetails from '../components/orders/OrderDetails';
import { getOrderById } from '../services/orderService';
import { useShop } from '../context/ShopContext';
import { isApiError } from '../lib/api/errors';
import type { Order } from '../types';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const shop = useShop();

  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getOrderById(id)
      .then(found => {
        if (cancelled) return;
        if (found) {
          setOrder(found);
          setStatus('ready');
        } else {
          setStatus('not-found');
        }
      })
      .catch(err => {
        if (cancelled) return;
        // A 404 from the server means the order does not exist for this
        // browser — show the not-found state, not a generic error.
        if (isApiError(err) && (err.status === 404 || err.code === 'not_found')) {
          setStatus('not-found');
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to load this order.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const load = () => {
    setOrder(null);
    setError(null);
    setStatus('loading');
    setReloadKey(key => key + 1);
  };

  const justPlaced = Boolean((location.state as { justPlaced?: boolean } | null)?.justPlaced);

  if (!id) {
    return <OrderNotFound />;
  }

  if (status === 'loading') {
    return <PageLoader label="Loading your order…" />;
  }

  if (status === 'error') {
    return (
      <div className="pt-32 pb-24">
        <ErrorState
          title="Unable to load this order"
          description={error ?? undefined}
          onRetry={load}
        />
      </div>
    );
  }

  if (status === 'not-found' || !order) {
    return <OrderNotFound />;
  }

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs items={[{ label: 'Orders', to: '/orders' }, { label: order.id }]} />
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-6">
        {justPlaced && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--surface-soft)] border border-[var(--hairline)] rounded-[var(--radius-card,16px)] p-8 mb-8 text-center shadow-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
              className="w-16 h-16 mx-auto bg-[var(--accent-green)] rounded-full flex items-center justify-center mb-6 shadow-sm"
            >
              <Check size={32} className="text-white" aria-hidden />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-[var(--ink-strong)] mb-2">
              Order Confirmed! 🎉
            </h1>
            <p className="text-[var(--muted)] text-lg mt-1 mb-6 font-medium">
              Thank you for your purchase, {order.customer.firstName || 'there'}! Your order is saved below.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/orders">
                <Button variant="outline">View All Orders</Button>
              </Link>
              <Link to="/products">
                <Button>Continue Shopping</Button>
              </Link>
            </div>
          </motion.div>
        )}

        <OrderDetails order={order} onBack={() => navigate('/orders')} onReorder={shop.reorder} />
      </div>
    </div>
  );
}

function OrderNotFound() {
  return (
    <div className="pt-32 pb-24">
      <EmptyState
        icon={<PackageSearch size={64} />}
        title="Order not found"
        description="We couldn't find that order for this browser."
        titleTag="h1"
        actions={
          <>
            <Link to="/orders">
              <Button>View Order History</Button>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-[var(--hairline)] hover:border-[var(--accent-blue)] text-[var(--ink)] hover:text-[var(--accent-blue)] font-medium transition-all shadow-sm"
            >
              Back to ToyBox
            </Link>
          </>
        }
      />
    </div>
  );
}
