import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithShop } from '../test/utils';
import ProductsPage from './ProductsPage';

describe('ProductsPage URL state', () => {
  it('renders the default kids grid with no URL parameters', () => {
    renderWithShop(<ProductsPage />, { route: '/products' });
    expect(screen.getByRole('heading', { name: 'All Toys' })).toBeInTheDocument();
    expect(screen.getAllByText('Hero Squad Action Pack')[0]).toBeInTheDocument();
  });

  it('applies ?category= from the URL', () => {
    renderWithShop(<ProductsPage />, { route: '/products?category=stem-toys' });
    expect(screen.getAllByText('Junior Robot Builder Kit')[0]).toBeInTheDocument();
    expect(screen.queryByText('Hero Squad Action Pack')).not.toBeInTheDocument();
  });

  it('combines ?category= and ?sort= from the URL', () => {
    renderWithShop(<ProductsPage />, { route: '/products?category=stem-toys&sort=price-asc' });
    expect(screen.getAllByText('Junior Robot Builder Kit')[0]).toBeInTheDocument();
    expect(screen.queryByText('Hero Squad Action Pack')).not.toBeInTheDocument();
  });

  it('applies ?q= from the URL', () => {
    renderWithShop(<ProductsPage />, { route: '/products?q=robot' });
    expect(screen.getAllByText('Junior Robot Builder Kit')[0]).toBeInTheDocument();
    expect(screen.queryByText('Hero Squad Action Pack')).not.toBeInTheDocument();
  });

  it('renders the empty state when the URL filters match nothing', () => {
    renderWithShop(<ProductsPage />, { route: '/products?category=stem-toys&q=zzz' });
    expect(screen.getByRole('heading', { name: 'No products found' })).toBeInTheDocument();
  });
});
