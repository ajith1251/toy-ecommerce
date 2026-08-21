import type { CartItem, Order, Toy } from '../types';

export function makeToy(overrides: Partial<Toy> = {}): Toy {
  return {
    id: 1,
    name: 'Test Toy',
    price: 29.99,
    category: 'action-figures',
    ageGroup: 'kids',
    ageRange: '4-7',
    rating: 4.5,
    reviewCount: 10,
    image: 'https://example.com/toy.jpg',
    description: 'A test toy',
    inStock: true,
    brand: 'TestBrand',
    ...overrides,
  };
}

export function makeCartItem(id: number, price: number, quantity = 1, name = `Toy ${id}`): CartItem {
  return { ...makeToy({ id, name, price }), quantity };
}

/** Server-shaped order fixture (as returned by the API). */
export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'TBX-20260817-8F4K2M',
    createdAt: '2026-08-17T10:00:00.000Z',
    status: 'confirmed',
    customer: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+1 555 123 4567',
    },
    shippingAddress: {
      line1: '123 Toy Lane',
      line2: '',
      city: 'Springfield',
      state: 'CA',
      postalCode: '90210',
      country: 'United States',
    },
    payment: { method: 'card', last4: '4242' },
    items: [
      {
        id: 1,
        name: 'Hero Squad Action Pack',
        image: 'https://example.com/hero.jpg',
        brand: 'PlayTime',
        price: 34.99,
        quantity: 2,
      },
    ],
    pricing: { subtotal: 69.98, discount: 0, shipping: 0, tax: 5.6, grandTotal: 75.58 },
    ...overrides,
  };
}
