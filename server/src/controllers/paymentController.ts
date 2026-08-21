import type { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../payments/paymentService.js';
import type { PaymentDependencies } from '../payments/paymentService.js';
import type { ServerConfig } from '../config.js';

/**
 * Controller for payment-related endpoints.
 */
export function createPaymentController(deps: PaymentDependencies & { config: Pick<ServerConfig, 'razorpay'> }) {
  const paymentService = new PaymentService(deps);
  const { config } = deps;

  async function createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, amount, currency, method, receipt, notes } = req.body;

      // Validate required fields
      if (!orderId || typeof orderId !== 'string') {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_order_id', 
            message: 'Order ID is required and must be a string' 
          } 
        });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_amount', 
            message: 'Amount is required and must be a positive number' 
          } 
        });
      }

      if (typeof currency !== 'string' || currency.length !== 3) {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_currency', 
            message: 'Currency is required and must be a 3-letter code' 
          } 
        });
      }

      if (!['card', 'upi', 'cod'].includes(method)) {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_method', 
            message: 'Method must be one of: card, upi, cod' 
          } 
        });
      }

      const result = await paymentService.createPayment({
        orderId,
        amount,
        currency,
        method,
        receipt,
        notes,
      });

      // Include the Razorpay key_id for frontend checkout integration
      res.status(201).json({
        ...result,
        keyId: config.razorpay.keyId
      });
    } catch (err) {
      next(err);
    }
  }

  async function verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, providerOrderId, providerPaymentId, signature } = req.body;

      // Validate required fields
      if (!orderId || typeof orderId !== 'string') {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_order_id', 
            message: 'Order ID is required and must be a string' 
          } 
        });
      }

      if (!providerOrderId || typeof providerOrderId !== 'string') {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_provider_order_id', 
            message: 'Provider order ID is required and must be a string' 
          } 
        });
      }

      if (!providerPaymentId || typeof providerPaymentId !== 'string') {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_provider_payment_id', 
            message: 'Provider payment ID is required and must be a string' 
          } 
        });
      }

      if (!signature || typeof signature !== 'string') {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_signature', 
            message: 'Signature is required and must be a string' 
          } 
        });
      }

      const result = await paymentService.verifyAndCapturePayment({
        orderId,
        providerOrderId,
        providerPaymentId,
        signature,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async function getPaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;

      if (!orderId || typeof orderId !== 'string') {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_order_id', 
            message: 'Order ID is required and must be a string' 
          } 
        });
      }

      // Get the order to verify it exists
      const orderRepo = deps.orderRepo;
      const order = await orderRepo.getOrderByNumber(orderId, null);
      if (!order) {
        return res.status(404).json({ 
          error: { 
            code: 'order_not_found', 
            message: 'Order not found' 
          } 
        });
      }

      // Get the internal order ID (bigint) for the payment query
      const internalOrderId = await orderRepo.getOrderIdByNumber(orderId);
      if (!internalOrderId) {
        return res.status(404).json({ 
          error: { 
            code: 'order_not_found', 
            message: 'Order not found' 
          } 
        });
      }

      // Get the payment for this order using the pool (non-transactional read)
      const paymentRepo = deps.paymentRepo;
      const pool = deps.pool;
      const payment = await paymentRepo.getPaymentByOrderId(pool, internalOrderId);
      
      if (!payment) {
        return res.status(404).json({ 
          error: { 
            code: 'payment_not_found', 
            message: 'Payment not found for this order' 
          } 
        });
      }

      res.json({
        orderId: order.id,
        paymentId: payment.id,
        providerOrderId: payment.provider_order_id,
        providerPaymentId: payment.provider_payment_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
        capturedAt: payment.captured_at,
      });
    } catch (err) {
      next(err);
    }
  }

  async function handleWebhook(provider: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    await paymentService.handleWebhook(provider, eventType, payload);
  }

  return {
    createPayment,
    verifyPayment,
    getPaymentStatus,
    handleWebhook,
  };
}

export type PaymentController = ReturnType<typeof createPaymentController>;