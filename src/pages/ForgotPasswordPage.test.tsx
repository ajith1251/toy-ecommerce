import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPasswordPage';
import { renderWithRouter } from '../test/utils';

vi.mock('../services/authService', async () => {
  const actual = await vi.importActual<typeof import('../services/authService')>('../services/authService');
  return { ...actual, forgotPassword: vi.fn() };
});

function renderForgot() {
  return renderWithRouter(
    <Routes>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    </Routes>,
    { route: '/forgot-password' }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPasswordPage', () => {
  it('validates the email locally', async () => {
    renderForgot();
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    const { forgotPassword } = await import('../services/authService');
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('shows the generic success state and never reveals account existence', async () => {
    const { forgotPassword } = await import('../services/authService');
    vi.mocked(forgotPassword).mockResolvedValue();

    renderForgot();
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith('jane@example.com'));
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    expect(screen.getByText(/If an account exists for/)).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to log in/i })).toHaveAttribute('href', '/login');
  });

  it('shows a neutral error when the request fails (no enumeration either way)', async () => {
    const { forgotPassword } = await import('../services/authService');
    vi.mocked(forgotPassword).mockRejectedValue(new Error('network'));

    renderForgot();
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(
      await screen.findByText('Could not request a reset right now — please try again later.')
    ).toBeInTheDocument();
  });
});
