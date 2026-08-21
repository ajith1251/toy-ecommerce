import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { makeToy } from '../../test/fixtures';
import { renderWithRouter, expectNoViolations } from '../../test/utils';
import ProductCard from './ProductCard';

const toy = makeToy({
  id: 7,
  name: 'Robo Builder',
  price: 60,
  originalPrice: 80,
  brand: 'CodeBuddy',
  isNew: true,
  isBestseller: true,
});

function renderCard(overrides: Partial<React.ComponentProps<typeof ProductCard>> = {}) {
  const props = {
    toy,
    onAddToCart: vi.fn(),
    onToggleWishlist: vi.fn(),
    isInWishlist: false,
    onQuickView: vi.fn(),
    ...overrides,
  };
  const utils = renderWithRouter(<ProductCard {...props} />);
  return { ...utils, props };
}

describe('ProductCard', () => {
  it('renders the product name, price, original price and badges', () => {
    renderCard();
    expect(screen.getByText('Robo Builder')).toBeInTheDocument();
    expect(screen.getByText('$60.00')).toBeInTheDocument();
    expect(screen.getByText('$80.00')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Bestseller')).toBeInTheDocument();
    // 25% off between $80 original and $60 price.
    expect(screen.getByText('-25%')).toBeInTheDocument();
  });

  it('omits the sale badge when there is no original price', () => {
    renderCard({ toy: makeToy({ id: 1, name: 'Plain Toy', price: 20 }) });
    expect(screen.queryByText(/-%\s*$/)).not.toBeInTheDocument();
  });

  it('links to the product detail page', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'View Robo Builder' })).toHaveAttribute('href', '/product/7');
    expect(screen.getByRole('link', { name: 'Robo Builder' })).toHaveAttribute('href', '/product/7');
  });

  it('adds the product to the cart', () => {
    const { props } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));
    expect(props.onAddToCart).toHaveBeenCalledWith(toy);
  });

  it('toggles the wishlist with an add label', () => {
    const onToggleWishlist = vi.fn();
    renderCard({ onToggleWishlist });
    fireEvent.click(screen.getByRole('button', { name: 'Add Robo Builder to wishlist' }));
    expect(onToggleWishlist).toHaveBeenCalledWith(toy);
  });

  it('labels the wishlist action as a removal when already wishlisted', () => {
    renderWithRouter(
      <ProductCard
        toy={toy}
        onAddToCart={vi.fn()}
        onToggleWishlist={vi.fn()}
        isInWishlist
        onQuickView={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Remove Robo Builder from wishlist' })).toBeInTheDocument();
  });

  it('opens quick view', () => {
    const { props } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Quick view Robo Builder' }));
    expect(props.onQuickView).toHaveBeenCalledWith(toy);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderCard();
    await expectNoViolations(container);
  });
});
