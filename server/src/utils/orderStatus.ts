import type { OrderStatus } from '../types.js';

/** Defines valid order status transitions. */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['paid', 'cancelled'],
  'paid': ['shipped', 'cancelled'],
  'shipped': ['delivered'],
  'delivered': [], // Final state
  'cancelled': []  // Final state
};

/**
 * Validates if a transition from one order status to another is allowed.
 * 
 * @param currentStatus - The current status of the order
 * @param targetStatus - The desired new status
 * @returns true if the transition is valid, false otherwise
 */
export function isValidOrderTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  // Allow same-status transitions (no-op)
  if (currentStatus === targetStatus) {
    return true;
  }
  
  const validNextStatuses = VALID_TRANSITIONS[currentStatus];
  return validNextStatuses.includes(targetStatus);
}

/**
 * Gets all valid next statuses for a given order status.
 * 
 * @param currentStatus - The current status of the order
 * @returns Array of valid next statuses
 */
export function getValidNextOrderStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return [...VALID_TRANSITIONS[currentStatus]];
}

/**
 * Checks if a status is a final state (no further transitions allowed).
 * 
 * @param status - The order status to check
 * @returns true if the status is final, false otherwise
 */
export function isFinalOrderStatus(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

/**
 * Gets the opposite/cancelled status for an order if applicable.
 * 
 * @param status - The current order status
 * @returns the cancelled status if it's a valid transition, null otherwise
 */
export function getCancelledStatusFor(status: OrderStatus): OrderStatus | null {
  // All non-final states can transition to cancelled except cancelled itself
  if (status !== 'cancelled' && !isFinalOrderStatus(status)) {
    return 'cancelled';
  }
  return null;
}