import type { DbPool } from '../db/pool.js';
import type { OrderRepository } from '../repositories/orderRepository.js';
import type { PaymentRepository } from './paymentRepository.js';
import type { PaymentProvider } from './paymentProvider.js';
import type { OrderDto, OrderPricingDto, PaymentStatus } from '../types.js';
import type { ServerConfig } from '../config.js';
import { ConflictError } from '../errors.js';
import type pg from 'pg';

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        order_id?: string;
        id?: string;
        error?: {
          code?: string;
          description?: string;
        };
      };
      id?: string;
      error?: {
        code?: string;
        description?: string;
      };
    };
    order?: {
      entity?: {
        id?: string;
      };
      id?: string;
    };
    error?: {
      code?: string;
      description?: string;
    };
  };
}

export interface PaymentDependencies {
  pool: DbPool;
  orderRepo: OrderRepository;
  paymentRepo: PaymentRepository;
  paymentProvider?: PaymentProvider;
  config: Pick<ServerConfig, 'razorpay'>;
}

export interface CreatePaymentInput {
  orderId: string; // ToyBox order_number
  amount: number; // Amount in minor units (paise for INR)
  currency: string; // Should be 'INR'
  method: 'card' | 'upi' | 'cod';
  receipt?: string;
  notes?: Record<string, unknown>;
}

export interface PaymentResult {
  providerOrderId: string;
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: 'card' | 'upi' | 'cod';
}

export interface PaymentVerificationInput {
  orderId: string; // ToyBox order_number
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

type Queryable = DbPool | pg.PoolClient;

export class PaymentService {
  private readonly pool: DbPool;
  private readonly orderRepo: OrderRepository;
  private readonly paymentRepo: PaymentRepository;
  private readonly paymentProvider: PaymentProvider | undefined;

  constructor(deps: PaymentDependencies) {
    this.pool = deps.pool;
    this.orderRepo = deps.orderRepo;
    this.paymentRepo = deps.paymentRepo;
    this.paymentProvider = deps.paymentProvider;
  }

  /**
   * Creates a payment for an order.
   * This is called when the user proceeds to payment in checkout.
   */
  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Load the order to verify it exists and get its details
      const order = await this.orderRepo.getOrderByNumber(input.orderId, null);
      if (!order) {
        throw new Error(`Order not found: ${input.orderId}`);
      }

      // Get the internal order ID (bigint) for the payment record
      const orderId = await this.orderRepo.getOrderIdByNumber(input.orderId);
      if (!orderId) {
        throw new Error(`Internal order ID not found for: ${input.orderId}`);
      }

      // Verify the order amount matches what we're trying to charge
      // Convert order grandTotal from rupees to paise for comparison
      const orderAmountInPaise = Math.round(order.pricing.grandTotal * 100);
      if (orderAmountInPaise !== input.amount) {
        throw new ConflictError(
          `Amount mismatch: order total is ${order.pricing.grandTotal} INR ` +
          `(=${orderAmountInPaise} paise) but payment amount is ${input.amount} paise`
        );
      }

      // Verify currency matches
      if (input.currency !== 'INR') {
        throw new ConflictError(`Currency mismatch: expected INR, got ${input.currency}`);
      }

      // Create receipt ID if not provided
      const receipt = input.receipt || `receipt_${input.orderId}_${Date.now()}`;

// Create the payment with the provider
        if (!this.paymentProvider) {
          throw new Error('Payment provider not configured');
        }
        const providerResponse = await this.paymentProvider.createOrder(
          input.amount,
          input.currency,
          receipt,
          input.notes
        );

      // Save the payment record
      const paymentRecord = await this.paymentRepo.createPayment(client, {
        orderId,
        providerOrderId: providerResponse.id,
        providerPaymentId: null, // Not yet known
        method: input.method,
        amount: input.amount,
        currency: input.currency,
        status: 'pending',
      });

      // Update order payment status to pending
      await this.orderRepo.updatePaymentStatus(input.orderId, 'pending');

      await client.query('COMMIT');

      return {
        providerOrderId: providerResponse.id,
        providerPaymentId: undefined,
        amount: input.amount,
        currency: input.currency,
        status: 'pending',
        method: input.method,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Verifies a payment signature and updates payment status.
   * This is called after the user completes Razorpay checkout.
   */
  async verifyAndCapturePayment(
    input: PaymentVerificationInput
  ): Promise<PaymentResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Load the order to verify ownership and get the associated payment
      const order = await this.orderRepo.getOrderByNumber(input.orderId, null);
      if (!order) {
        throw new Error(`Order not found: ${input.orderId}`);
      }

      // Get the internal order ID (bigint) for the payment record
      const orderId = await this.orderRepo.getOrderIdByNumber(input.orderId);
      if (!orderId) {
        throw new Error(`Internal order ID not found for: ${input.orderId}`);
      }

      // Get the payment record for this order
      const payment = await this.paymentRepo.getPaymentByOrderId(client, orderId);
      if (!payment) {
        throw new Error(`No payment record found for order: ${input.orderId}`);
      }

      // Verify that the provider order ID matches
      if (payment.provider_order_id !== input.providerOrderId) {
        throw new Error('Provider order ID mismatch');
      }

// Verify the signature with the provider
        if (!this.paymentProvider) {
          throw new Error('Payment provider not configured');
        }
        const isValidSignature = await this.paymentProvider.verifySignature(
          input.providerOrderId,
          input.providerPaymentId,
          input.signature
        );

      if (!isValidSignature) {
        // Update payment status to failed
        await this.paymentRepo.updatePaymentStatusAndFailure(
          client,
          payment.id,
          'failed',
          'invalid_signature',
          'Invalid payment signature'
        );
        await this.orderRepo.updatePaymentStatus(input.orderId, 'failed');
        
        await client.query('COMMIT');
        
        throw new Error('Invalid payment signature');
      }

      // Signature is valid, update payment status
      // For Razorpay Standard Checkout, payment is usually already captured
      // but we'll update to authorized state first
      await this.paymentRepo.updatePaymentAndStatus(
        client,
        payment.id,
        input.providerPaymentId,
        'authorized'
      );
      
      await this.orderRepo.updatePaymentStatus(input.orderId, 'authorized');

// Attempt to capture the payment (if not already captured)
       // For Razorpay, if auto_capture was enabled when creating the order,
       // this might be redundant but safe
       if (this.paymentProvider) {
         try {
           await this.paymentProvider.capturePayment(
             input.providerPaymentId,
             payment.amount
           );
           
           // Update status to captured
           await this.paymentRepo.updatePaymentAndStatus(
             client,
             payment.id,
             input.providerPaymentId,
             'captured'
           );
           await this.orderRepo.updatePaymentStatus(input.orderId, 'captured');
         } catch (captureError) {
           // If capture fails, we still consider the payment authorized
           // The webhook will handle the final status
           console.warn('Payment capture failed, waiting for webhook:', captureError);
         }
       } else {
         console.warn('Payment provider not configured, skipping capture attempt');
       }

      await client.query('COMMIT');

      return {
        providerOrderId: payment.provider_order_id,
        providerPaymentId: input.providerPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: 'captured', // Assuming capture succeeded
        method: payment.method as 'card' | 'upi' | 'cod',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Handles a webhook from the payment provider.
   * This is the authoritative source for payment status updates.
   */
  async handleWebhook(
    provider: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const client = await this.pool.connect();
    const typedPayload = payload as unknown as RazorpayWebhookPayload;
    try {
      await client.query('BEGIN');

      // Process different event types
      switch (eventType) {
        case 'payment.captured':
          await this.handlePaymentCaptured(client, typedPayload);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(client, typedPayload);
          break;
        case 'order.paid':
          await this.handleOrderPaid(client, typedPayload);
          break;
        default:
          // Log unhandled event types but don't fail
          console.log(`Unhandled webhook event type: ${eventType}`);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async handlePaymentCaptured(client: Queryable, payload: RazorpayWebhookPayload): Promise<void> {
    const providerOrderId = String(payload.payload?.payment?.entity?.order_id || payload.payload?.order?.id);
    const providerPaymentId = String(payload.payload?.payment?.entity?.id || payload.payload?.payment?.id);
    
    if (!providerOrderId) {
      throw new Error('Missing provider order ID in webhook payload');
    }

    // Find the payment by provider order ID
    const payment = await this.paymentRepo.getPaymentByProviderOrderId(client, providerOrderId);
    if (!payment) {
      throw new Error(`No payment found for provider order ID: ${providerOrderId}`);
    }

    // Update payment as captured
    await this.paymentRepo.updatePaymentAndStatus(
      client,
      payment.id,
      providerPaymentId,
      'captured'
    );

    // Update order payment status - need to get order number from order_id
    const orderNumber = await this.getOrderNumberByPaymentId(client, payment.id);
    if (orderNumber) {
      await this.orderRepo.updatePaymentStatus(orderNumber, 'captured');
      // Update order status from 'confirmed' to 'paid' after successful payment
      await this.orderRepo.updateOrderStatus(client, orderNumber, 'paid');
    }
  }

  private async handlePaymentFailed(client: Queryable, payload: RazorpayWebhookPayload): Promise<void> {
    const providerOrderId = String(payload.payload?.payment?.entity?.order_id || payload.payload?.order?.id);
    const providerPaymentId = String(payload.payload?.payment?.entity?.id || payload.payload?.payment?.id);
    const errorCode = String(payload.payload?.payment?.error?.code || payload.payload?.error?.code || '');
    const errorDescription = String(payload.payload?.payment?.error?.description || payload.payload?.error?.description || '');
    
    if (!providerOrderId) {
      throw new Error('Missing provider order ID in webhook payload');
    }

    // Find the payment by provider order ID
    const payment = await this.paymentRepo.getPaymentByProviderOrderId(client, providerOrderId);
    if (!payment) {
      throw new Error(`No payment found for provider order ID: ${providerOrderId}`);
    }

    // Update payment as failed
    await this.paymentRepo.updatePaymentStatusAndFailure(
      client,
      payment.id,
      'failed',
      errorCode,
      errorDescription
    );

    // Update order payment status
    const orderNumber = await this.getOrderNumberByPaymentId(client, payment.id);
    if (orderNumber) {
      await this.orderRepo.updatePaymentStatus(orderNumber, 'failed');
    }
  }

  private async handleOrderPaid(client: Queryable, payload: RazorpayWebhookPayload): Promise<void> {
    const providerOrderId = String(payload.payload?.order?.entity?.id || payload.payload?.order?.id);
    
    if (!providerOrderId) {
      throw new Error('Missing provider order ID in webhook payload');
    }

    // Find the payment by provider order ID
    const payment = await this.paymentRepo.getPaymentByProviderOrderId(client, providerOrderId);
    if (!payment) {
      throw new Error(`No payment found for provider order ID: ${providerOrderId}`);
    }

    // Update order payment status to captured (if not already)
    const currentPayment = await this.paymentRepo.getPaymentById(client, payment.id);
    if (currentPayment && currentPayment.status !== 'captured') {
      await this.paymentRepo.updatePaymentAndStatus(
        client,
        payment.id,
        currentPayment.provider_payment_id,
        'captured'
      );
      const orderNumber = await this.getOrderNumberByPaymentId(client, payment.id);
      if (orderNumber) {
        await this.orderRepo.updatePaymentStatus(orderNumber, 'captured');
        // Update order status from 'confirmed' to 'paid' after successful payment
        await this.orderRepo.updateOrderStatus(client, orderNumber, 'paid');
      }
    }
  }

  private async getOrderNumberByPaymentId(client: Queryable, paymentId: bigint): Promise<string | null> {
    const res = await client.query<{ order_number: string }>(
      `SELECT order_number FROM orders WHERE id = (SELECT order_id FROM payments WHERE id = $1)`,
      [paymentId]
    );
    return res.rows[0]?.order_number ?? null;
  }
}