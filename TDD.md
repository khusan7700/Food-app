# 🛠️ TDD — Texnik Dizayn Hujjati v1.2

## 1. Arxitektura

```
┌─────────────────────────────────────────────┐
│             Mobile (Expo)                   │
│   Customer | Owner | Driver                 │
│   gluestack-ui v2 + NativeWind + Zustand    │
└────────────────┬────────────────────────────┘
                 │ HTTP REST + WebSocket (Socket.IO)
┌────────────────▼────────────────────────────┐
│            NestJS API (:3000)               │
│   Auth | Restaurants | Menu | Orders        │
│   Payments | Driver | Gateway | Reviews     │
└──────┬──────────┬──────────┬────────────────┘
       │          │          │
  ┌────▼──────┐ ┌─▼──────┐ ┌─▼────────┐
  │PostgreSQL │ │Upstash │ │  Stripe  │
  │ (Prisma)  │ │ Redis  │ │ Webhooks │
  └───────────┘ └────────┘ └──────────┘
                                │
                         ┌──────▼──────┐
                         │ Kakao API   │
                         │ OAuth + Maps│
                         └─────────────┘
```

---

## 2. Database Schema (Prisma)

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  CUSTOMER
  RESTAURANT_OWNER
  DRIVER
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  PENDING_DRIVER
  PICKED_UP
  DELIVERED
  CANCELLED
  REFUND_PENDING
  REFUNDED
}

model User {
  id        String   @id @default(uuid())
  email     String?  @unique
  password  String?
  kakaoId   String?  @unique
  name      String
  role      Role
  createdAt DateTime @default(now())

  restaurant     Restaurant?
  orders         Order[]        @relation("CustomerOrders")
  driverOrders   Order[]        @relation("DriverOrders")
  reviews        Review[]       @relation("CustomerReviews")
  driverReviews  Review[]       @relation("DriverReviews")
  driverProfile  Driver?
  refreshTokens  RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model Restaurant {
  id           String   @id @default(uuid())
  ownerId      String   @unique
  name         String
  description  String?
  imageUrl     String?
  address      String
  lat          Float
  lng          Float
  isOpen       Boolean  @default(false)
  rating       Float    @default(0)
  totalReviews Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  owner      User       @relation(fields: [ownerId], references: [id])
  categories Category[]
  menuItems  MenuItem[]
  orders     Order[]
  reviews    Review[]

  @@map("restaurants")
}

model Category {
  id           String @id @default(uuid())
  restaurantId String
  name         String
  order        Int    @default(0)

  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  menuItems  MenuItem[]

  @@map("categories")
}

model MenuItem {
  id           String  @id @default(uuid())
  categoryId   String
  restaurantId String
  name         String
  description  String?
  price        Int
  imageUrl     String?
  isAvailable  Boolean @default(true)

  category   Category   @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  restaurant Restaurant @relation(fields: [restaurantId], references: [id])
  orderItems OrderItem[]

  @@map("menu_items")
}

model Order {
  id                    String      @id @default(uuid())
  customerId            String
  restaurantId          String
  driverId              String?
  status                OrderStatus @default(PENDING)
  totalPrice            Int
  stripePaymentIntentId String?
  cancelReason          String?
  deliveryAddress       String
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  customer   User        @relation("CustomerOrders", fields: [customerId], references: [id])
  restaurant Restaurant  @relation(fields: [restaurantId], references: [id])
  driver     User?       @relation("DriverOrders", fields: [driverId], references: [id])
  items      OrderItem[]
  review     Review?

  @@map("orders")
}

model OrderItem {
  id         String @id @default(uuid())
  orderId    String
  menuItemId String
  quantity   Int
  price      Int

  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])

  @@map("order_items")
}

model Driver {
  id       String  @id @default(uuid())
  userId   String  @unique
  isOnline Boolean @default(false)
  lat      Float?
  lng      Float?

  user User @relation(fields: [userId], references: [id])

  @@map("drivers")
}

model Review {
  id               String   @id @default(uuid())
  orderId          String   @unique
  customerId       String
  restaurantId     String
  driverId         String?
  restaurantRating Int
  driverRating     Int?
  comment          String?
  createdAt        DateTime @default(now())

  order      Order      @relation(fields: [orderId], references: [id])
  customer   User       @relation("CustomerReviews", fields: [customerId], references: [id])
  restaurant Restaurant @relation(fields: [restaurantId], references: [id])
  driver     User?      @relation("DriverReviews", fields: [driverId], references: [id])

  @@map("reviews")
}
```

---

## 3. PrismaService (NestJS)

```tsx
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```tsx
// src/prisma/prisma.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

## 4. NestJS Modullari Tuzilmasi

```
src/
├── prisma/           # PrismaModule, PrismaService
├── auth/             # JWT, Kakao OAuth, refresh token
├── restaurants/      # CRUD, UploadThing, Redis cache
├── menu/             # Category + MenuItem (nested resource)
├── orders/           # State machine, cancel, refund
├── payments/         # Stripe PaymentIntent, webhook
├── driver/           # Status toggle, assignment algorithm
├── gateway/          # Socket.IO — barcha real-time eventlar
├── location/         # Redis driver location
└── reviews/          # Rating, PostgreSQL trigger
```

### AuthModule — RefreshToken implementatsiyasi

```tsx
// auth/auth.service.ts

async generateTokens(user: User) {
  const payload = { sub: user.id, role: user.role };

  const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
  const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await this.prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  return { accessToken, refreshToken, user };
}

async refreshTokens(token: string) {
  const dbToken = await this.prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!dbToken || dbToken.expiresAt < new Date()) {
    throw new UnauthorizedException('Refresh token yaroqsiz');
  }

  // Eski tokenni o'chirish (rotation)
  await this.prisma.refreshToken.delete({ where: { token } });

  return this.generateTokens(dbToken.user);
}

async logout(token: string) {
  await this.prisma.refreshToken.deleteMany({ where: { token } });
}
```

### Kakao OAuth oqimi

```
Mobile                    Backend                    Kakao API
  │  login() → accessToken  │                           │
  │ ──────────────────────► │  GET /v2/user/me ────────►│
  │                         │ ◄──── { id, email, name } │
  │                         │  prisma.user.upsert()     │
  │ ◄── { accessToken,      │  generateTokens()         │
  │       refreshToken }    │                           │
```

```tsx
// auth/auth.service.ts
async loginWithKakao(kakaoAccessToken: string, role: Role) {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${kakaoAccessToken}` },
  });
  const kakaoUser = await res.json();

  const user = await this.prisma.user.upsert({
    where: { kakaoId: String(kakaoUser.id) },
    update: {},
    create: {
      kakaoId: String(kakaoUser.id),
      name: kakaoUser.kakao_account?.profile?.nickname ?? '사용자',
      email: kakaoUser.kakao_account?.email ?? null,
      role,
    },
  });

  const isNewUser = !user.createdAt || (Date.now() - user.createdAt.getTime()) < 5000;
  const tokens = await this.generateTokens(user);
  return { ...tokens, isNewUser };
}
```

---

## 5. State Machine (To'liq)

```tsx
// orders/order-state-machine.ts

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["PENDING_DRIVER"],
  PENDING_DRIVER: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransition(from, to)) {
    throw new UnprocessableEntityException(
      `${from} → ${to} tranzitsiyasi ruxsat etilmagan`,
    );
  }
}
```

```
PENDING → CONFIRMED → PREPARING → READY → PENDING_DRIVER → PICKED_UP → DELIVERED
   |           |            |                    |
   ↓           ↓            ↓                    ↓ (timeout/rad)
CANCELLED  CANCELLED   CANCELLED            CANCELLED
                                                |
                                                ↓
                                       REFUND_PENDING → REFUNDED
```

---

## 6. Driver Tayinlash Algoritmi

```tsx
// driver/driver-assignment.service.ts

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async assignDriver(order: Order, restaurant: Restaurant) {
  const radii = [5, 10];

  for (const radius of radii) {
    const onlineDrivers = await this.prisma.driver.findMany({
      where: { isOnline: true },
      include: { user: true },
    });

    const nearby = onlineDrivers
      .filter(d => d.lat && d.lng)
      .map(d => ({
        driver: d,
        distance: haversineKm(restaurant.lat, restaurant.lng, d.lat!, d.lng!),
      }))
      .filter(d => d.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    if (nearby.length > 0) {
      return this.tryAssignDrivers(order, nearby.map(n => n.driver));
    }
  }

  this.gateway.notifyRestaurant(order.restaurantId, 'driver:assignment:failed', {
    orderId: order.id,
    reason: 'no_drivers_nearby',
  });
}

private async tryAssignDrivers(order: Order, drivers: Driver[], attempt = 0) {
  if (attempt >= 3 || attempt >= drivers.length) {
    this.gateway.notifyRestaurant(order.restaurantId, 'driver:assignment:failed', {
      orderId: order.id,
      reason: 'all_drivers_rejected',
    });
    return;
  }

  const driver = drivers[attempt];

  await this.prisma.order.update({
    where: { id: order.id },
    data: { driverId: driver.userId },
  });

  this.gateway.notifyDriver(driver.userId, 'order:assigned', {
    orderId: order.id,
    driver: { id: driver.userId, name: driver.user.name },
  });

  // 2 daqiqa timeout — qabul qilmasa keyingisiga
  setTimeout(() => {
    this.tryAssignDrivers(order, drivers, attempt + 1);
  }, 2 * 60 * 1000);
}
```

---

## 7. Cursor-based Pagination

```tsx
// common/pagination.ts

export interface PaginationQuery {
  cursor?: string;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export async function paginate<T extends { id: string }>(
  findMany: (args: any) => Promise<T[]>,
  count: () => Promise<number>,
  { cursor, limit = 20 }: PaginationQuery,
): Promise<PaginationResult<T>> {
  const take = Math.min(limit, 50);

  const data = await findMany({
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });

  const hasMore = data.length > take;
  const items = hasMore ? data.slice(0, take) : data;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  const total = await count();

  return { data: items, pagination: { nextCursor, hasMore, total } };
}
```

```tsx
// restaurants/restaurants.service.ts — ishlatish misoli
async findAll(query: RestaurantQuery): Promise<PaginationResult<Restaurant>> {
  const where = {
    ...(query.isOpen !== undefined ? { isOpen: query.isOpen } : {}),
    ...(query.minRating ? { rating: { gte: query.minRating } } : {}),
    ...(query.category ? { categories: { some: { name: query.category } } } : {}),
  };

  return paginate(
    (args) => this.prisma.restaurant.findMany({ ...args, where }),
    () => this.prisma.restaurant.count({ where }),
    query,
  );
}
```

---

## 8. Gateway (Socket.IO) — Barcha Eventlar

```tsx
// gateway/orders.gateway.ts
@WebSocketGateway({ namespace: "/orders", cors: true })
export class OrdersGateway {
  @WebSocketServer() server: Server;

  notifyRestaurant(restaurantId: string, event: string, data: any) {
    this.server.to(`restaurant:${restaurantId}`).emit(event, data);
  }
  notifyCustomer(customerId: string, event: string, data: any) {
    this.server.to(`customer:${customerId}`).emit(event, data);
  }
  notifyDriver(driverId: string, event: string, data: any) {
    this.server.to(`driver:${driverId}`).emit(event, data);
  }
  notifyOrder(orderId: string, event: string, data: any) {
    this.server.to(`order:${orderId}`).emit(event, data);
  }

  @SubscribeMessage("join:order")
  handleJoinOrder(client: Socket, orderId: string) {
    client.join(`order:${orderId}`);
  }

  @SubscribeMessage("driver:location:update")
  async handleDriverLocation(client: Socket, payload: LocationPayload) {
    const userId = client.data.userId;
    if (userId !== payload.driverId) throw new WsException("Unauthorized");

    await this.redis.set(
      `driver:${payload.driverId}:location`,
      JSON.stringify({
        lat: payload.lat,
        lng: payload.lng,
        accuracy: payload.accuracy,
      }),
      { ex: 300 }, // 5 daqiqa TTL
    );

    this.notifyOrder(payload.orderId, "driver:location:changed", {
      driverId: payload.driverId,
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading,
      accuracy: payload.accuracy,
    });
  }

  @SubscribeMessage("driver:status:update")
  async handleDriverStatus(
    client: Socket,
    { isOnline }: { isOnline: boolean },
  ) {
    const userId = client.data.userId;
    await this.prisma.driver.update({
      where: { userId },
      data: { isOnline },
    });
    client.emit("driver:status:confirmed", { isOnline, timestamp: Date.now() });
  }
}
```

**To'liq Socket.IO event jadvali:**

| Event                       | Yo'nalish       | Kimga            |
| --------------------------- | --------------- | ---------------- |
| `order:created`             | Server →        | Restaurant Owner |
| `order:updated`             | Server →        | Customer, Driver |
| `order:assigned`            | Server →        | Driver           |
| `order:payment:failed`      | Server →        | Customer         |
| `order:payment:expired`     | Server →        | Customer         |
| `driver:assignment:failed`  | Server →        | Restaurant Owner |
| `driver:assignment:timeout` | Server →        | Restaurant Owner |
| `driver:location:update`    | Driver → Server | —                |
| `driver:location:changed`   | Server →        | Customer         |
| `driver:status:update`      | Driver → Server | —                |
| `driver:status:confirmed`   | Server →        | Driver           |

---

## 9. To'lov Oqimi (Stripe)

```tsx
// payments/payments.service.ts

async createPaymentIntent(amount: number, orderId: string) {
  return this.stripe.paymentIntents.create({
    amount,
    currency: 'krw',
    metadata: { orderId },
    idempotencyKey: `order-${orderId}`,
  });
}

async handleWebhook(signature: string, payload: Buffer) {
  const event = this.stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.onPaymentSucceeded(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await this.onPaymentFailed(event.data.object);
      break;
    case 'charge.refunded':
      await this.onRefunded(event.data.object);
      break;
  }
}

private async onPaymentSucceeded(intent: Stripe.PaymentIntent) {
  const { orderId } = intent.metadata;
  await this.prisma.order.update({
    where: { id: orderId },
    data: { status: 'CONFIRMED' },
  });
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: true },
  });
  this.gateway.notifyRestaurant(order.restaurantId, 'order:created', {
    orderId, items: order.items, totalAmount: order.totalPrice,
  });
}

private async onPaymentFailed(intent: Stripe.PaymentIntent) {
  const { orderId } = intent.metadata;
  const order = await this.prisma.order.findUnique({ where: { id: orderId } });
  this.gateway.notifyCustomer(order.customerId, 'order:payment:failed', {
    orderId, reason: intent.last_payment_error?.message, retryAllowed: true,
  });
}

private async onRefunded(charge: Stripe.Charge) {
  const intent = await this.stripe.paymentIntents.retrieve(charge.payment_intent as string);
  const { orderId } = intent.metadata;
  await this.prisma.order.update({
    where: { id: orderId },
    data: { status: 'REFUNDED' },
  });
}
```

**Stripe polling fallback:**

```tsx
// payments/payments.scheduler.ts
@Cron('*/5 * * * *')
async pollPendingPayments() {
  const pendingOrders = await this.prisma.order.findMany({
    where: {
      status: 'PENDING',
      stripePaymentIntentId: { not: null },
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });

  for (const order of pendingOrders) {
    const intent = await this.stripe.paymentIntents.retrieve(
      order.stripePaymentIntentId,
    );
    if (intent.status === 'succeeded') {
      await this.onPaymentSucceeded(intent);
    }
  }
}

@Cron('*/30 * * * *')
async expirePendingOrders() {
  const expired = await this.prisma.order.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
    },
  });
  for (const order of expired) {
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelReason: 'payment_expired' },
    });
    this.gateway.notifyCustomer(order.customerId, 'order:payment:expired', {
      orderId: order.id,
    });
  }
}
```

---

## 10. Error Handling Arxitekturasi

### WebSocket Reconnect (client)

```tsx
// hooks/useOrderSocket.ts
export function useOrderSocket(orderId: string) {
  const [status, setStatus] = useState<OrderStatus>();
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const socket = io(`${SERVER_URL}/orders`, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.emit("join:order", orderId);
    socket.on("order:updated", (data) => setStatus(data.status));

    socket.on("reconnect", async () => {
      const res = await api.get(`/orders/${orderId}`);
      setStatus(res.data.status);
    });

    return () => socket.disconnect();
  }, [orderId]);

  return { status };
}
```

### Driver offline detection (backend)

```tsx
// gateway/orders.gateway.ts
handleDisconnect(client: Socket) {
  const userId = client.data.userId;
  if (!userId) return;

  setTimeout(async () => {
    const sockets = await this.server.in(`driver:${userId}`).fetchSockets();
    if (sockets.length === 0) {
      await this.prisma.driver.update({
        where: { userId },
        data: { isOnline: false },
      });
    }
  }, 60_000);
}
```

### Restoran timeout (NestJS Scheduler)

```tsx
// orders/orders.scheduler.ts
@Cron('* * * * *')
async checkRestaurantTimeout() {
  const slow = await this.prisma.order.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
  for (const order of slow) {
    this.gateway.notifyCustomer(order.customerId, 'order:updated', {
      orderId: order.id,
      message: 'Restoran hali tasdiqlamadi',
    });
  }

  const expired = await this.prisma.order.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
    },
  });
  for (const order of expired) {
    await this.ordersService.cancel(order.id, 'restaurant_timeout');
  }
}
```

### GPS accuracy flag

```tsx
interface LocationPayload {
  driverId: string;
  orderId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  accuracy: "high" | "low" | "none";
  timestamp: number;
}

// Driver app
const { coords } = location;
socket.emit("driver:location:update", {
  driverId,
  orderId,
  lat: coords.latitude,
  lng: coords.longitude,
  heading: coords.heading ?? 0,
  speed: coords.speed ?? 0,
  accuracy:
    coords.accuracy < 20 ? "high" : coords.accuracy < 100 ? "low" : "none",
  timestamp: Date.now(),
});
```

### Umumiy HTTP Error filter

```tsx
// common/filters/http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      error: exception.name,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

## 11. Redis Arxitekturasi (Upstash)

```tsx
const CACHE_KEYS = {
  restaurantList: 'restaurants:list',
  restaurant:     (id: string)           => `restaurant:${id}`,
  menu:           (restaurantId: string) => `menu:${restaurantId}`,
  driverLocation: (driverId: string)     => `driver:${driverId}:location`,
};

// Cache-aside pattern
async getRestaurants(query: RestaurantQuery) {
  const cacheKey = CACHE_KEYS.restaurantList;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const data = await this.prisma.restaurant.findMany();
  await this.redis.set(cacheKey, JSON.stringify(data), { ex: 300 }); // 5 daqiqa
  return data;
}

// Yangilanishda invalidation
async updateRestaurant(id: string, dto: UpdateRestaurantDto) {
  const result = await this.prisma.restaurant.update({ where: { id }, data: dto });
  await this.redis.del(CACHE_KEYS.restaurantList);
  await this.redis.del(CACHE_KEYS.restaurant(id));
  return result;
}
```

---

## 12. Mobile Arxitekturasi (Expo Router + gluestack-ui v2 + Zustand)

### Papka Tuzilmasi

```
apps/mobile/
├── global.css
├── tailwind.config.js
├── babel.config.js
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login.tsx
    │   │   └── register.tsx
    │   ├── (customer)/
    │   │   ├── index.tsx
    │   │   ├── restaurant/[id].tsx
    │   │   ├── cart.tsx
    │   │   ├── orders/
    │   │   │   ├── index.tsx
    │   │   │   └── [id].tsx     # Live tracking
    │   │   └── _layout.tsx
    │   ├── (owner)/
    │   │   ├── dashboard.tsx
    │   │   ├── menu.tsx
    │   │   ├── orders/[id].tsx
    │   │   ├── analytics.tsx
    │   │   └── _layout.tsx
    │   ├── (driver)/
    │   │   ├── home.tsx
    │   │   ├── active.tsx
    │   │   ├── history.tsx
    │   │   └── _layout.tsx
    │   └── _layout.tsx
    ├── components/
    ├── hooks/
    │   ├── useOrderSocket.ts
    │   └── useDriverTracking.ts
    ├── stores/
    │   ├── auth.store.ts
    │   ├── cart.store.ts
    │   └── order.store.ts
    └── lib/
        ├── axios.ts
        └── tokens.ts
```

### gluestack-ui v2 + NativeWind sozlash

```tsx
// packages/ui/gluestack.config.ts
import { createConfig } from "@gluestack-ui/themed";

export const config = createConfig({
  aliases: {
    bg: "backgroundColor",
    p: "padding",
    px: "paddingHorizontal",
    py: "paddingVertical",
    rounded: "borderRadius",
  },
});
```

```tsx
// packages/ui/components/button.tsx
import { Button as GButton, ButtonText } from "@gluestack-ui/themed";

interface ButtonProps {
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  onPress?: () => void;
  isDisabled?: boolean;
  children: string;
  className?: string;
}

export function Button({
  variant = "solid",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <GButton action="primary" variant={variant} size={size} {...props}>
      <ButtonText>{children}</ButtonText>
    </GButton>
  );
}
```

```tsx
// packages/ui/index.ts
export { Button } from "./components/button";
export { Input } from "./components/input";
export { Card } from "./components/card";
export { Badge } from "./components/badge";
```

### Zustand Stores

```tsx
// stores/cart.store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  restaurantId: string | null;
  totalPrice: number;
  addItem: (item: CartItem, restaurantId: string) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      restaurantId: null,
      totalPrice: 0,

      addItem: (item, restaurantId) =>
        set((s) => {
          if (s.restaurantId && s.restaurantId !== restaurantId) {
            return {
              items: [{ ...item, quantity: 1 }],
              restaurantId,
              totalPrice: item.price,
            };
          }
          const existing = s.items.find((i) => i.id === item.id);
          const items = existing
            ? s.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
              )
            : [...s.items, { ...item, quantity: 1 }];
          return {
            items,
            restaurantId,
            totalPrice: items.reduce((a, i) => a + i.price * i.quantity, 0),
          };
        }),

      removeItem: (id) =>
        set((s) => {
          const items = s.items.filter((i) => i.id !== id);
          return {
            items,
            totalPrice: items.reduce((a, i) => a + i.price * i.quantity, 0),
          };
        }),

      updateQty: (id, qty) =>
        set((s) => {
          const items =
            qty === 0
              ? s.items.filter((i) => i.id !== id)
              : s.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i));
          return {
            items,
            totalPrice: items.reduce((a, i) => a + i.price * i.quantity, 0),
          };
        }),

      clear: () => set({ items: [], restaurantId: null, totalPrice: 0 }),
    }),
    { name: "cart-storage", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

// stores/auth.store.ts
export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  logout: () => set({ user: null, accessToken: null }),
}));
```

---

## 13. Kakao Maps (WebView + postMessage bridge)

```tsx
// components/KakaoMap.tsx
import { WebView } from "react-native-webview";
import { forwardRef, useImperativeHandle, useRef } from "react";

export interface KakaoMapHandle {
  updateDriverMarker: (lat: number, lng: number) => void;
}

export const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(
  ({ markers, center }, ref) => {
    const webviewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      updateDriverMarker(lat, lng) {
        webviewRef.current?.postMessage(
          JSON.stringify({ type: "DRIVER_MOVE", lat, lng }),
        );
      },
    }));

    const html = `
      <!DOCTYPE html><html><head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.EXPO_PUBLIC_KAKAO_JS_KEY}"></script>
      </head>
      <body style="margin:0">
        <div id="map" style="width:100%;height:100vh"></div>
        <script>
          const map = new kakao.maps.Map(document.getElementById('map'), {
            center: new kakao.maps.LatLng(${center.lat}, ${center.lng}), level: 4
          });
          const driverMarker = new kakao.maps.Marker({
            map, position: new kakao.maps.LatLng(${center.lat}, ${center.lng})
          });
          window.addEventListener('message', (e) => {
            const { type, lat, lng } = JSON.parse(e.data);
            if (type === 'DRIVER_MOVE') {
              driverMarker.setPosition(new kakao.maps.LatLng(lat, lng));
            }
          });
        </script>
      </body></html>
    `;

    return <WebView ref={webviewRef} source={{ html }} style={{ flex: 1 }} />;
  },
);
```

```tsx
// app/(customer)/orders/[id].tsx — live tracking
export default function OrderTracking() {
  const { id } = useLocalSearchParams();
  const mapRef = useRef<KakaoMapHandle>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const socket = io(`${SERVER_URL}/orders`, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionDelayMax: 30000,
    });
    socket.emit("join:order", id);
    socket.on("driver:location:changed", ({ lat, lng }) => {
      mapRef.current?.updateDriverMarker(lat, lng);
    });
    socket.on("reconnect", async () => {
      const res = await api.get(`/orders/${id}`);
      // state sync
    });
    return () => socket.disconnect();
  }, [id]);

  return <KakaoMap ref={mapRef} center={restaurantCoord} markers={[]} />;
}
```

---

## 14. Driver GPS Broadcast

```tsx
// app/(driver)/active.tsx
import * as Location from "expo-location";

useEffect(() => {
  let subscription: Location.LocationSubscription;

  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 10,
      },
      ({ coords }) => {
        const accuracy =
          coords.accuracy < 20
            ? "high"
            : coords.accuracy < 100
              ? "low"
              : "none";

        socket.emit("driver:location:update", {
          driverId: user.id,
          orderId,
          lat: coords.latitude,
          lng: coords.longitude,
          heading: coords.heading ?? 0,
          speed: coords.speed ?? 0,
          accuracy,
          timestamp: Date.now(),
        });
      },
    );
  })();

  return () => subscription?.remove();
}, [orderId]);
```

---

## 15. Xavfsizlik

| Tahdid                  | Himoya                                                 |
| ----------------------- | ------------------------------------------------------ |
| Unauthorized access     | JWT Guard + Roles Guard barcha routelarda              |
| Stripe webhook spoofing | `stripe.webhooks.constructEvent()` imzo tekshiruvi     |
| Password leak           | bcrypt (salt rounds: 12)                               |
| CORS                    | NestJS CORS — faqat ruxsat etilgan originlar           |
| SQL injection           | Prisma — parametrlangan so'rovlar                      |
| Kakao token             | Backend da `/v2/user/me` orqali verify                 |
| Driver location spoof   | JWT dan userId → driverId tekshiruvi                   |
| RefreshToken rotation   | Har refreshda eski token o'chiriladi, yangi yaratiladi |
| Env secrets             | `.env` gitignore, `.env.example` komitlanadi           |

---

## 16. Testing Strategiyasi

| Tur         | Tool                      | Nima test qilinadi                   |
| ----------- | ------------------------- | ------------------------------------ |
| Unit        | Jest + jest-mock-extended | State machine, haversine, pagination |
| Integration | Supertest + test DB       | API endpointlar, auth oqimi          |
| E2E         | Detox (kelajak)           | Mobil oqim                           |

```tsx
// orders/order-state-machine.spec.ts
describe("canTransition", () => {
  it("READY → PENDING_DRIVER ruxsat etilgan", () => {
    expect(canTransition("READY", "PENDING_DRIVER")).toBe(true);
  });
  it("READY → PICKED_UP ruxsat etilmagan", () => {
    expect(canTransition("READY", "PICKED_UP")).toBe(false);
  });
  it("PENDING → CANCELLED ruxsat etilgan", () => {
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
  });
  it("DELIVERED → CANCELLED ruxsat etilmagan", () => {
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
  });
});
```

```bash
pnpm test        # Unit testlar
pnpm test:cov    # Coverage hisoboti
```

---

_TDD v1.2 | 16.06.2026 | Food Delivery Portfolio Project_
