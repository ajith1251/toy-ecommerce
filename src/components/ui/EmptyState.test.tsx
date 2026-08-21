import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ShoppingBag } from 'lucide-react';
import { expectNoViolations } from '../../test/utils';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

describe('EmptyState', () => {
  it('renders title, description and actions', () => {
    render(
      <EmptyState
        icon={<ShoppingBag />}
        title="Your cart is empty"
        description="Browse the toybox to find something fun."
        actions={<button>Explore Toys</button>}
      />
    );
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.getByText('Browse the toybox to find something fun.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore Toys' })).toBeInTheDocument();
  });

  it('renders as an h2 by default and h1 on standalone pages', () => {
    const { rerender } = render(<EmptyState icon={<ShoppingBag />} title="Nothing here" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Nothing here' })).toBeInTheDocument();

    rerender(<EmptyState icon={<ShoppingBag />} title="Nothing here" titleTag="h1" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Nothing here' })).toBeInTheDocument();
  });

  it('omits the description block when none is provided', () => {
    render(<EmptyState icon={<ShoppingBag />} title="Nothing here" />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<EmptyState icon={<ShoppingBag />} title="Empty" description="Nothing to see." />);
    await expectNoViolations(container);
  });
});

describe('ErrorState', () => {
  it('shows a user-friendly alert with a retry action', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveTextContent('An unexpected error occurred');
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides the retry button when onRetry is omitted', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
  });

  it('renders a custom footer', () => {
    render(<ErrorState footer={<a href="/">Back home</a>} />);
    expect(screen.getByRole('link', { name: 'Back home' })).toHaveAttribute('href', '/');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ErrorState onRetry={vi.fn()} />);
    await expectNoViolations(container);
  });
});
