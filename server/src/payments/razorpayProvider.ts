import crypto from 'crypto';
import Razorpay from 'razorpay';
import type { PaymentProvider } from './paymentProvider.js';

/**
 * Razorpay payment provider implementation.
 * Handles integration with Razorpay Standard Checkout.
 */

// Use any for Razorpay types to avoid TypeScript compatibility issues
// The runtime behavior is correct, types are only for compile-time checking
type RazorpayOrder = any;
type RazorpayPayment = any;
type RazorpayOptions = {
  key_id: string;
  key_secret: string;
};

export class RazorpayProvider implements PaymentProvider {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly razorpay: Razorpay;
  /** Client-side timeout for provider API calls — requests must never hang. */
  private readonly timeoutMs: number;

  constructor(keyId: string, keySecret: string, timeoutMs = 15_000) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.timeoutMs = timeoutMs;
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    } as RazorpayOptions);
  }

  /**
   * Races a provider call against a timeout so a hung Razorpay connection
   * surfaces as a normal error instead of an eternally pending request.
   */
  private withTimeout<T>(operation: string, run: () => Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Razorpay ${operation} timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs
      );
    });
    return Promise.race([run(), timeout]).finally(() => clearTimeout(timer));
  }

  /**
   * Creates a Razorpay order.
   * Makes an HTTP request to Razorpay API to create an order.
   */
  async createOrder(
    amount: number,
    currency: string,
    receipt: string,
    notes?: Record<string, unknown>
  ): Promise<{
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
    [key: string]: unknown;
  }> {
    return this.withTimeout('createOrder', () => new Promise((resolve, reject) => {
      try {
        this.razorpay.orders.create(
          {
            amount,
            currency,
            receipt,
            notes: notes as Record<string, string | number>,
            payment_capture: true, // Auto-capture payments
          },
          (err: any, order: RazorpayOrder) => {
            if (err) {
              console.error('Razorpay createOrder error:', err);
              reject(new Error(`Failed to create Razorpay order: ${err?.message || 'Unknown error'}`));
              return;
            }
            resolve({
              id: order.id,
              amount: order.amount,
              currency: order.currency,
              receipt: order.receipt,
              status: order.status,
              ...(notes || {}),
            });
          }
        );
      } catch (error) {
        console.error('Razorpay createOrder error:', error);
        reject(new Error(`Failed to create Razorpay order: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }));
  }

  /**
   * Verifies Razorpay payment signature.
   * Razorpay signature is calculated as:
   *   sha256(order_id + "|" + payment_id, key_secret)
   */
  async verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean> {
    const hmac = crypto.createHmac('sha256', this.keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  }

  /**
   * Captures an authorized payment.
   * For Standard Checkout with automatic capture, this is typically not needed
   * as payments are captured immediately. But we implement it for completeness.
   */
  async capturePayment(
    paymentId: string,
    amount: number
  ): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    [key: string]: unknown;
  }> {
    // Use type assertion to bypass TypeScript checking for the callback-based API
    const razorpayAny = this.razorpay as any;
    return this.withTimeout('capturePayment', () => new Promise((resolve, reject) => {
      try {
        razorpayAny.payments.capture(
          paymentId,
          amount,
          (err: any, payment: any) => {
            if (err) {
              console.error('Razorpay capturePayment error:', err);
              reject(new Error(`Failed to capture payment: ${err?.message || 'Unknown error'}`));
              return;
            }
            resolve({
              id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
            });
          }
        );
      } catch (error) {
        console.error('Razorpay capturePayment error:', error);
        reject(new Error(`Failed to capture payment: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }));
  }

  /**
   * Verifies Razorpay webhook signature.
   * Webhook signature is calculated as:
   *   sha256(request_body, webhook_secret)
   */
  verifyWebhookSignature(
    requestBody: string,
    webhookSecret: string,
    receivedSignature: string
  ): boolean {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(requestBody);
    const generatedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'utf8'),
      Buffer.from(receivedSignature, 'utf8')
    );
  }
}

/**
 * Creates a Razorpay provider instance.
 * @param keyId - Provider key ID
 * @param keySecret - Provider key secret
 * @param timeoutMs - Client-side timeout for provider API calls
 * @returns Payment provider instance
 */
export function createRazorpayProvider(keyId: string, keySecret: string, timeoutMs?: number): PaymentProvider {
  return new RazorpayProvider(keyId, keySecret, timeoutMs);
}