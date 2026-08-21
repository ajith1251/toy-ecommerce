import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ChevronDown, Loader2, Lock, MapPin, RefreshCcw, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/cn';
import { hasErrors, validatePayment, validateShipping } from '../lib/validation';
import { useCheckoutFlow } from '../hooks/useCheckoutFlow';
import type { FlowStep } from '../hooks/useCheckoutFlow';
import type { CheckoutStep } from '../types/checkout';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { formatMoney } from '../utils/orderCalculations';
import { listAddresses } from '../services/authService';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import PageLoader from '../components/ui/PageLoader';
import CheckoutProgress from '../components/checkout/CheckoutProgress';
import OrderReview from '../components/checkout/OrderReview';
import OrderSummary from '../components/checkout/OrderSummary';
import PaymentForm from '../components/checkout/PaymentForm';
import ShippingForm from '../components/checkout/ShippingForm';
import type { Address } from '../types';
import type { ShippingFormData } from '../types/checkout';

const STEPS: CheckoutStep[] = ['shipping', 'payment', 'review'];
const STEP_LABELS: Record<CheckoutStep, string> = {
  shipping: 'Shipping',
  payment: 'Payment',
  review: 'Review',
};

export default function CheckoutPage() {
  const { step: urlStep } = useParams();
  const navigate = useNavigate();
  const shop = useShop();
  const { status: authStatus } = useAuth();

  const urlStepValid = STEPS.includes(urlStep as CheckoutStep);
  const currentStep = urlStepValid ? (urlStep as CheckoutStep) : 'shipping';

  // The URL owns shipping/payment/review. Transient steps ('processing' /
  // 'done') live only in memory and only while the URL still matches the
  // step they were launched from — so back/forward always falls back to the
  // URL as the source of truth.
  const [flash, setFlash] = useState<{ step: FlowStep; fromUrl: string } | null>(null);
  const step: FlowStep =
    flash && flash.fromUrl === (urlStep ?? '') ? flash.step : currentStep;

  const setStep = useCallback((next: FlowStep) => {
    if (next === 'processing' || next === 'done') {
      setFlash({ step: next, fromUrl: urlStep ?? '' });
    } else {
      navigate(`/checkout/${next}`, { replace: true });
    }
  }, [navigate, urlStep]);

  const flow = useCheckoutFlow({
    items: shop.cartItems,
    active: true,
    step,
    onStepChange: setStep,
    onClearCart: shop.clearCart,
    onOrderPlaced: (order) => shop.addToast(`Order ${order.id} placed! 🎉`, 'success'),
  });

  // After the order is placed, the persisted order detail page is the
  // canonical confirmation destination.
  useEffect(() => {
    if (flow.step === 'done' && flow.placedOrder) {
      navigate(`/orders/${flow.placedOrder.id}`, {
        replace: true,
        state: { justPlaced: true },
      });
    }
  }, [flow.step, flow.placedOrder, navigate]);

  // ── Route guards ────────────────────────────────────────────────────
  // A route must never let a user skip required checkout steps.
  if (!urlStepValid && step !== 'processing' && step !== 'done') {
    return <Navigate to="/checkout/shipping" replace />;
  }

  // Wait for the session check: while status is 'loading' the app renders as
  // a guest (empty localStorage cart), and a redirect then would kick an
  // authenticated user with a server cart back to /cart before it hydrates.
  if (authStatus === 'loading') {
    return <PageLoader label="Checking your session…" />;
  }

  // Only redirect when the cart is known-empty — authenticated carts load
  // from the server asynchronously, so a not-yet-hydrated cart must not be
  // mistaken for an empty one.
  if (shop.cartItems.length === 0 && shop.cartReady && step !== 'processing' && step !== 'done') {
    return <Navigate to="/cart" replace />;
  }

  const shippingValid = !hasErrors(validateShipping(flow.shipping));
  const paymentValid = !hasErrors(validatePayment(flow.payment));

  if (step === 'payment' && !shippingValid) {
    return <Navigate to="/checkout/shipping" replace />;
  }
  if (step === 'review' && !shippingValid) {
    return <Navigate to="/checkout/shipping" replace />;
  }
  if (step === 'review' && !paymentValid) {
    return <Navigate to="/checkout/payment" replace />;
  }

  const showSteps = step !== 'done' && step !== 'processing';
  const stepLabel = (['shipping', 'payment', 'review'] as CheckoutStep[]).includes(step as CheckoutStep)
    ? STEP_LABELS[step as CheckoutStep]
    : '';

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumbs
          items={[
            { label: 'Cart', to: '/cart' },
            ...(showSteps && stepLabel ? [{ label: `Checkout · ${stepLabel}` }] : []),
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <Lock size={24} className="text-red-500" aria-hidden />
          Secure Checkout
        </h1>
      </div>

      {showSteps && <CheckoutProgress current={step as CheckoutStep} />}

      <div className="max-w-7xl mx-auto px-6 mt-6">
        {step === 'processing' ? (
          <div className="text-center py-20">
            <Loader2 size={48} className="mx-auto text-red-500 animate-spin mb-4" aria-hidden />
            <p className="text-lg font-semibold text-slate-900 dark:text-white">Processing payment…</p>
            <p className="text-sm text-slate-400 mt-1">Please don't close this window</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              {flow.placeError && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-5">
                  <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" aria-hidden />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      We couldn't place your order
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300/80 mt-0.5">{flow.placeError}</p>
                  </div>
                </div>
              )}

              {flow.cartChanged && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5">
                  <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" aria-hidden />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Your cart has changed.
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-0.5">
                      Please review your cart before placing the order.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={flow.handleRefreshCart}>
                      <RefreshCcw size={14} aria-hidden /> Review updated cart
                    </Button>
                  </div>
                </div>
              )}

              {/* Mobile order summary toggle */}
              <MobileSummary items={shop.cartItems} totals={flow.totals} />

              {step === 'shipping' && (
                <>
                  <SavedAddressPicker
                    onSelect={address => fillShippingFromAddress(flow.handleShippingChange, address, flow.shipping.email)}
                  />
                  <ShippingForm
                    value={flow.shipping}
                    errors={flow.shippingErrors}
                    onChange={flow.handleShippingChange}
                  />
                </>
              )}
              {step === 'payment' && (
                <PaymentForm
                  value={flow.payment}
                  errors={flow.paymentErrors}
                  onMethodChange={flow.handleMethodChange}
                  onCardChange={flow.handleCardChange}
                  onUpiChange={flow.handleUpiChange}
                />
              )}
              {step === 'review' && (
                <OrderReview items={shop.cartItems} shipping={flow.shipping} payment={flow.payment} totals={flow.totals} />
              )}
            </div>

            {/* Desktop order summary */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="lg:sticky lg:top-24">
                <OrderSummary items={shop.cartItems} totals={flow.totals} />
              </div>
            </aside>
          </div>
        )}
      </div>

      {showSteps && (
        <div className="max-w-7xl mx-auto px-6 mt-8">
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
            {step === 'payment' || step === 'review' ? (
              <Button variant="ghost" onClick={() => setStep(step === 'payment' ? 'shipping' : 'payment')}>
                <ArrowLeft size={16} aria-hidden /> Back
              </Button>
            ) : (
              <span />
            )}

            {step === 'shipping' && (
              <Button onClick={flow.handleContinueShipping}>Continue to Payment</Button>
            )}
            {step === 'payment' && (
              <Button onClick={flow.handleContinuePayment}>Review Order</Button>
            )}
            {step === 'review' && (
              <Button
                onClick={flow.handlePlaceOrder}
                disabled={shop.cartItems.length === 0 || flow.cartChanged}
                title={flow.cartChanged ? 'Review your updated cart before placing the order' : undefined}
              >
                <Lock size={16} aria-hidden /> Place Order · {formatMoney(flow.totals.grandTotal)}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Maps a saved address onto the shipping form (email preserved if already entered). */
function fillShippingFromAddress(
  onChange: (field: keyof ShippingFormData, value: string) => void,
  address: Address,
  currentEmail: string
) {
  onChange('firstName', address.firstName || '');
  onChange('lastName', address.lastName || '');
  if (!currentEmail) onChange('email', ''); // user fills email; it's never stored in addresses
  onChange('phone', address.phone || '');
  onChange('line1', address.line1);
  onChange('line2', address.line2 || '');
  onChange('city', address.city);
  onChange('state', address.state || '');
  onChange('postalCode', address.postalCode);
  onChange('country', address.country || '');
}

/** For authenticated users, one-tap fill from saved addresses (§31). */
function SavedAddressPicker({ onSelect }: { onSelect: (address: Address) => void }) {
  const { status, user } = useAuth();
  const [addresses, setAddresses] = useState<Address[] | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    listAddresses()
      .then(list => {
        if (!cancelled) setAddresses(list);
      })
      .catch(() => {
        if (!cancelled) setAddresses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== 'authenticated' || !addresses || addresses.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
        Use a saved address ({user?.firstName})
      </p>
      <div className="flex flex-wrap gap-2">
        {addresses.map(address => (
          <button
            key={address.id}
            type="button"
            onClick={() => onSelect(address)}
            className="flex items-center gap-2 text-sm font-semibold bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 hover:border-red-400 transition-colors cursor-pointer"
          >
            <MapPin size={14} className="text-red-500" aria-hidden />
            <span>{address.label || `${address.city}, ${address.country}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileSummary({ items, totals }: { items: ReturnType<typeof useShop>['cartItems']; totals: ReturnType<typeof useCheckoutFlow>['totals'] }) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="lg:hidden mb-4">
      <button
        type="button"
        onClick={() => setSummaryOpen(o => !o)}
        aria-expanded={summaryOpen}
        className="w-full flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-red-500" aria-hidden />
          Order Summary ({items.length})
        </span>
        <ChevronDown
          size={16}
          className={cn('transition-transform', summaryOpen && 'rotate-180')}
          aria-hidden
        />
      </button>
      {summaryOpen && <OrderSummary items={items} totals={totals} className="mt-3" />}
    </div>
  );
}
