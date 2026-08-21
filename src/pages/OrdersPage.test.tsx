import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/utils';
import { makeOrder } from '../test/fixtures';
import { ApiError } from '../lib/api/errors';
import OrdersPage from './OrdersPage';

vi.mock('../services/orderService', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/orderService')>();
  return {
    ...actual,
    getOrders: vi.fn(),
  };
});

import { getOrders } from '../services/orderService';

const mockedGetOrders = vi.mocked(getOrders);

describe('OrdersPage', () => {
  it('shows a loader while orders are loading', () => {
    mockedGetOrders.mockReturnValue(new Promise(() => {}));
    renderWithRouter(<OrdersPage />);
    expect(screen.getByText('Loading your orders…')).toBeInTheDocument();
  });

  it('renders the order history from the API', async () => {
    mockedGetOrders.mockResolvedValue([makeOrder({ id: 'TBX-20260817-AAA111' }), makeOrder({ id: 'TBX-20260817-BBB222' })]);
    renderWithRouter(<OrdersPage />);

    expect(await screen.findByRole('heading', { name: /Order History/ })).toBeInTheDocument();
    expect(await screen.findByText('2 orders')).toBeInTheDocument();
    expect(screen.getByText('TBX-20260817-AAA111')).toBeInTheDocument();
    expect(screen.getByText('TBX-20260817-BBB222')).toBeInTheDocument();
  });

  it('renders an empty state when there are no orders', async () => {
    mockedGetOrders.mockResolvedValue([]);
    renderWithRouter(<OrdersPage />);
    expect(await screen.findByRole('heading', { name: 'No orders yet' })).toBeInTheDocument();
  });

  it('shows an error state with retry when the API fails', async () => {
    mockedGetOrders.mockRejectedValueOnce(new ApiError('Service unreachable', 0, 'network'));
    renderWithRouter(<OrdersPage />);

    expect(await screen.findByRole('heading', { name: 'Unable to load your orders' })).toBeInTheDocument();
    expect(screen.getByText('Service unreachable')).toBeInTheDocument();

    mockedGetOrders.mockResolvedValueOnce([makeOrder()]);
    // Retry recovers and shows the list.
    screen.getByRole('button', { name: /Try Again/ }).click();
    expect(await screen.findByText('TBX-20260817-8F4K2M')).toBeInTheDocument();
  });
});
