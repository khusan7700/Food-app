export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  PENDING_DRIVER: 'PENDING_DRIVER',
  PICKED_UP: 'PICKED_UP',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  restaurantId: string;
  restaurantName: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  driverId: string | null;
  status: OrderStatus;
  totalPrice: number;
  stripePaymentIntentId: string | null;
  cancelReason: string | null;
  deliveryAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  createdAt: Date;
}
