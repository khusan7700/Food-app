import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    RestaurantsModule,
    MenuModule,
    PaymentsModule,
    OrdersModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
