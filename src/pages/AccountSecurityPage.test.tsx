import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import AccountSecurityPage from './AccountSecurityPage';
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

vi.mock('../services/authService', async () => {
  const actual = await vi.importActual<typeof import('../services/authService')>('../services/authService');
  return {
    ...actual,
    changePassword: vi.fn(),
  };
});

function renderSecurity() {
  return renderWithAuth(
    <Routes>
      <Route path="/account/security" element={<AccountSecurityPage />} />
    </Routes>,
    { route: '/account/security', value: { status: 'authenticated', user }, withShop: true }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AccountSecurityPage', () => {
  it('validates the new password length and confirmation locally', async () => {
    renderSecurity();

    await userEvent.type(screen.getByLabelText(/current password/i), 'old-pass-123');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'short');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    const { changePassword } = await import('../services/authService');
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('changes the password and clears the form fields', async () => {
    const { changePassword } = await import('../services/authService');
    vi.mocked(changePassword).mockResolvedValue();

    renderSecurity();

    await userEvent.type(screen.getByLabelText(/current password/i), 'old-pass-123');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPassword123!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPassword123!');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('old-pass-123', 'NewPassword123!'));
    expect(screen.getByLabelText(/current password/i)).toHaveValue('');
    expect(screen.getByLabelText(/^new password/i)).toHaveValue('');
  });

  it('shows the API error message when the current password is wrong', async () => {
    const { changePassword } = await import('../services/authService');
    vi.mocked(changePassword).mockRejectedValue(new ApiError('Current password is incorrect', 401, 'unauthorized'));

    renderSecurity();

    await userEvent.type(screen.getByLabelText(/current password/i), 'wrong-pass');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPassword123!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPassword123!');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();
  });

  it('signs out of the current browser session', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(
      <Routes>
        <Route path="/account/security" element={<AccountSecurityPage />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>,
      { route: '/account/security', value: { status: 'authenticated', user, logout }, withShop: true }
    );

    await userEvent.click(screen.getByRole('button', { name: /log out$/i }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it('signs out everywhere and navigates home', async () => {
    renderSecurity();
    await userEvent.click(screen.getByRole('button', { name: /log out everywhere/i }));
    await waitFor(() => expect(screen.queryByText(/log out everywhere/i)).not.toBeInTheDocument());
  });
});
