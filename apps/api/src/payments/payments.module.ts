import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GatewayModule } from '../gateway/gateway.module';
import { PaymentsController } from './payments.controller';
import { PaymentsScheduler } from './payments.scheduler';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule, GatewayModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsScheduler],
  exports: [PaymentsService],
})
export class PaymentsModule {}
