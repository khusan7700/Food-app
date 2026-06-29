import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtPayload, UserRole } from '@food-delivery/types';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

// Namespace /orders, JWT passed via handshake.auth.token (not query/header) per CLAUDE.md.
@WebSocketGateway({ namespace: '/orders', cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string | undefined;
      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify<JwtPayload>(token);

      if (payload.role === UserRole.RESTAURANT_OWNER) {
        const restaurant = await this.prisma.restaurant.findUnique({
          where: { ownerId: payload.sub },
        });
        if (restaurant) await client.join(`restaurant:${restaurant.id}`);
      } else if (payload.role === UserRole.CUSTOMER) {
        await client.join(`customer:${payload.sub}`);
      } else if (payload.role === UserRole.DRIVER) {
        await client.join(`driver:${payload.sub}`);
      }
    } catch {
      client.disconnect();
    }
  }

  emitOrderCreated(restaurantId: string, order: unknown) {
    this.server.to(`restaurant:${restaurantId}`).emit('order:created', order);
  }

  emitOrderUpdated(customerId: string, order: unknown) {
    this.server.to(`customer:${customerId}`).emit('order:updated', order);
  }
}
