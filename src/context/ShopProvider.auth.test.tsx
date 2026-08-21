import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { makeToy } from '../test/fixtures';
import type { Order } from '../types';
import type { CartItem } from '../types';
import ShopProvider from './ShopProvider';
import { useShop } from './ShopContext';
import { AuthTestProvider } from '../test/utils';
import type { User } from '../types';
import { seedStorage } from '../test/utils';
import { CART_STORAGE_KEY, WISHLIST_STORAGE_KEY } from '../constants/storage';

const user: User = {
  id: 1,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '',
  createdAt: '2026-08-17T00:00:00.000Z',
};

const rocket = { ...makeToy({ id: 1, name: 'Rocket', price: 20 }), quantity: 1 } as CartItem;
const plush = { ...makeToy({ id: 2, name: 'Plush', price: 10 }), quantity: 3 } as CartItem;

vi.mock('../services/cartService', async () => {
  const actual = await vi.importActual<typeof import('../services/cartService')>('../services/cartService');
  return {
    ...actual,
    loadServerCart: vi.fn(),
    addServerCartItem: vi.fn(),
    updateServerCartItem: vi.fn(),
    removeServerCartItem: vi.fn(),
    clearServerCart: vi.fn(),
  };
});

vi.mock('../services/wishlistService', async () => {
  const actual = await vi.importActual<typeof import('../services/wishlistService')>('../services/wishlistService');
  return {
    ...actual,
    loadServerWishlist: vi.fn(),
    addServerWishlistItem: vi.fn(),
    removeServerWishlistItem: vi.fn(),
  };
});

vi.mock('../services/authService', async () => {
  const actual = await vi.importActual<typeof import('../services/authService')>('../services/authService');
  return { ...actual, mergeGuestData: vi.fn() };
});

function Probe() {
  const shop = useShop();
  return (
    <div>
      <p data-testid="cart-count">{shop.cartTotalItems}</p>
      <p data-testid="cart-items">{shop.cartItems.map(i => `${i.id}x${i.quantity}`).join(',')}</p>
      <p data-testid="wishlist">{shop.wishlistIds.join(',')}</p>
      <button onClick={() => shop.addToCart(makeToy({ id: 1, name: 'Rocket', price: 20 }))}>Add Rocket</button>
      <button onClick={() => shop.removeFromCart(1)}>Remove Rocket</button>
      <button onClick={() => shop.toggleWishlist(makeToy({ id: 2, name: 'Plush', price: 10 }))}>Wish Plush</button>
      <button
        onClick={() =>
          shop.reorder({ items: [{ id: 1, quantity: 2, price: 20 }] } as unknown as Order)
        }
      >
        Reorder
      </button>
    </div>
  );
}

function renderAuthenticated(status: 'authenticated' | 'unauthenticated' | 'loading' = 'authenticated') {
  return render(
    <AuthTestProvider value={{ status, user: status === 'authenticated' ? user : null }}>
      <ShopProvider>
        <Probe />
      </ShopProvider>
    </AuthTestProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('ShopProvider (authenticated)', () => {
  it('merges the guest cart and wishlist on login, then loads the server cart', async () => {
    // Guest cart persisted in localStorage before login.
    seedStorage({ [CART_STORAGE_KEY]: [rocket], [WISHLIST_STORAGE_KEY]: [7, 8] });

    const { mergeGuestData } = await import('../services/authService');
    const { loadServerCart } = await import('../services/cartService');
    const { loadServerWishlist } = await import('../services/wishlistService');

    vi.mocked(mergeGuestData).mockResolvedValue({ cart: [], wishlist: [], capped: [] });
    vi.mocked(loadServerCart).mockResolvedValue([rocket, plush]);
    vi.mocked(loadServerWishlist).mockResolvedValue([9]);

    renderAuthenticated();
    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('4'));

    expect(mergeGuestData).toHaveBeenCalledWith(
      [{ productId: 1, quantity: 1 }],
      [7, 8]
    );
    expect(screen.getByTestId('cart-items')).toHaveTextContent('1x1,2x3');
    expect(screen.getByTestId('wishlist')).toHaveTextContent('9');
  });

  it('routes cart mutations through the server when authenticated', async () => {
    const { mergeGuestData } = await import('../services/authService');
    const { loadServerCart, addServerCartItem } = await import('../services/cartService');
    const { loadServerWishlist } = await import('../services/wishlistService');
    vi.mocked(mergeGuestData).mockResolvedValue({ cart: [], wishlist: [], capped: [] });
    vi.mocked(loadServerCart).mockResolvedValue([]);
    vi.mocked(loadServerWishlist).mockResolvedValue([]);
    vi.mocked(addServerCartItem).mockResolvedValue([rocket]);

    renderAuthenticated();
    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('0'));

    act(() => screen.getByRole('button', { name: 'Add Rocket' }).click());
    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('1'));
    expect(addServerCartItem).toHaveBeenCalledWith(1, 1);
  });

  it('reconciles the wishlist from the server on toggle', async () => {
    const { mergeGuestData } = await import('../services/authService');
    const { loadServerCart } = await import('../services/cartService');
    const { loadServerWishlist, addServerWishlistItem } = await import('../services/wishlistService');
    vi.mocked(mergeGuestData).mockResolvedValue({ cart: [], wishlist: [], capped: [] });
    vi.mocked(loadServerCart).mockResolvedValue([]);
    vi.mocked(loadServerWishlist).mockResolvedValue([]);
    vi.mocked(addServerWishlistItem).mockResolvedValue([2]);

    renderAuthenticated();
    await waitFor(() => expect(screen.getByTestId('wishlist')).toHaveTextContent(''));

    act(() => screen.getByRole('button', { name: 'Wish Plush' }).click());
    await waitFor(() => expect(screen.getByTestId('wishlist')).toHaveTextContent('2'));
    expect(addServerWishlistItem).toHaveBeenCalledWith(2);
  });

  it('uses the server cart for reorder and reports capped stock', async () => {
    const { mergeGuestData } = await import('../services/authService');
    const { loadServerCart, addServerCartItem } = await import('../services/cartService');
    const { loadServerWishlist } = await import('../services/wishlistService');
    vi.mocked(mergeGuestData).mockResolvedValue({ cart: [], wishlist: [], capped: [{ productId: 1, requested: 5, capped: 2 }] });
    vi.mocked(loadServerCart).mockResolvedValue([]);
    vi.mocked(loadServerWishlist).mockResolvedValue([]);
    vi.mocked(addServerCartItem).mockResolvedValue([plush]);

    renderAuthenticated();
    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('0'));

    act(() => screen.getByRole('button', { name: 'Reorder' }).click());
    await waitFor(() => expect(addServerCartItem).toHaveBeenCalledWith(1, 2));
  });

  it('resets to the guest cart after logout', async () => {
    const { mergeGuestData } = await import('../services/authService');
    const { loadServerCart } = await import('../services/cartService');
    const { loadServerWishlist } = await import('../services/wishlistService');
    vi.mocked(mergeGuestData).mockResolvedValue({ cart: [], wishlist: [], capped: [] });
    vi.mocked(loadServerCart).mockResolvedValue([rocket, plush]);
    vi.mocked(loadServerWishlist).mockResolvedValue([9]);

    const { rerender } = renderAuthenticated();
    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('4'));

    // Log out: status flips to unauthenticated → rehydrate guest localStorage (empty).
    rerender(
      <AuthTestProvider value={{ status: 'unauthenticated', user: null }}>
        <ShopProvider>
          <Probe />
        </ShopProvider>
      </AuthTestProvider>
    );
    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('0'));
  });
});
