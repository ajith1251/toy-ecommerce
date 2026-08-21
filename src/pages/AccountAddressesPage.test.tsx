import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import AccountAddressesPage from './AccountAddressesPage';
import { renderWithAuth } from '../test/utils';
import type { Address, User } from '../types';

const user: User = {
  id: 1,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '',
  createdAt: '2026-08-17T00:00:00.000Z',
};

const address: Address = {
  id: 1,
  label: 'Home',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '',
  line1: '123 Toy Lane',
  line2: '',
  city: 'Springfield',
  state: 'CA',
  postalCode: '90210',
  country: 'United States',
  isDefault: true,
  createdAt: '2026-08-17T00:00:00.000Z',
};

vi.mock('../services/authService', async () => {
  const actual = await vi.importActual<typeof import('../services/authService')>('../services/authService');
  return {
    ...actual,
    listAddresses: vi.fn(),
    createAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    setDefaultAddress: vi.fn(),
  };
});

function renderAddresses() {
  return renderWithAuth(
    <Routes>
      <Route path="/account/addresses" element={<AccountAddressesPage />} />
    </Routes>,
    { route: '/account/addresses', value: { status: 'authenticated', user }, withShop: true }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AccountAddressesPage', () => {
  it('lists saved addresses with the default badge', async () => {
    const { listAddresses } = await import('../services/authService');
    vi.mocked(listAddresses).mockResolvedValue([address]);

    renderAddresses();
    await waitFor(() => expect(screen.getByText(/123 Toy Lane/)).toBeInTheDocument());
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText(/Springfield/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no addresses', async () => {
    const { listAddresses } = await import('../services/authService');
    vi.mocked(listAddresses).mockResolvedValue([]);

    renderAddresses();
    await waitFor(() => expect(screen.getByText('No saved addresses yet')).toBeInTheDocument());
  });

  it('creates a new address', async () => {
    const { listAddresses, createAddress } = await import('../services/authService');
    vi.mocked(listAddresses).mockResolvedValue([]);
    vi.mocked(createAddress).mockResolvedValue(address);

    renderAddresses();
    await waitFor(() => expect(screen.getByText('No saved addresses yet')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /add an address/i }));

    await userEvent.type(screen.getByLabelText(/street address/i), '456 New St');
    await userEvent.type(screen.getByLabelText(/city/i), 'Oakland');
    await userEvent.type(screen.getByLabelText(/postal code/i), '94601');
    await userEvent.type(screen.getByLabelText(/country/i), 'United States');
    await userEvent.click(screen.getByRole('button', { name: /save address/i }));

    await waitFor(() =>
      expect(createAddress).toHaveBeenCalledWith(expect.objectContaining({ line1: '456 New St', city: 'Oakland' }))
    );
  });

  it('edits and deletes an address', async () => {
    const { listAddresses, updateAddress, deleteAddress } = await import('../services/authService');
    vi.mocked(listAddresses).mockResolvedValue([{ ...address, isDefault: false }]);
    vi.mocked(updateAddress).mockResolvedValue(address);
    vi.mocked(deleteAddress).mockResolvedValue();

    renderAddresses();
    await waitFor(() => expect(screen.getByText(/123 Toy Lane/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /edit home/i }));
    await userEvent.click(screen.getByRole('button', { name: /save address/i }));
    await waitFor(() => expect(updateAddress).toHaveBeenCalledWith(1, expect.anything()));

    await userEvent.click(screen.getByRole('button', { name: /delete home/i }));
    await waitFor(() => expect(deleteAddress).toHaveBeenCalledWith(1));
  });

  it('sets an address as default', async () => {
    const { listAddresses, setDefaultAddress } = await import('../services/authService');
    vi.mocked(listAddresses).mockResolvedValue([{ ...address, isDefault: false }]);
    vi.mocked(setDefaultAddress).mockResolvedValue();

    renderAddresses();
    await waitFor(() => expect(screen.getByText(/123 Toy Lane/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /set default/i }));
    await waitFor(() => expect(setDefaultAddress).toHaveBeenCalledWith(1));
  });
});
