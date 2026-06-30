import { forwardRef, Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { DriverAssignmentService } from './driver-assignment.service';
import { AuthModule } from '../auth/auth.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [AuthModule, forwardRef(() => GatewayModule)],
  controllers: [DriverController],
  providers: [DriverService, DriverAssignmentService],
  exports: [DriverAssignmentService], // OrdersService starts assignment on READY
})
export class DriverModule {}
