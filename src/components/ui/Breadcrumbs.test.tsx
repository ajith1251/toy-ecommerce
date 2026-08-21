import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter, expectNoViolations } from '../../test/utils';
import Breadcrumbs from './Breadcrumbs';

describe('Breadcrumbs', () => {
  it('renders the home link and crumbs inside a labeled landmark', () => {
    renderWithRouter(
      <Breadcrumbs items={[{ label: 'Toys', to: '/category/action-figures' }, { label: 'Hero Squad' }]} />
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('renders crumbs with a destination as links', () => {
    renderWithRouter(<Breadcrumbs items={[{ label: 'Robots', to: '/category/stem-toys' }]} />);
    expect(screen.getByRole('link', { name: 'Robots' })).toHaveAttribute('href', '/category/stem-toys');
  });

  it('renders the current crumb as plain text when it has no destination', () => {
    renderWithRouter(<Breadcrumbs items={[{ label: 'Current Page' }]} />);
    expect(screen.getByText('Current Page')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Current Page' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithRouter(
      <Breadcrumbs items={[{ label: 'A', to: '/a' }, { label: 'B' }]} />
    );
    await expectNoViolations(container);
  });
});
