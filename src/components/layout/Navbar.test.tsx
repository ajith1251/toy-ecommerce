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
  it('shows an account icon link for desktop users', () => {
    renderNavbar({ value: { status: 'unauthenticated' } });
    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute('href', '/account');
  });

  it('mobile menu shows auth actions for guests', async () => {
    renderNavbar({ value: { status: 'unauthenticated' } });
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });

  it('mobile menu shows account actions for authenticated users', async () => {
    renderNavbar({ value: { status: 'authenticated', user } });
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });
});
