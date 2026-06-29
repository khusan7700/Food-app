import { OrderStatus } from '@food-delivery/types';

// READY -> PENDING_DRIVER -> PICKED_UP: driver is never set to PICKED_UP directly.
// CANCELLED -> REFUND_PENDING -> REFUNDED: automatic Stripe refund chain.
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.PENDING_DRIVER],
  PENDING_DRIVER: [OrderStatus.PICKED_UP],
  PICKED_UP: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [OrderStatus.REFUND_PENDING],
  REFUND_PENDING: [OrderStatus.REFUNDED],
  REFUNDED: [],
};

// Subset of TRANSITIONS a restaurant owner is allowed to trigger directly.
// PENDING_DRIVER/PICKED_UP/DELIVERED are driven by driver-assignment.service.ts (not built yet);
// REFUND_PENDING/REFUNDED are driven by the Stripe refund cron (not built yet).
export const OWNER_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function canOwnerTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return OWNER_TRANSITIONS[from]?.includes(to) ?? false;
}
