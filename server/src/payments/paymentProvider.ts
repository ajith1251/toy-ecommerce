/**
 * Payment provider abstraction layer.
 * Defines the interface that payment providers must implement.
 */

export interface PaymentProvider {
  /**
   * Creates a payment order with the provider.
   * @param amount - Amount in minor units (paise for INR)
   * @param currency - Currency code (INR)
   * @param receipt - Unique receipt ID for the order
   * @param notes - Optional metadata
   * @returns Provider order ID and other creation details
   */
  createOrder(
    amount: number,
    currency: string,
    receipt: string,
    notes?: Record<string, unknown>
  ): Promise<{
    id: string; // provider_order_id
    amount: number;
    currency: string;
    receipt: string;
    status: string;
    [key: string]: unknown;
  }>;

  /**
   * Verifies a payment signature returned by the provider.
   * @param orderId - Provider order ID
   * @param paymentId - Provider payment ID
   * @param signature - Signature to verify
   * @returns True if signature is valid
   */
  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean>;

  /**
   * Captures an authorized payment.
   * @param paymentId - Provider payment ID
   * @param amount - Amount to capture in minor units
   * @returns Capture result
   */
  capturePayment(
    paymentId: string,
    amount: number
  ): Promise<{
    id: string; // provider_payment_id
    amount: number;
    currency: string;
    status: string;
    [key: string]: unknown;
  }>;
}

/**
 * Payment provider factory.
 * Creates the appropriate provider based on configuration.
 */
import { RazorpayProvider } from './razorpayProvider.js';

export class PaymentProviderFactory {
  /**
   * Creates a payment provider instance.
   * @param type - Provider type (currently only 'razorpay')
   * @param keyId - Provider key ID
   * @param keySecret - Provider key secret
   * @returns Payment provider instance
   */
  static createProvider(
    type: string,
    keyId: string,
    keySecret: string
  ): PaymentProvider {
    switch (type.toLowerCase()) {
      case 'razorpay':
        return new RazorpayProvider(keyId, keySecret);
      default:
        throw new Error(`Unsupported payment provider: ${type}`);
    }
  }
}