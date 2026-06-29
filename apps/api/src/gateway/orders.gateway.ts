import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtPayload, OrderStatus, UserRole } from '@food-delivery/types';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';

interface DriverLocationPayload {
  latitude: number;
  longitude: number;
  accuracy: 'high' | 'low' | 'none';
}

// Namespace /orders, JWT passed via handshake.auth.token (not query/header) per CLAUDE.md.
@WebSocketGateway({ namespace: '/orders', cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string | undefined;
      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      if (payload.role === UserRole.RESTAURANT_OWNER) {
        const restaurant = await this.prisma.restaurant.findUnique({
          where: { ownerId: payload.sub },
        });
        if (restaurant) await client.join(`restaurant:${restaurant.id}`);
      } else if (payload.role === UserRole.CUSTOMER) {
        await client.join(`customer:${payload.sub}`);
        await this.hydrateCustomerLocation(payload.sub, client);
      } else if (payload.role === UserRole.DRIVER) {
        await client.join(`driver:${payload.sub}`);
      }
    } catch {
      client.disconnect();
    }
  }

  // A customer connecting mid-delivery has no live GPS tick yet — push the
  // last cached position from Redis once, immediately, over the socket
  // itself (no REST per CLAUDE.md's location section).
  private async hydrateCustomerLocation(customerId: string, client: Socket) {
    const order = await this.prisma.order.findFirst({
      where: { customerId, status: OrderStatus.PICKED_UP },
    });
    if (!order?.driverId) return;

    const cached = await this.locationService.getDriverLocation(order.driverId);
    if (!cached) return;

    client.emit('driver:location:changed', {
      orderId: order.id,
      latitude: cached.latitude,
      longitude: cached.longitude,
      accuracy: 'low',
    });
  }

  // Driver -> Server GPS ping, sent continuously while online (not just
  // during an active delivery) — driver-assignment.service.ts's haversine
  // search needs an up-to-date Driver.lat/lng to find this driver at all.
  // Persisted to both Postgres (assignment search) and Redis (CLAUDE.md's
  // GPS cache, `driver:{id}:location`, 300s TTL), then relayed live to the
  // customer of whichever order this driver currently has PICKED_UP.
  @SubscribeMessage('driver:location:update')
  async handleDriverLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DriverLocationPayload,
  ) {
    const driverId = client.data.userId as string | undefined;
    if (!driverId || client.data.role !== UserRole.DRIVER) return;

    await Promise.all([
      this.prisma.driver.update({
        where: { userId: driverId },
        data: { lat: data.latitude, lng: data.longitude },
      }),
      this.locationService.saveDriverLocation(
        driverId,
        data.latitude,
        data.longitude,
      ),
    ]);

    const order = await this.prisma.order.findFirst({
      where: { driverId, status: OrderStatus.PICKED_UP },
    });
    if (!order) return;

    this.server
      .to(`customer:${order.customerId}`)
      .emit('driver:location:changed', {
        orderId: order.id,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
      });
  }

  emitOrderCreated(restaurantId: string, order: unknown) {
    this.server.to(`restaurant:${restaurantId}`).emit('order:created', order);
  }

  emitOrderUpdated(customerId: string, order: unknown) {
    this.server.to(`customer:${customerId}`).emit('order:updated', order);
  }

  emitOrderAssigned(driverId: string, order: unknown) {
    this.server.to(`driver:${driverId}`).emit('order:assigned', order);
  }

  emitDriverAssignmentFailed(restaurantId: string, order: unknown) {
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('driver:assignment:failed', order);
  }

  emitDriverAssignmentTimeout(restaurantId: string, order: unknown) {
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('driver:assignment:timeout', order);
  }
}
