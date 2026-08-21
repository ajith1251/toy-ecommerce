import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import { renderWithAuth } from '../test/utils';
import { ApiError } from '../lib/api/errors';
import type { User } from '../types';

const user: User = {
  id: 1,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '',
  createdAt: '2026-08-17T00:00:00.000Z',
};

/** Navigates to /login with a returnTo state — simulates RequireAuth. */
function GoToLogin({ returnTo }: { returnTo: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/login', { state: { returnTo } })}>go</button>;
}

function renderLogin(value: Record<string, unknown> = {}) {
  return renderWithAuth(
    <Routes>
      <Route path="/" element={<GoToLogin returnTo="/account" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/account" element={<div>Account page</div>} />
      <Route path="/account/addresses" element={<div>Addresses page</div>} />
    </Routes>,
    { route: '/', value: { status: 'unauthenticated', ...value } }
  );
}

async function submitLogin(email = 'jane@example.com', password = 'Password123!') {
  await userEvent.click(screen.getByRole('button', { name: 'go' }));
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));
}

describe('LoginPage', () => {
  it('logs in and redirects to the account by default', async () => {
    const login = vi.fn().mockResolvedValue(user);
    renderLogin({ login });
    await submitLogin();

    await waitFor(() => expect(screen.getByText('Account page')).toBeInTheDocument());
    expect(login).toHaveBeenCalledWith('jane@example.com', 'Password123!');
  });

  it('returns to the original destination after login', async () => {
    const login = vi.fn().mockResolvedValue(user);
    renderWithAuth(
      <Routes>
        <Route path="/" element={<GoToLogin returnTo="/account/addresses" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account/addresses" element={<div>Addresses page</div>} />
      </Routes>,
      { route: '/', value: { status: 'unauthenticated', login } }
    );
    await submitLogin();

    await waitFor(() => expect(screen.getByText('Addresses page')).toBeInTheDocument());
  });

  it('shows the API error message on failed login', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError('Invalid email or password', 401, 'unauthorized'));
    renderLogin({ login });
    await submitLogin('jane@example.com', 'wrong-password');

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password'));
  });

  it('redirects straight to the account when already authenticated', () => {
    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<div>Account page</div>} />
      </Routes>,
      { route: '/login', value: { status: 'authenticated', user } }
    );
    expect(screen.getByText('Account page')).toBeInTheDocument();
  });

  it('links to registration', () => {
    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login', value: { status: 'unauthenticated' } }
    );
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/register');
  });
});
