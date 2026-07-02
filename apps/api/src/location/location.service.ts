import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface DriverCoordinates {
  latitude: number;
  longitude: number;
}

const LOCATION_TTL_SECONDS = 300; // CLAUDE.md: GPS cache TTL 5 daqiqa

function isDriverCoordinates(value: unknown): value is DriverCoordinates {
  return (
    typeof value === 'object' &&
    value !== null &&
    'latitude' in value &&
    'longitude' in value &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number'
  );
}

// Ephemeral GPS cache, per CLAUDE.md: key `driver:{id}:location`, TTL 300s.
// No REST surface — only orders.gateway.ts reads/writes this, since location
// updates flow exclusively over the `/orders` WebSocket namespace. Backed by
// a local Redis instance (native protocol via ioredis), not Upstash's cloud.
@Injectable()
export class LocationService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async saveDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ) {
    await this.redis.set(
      `driver:${driverId}:location`,
      JSON.stringify({ latitude, longitude }),
      'EX',
      LOCATION_TTL_SECONDS,
    );
  }

  async getDriverLocation(driverId: string): Promise<DriverCoordinates | null> {
    const data = await this.redis.get(`driver:${driverId}:location`);
    if (!data) return null;

    const parsed: unknown = JSON.parse(data);
    return isDriverCoordinates(parsed) ? parsed : null;
  }
}
