import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { expectNoViolations } from '../../test/utils';
import type { Toast } from '../../hooks/useToast';
import ToastContainer from './Toast';

const toasts: Toast[] = [
  { id: '1', message: 'Added to cart!', type: 'success' },
  { id: '2', message: 'Something failed', type: 'error' },
  { id: '3', message: 'Heads up', type: 'info' },
];

describe('ToastContainer', () => {
  it('renders every toast message', () => {
    render(<ToastContainer toasts={toasts} onRemove={vi.fn()} />);
    expect(screen.getByText('Added to cart!')).toBeInTheDocument();
    expect(screen.getByText('Something failed')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });

  it('dismisses a toast via its labeled button', () => {
    const onRemove = vi.fn();
    render(<ToastContainer toasts={toasts} onRemove={onRemove} />);
    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss notification' });
    expect(dismissButtons).toHaveLength(3);
    fireEvent.click(dismissButtons[1]);
    expect(onRemove).toHaveBeenCalledWith('2');
  });

  it('renders nothing when there are no toasts', () => {
    render(<ToastContainer toasts={[]} onRemove={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ToastContainer toasts={toasts} onRemove={vi.fn()} />);
    await expectNoViolations(container);
  });
});
