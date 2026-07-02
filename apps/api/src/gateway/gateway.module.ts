import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocationModule } from '../location/location.module';
import { DriverModule } from '../driver/driver.module';
import { OrdersGateway } from './orders.gateway';

@Module({
  imports: [AuthModule, LocationModule, forwardRef(() => DriverModule)],
  providers: [OrdersGateway],
  exports: [OrdersGateway],
})
export class GatewayModule {}
