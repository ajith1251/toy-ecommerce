import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { makeToy } from '../test/fixtures';
import type { Order } from '../types';
import ShopProvider from './ShopProvider';
import { useShop } from './ShopContext';

function Probe() {
  const shop = useShop();
  return (
    <div>
      <p data-testid="cart-count">{shop.cartTotalItems}</p>
      <p data-testid="cart-price">{shop.cartTotalPrice}</p>
      <p data-testid="wishlist-count">{shop.wishlistCount}</p>
      <p data-testid="theme">{shop.theme}</p>
      <p data-testid="toasts">{shop.toasts.length}</p>
      <p data-testid="products">{shop.filteredProducts.length}</p>
      <p data-testid="recent">{shop.recentIds.join(',')}</p>
      <p data-testid="quickview">{shop.quickViewToy ? shop.quickViewToy.name : 'none'}</p>

      <button onClick={() => shop.addToCart(makeToy({ id: 1, name: 'Rocket', price: 20 }))}>Add Rocket</button>
      <button onClick={() => shop.toggleWishlist(makeToy({ id: 2, name: 'Plush', price: 10 }))}>Wish Plush</button>
      <button onClick={() => shop.toggleTheme()}>Toggle Theme</button>
      <button onClick={() => shop.markViewed(3)}>View 3</button>
      <button onClick={() => shop.openQuickView(makeToy({ id: 4, name: 'Drone', price: 90 }))}>Quick View</button>
      <button onClick={() => shop.closeQuickView()}>Close Quick View</button>
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

function renderProvider() {
  return render(
    <ShopProvider>
      <Probe />
    </ShopProvider>
  );
}

describe('ShopProvider', () => {
  it('boots with defaults: empty cart, empty wishlist, light theme, kids products', () => {
    renderProvider();
    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    expect(screen.getByTestId('wishlist-count')).toHaveTextContent('0');
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('products')).toHaveTextContent('20');
  });

  it('adds to the cart with a quantity and shows a toast', () => {
    renderProvider();
    act(() => screen.getByRole('button', { name: 'Add Rocket' }).click());
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-price')).toHaveTextContent('20');
    expect(screen.getByTestId('toasts')).toHaveTextContent('1');
  });

  it('toggles the wishlist', () => {
    renderProvider();
    act(() => screen.getByRole('button', { name: 'Wish Plush' }).click());
    expect(screen.getByTestId('wishlist-count')).toHaveTextContent('1');
  });

  it('toggles the theme', () => {
    renderProvider();
    act(() => screen.getByRole('button', { name: 'Toggle Theme' }).click());
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('records recently viewed ids and manages quick view state', () => {
    renderProvider();
    act(() => screen.getByRole('button', { name: 'View 3' }).click());
    expect(screen.getByTestId('recent')).toHaveTextContent('3');

    act(() => screen.getByRole('button', { name: 'Quick View' }).click());
    expect(screen.getByTestId('quickview')).toHaveTextContent('Drone');
    act(() => screen.getByRole('button', { name: 'Close Quick View' }).click());
    expect(screen.getByTestId('quickview')).toHaveTextContent('none');
  });

  it('reorders a previous order back into the cart', () => {
    renderProvider();
    act(() => screen.getByRole('button', { name: 'Reorder' }).click());
    expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
    expect(screen.getByTestId('toasts')).toHaveTextContent('1');
  });
});
