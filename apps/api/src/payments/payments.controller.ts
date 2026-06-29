import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@food-delivery/types';
import type { Response } from 'express';
import { Request as ExpressRequest } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentReadyDto } from './dto/payment-ready.dto';
import { PaymentsService } from './payments.service';

// Renders a minimal page inside the WebView so the mobile app's
// onNavigationStateChange can detect we've landed on this route and close
// the WebView itself — the actual approve/cancel/fail logic already ran
// server-side by the time this HTML is sent. On native this page is never
// actually seen (the app intercepts navigation before it renders); on web,
// where there's no WebView to intercept anything, it auto-redirects back
// into the app's order detail screen after a moment.
function resultPage(message: string, orderId: string) {
  const mobileWebUrl = process.env.MOBILE_WEB_URL ?? 'http://localhost:8081';
  const backUrl = `${mobileWebUrl}/(customer)/order/${orderId}`;
  return `<html><body style="font-family:sans-serif;text-align:center;padding-top:64px">
    <h2>${message}</h2>
    <p><a href="${backUrl}">Back to app</a></p>
    <script>setTimeout(() => { window.location.href = ${JSON.stringify(backUrl)}; }, 1500);</script>
  </body></html>`;
}

@Controller('payments/kakao')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('ready')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  ready(
    @Body() dto: PaymentReadyDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.paymentsService.ready(dto.orderId, req.user.sub);
  }

  // Dev-only bypass — never available in production, regardless of who
  // calls it or what JWT they hold.
  @Post('test-approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  testApprove(
    @Body() dto: PaymentReadyDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    return this.paymentsService.testApprove(dto.orderId, req.user.sub);
  }

  @Get('approve')
  async approve(
    @Query('orderId') orderId: string,
    @Query('pg_token') pgToken: string,
    @Res() res: Response,
  ) {
    const result = await this.paymentsService.approve(orderId, pgToken);
    res.send(
      resultPage(
        result.success ? 'Payment successful' : 'Payment approval failed',
        orderId,
      ),
    );
  }

  @Get('cancel')
  async cancel(@Query('orderId') orderId: string, @Res() res: Response) {
    await this.paymentsService.markCancelled(orderId);
    res.send(resultPage('Payment cancelled', orderId));
  }

  @Get('fail')
  async fail(@Query('orderId') orderId: string, @Res() res: Response) {
    await this.paymentsService.markFailed(orderId);
    res.send(resultPage('Payment failed', orderId));
  }
}
