import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { expectNoViolations } from '../../test/utils';
import Modal from './Modal';

function renderModal(overrides: Partial<React.ComponentProps<typeof Modal>> = {}) {
  return render(
    <Modal isOpen onClose={vi.fn()} ariaLabel="Quick View" {...overrides}>
      <p>Modal content</p>
    </Modal>
  );
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes dialog semantics with an accessible name', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Quick View' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('moves focus into the dialog when opened', () => {
    const { container } = renderModal();
    expect(container.querySelector('[role="dialog"]')).toHaveFocus();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the close button', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderModal();
    await expectNoViolations(container);
  });
});
