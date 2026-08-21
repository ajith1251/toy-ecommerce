import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import ShopProvider from '../context/ShopProvider';
import { appRoutes } from '../routes';
import { makeCartItem, makeOrder } from './fixtures';
import type { Order } from '../types';

// Orders are server-owned: mock the API boundary with in-memory state so the
// routing tests exercise the real pages without a network.
const orderMock = vi.hoisted(() => ({
  orders: [] as Order[],
  placeOrder: vi.fn<(params: { items: unknown[] }) => Promise<Order>>(),
  getOrders: vi.fn<() => Promise<Order[]>>(),
  getOrderById: vi.fn<(id: string) => Promise<Order | null>>(),
}));

const paymentMock = vi.hoisted(() => ({
  createPayment: vi.fn<(params: unknown) => Promise<{ providerOrderId: string; providerPaymentId?: string; amount: number; currency: string; status: string; method: string }>>(),
  verifyPayment: vi.fn<(params: unknown) => Promise<{ providerOrderId: string; providerPaymentId?: string; amount: number; currency: string; status: string; method: string }>>(),
  getPaymentStatus: vi.fn<(orderNumber: string) => Promise<{ providerOrderId: string; providerPaymentId?: string; amount: number; currency: string; status: string; method: string }>>(),
}));

vi.mock('../services/orderService', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/orderService')>();
  return {
    ...actual,
    placeOrder: orderMock.placeOrder,
    getOrders: orderMock.getOrders,
    getOrderById: orderMock.getOrderById,
  };
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

vi.mock('framer-motion', async () => {
  const { createElement, Fragment } = await import('react');
  const DROP = new Set(['initial', 'animate', 'exit', 'transition', 'layout', 'whileHover', 'whileTap', 'style', 'key']);
  const make = (tag: string) => (props: Record<string, unknown>) => {
    const dom: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!DROP.has(key)) dom[key] = value;
    }
    return createElement(tag as 'div', dom);
  };
  return {
    motion: { div: make('div'), section: make('section'), span: make('span'), p: make('p') },
    AnimatePresence: ({ children }: { children?: unknown }) => createElement(Fragment, null, children as never),
  };
});

function renderApp(path = '/') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <ShopProvider>
      <RouterProvider router={router} />
    </ShopProvider>
  );
  return router;
}

function seedCart(items: ReturnType<typeof makeCartItem>[]) {
  localStorage.setItem('toybox-cart', JSON.stringify(items));
}

function futureExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
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

function seedOrder(): Order {
  const order = makeOrder();
  orderMock.orders.unshift(order);
  return order;
}

beforeEach(() => {
  orderMock.orders.length = 0;
  orderMock.placeOrder.mockImplementation(async params => {
    const order = makeOrder({
      items: (params.items as { productId: number; quantity: number }[]).map(i => ({
        id: i.productId,
        name: `Toy ${i.productId}`,
        image: '',
        brand: 'TestBrand',
        price: 29.99,
        quantity: i.quantity,
      })),
    });
    orderMock.orders.unshift(order);
    return order;
  });
  orderMock.getOrders.mockImplementation(async () => [...orderMock.orders]);
  orderMock.getOrderById.mockImplementation(async id => orderMock.orders.find(o => o.id === id) ?? null);
});

describe('Routing', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the home route', () => {
    renderApp('/');
    expect(screen.getByText('New Kids Collection')).toBeInTheDocument();
    expect(screen.getByText('Browse Categories')).toBeInTheDocument();
    expect(screen.getAllByText('ToyBox', { selector: 'span' }).length).toBeGreaterThan(0);
  });

  it('renders the products route with the full browsing experience', () => {
    renderApp('/products');
    expect(screen.getByText('All Toys')).toBeInTheDocument();
    expect(screen.getByText('Hero Squad Action Pack')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All Categories/ })).toBeInTheDocument();
  });

  it('applies a category URL param on the products page', () => {
    renderApp('/products?category=action-figures');
    expect(screen.getByText('Hero Squad Action Pack')).toBeInTheDocument();
    expect(screen.queryByText('Junior Robot Builder Kit')).not.toBeInTheDocument();
  });

  it('applies a search URL param on the products page', () => {
    renderApp('/products?q=robot');
    expect(screen.getByText('Coding Robot for Kids')).toBeInTheDocument();
    expect(screen.queryByText('Hero Squad Action Pack')).not.toBeInTheDocument();
  });

  it('navigates from a product card to the product detail route', () => {
    const router = renderApp('/products');
    fireEvent.click(screen.getByRole('link', { name: 'View Hero Squad Action Pack' }));
    expect(router.state.location.pathname).toBe('/product/1');
    expect(screen.getByText('Product Information')).toBeInTheDocument();
  });

  it('renders a product detail page for a valid id', () => {
    renderApp('/product/8');
    expect(screen.getByRole('heading', { level: 1, name: 'Architect Series: Skyline Edition' })).toBeInTheDocument();
    expect(screen.getAllByText('In Stock').length).toBeGreaterThan(0);
    expect(screen.getByText('Related Products')).toBeInTheDocument();
    expect(screen.getByText('Product Information')).toBeInTheDocument();
  });

  it('shows a product-not-found state for an invalid product id', () => {
    renderApp('/product/999999');
    expect(screen.getByText('Product not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to ToyBox' })).toBeInTheDocument();
  });

  it('shows a product-not-found state for a malformed product id', () => {
    renderApp('/product/not-a-number');
    expect(screen.getByText('Product not found')).toBeInTheDocument();
  });

  it('renders a category page with matching products', () => {
    renderApp('/category/action-figures');
    expect(screen.getAllByText(/Action Figures/).length).toBeGreaterThan(0);
    expect(screen.getByText('Hero Squad Action Pack')).toBeInTheDocument();
  });

  it('renders a category not-found state for an unknown category', () => {
    renderApp('/category/does-not-exist');
    expect(screen.getByText('Category not found')).toBeInTheDocument();
  });

  it('renders a brand page with matching products', () => {
    renderApp('/brand/playtime');
    expect(screen.getAllByText('PlayTime').length).toBeGreaterThan(0);
    expect(screen.getByText('1 product from PlayTime')).toBeInTheDocument();
    expect(screen.getByText('Hero Squad Action Pack')).toBeInTheDocument();
  });

  it('renders a brand not-found state for an unknown brand', () => {
    renderApp('/brand/lego');
    expect(screen.getByText('Brand not found')).toBeInTheDocument();
  });

  it('renders search results for a URL search query', () => {
    renderApp('/search?q=robot');
    expect(screen.getByText('Search results for "robot"')).toBeInTheDocument();
    expect(screen.getByText('Coding Robot for Kids')).toBeInTheDocument();
  });

  it('shows an empty search state when no query is present', () => {
    renderApp('/search');
    expect(screen.getByText('Search ToyBox')).toBeInTheDocument();
  });

  it('renders an empty wishlist state', () => {
    renderApp('/wishlist');
    expect(screen.getByText('Your wishlist is empty')).toBeInTheDocument();
  });

  it('renders wishlist products and removes them', () => {
    localStorage.setItem('toybox-wishlist', JSON.stringify([1]));
    renderApp('/wishlist');
    expect(screen.getByText('1 item')).toBeInTheDocument();
    expect(screen.getByText('Hero Squad Action Pack')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Hero Squad Action Pack from wishlist' }));
    expect(screen.getByText('Your wishlist is empty')).toBeInTheDocument();
  });

  it('renders an empty cart state', () => {
    renderApp('/cart');
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('renders the cart page with items and totals', () => {
    seedCart([makeCartItem(1, 29.99, 2)]);
    renderApp('/cart');
    expect(screen.getByText('Your Cart')).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Checkout Now/ })).toBeInTheDocument();
  });

  it('moves a cart item to the wishlist', () => {
    seedCart([makeCartItem(1, 29.99, 1)]);
    renderApp('/cart');
    fireEvent.click(screen.getByTitle('Move to wishlist'));
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('toybox-wishlist') ?? '[]')).toEqual([1]);
  });

  it('redirects checkout to the cart when the cart is empty', () => {
    const router = renderApp('/checkout/shipping');
    expect(router.state.location.pathname).toBe('/cart');
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('redirects review to shipping when shipping is incomplete', () => {
    seedCart([makeCartItem(1, 29.99, 1)]);
    const router = renderApp('/checkout/review');
    expect(router.state.location.pathname).toBe('/checkout/shipping');
    expect(screen.getByText('Shipping Information')).toBeInTheDocument();
  });

  it('redirects payment to shipping when shipping is incomplete', () => {
    seedCart([makeCartItem(1, 29.99, 1)]);
    const router = renderApp('/checkout/payment');
    expect(router.state.location.pathname).toBe('/checkout/shipping');
  });

  it('redirects an invalid checkout step to shipping', () => {
    seedCart([makeCartItem(1, 29.99, 1)]);
    const router = renderApp('/checkout/nope');
    expect(router.state.location.pathname).toBe('/checkout/shipping');
  });

  it('walks the full checkout flow to a persisted order detail route', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

    seedCart([makeCartItem(1, 29.99, 1)]);
    const router = renderApp('/checkout/shipping');

    fillShipping();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));
    expect(router.state.location.pathname).toBe('/checkout/payment');
    expect(screen.getByText('Payment Details')).toBeInTheDocument();

    fillCard();
    fireEvent.click(screen.getByRole('button', { name: 'Review Order' }));
    expect(router.state.location.pathname).toBe('/checkout/review');
    expect(screen.getByRole('button', { name: /Place Order/ })).toBeInTheDocument();

// Mock the payment service responses BEFORE placing the order
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

     // jsdom cannot load the external Razorpay SDK script; stub a fake
     // whose open() immediately reports a successful payment.
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

     fireEvent.click(screen.getByRole('button', { name: /Place Order/ }));
     expect(screen.getByText('Processing payment…')).toBeInTheDocument();

     // Drain every mocked-promise chain (place → createPayment → Razorpay
     // modal → verify) without touching fake timers.
     await act(async () => {
       for (let i = 0; i < 10; i++) await Promise.resolve();
     });

    // With fake timers active, waitFor/findBy would hang — all promises and
    // effects have flushed inside act, so assert synchronously.
    expect(router.state.location.pathname).toMatch(/^\/orders\/TBX-/);
    expect(screen.getByText('Order Confirmed! 🎉')).toBeInTheDocument();
    expect(screen.getAllByText(/TBX-/).length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('toybox-cart') ?? '[]')).toEqual([]);
  });

  it('renders the order history page from orderService', async () => {
    const order = seedOrder();
    renderApp('/orders');
    expect(await screen.findByText('Order History')).toBeInTheDocument();
    expect(await screen.findByText(order.id)).toBeInTheDocument();
  });

  it('renders an empty order history state', async () => {
    renderApp('/orders');
    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
  });

  it('renders order details for an existing order id', async () => {
    const order = seedOrder();
    renderApp(`/orders/${order.id}`);
    expect((await screen.findAllByText(order.id)).length).toBeGreaterThan(0);
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Reorder/ })).toBeInTheDocument();
  });

  it('shows an order-not-found state for an invalid order id', async () => {
    renderApp('/orders/DOES-NOT-EXIST');
    expect(await screen.findByText('Order not found')).toBeInTheDocument();
  });

  it('renders the 404 page for unknown routes', () => {
    renderApp('/this-route-does-not-exist');
    expect(screen.getByText('Oops! This toy wandered away.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to ToyBox' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore Toys' })).toBeInTheDocument();
  });

  it('supports forward/back browser navigation', () => {
    const router = renderApp('/');
    fireEvent.click(screen.getByRole('link', { name: 'Toys' }));
    expect(router.state.location.pathname).toBe('/products');
    expect(screen.getByText('All Toys')).toBeInTheDocument();

    act(() => { router.navigate(-1); });
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByText('New Kids Collection')).toBeInTheDocument();

    act(() => { router.navigate(1); });
    expect(router.state.location.pathname).toBe('/products');
  });

  it('opens the quick-view modal from a product card', () => {
    renderApp('/products');
    fireEvent.click(screen.getByRole('button', { name: 'Quick view Hero Squad Action Pack' }));
    expect(screen.getByText('2 Year Warranty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Full Details/ })).toBeInTheDocument();
  });
});
