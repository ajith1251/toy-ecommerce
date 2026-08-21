import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

/** Component that always throws during render. */
function Bomb(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('catches render errors and shows a friendly, recoverable state', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred while rendering/i)).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to ToyBox' })).toHaveAttribute('href', '/');
    spy.mockRestore();
  });

  it('recovers after the user clicks Try again once the cause is fixed', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldFail = true;
    function Flaky() {
      if (shouldFail) throw new Error('boom');
      return <p>Recovered content</p>;
    }
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    );
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();

    shouldFail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
    spy.mockRestore();
  });
});
