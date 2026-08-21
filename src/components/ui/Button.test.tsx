import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders children and fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Add to Cart</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the requested variant classes', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.querySelector('button')).toHaveClass('bg-red-600');
  });

  it('applies the requested size classes', () => {
    const { container } = render(<Button size="sm">Small</Button>);
    expect(container.querySelector('button')).toHaveClass('px-4 py-2');
  });

  it('shows a spinner and disables the button while loading', () => {
    const onClick = vi.fn();
    const { container } = render(<Button loading onClick={onClick}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(container.querySelector('.animate-spin')).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('honors the disabled prop and blocks clicks', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is exposed to assistive tech as a button', () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });
});
