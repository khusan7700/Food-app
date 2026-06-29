import { Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';

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
// updates flow exclusively over the `/orders` WebSocket namespace.
@Injectable()
export class LocationService {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async saveDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ) {
    await this.redis.set(
      `driver:${driverId}:location`,
      JSON.stringify({ latitude, longitude }),
      { ex: LOCATION_TTL_SECONDS },
    );
  }

  async getDriverLocation(driverId: string): Promise<DriverCoordinates | null> {
    const data = await this.redis.get<string>(`driver:${driverId}:location`);
    if (!data) return null;

    const parsed: unknown = typeof data === 'string' ? JSON.parse(data) : data;
    return isDriverCoordinates(parsed) ? parsed : null;
  }
}
