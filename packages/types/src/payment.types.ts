export const PaymentStatus = {
  READY: 'READY',
  APPROVED: 'APPROVED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface Payment {
  id: string;
  orderId: string;
  tid: string | null;
  status: PaymentStatus;
  amount: number;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
