import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import RegisterPage from './RegisterPage';
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

function renderRegister(value: Record<string, unknown> = {}) {
  return renderWithAuth(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/account" element={<div>Account page</div>} />
    </Routes>,
    { route: '/register', value: { status: 'unauthenticated', ...value } }
  );
}

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
  await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
  await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
  await userEvent.type(screen.getByLabelText(/^password$/i), 'Password123!');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password123!');
}

describe('RegisterPage', () => {
  it('registers and redirects to the account', async () => {
    const register = vi.fn().mockResolvedValue(user);
    renderRegister({ register });
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText('Account page')).toBeInTheDocument());
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com', firstName: 'Jane', password: 'Password123!' })
    );
  });

  it('blocks short passwords and mismatched confirmation', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'short');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows a duplicate-email error from the API', async () => {
    const register = vi
      .fn()
      .mockRejectedValue(new ApiError('An account with this email already exists', 409, 'conflict'));
    renderRegister({ register });
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('An account with this email already exists')
    );
  });

  it('links to login', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });
});
