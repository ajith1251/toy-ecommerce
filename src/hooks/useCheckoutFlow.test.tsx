import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { CartItem, Order } from '../types';
import { makeCartItem, makeOrder } from '../test/fixtures';
import { bootCheckoutFromDraft, useCheckoutFlow } from './useCheckoutFlow';
import type { FlowStep } from './useCheckoutFlow';
import ShippingForm from '../components/checkout/ShippingForm';
import PaymentForm from '../components/checkout/PaymentForm';
import OrderReview from '../components/checkout/OrderReview';

// Mock services
const orderMock = vi.hoisted(() => ({
  placeOrder: vi.fn<(params: unknown) => Promise<Order>>(),
}));

const paymentMock = vi.hoisted(() => ({
  createPayment: vi.fn<(params: unknown) => Promise<{ providerOrderId: string; providerPaymentId?: string; amount: number; currency: string; status: string; method: string }>>(),
  verifyPayment: vi.fn<(params: unknown) => Promise<{ providerOrderId: string; providerPaymentId?: string; amount: number; currency: string; status: string; method: string }>>(),
  getPaymentStatus: vi.fn<(orderNumber: string) => Promise<{ providerOrderId: string; providerPaymentId?: string; amount: number; currency: string; status: string; method: string }>>(),
}));

vi.mock('../services/orderService', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/orderService')>();
  return { ...actual, placeOrder: orderMock.placeOrder };
});

vi.mock('../services/paymentService', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/paymentService')>();
  return {
    ...actual,
    PaymentService: class {
      static createPayment = paymentMock.createPayment;
      static verifyPayment = paymentMock.verifyPayment;
      static getPaymentStatus = paymentMock.getPaymentStatus;
    }
  };
});

/**
 * Minimal harness binding useCheckoutFlow to real forms — mirrors the
 * (removed) modal CheckoutContainer so the checkout state machine stays
 * covered without a dead component in the app.
 */
function Harness({
  items,
  onOrderPlaced,
  onClearCart,
}: {
  items: CartItem[];
  onOrderPlaced: (order: Order) => void;
  onClearCart: () => void;
}) {
  const [step, setStep] = useState<FlowStep>(() => bootCheckoutFromDraft(items).step);
  const flow = useCheckoutFlow({ items, active: true, step, onStepChange: setStep, onClearCart, onOrderPlaced });

  return (
    <div>
      {flow.cartEmpty ? (
        <p>Your cart is empty</p>
      ) : (
        <>
          {step === 'shipping' && (
            <ShippingForm value={flow.shipping} errors={flow.shippingErrors} onChange={flow.handleShippingChange} />
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
            <OrderReview items={items} shipping={flow.shipping} payment={flow.payment} totals={flow.totals} />
          )}
          {step === 'processing' && <p>Processing payment…</p>}
          {step === 'done' && flow.placedOrder && <p>Order Confirmed! 🎉</p>}
          {flow.placeError && (
            <div>
              <p>We couldn't place your order</p>
              <p>{flow.placeError}</p>
            </div>
          )}

          {flow.cartChanged && (
            <div>
              <p>Your cart has changed.</p>
              <button onClick={flow.handleRefreshCart}>Review updated cart</button>
            </div>
          )}

          <footer>
            {(step === 'payment' || step === 'review') && (
              <button onClick={() => setStep(step === 'payment' ? 'shipping' : 'payment')}>Back</button>
            )}
            {step === 'shipping' && <button onClick={flow.handleContinueShipping}>Continue to Payment</button>}
            {step === 'payment' && <button onClick={flow.handleContinuePayment}>Review Order</button>}
            {step === 'review' && (
              <button onClick={flow.handlePlaceOrder} disabled={items.length === 0 || flow.cartChanged}>
                Place Order
              </button>
            )}
          </footer>
        </>
      )}
    </div>
  );
}

function futureExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
}

function renderCheckout(
  items: CartItem[],
  onOrderPlaced: (order: Order) => void = vi.fn(),
  onClearCart: () => void = vi.fn()
) {
  return render(<Harness items={items} onOrderPlaced={onOrderPlaced} onClearCart={onClearCart} />);
}

function fillShipping() {
  fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+1 555 123 4567' } });
  fireEvent.change(screen.getByLabelText('Address Line 1'), { target: { value: '123 Toy Lane' } });
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Springfield' } });
  fireEvent.change(screen.getByLabelText('State / Province'), { target: { value: 'CA' } });
  fireEvent.change(screen.getByLabelText('Postal Code'), { target: { value: '90210' } });
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'United States' } });
}

function fillCard() {
  fireEvent.change(screen.getByLabelText('Cardholder Name'), { target: { value: 'Jane Doe' } });
  fireEvent.change(screen.getByLabelText('Card Number'), { target: { value: '4242 4242 4242 4242' } });
  fireEvent.change(screen.getByLabelText('Expiry (MM/YY)'), { target: { value: futureExpiry() } });
  fireEvent.change(screen.getByLabelText('CVV'), { target: { value: '123' } });
}

function goToReview() {
  fillShipping();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));
  fillCard();
  fireEvent.click(screen.getByRole('button', { name: 'Review Order' }));
}

/**
 * Card/UPI orders run through the Razorpay Checkout SDK (Phase 8), which
 * jsdom cannot load (external script → onload never fires). Stub
 * `window.Razorpay` with a fake whose open() immediately reports a
 * successful payment so the flow can complete under fake timers.
 */
function stubRazorpaySuccess() {
  class FakeRazorpay {
    private options: { handler: (response: unknown) => void };
    constructor(options: { handler: (response: unknown) => void }) {
      this.options = options;
    }
    open(): void {
      this.options.handler({
        razorpay_payment_id: 'pay_test_123',
        razorpay_order_id: 'order_test_123',
        razorpay_signature: 'sig_test_123',
      });
    }
    on(): void {}
  }
  (window as unknown as { Razorpay?: unknown }).Razorpay = FakeRazorpay;
}

/** Drains every pending mocked-promise chain without touching fake timers. */
async function flushPromises() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

describe('useCheckoutFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    orderMock.placeOrder.mockReset();
    orderMock.placeOrder.mockResolvedValue(makeOrder());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows an empty state when the cart is empty', () => {
    renderCheckout([]);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue to Payment' })).not.toBeInTheDocument();
  });

  it('blocks progression when shipping is invalid and shows inline errors', () => {
    renderCheckout([makeCartItem(1, 29.99, 1)]);
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    expect(screen.queryByText('Payment Details')).not.toBeInTheDocument();
  });

  it('blocks progression when payment is invalid', () => {
    renderCheckout([makeCartItem(1, 29.99, 1)]);
    fillShipping();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review Order' }));

    expect(screen.getByText('Name on card is required')).toBeInTheDocument();
    expect(screen.getByText('Payment Details')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Place Order/ })).not.toBeInTheDocument();
  });

it('walks shipping → payment → review → confirmation and places the order via the API', async () => {
     const onOrderPlaced = vi.fn();
     const onClearCart = vi.fn();
     renderCheckout([makeCartItem(1, 29.99, 1)], onOrderPlaced, onClearCart);

     goToReview();
     expect(screen.getByText('Order Summary')).toBeInTheDocument();
     expect(screen.getByRole('button', { name: /Place Order/ })).toBeInTheDocument();

     // Mock the payment service responses
     paymentMock.createPayment.mockResolvedValueOnce({
       providerOrderId: 'order_test_123',
       amount: 2999, // 29.99 in paise
       currency: 'INR',
       status: 'pending',
       method: 'card'
     });
     
     paymentMock.verifyPayment.mockResolvedValueOnce({
       providerOrderId: 'order_test_123',
       providerPaymentId: 'pay_test_123',
       amount: 2999,
       currency: 'INR',
       status: 'captured',
       method: 'card'
     });

     stubRazorpaySuccess();
     fireEvent.click(screen.getByRole('button', { name: /Place Order/ }));
     expect(screen.getByText('Processing payment…')).toBeInTheDocument();

     await flushPromises();

     expect(screen.getByText('Order Confirmed! 🎉')).toBeInTheDocument();
     expect(onOrderPlaced).toHaveBeenCalledTimes(1);
     expect(onClearCart).toHaveBeenCalledTimes(1);
     expect(orderMock.placeOrder).toHaveBeenCalledTimes(1);

     const order = onOrderPlaced.mock.calls[0][0];
     expect(order.id).toMatch(/^TBX-/);
     expect(order.payment.last4).toBe('4242');
   });

  it('validates and accepts UPI payments', () => {
    renderCheckout([makeCartItem(1, 10, 1)]);
    fillShipping();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));

    fireEvent.click(screen.getByRole('radio', { name: /UPI/ }));
    fireEvent.change(screen.getByLabelText('UPI ID'), { target: { value: 'notvalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review Order' }));
    expect(screen.getByText('Enter a valid UPI ID (e.g. name@bank)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('UPI ID'), { target: { value: 'user@bank' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review Order' }));
    expect(screen.queryByText('Enter a valid UPI ID (e.g. name@bank)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Place Order/ })).toBeInTheDocument();
  });

  it('accepts cash on delivery without payment credentials', () => {
    renderCheckout([makeCartItem(1, 10, 1)]);
    fillShipping();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));

    fireEvent.click(screen.getByRole('radio', { name: /Cash on Delivery/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Review Order' }));
    expect(screen.getByRole('button', { name: /Place Order/ })).toBeInTheDocument();
  });

it('prevents duplicate order submission', async () => {
     const onOrderPlaced = vi.fn();
     renderCheckout([makeCartItem(1, 10, 1)], onOrderPlaced);

     goToReview();
     const place = screen.getByRole('button', { name: /Place Order/ });

     // Mock the payment service responses
     paymentMock.createPayment.mockResolvedValueOnce({
       providerOrderId: 'order_test_123',
       amount: 1000, // 10.00 in paise
       currency: 'INR',
       status: 'pending',
       method: 'card'
     });
     
     paymentMock.verifyPayment.mockResolvedValueOnce({
       providerOrderId: 'order_test_123',
       providerPaymentId: 'pay_test_123',
       amount: 1000,
       currency: 'INR',
       status: 'captured',
       method: 'card'
     });

     stubRazorpaySuccess();
     fireEvent.click(place);
     fireEvent.click(place);

     await flushPromises();

     expect(orderMock.placeOrder).toHaveBeenCalledTimes(1);
     expect(onOrderPlaced).toHaveBeenCalledTimes(1);
   });

it('surfaces a placement failure (e.g. insufficient stock) and returns to review', async () => {
     orderMock.placeOrder.mockRejectedValueOnce(new Error('One or more items are no longer available'));
     renderCheckout([makeCartItem(1, 10, 1)]);

     goToReview();
     fireEvent.click(screen.getByRole('button', { name: /Place Order/ }));

     // Mock the payment service responses (though they won't be called due to the order failure)
     paymentMock.createPayment.mockResolvedValueOnce({
       providerOrderId: 'order_test_123',
       amount: 1000, // 10.00 in paise
       currency: 'INR',
       status: 'pending',
       method: 'card'
     });
     
     paymentMock.verifyPayment.mockResolvedValueOnce({
       providerOrderId: 'order_test_123',
       providerPaymentId: 'pay_test_123',
       amount: 1000,
       currency: 'INR',
       status: 'captured',
       method: 'card'
     });

     // Wait for the async operations to complete
     await act(async () => {
       // No need to advance timers since we removed the setTimeout
       // Just wait for the next tick
       await Promise.resolve();
     });

     expect(screen.getByText("We couldn't place your order")).toBeInTheDocument();
     expect(screen.getByText('One or more items are no longer available')).toBeInTheDocument();
     expect(screen.getByRole('button', { name: /Place Order/ })).toBeInTheDocument();
   });

  it('blocks placement when the cart changes and unblocks after refresh', () => {
    const items = [makeCartItem(1, 10, 1)];
    const { rerender } = renderCheckout(items);
    goToReview();

    const changedItems = [...items, makeCartItem(2, 20, 1)];
    rerender(
      <Harness items={changedItems} onOrderPlaced={vi.fn()} onClearCart={vi.fn()} />
    );

    expect(screen.getByText('Your cart has changed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Place Order/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Review updated cart/ }));

    expect(screen.queryByText('Your cart has changed.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Place Order/ })).toBeEnabled();
  });

  it('shows the empty state when the cart is cleared during checkout', () => {
    const { rerender } = renderCheckout([makeCartItem(1, 10, 1)]);
    goToReview();

    rerender(<Harness items={[]} onOrderPlaced={vi.fn()} onClearCart={vi.fn()} />);

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Place Order/ })).not.toBeInTheDocument();
  });

  it('restores a saved draft on reopen without restoring card secrets', () => {
    const items = [makeCartItem(1, 10, 1)];
    const { unmount } = renderCheckout(items);

    fillShipping();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));
    fireEvent.change(screen.getByLabelText('Cardholder Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Card Number'), { target: { value: '4242 4242 4242 4242' } });
    unmount();

    renderCheckout(items);

    expect(screen.getByText('Payment Details')).toBeInTheDocument();
    expect(screen.getByLabelText('Cardholder Name')).toHaveValue('Jane Doe');
    expect(screen.getByLabelText('Card Number')).toHaveValue('');
  });

  it('preserves entered values when navigating back between steps', () => {
    renderCheckout([makeCartItem(1, 10, 1)]);
    fillShipping();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByLabelText('First Name')).toHaveValue('Jane');
    expect(screen.getByLabelText('Postal Code')).toHaveValue('90210');
  });
});
