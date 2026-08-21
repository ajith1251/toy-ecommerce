import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasErrors, validatePayment, validateShipping } from '../lib/validation';
import { placeOrder } from '../services/orderService';
import { PaymentService } from '../services/paymentService';
import {
  cartFingerprint,
  clearCheckoutDraft,
  draftToPayment,
  emptyPayment,
  emptyShipping,
  fingerprintsMatch,
  loadCheckoutDraft,
  saveCheckoutDraft,
  toDraftPayment,
} from '../services/checkoutService';
import type { CartItem, Order } from '../types';
import type {
  CartFingerprint,
  CheckoutStep,
  PaymentErrors,
  PaymentFormData,
  ShippingErrors,
  ShippingFormData,
} from '../types/checkout';
import { calcTotals } from '../utils/orderCalculations';

export type FlowStep = CheckoutStep | 'processing' | 'done';

export interface BootState {
  step: CheckoutStep;
  shipping: ShippingFormData;
  payment: PaymentFormData;
}

/**
 * Restores a persisted safe draft only when the cart still matches the
 * fingerprint captured when the draft was saved. Any other case starts a
 * fresh checkout.
 */
export function bootCheckoutFromDraft(items: CartItem[]): BootState {
  const draft = loadCheckoutDraft();
  if (draft && items.length > 0 && fingerprintsMatch(draft.cart, cartFingerprint(items))) {
    return { step: draft.step, shipping: draft.shipping, payment: draftToPayment(draft.payment) };
  }
  return { step: 'shipping', shipping: emptyShipping(), payment: emptyPayment() };
}

interface UseCheckoutFlowOptions {
  items: CartItem[];
  /** When false, checkout drafts are not persisted (e.g. modal closed). */
  active: boolean;
  /** Current step, controlled by the caller (modal state or URL param). */
  step: FlowStep;
  onStepChange: (step: FlowStep) => void;
  onClearCart: () => void;
  onOrderPlaced: (order: Order) => void;
}

/**
 * Single source of truth for the checkout state machine. Shared by the
 * modal `CheckoutContainer` and the route-driven `CheckoutPage` so the
 * Phase 2 checkout logic is never duplicated.
 */
export function useCheckoutFlow({
  items,
  active,
  step,
  onStepChange,
  onClearCart,
  onOrderPlaced,
}: UseCheckoutFlowOptions) {
  const [boot] = useState<BootState>(() => bootCheckoutFromDraft(items));
  const [shipping, setShipping] = useState<ShippingFormData>(boot.shipping);
  const [payment, setPayment] = useState<PaymentFormData>(boot.payment);
  const [snapshot, setSnapshot] = useState<CartFingerprint>(() => cartFingerprint(items));
  const [shippingErrors, setShippingErrors] = useState<ShippingErrors>({});
  const [paymentErrors, setPaymentErrors] = useState<PaymentErrors>({ card: {} });
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processingRef = useRef(false);

  // Discard abandoned drafts whenever the cart is empty.
  useEffect(() => {
    if (items.length === 0) clearCheckoutDraft();
  }, [items]);

  // Persist a safe draft while checkout is in progress so accidental
  // refreshes don't destroy progress. CVV and full card numbers are never
  // written; a draft whose cart no longer matches is discarded first.
  useEffect(() => {
    if (!active || items.length === 0 || step === 'done' || step === 'processing') return;

    const existing = loadCheckoutDraft();
    const current = cartFingerprint(items);
    if (existing && !fingerprintsMatch(existing.cart, current)) {
      clearCheckoutDraft();
    }
    saveCheckoutDraft({
      version: 1,
      step: step as CheckoutStep,
      shipping,
      payment: toDraftPayment(payment),
      cart: current,
      updatedAt: new Date().toISOString(),
    });
  }, [active, step, shipping, payment, items]);

  const totals = useMemo(() => calcTotals(items), [items]);
  const cartChanged = useMemo(
    () => !fingerprintsMatch(snapshot, cartFingerprint(items)),
    [snapshot, items]
  );
  const cartEmpty = items.length === 0 && step !== 'done' && step !== 'processing';

  const handleShippingChange = (field: keyof ShippingFormData, value: string) => {
    setShipping(prev => ({ ...prev, [field]: value }));
    setShippingErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleMethodChange = (method: PaymentFormData['method']) => {
    setPayment(prev => ({ ...prev, method }));
    setPaymentErrors({ card: {}, upiId: undefined });
  };

  const handleCardChange = (field: keyof PaymentFormData['card'], value: string) => {
    setPayment(prev => ({ ...prev, card: { ...prev.card, [field]: value } }));
    setPaymentErrors(prev => ({ ...prev, card: { ...prev.card, [field]: undefined } }));
  };

  const handleUpiChange = (value: string) => {
    setPayment(prev => ({ ...prev, upiId: value }));
    setPaymentErrors(prev => ({ ...prev, upiId: undefined }));
  };

  const handleContinueShipping = () => {
    const errors = validateShipping(shipping);
    setShippingErrors(errors);
    if (!hasErrors(errors)) {
      // Adopt the cart as it exists when the user leaves the shipping step.
      // An authenticated cart may hydrate from the server after the flow
      // mounts (reload directly onto checkout) — that late arrival is not a
      // user-driven change and must not block the review step.
      setSnapshot(cartFingerprint(items));
      onStepChange('payment');
    }
  };

  const handleContinuePayment = () => {
    const errors = validatePayment(payment);
    setPaymentErrors(errors);
    if (!hasErrors(errors)) onStepChange('review');
  };

  const handleRefreshCart = useCallback(() => {
    setSnapshot(cartFingerprint(items));
  }, [items]);

  // Load Razorpay script dynamically
  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  // Handle Razorpay payment
  const handleRazorpayPayment = useCallback(async (
    orderId: string,
    amountInPaise: number,
    paymentMethod: 'card' | 'upi',
    shipping: ShippingFormData,
    payment: PaymentFormData,
    razorpayOrderId: string,
    razorpayKeyId: string
  ): Promise<{ paymentId: string; signature: string } | null> => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
    }

    return new Promise((resolve, reject) => {
      const options = {
        key_id: razorpayKeyId,
        amount: amountInPaise,
        currency: 'INR',
        name: 'ToyBox',
        description: `Order ${orderId}`,
        order_id: razorpayOrderId,
        handler: function (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
          resolve({
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature
          });
        },
        prefill: {
          name: paymentMethod === 'card' ? payment.card.cardName : shipping.firstName + ' ' + shipping.lastName,
          email: shipping.email,
          contact: shipping.phone,
        },
        notes: {
          address: `${shipping.line1}, ${shipping.line2}, ${shipping.city}, ${shipping.state} - ${shipping.postalCode}`
        },
        theme: {
          color: '#dc2626' // Red-600 to match brand
        },
        modal: {
          ondismiss: function () {
            reject(new Error('Payment cancelled by user'));
          }
        }
      };

const rzp = new window.Razorpay(options);
       rzp.on('payment.failed', function (response: unknown) {
         const errorResponse = response as { error: { code: string; description: string } };
         reject(new Error(errorResponse.error.description || 'Payment failed'));
       });
      rzp.open();
    });
  }, [loadRazorpayScript]);

  const handlePlaceOrder = async () => {
    // Duplicate-submission guard plus a final cart validity check.
    if (processingRef.current) return;
    if (items.length === 0 || cartChanged) return;

    processingRef.current = true;
    setIsProcessing(true);
    setPlaceError(null);
    onStepChange('processing');

    try {
      // First, create the order with pending payment status
      const order = await placeOrder({ items, shipping, payment });
      
      // Handle different payment methods
      if (payment.method === 'cod') {
        // For COD, we're done - no payment processing needed
        clearCheckoutDraft();
        setPlacedOrder(order);
        onClearCart();
        onOrderPlaced(order);
        processingRef.current = false;
        setIsProcessing(false);
        onStepChange('done');
        return;
      }
      
      // For card and upi, process payment via Razorpay
      const amountInPaise = Math.round(totals.grandTotal * 100); // Convert to paise
      
      // Create Razorpay order
      const razorpayOrder = await PaymentService.createPayment(
        order.id,
        amountInPaise,
        payment.method,
        `receipt_${order.id}_${Date.now()}`,
        {
          description: `Payment for order ${order.id}`,
          ...(payment.method === 'card' && {
            name: payment.card.cardName,
            email: shipping.email,
            contact: shipping.phone
          }),
          ...(payment.method === 'upi' && {
            upiId: payment.upiId,
            email: shipping.email
          })
        }
      );
      
      // Open Razorpay Checkout
      const paymentResult = await handleRazorpayPayment(
        order.id,
        amountInPaise,
        payment.method,
        shipping,
        payment,
        razorpayOrder.providerOrderId,
        razorpayOrder.keyId
      );
      
      if (!paymentResult) {
        throw new Error('Payment was cancelled or failed');
      }
      
      // Verify and capture the payment
      await PaymentService.verifyPayment(
        order.id,
        razorpayOrder.providerOrderId,
        paymentResult.paymentId,
        paymentResult.signature
      );
      
      // Payment successful
      clearCheckoutDraft();
      setPlacedOrder(order);
      onClearCart();
      onOrderPlaced(order);
      processingRef.current = false;
      setIsProcessing(false);
      onStepChange('done');
    } catch (err) {
      processingRef.current = false;
      setIsProcessing(false);
      setPlaceError(err instanceof Error ? err.message : 'We could not process your payment. Please try again.');
      onStepChange('review');
    }
  };

  return {
    bootStep: boot.step,
    step,
    shipping,
    payment,
    totals,
    cartChanged,
    cartEmpty,
    placedOrder,
    placeError,
    shippingErrors,
    paymentErrors,
    isProcessing,
    handleShippingChange,
    handleMethodChange,
    handleCardChange,
    handleUpiChange,
    handleContinueShipping,
    handleContinuePayment,
    handleRefreshCart,
    handlePlaceOrder,
  };
}

// Type augmentation for Razorpay
declare global {
  interface Window {
    Razorpay: {
      new (options: {
        key_id: string;
        key_secret?: string;
        [key: string]: unknown;
      }): {
        open: () => void;
        close: () => void;
        on: (event: string, callback: (response: unknown) => void) => void;
      };
    };
  }
}
