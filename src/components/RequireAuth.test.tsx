import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import RequireAuth from './RequireAuth';
import { renderWithAuth } from '../test/utils';
import type { User } from '../types';

const user: User = {
  id: 1,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '',
  createdAt: '2026-08-17T00:00:00.000Z',
};

describe('RequireAuth', () => {
  it('shows a loader while the session is being checked', () => {
    renderWithAuth(
      <Routes>
        <Route path="/account" element={<RequireAuth><div>Protected</div></RequireAuth>} />
      </Routes>,
      { route: '/account', value: { status: 'loading' } }
    );
    expect(screen.getByText('Checking your session…')).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login with a returnTo', () => {
    renderWithAuth(
      <Routes>
        <Route path="/account" element={<RequireAuth><div>Protected</div></RequireAuth>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>,
      { route: '/account', value: { status: 'unauthenticated' } }
    );
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    renderWithAuth(
      <Routes>
        <Route path="/account" element={<RequireAuth><div>Protected content</div></RequireAuth>} />
      </Routes>,
      { route: '/account', value: { status: 'authenticated', user } }
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
