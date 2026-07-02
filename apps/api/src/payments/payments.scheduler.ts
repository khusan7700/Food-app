import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

const PAYMENT_TIMEOUT_MS = 30 * 60 * 1000;

@Injectable()
export class PaymentsScheduler {
  private readonly logger = new Logger(PaymentsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // Fallback for Kakao Pay's redirect-based flow having no webhook: if a
  // customer never completes payment (closes the WebView, loses
  // connection, etc.) the order would otherwise sit at PENDING forever.
  @Cron('*/5 * * * *')
  async expireUnpaidOrders() {
    const cutoff = new Date(Date.now() - PAYMENT_TIMEOUT_MS);
    const stale = await this.prisma.payment.findMany({
      where: { status: 'READY', createdAt: { lt: cutoff } },
      include: { order: true },
    });

    for (const payment of stale) {
      if (payment.order.status !== 'PENDING') continue;
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'CANCELLED',
          cancelReason: 'Payment not completed within 30 minutes',
        },
      });
      await this.prisma.payment.update({
        where: { orderId: payment.orderId },
        data: { status: 'FAILED' },
      });
      this.logger.log(`Expired unpaid order ${payment.orderId}`);
    }
  }

  // Retries refunds that failed (Kakao Pay API down, etc.) and got stuck
  // at REFUND_PENDING instead of reaching REFUNDED.
  @Cron('*/5 * * * *')
  async retryStuckRefunds() {
    const stuck = await this.prisma.order.findMany({
      where: { status: 'REFUND_PENDING' },
    });

    for (const order of stuck) {
      try {
        await this.paymentsService.refund(order.id);
      } catch {
        this.logger.warn(`Refund retry still failing for order ${order.id}`);
      }
    }
  }
}
