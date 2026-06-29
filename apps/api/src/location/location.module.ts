import { Module } from '@nestjs/common';
import { LocationService } from './location.service';

// No controller — per CLAUDE.md, location updates flow exclusively over
// WebSocket (gateway/orders.gateway.ts), there are no REST /location/* routes.
@Module({
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
