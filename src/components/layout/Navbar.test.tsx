import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import { renderWithAuth } from '../../test/utils';
import type { AuthContextValue } from '../../context/AuthContext';
import type { User } from '../../types';

const user: User = {
  id: 1,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '',
  createdAt: '2026-08-17T00:00:00.000Z',
};

function renderNavbar({
  value = {},
  route = '/',
}: { value?: Partial<AuthContextValue>; route?: string } = {}) {
  return renderWithAuth(
    <Routes>
      <Route path="/" element={<Navbar onCartOpen={vi.fn()} />} />
      <Route path="/login" element={<p>Login page</p>} />
      <Route path="/account" element={<p>Account page</p>} />
    </Routes>,
    { route, value, withShop: true }
  );
}

describe('Navbar auth UI', () => {
  it('shows a Log in link for guests', () => {
    renderNavbar({ value: { status: 'unauthenticated' } });
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: /my account/i })).not.toBeInTheDocument();
  });

  it('shows the account link, first name, and logout for authenticated users', () => {
    renderNavbar({ value: { status: 'authenticated', user } });
    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/account');
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('logs the user out and returns home', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderNavbar({ value: { status: 'authenticated', user, logout } });
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it('mobile menu shows auth actions for guests', async () => {
    renderNavbar({ value: { status: 'unauthenticated' } });
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    expect(screen.getByRole('link', { name: /^register$/i })).toHaveAttribute('href', '/register');
    expect(screen.getAllByRole('link', { name: /log in/i })).toHaveLength(2); // desktop + mobile
  });

  it('mobile menu shows account actions for authenticated users', async () => {
    renderNavbar({ value: { status: 'authenticated', user } });
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    expect(screen.getAllByRole('link', { name: /my account/i })).toHaveLength(2); // desktop + mobile
    expect(screen.getAllByRole('button', { name: /log out/i })).toHaveLength(2); // desktop + mobile
  });
});
