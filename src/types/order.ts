export type PaymentMethod = 'card' | 'upi' | 'cod';

export type OrderStatus = 'confirmed' | 'shipped' | 'delivered';

export interface OrderCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface OrderShippingAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Payment info stored on an order. Never contains CVV or the full card
 * number — only safe display data.
 */
export interface OrderPayment {
  method: PaymentMethod;
  /** Last 4 digits of the card, only when the order was paid by card. */
  last4?: string;
  /** UPI ID, only when the order was paid via UPI. */
  upiId?: string;
}

export interface OrderItem {
  id: number;
  name: string;
  image: string;
  brand: string;
  price: number;
  quantity: number;
}

export interface OrderPricing {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  grandTotal: number;
}

export interface Order {
  id: string;
  /** ISO timestamp of when the order was placed. */
  createdAt: string;
  status: OrderStatus;
  customer: OrderCustomer;
  shippingAddress: OrderShippingAddress;
  payment: OrderPayment;
  items: OrderItem[];
  pricing: OrderPricing;
}
