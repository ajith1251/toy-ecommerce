import { api } from '../lib/api/client.js';

/**
 * Payment service for handling Razorpay integration
 */
export class PaymentService {
  /**
   * Creates a payment intent for an order
   * @param orderId - The order ID
   * @param amount - Amount in paise (minor units)
   * @param method - Payment method ('card' or 'upi')
   * @param receipt - Optional receipt ID
   * @param notes - Optional metadata
   * @returns Promise with provider order details including keyId
   */
  static async createPayment(
    orderId: string,
    amount: number,
    method: 'card' | 'upi',
    receipt?: string,
    notes?: Record<string, unknown>
  ) {
    const response = await api.post<{
      providerOrderId: string;
      amount: number;
      currency: string;
      status: string;
      method: string;
      keyId: string;
    }>('/payments/create-order', {
      orderId,
      amount,
      currency: 'INR',
      method,
      receipt,
      notes
    });
    return response;
  }

  /**
   * Verifies a payment with Razorpay
   * @param orderId - The order ID
   * @param providerOrderId - Razorpay order ID
   * @param providerPaymentId - Razorpay payment ID
   * @param signature - Razorpay signature
   * @returns Promise with payment verification result
   */
  static async verifyPayment(
    orderId: string,
    providerOrderId: string,
    providerPaymentId: string,
    signature: string
  ) {
    const response = await api.post<{
      providerOrderId: string;
      providerPaymentId: string;
      amount: number;
      currency: string;
      status: string;
      method: string;
    }>('/payments/verify', {
      orderId,
      providerOrderId,
      providerPaymentId,
      signature
    });
    return response;
  }

  /**
   * Gets the payment status for an order
   * @param orderNumber - The order number
   * @returns Promise with payment status
   */
  static async getPaymentStatus(orderNumber: string) {
    const response = await api.get<{
      providerOrderId: string;
      providerPaymentId?: string;
      amount: number;
      currency: string;
      status: string;
      method: string;
    }>(`/orders/${orderNumber}/payment`);
    return response;
  }
}