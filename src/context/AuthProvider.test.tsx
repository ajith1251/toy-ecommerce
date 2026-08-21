import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import AuthProvider from './AuthProvider';
import { useAuth } from './AuthContext';
import type { User } from '../types';

const user: User = {
  id: 1,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '',
  createdAt: '2026-08-17T00:00:00.000Z',
};

vi.mock('../services/authService', async () => {
  const actual = await vi.importActual<typeof import('../services/authService')>('../services/authService');
  return {
    ...actual,
    fetchMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  };
});

function Probe() {
  const { status, user: current, login, register, logout, refreshAuth } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{current?.email ?? 'none'}</p>
      <button onClick={() => login('a@b.com', 'Password123!')}>login</button>
      <button onClick={() => register({ email: 'a@b.com', password: 'Password123!', firstName: 'A', lastName: 'B' })}>register</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => refreshAuth()}>refresh</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthProvider', () => {
  it('boots in loading state, then becomes unauthenticated when there is no session', async () => {
    const { fetchMe } = await import('../services/authService');
    vi.mocked(fetchMe).mockResolvedValue(null);

    renderProvider();
    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('restores an existing session from /api/auth/me on boot', async () => {
    const { fetchMe } = await import('../services/authService');
    vi.mocked(fetchMe).mockResolvedValue(user);

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('jane@example.com');
  });

  it('sets the session on login and clears it on logout', async () => {
    const { fetchMe, login, logout } = await import('../services/authService');
    vi.mocked(fetchMe).mockResolvedValue(null);
    vi.mocked(login).mockResolvedValue(user);
    vi.mocked(logout).mockResolvedValue();

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    act(() => screen.getByRole('button', { name: 'login' }).click());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    act(() => screen.getByRole('button', { name: 'logout' }).click());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('registers a new account and authenticates', async () => {
    const { fetchMe, register } = await import('../services/authService');
    vi.mocked(fetchMe).mockResolvedValue(null);
    vi.mocked(register).mockResolvedValue(user);

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    act(() => screen.getByRole('button', { name: 'register' }).click());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
  });

  it('clears local state even when the logout request fails (network)', async () => {
    const { fetchMe, login, logout } = await import('../services/authService');
    vi.mocked(fetchMe).mockResolvedValue(null);
    vi.mocked(login).mockResolvedValue(user);
    vi.mocked(logout).mockImplementation(async () => {
      throw new Error('network');
    });

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    act(() => screen.getByRole('button', { name: 'login' }).click());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    act(() => screen.getByRole('button', { name: 'logout' }).click());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('refreshAuth re-checks the session', async () => {
    const { fetchMe } = await import('../services/authService');
    vi.mocked(fetchMe).mockResolvedValueOnce(null).mockResolvedValueOnce(user);

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    act(() => screen.getByRole('button', { name: 'refresh' }).click());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
  });
});
