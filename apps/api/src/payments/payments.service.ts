import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { kakaoPayConfig } from './kakao-pay.config';

interface KakaoReadyResponse {
  tid: string;
  next_redirect_mobile_url: string;
  next_redirect_pc_url: string;
  next_redirect_app_url: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // partner_user_id/partner_order_id are capped at 100 chars by Kakao Pay;
  // our UUIDs are well within that, so they're passed through as-is.
  async ready(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) {
      throw new ForbiddenException('You do not own this order');
    }
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const existing = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    if (existing?.status === 'APPROVED') {
      throw new BadRequestException('Order is already paid');
    }

    const { cid, adminKey, baseUrl, apiBaseUrl } = kakaoPayConfig();

    const res = await fetch(`${baseUrl}/online/v1/payment/ready`, {
      method: 'POST',
      headers: {
        Authorization: `SECRET_KEY ${adminKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid,
        partner_order_id: order.id,
        partner_user_id: customerId,
        item_name: `Order #${order.id.slice(0, 8)}`,
        quantity: 1,
        // NOTE: order.totalPrice is stored as USD cents elsewhere in the app
        // (see CLAUDE.md's money convention), but Kakao Pay charges in KRW
        // with no subunit. This demo passes the raw integer through as won
        // rather than doing currency conversion — fine for a portfolio
        // sandbox flow, not real money.
        total_amount: order.totalPrice,
        tax_free_amount: 0,
        approval_url: `${apiBaseUrl}/api/payments/kakao/approve?orderId=${order.id}`,
        cancel_url: `${apiBaseUrl}/api/payments/kakao/cancel?orderId=${order.id}`,
        fail_url: `${apiBaseUrl}/api/payments/kakao/fail?orderId=${order.id}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Kakao Pay ready failed (${res.status}): ${body}`);
      throw new BadRequestException('Failed to start Kakao Pay payment');
    }
    const data = (await res.json()) as KakaoReadyResponse;

    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        tid: data.tid,
        status: 'READY',
        amount: order.totalPrice,
      },
      update: { tid: data.tid, status: 'READY', amount: order.totalPrice },
    });

    return {
      redirectUrl: data.next_redirect_mobile_url || data.next_redirect_pc_url,
    };
  }

  async approve(orderId: string, pgToken: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    if (!payment?.tid) throw new NotFoundException('Payment not found');

    const { cid, adminKey, baseUrl } = kakaoPayConfig();

    const res = await fetch(`${baseUrl}/online/v1/payment/approve`, {
      method: 'POST',
      headers: {
        Authorization: `SECRET_KEY ${adminKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid,
        tid: payment.tid,
        partner_order_id: orderId,
        partner_user_id: order.customerId,
        pg_token: pgToken,
      }),
    });

    if (!res.ok) {
      await this.prisma.payment.update({
        where: { orderId },
        data: { status: 'FAILED' },
      });
      return { success: false };
    }

    await this.prisma.payment.update({
      where: { orderId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    return { success: true };
  }

  // Dev-only shortcut: skips the real Kakao Pay redirect entirely and marks
  // the order as paid directly. Lets you exercise the rest of the order
  // flow (owner confirm, cancel/refund) without going through Kakao Pay's
  // hosted page every time. The controller only exposes this outside of
  // production.
  async testApprove(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) {
      throw new ForbiddenException('You do not own this order');
    }

    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        tid: `TEST_${Date.now()}`,
        status: 'APPROVED',
        amount: order.totalPrice,
        approvedAt: new Date(),
      },
      update: { status: 'APPROVED', approvedAt: new Date() },
    });

    return { success: true };
  }

  async markCancelled(orderId: string) {
    await this.prisma.payment
      .update({ where: { orderId }, data: { status: 'CANCELLED' } })
      .catch(() => undefined);
  }

  async markFailed(orderId: string) {
    await this.prisma.payment
      .update({ where: { orderId }, data: { status: 'FAILED' } })
      .catch(() => undefined);
  }

  // Called once an order has already moved to REFUND_PENDING. Issues the
  // Kakao Pay cancel(refund) call and, on success, advances the order to
  // REFUNDED. Left at REFUND_PENDING on failure so the scheduler can retry.
  async refund(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    if (!payment?.tid || payment.status !== 'APPROVED') return;

    const { cid, adminKey, baseUrl } = kakaoPayConfig();

    const res = await fetch(`${baseUrl}/online/v1/payment/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `SECRET_KEY ${adminKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid,
        tid: payment.tid,
        cancel_amount: payment.amount,
        cancel_tax_free_amount: 0,
      }),
    });

    if (!res.ok) {
      throw new BadRequestException('Kakao Pay refund failed');
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED' },
      }),
    ]);
  }
}
