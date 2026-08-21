import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import AccountPage from './AccountPage';
import { renderWithAuth } from '../test/utils';
import type { User } from '../types';

const user: User = {
  id: 1,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '+1 555 000 0000',
  createdAt: '2026-08-17T00:00:00.000Z',
};

vi.mock('../services/authService', async () => {
  const actual = await vi.importActual<typeof import('../services/authService')>('../services/authService');
  return { ...actual, updateProfile: vi.fn() };
});

function renderAccount() {
  return renderWithAuth(
    <Routes>
      <Route path="/account" element={<AccountPage />} />
    </Routes>,
    { route: '/account', value: { status: 'authenticated', user }, withShop: true }
  );
}

describe('AccountPage', () => {
  it('displays the profile details', () => {
    renderAccount();
    expect(screen.getByText('Hi, Jane')).toBeInTheDocument(); // greeting
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1 555 000 0000')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('edits and saves the profile', async () => {
    const { updateProfile } = await import('../services/authService');
    vi.mocked(updateProfile).mockResolvedValue({ ...user, firstName: 'Janet' });
    renderAccount();

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const firstName = screen.getByLabelText(/first name/i);
    await userEvent.clear(firstName);
    await userEvent.type(firstName, 'Janet');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Janet' })));
  });

  it('renders the account navigation tabs', () => {
    renderAccount();
    expect(screen.getByRole('link', { name: /orders/i })).toHaveAttribute('href', '/account/orders');
    expect(screen.getByRole('link', { name: /addresses/i })).toHaveAttribute('href', '/account/addresses');
    expect(screen.getByRole('link', { name: /security/i })).toHaveAttribute('href', '/account/security');
  });
});
