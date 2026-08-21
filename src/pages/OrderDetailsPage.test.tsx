import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ShopProvider from '../context/ShopProvider';
import { makeOrder } from '../test/fixtures';
import { ApiError } from '../lib/api/errors';
import OrderDetailsPage from './OrderDetailsPage';

vi.mock('../services/orderService', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/orderService')>();
  return {
    ...actual,
    getOrderById: vi.fn(),
  };
});

import { getOrderById } from '../services/orderService';

const mockedGetOrderById = vi.mocked(getOrderById);

/** Renders the page under a real `/orders/:id` route so useParams resolves. */
function renderPage(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ShopProvider>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailsPage />} />
        </Routes>
      </ShopProvider>
    </MemoryRouter>
  );
}

describe('OrderDetailsPage', () => {
  it('shows a loader while the order is loading', () => {
    mockedGetOrderById.mockReturnValue(new Promise(() => {}));
    renderPage('/orders/TBX-20260817-8F4K2M');
    expect(screen.getByText('Loading your order…')).toBeInTheDocument();
  });

  it('renders a loaded order with its server data', async () => {
    mockedGetOrderById.mockResolvedValue(makeOrder({ id: 'TBX-20260817-8F4K2M' }));
    renderPage('/orders/TBX-20260817-8F4K2M');

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getAllByText('TBX-20260817-8F4K2M').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Reorder/ })).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown order', async () => {
    mockedGetOrderById.mockResolvedValue(null);
    renderPage('/orders/TBX-20260101-NOPE00');
    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
  });

  it('maps a server 404 to the not-found state (not a generic error)', async () => {
    mockedGetOrderById.mockRejectedValue(new ApiError('Order TBX-1 not found', 404, 'not_found'));
    renderPage('/orders/TBX-20260101-NOPE00');
    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
  });

  it('shows an error state with retry when the API fails', async () => {
    mockedGetOrderById.mockRejectedValueOnce(new ApiError('Service unreachable', 0, 'network'));
    renderPage('/orders/TBX-20260817-8F4K2M');

    expect(await screen.findByRole('heading', { name: 'Unable to load this order' })).toBeInTheDocument();
    expect(screen.getByText('Service unreachable')).toBeInTheDocument();
  });
});
