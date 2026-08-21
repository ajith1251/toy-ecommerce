import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from './Input';

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input label="Email" name="email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'email');
  });

  it('derives an id from the label when no name is given', () => {
    render(<Input label="First Name" />);
    expect(screen.getByLabelText('First Name')).toHaveAttribute('id', 'first-name');
  });

  it('exposes errors to assistive tech', () => {
    render(<Input label="Email" name="email" error="Enter a valid email address" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address');
  });

  it('links hints with aria-describedby and omits the alert role', () => {
    render(<Input label="CVV" name="cvv" hint="3-4 digits" />);
    const input = screen.getByLabelText('CVV');
    expect(input).toHaveAttribute('aria-describedby', 'cvv-hint');
    expect(screen.getByText('3-4 digits')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no error or hint state when neither is provided', () => {
    render(<Input label="City" name="city" />);
    expect(screen.getByLabelText('City')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('City')).not.toHaveAttribute('aria-describedby');
  });
});
