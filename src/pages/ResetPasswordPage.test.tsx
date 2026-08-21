import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import { renderWithRouter } from '../test/utils';
import { ApiError } from '../lib/api/errors';

vi.mock('../services/authService', async () => {
  const actual = await vi.importActual<typeof import('../services/authService')>('../services/authService');
  return { ...actual, resetPassword: vi.fn() };
});

function renderReset(token = 'one-time-token') {
  return renderWithRouter(
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>,
    { route: `/reset-password?token=${token}` }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ResetPasswordPage', () => {
  it('validates password length and confirmation locally', async () => {
    renderReset();
    await userEvent.type(screen.getByLabelText('New password'), 'short');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    const { resetPassword } = await import('../services/authService');
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('resets the password with the URL token and shows the success state', async () => {
    const { resetPassword } = await import('../services/authService');
    vi.mocked(resetPassword).mockResolvedValue();

    renderReset('tok-123');
    await userEvent.type(screen.getByLabelText('New password'), 'NewPassword123!');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPassword123!');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('tok-123', 'NewPassword123!'));
    expect(await screen.findByText('Password updated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in with your new password/i })).toHaveAttribute('href', '/login');
  });

  it('shows the server message for an invalid or expired link', async () => {
    const { resetPassword } = await import('../services/authService');
    vi.mocked(resetPassword).mockRejectedValue(
      new ApiError('This reset link is invalid or has expired', 401, 'unauthorized')
    );

    renderReset('stale-token');
    await userEvent.type(screen.getByLabelText('New password'), 'NewPassword123!');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPassword123!');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('This reset link is invalid or has expired')).toBeInTheDocument();
    // The form stays visible so the user can see the server's message.
    expect(screen.getByRole('button', { name: 'Update password' })).toBeInTheDocument();
  });

  it('prompts for a fresh link when the URL has no token', () => {
    renderReset('');
    expect(screen.getByText(/missing its token/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });
});
