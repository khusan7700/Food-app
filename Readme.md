<div align="center">

# 🍔 ORDER-EATS Application

### A real-time, three-sided food delivery platform built with NestJS & Expo

_Customer signs up → finds a restaurant → places an order → pays via Kakao Pay → a driver is auto-assigned by distance → order is delivered → customer rates the experience._

<br/>

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)

[![Kakao Pay](https://img.shields.io/badge/Kakao_Pay-FFCD00?style=for-the-badge&logo=kakaotalk&logoColor=000000)](https://developers.kakao.com)
[![Kakao Maps](https://img.shields.io/badge/Kakao_Maps-FFCD00?style=for-the-badge&logo=kakaotalk&logoColor=000000)](https://developers.kakao.com)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io)

</div>

---

### ✨ Highlights

- 🔄 **End-to-end real-time order flow** across customer, restaurant owner, and driver apps
- 📍 **Automatic, distance-based driver assignment** — haversine formula, 5 → 10 km radius
- 💳 **Kakao Pay payments** with refunds, idempotency keys, and scheduler-based polling fallback
- 🗺️ **Live driver tracking** via Kakao Maps + Socket.IO (sub-second updates)
- 🧩 **Type-safe monorepo** — Turborepo + pnpm workspaces + shared types package

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Order State Machine](#-order-state-machine)
- [Driver Assignment](#-driver-assignment)
- [Real-time Events](#-real-time-events-with-socketio)
- [Authentication](#-authentication)
- [API Overview](#-api-overview)
- [Error Handling](#-error-handling)
- [Reviews and Ratings](#-reviews-and-ratings)
- [Getting Started](#-getting-started)
- [Testing](#-testing)
- [MVP Scope](#-mvp-scope)
- [License](#-license)

---

## 📱 Overview

| Role                    | What they can do                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 🧑‍🍳 **Customer**         | Browse open restaurants, search, order, pay with Kakao Pay, track delivery live on a map, rate restaurant & driver         |
| 🏪 **Restaurant Owner** | Create/manage restaurant, manage menu & categories, receive orders in real time, update order status, view daily analytics |
| 🚗 **Driver**           | Go online/offline, receive auto-assigned orders, broadcast GPS location, mark orders as picked up / delivered              |

---

## 🧱 Tech Stack

### Backend

| Technology                                                                                                                                        | Purpose                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| [![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)                         | REST API + WebSocket Gateway      |
| [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)     | Primary database                  |
| [![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)                      | Type-safe ORM                     |
| [![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)                              | Caching & live location store     |
| [![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io)               | Real-time order & location events |
| [![Kakao Pay](https://img.shields.io/badge/Kakao_Pay-FFCD00?style=flat-square&logo=kakaotalk&logoColor=000000)](https://developers.kakao.com)     | Payments, refunds                 |
| [![Kakao OAuth](https://img.shields.io/badge/Kakao_OAuth-FFCD00?style=flat-square&logo=kakaotalk&logoColor=000000)](https://developers.kakao.com) | Social login (server-side verify) |
| ![Multer](https://img.shields.io/badge/Multer-FF6B35?style=flat-square&logo=node.js&logoColor=white)                                              | Image uploads (local disk)        |

### Mobile

| Technology                                                                                                                                                              | Purpose                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)                                                       | React Native SDK + Expo Router           |
| [![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev)                               | Cross-platform mobile UI                 |
| [![NativeWind](https://img.shields.io/badge/NativeWind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://www.nativewind.dev)                          | Tailwind CSS for React Native            |
| ![gluestack-ui](https://img.shields.io/badge/gluestack--ui_v2-1F51FF?style=flat-square&logoColor=white)                                                                 | UI component library                     |
| [![Zustand](https://img.shields.io/badge/Zustand-443E38?style=flat-square&logo=react&logoColor=white)](https://zustand-demo.pmnd.rs)                                    | Global state (cart, auth)                |
| [![Kakao Maps](https://img.shields.io/badge/Kakao_Maps-FFCD00?style=flat-square&logo=kakaotalk&logoColor=000000)](https://developers.kakao.com)                         | Restaurant & driver tracking via WebView |
| [![expo-location](https://img.shields.io/badge/expo--location-000020?style=flat-square&logo=expo&logoColor=white)](https://docs.expo.dev/versions/latest/sdk/location/) | GPS broadcasting (driver)                |

### Monorepo

| Technology                                                                                                                                        | Purpose                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build)               | Monorepo build system                |
| [![pnpm](https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)                                  | Fast, disk-efficient package manager |
| [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org) | Strict mode across all packages      |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────┐
│             Mobile (Expo)                   │
│   Customer | Owner | Driver                 │
│   gluestack-ui v2 + NativeWind + Zustand    │
└─────────────-───┬───────────────────────────┘
                  │ HTTP REST + WebSocket (Socket.IO)
┌─────────────────▼──────────────────────────────┐
│            NestJS API (:3000)                  │
│   Auth | Restaurants | Menu | Orders           │
│   Payments | Driver | Gateway | Reviews        │
└──────┬─────-─────┬─────────-─┬─────────────────┘
       │           │           │
  ┌────▼──────┐  ┌─▼──────┐  ┌─▼──────────┐
  │PostgreSQL │  │        │  │ Kakao API  │
  │ (Prisma)  │  │ Redis  │  │ Pay + Maps │
  └───────────┘  └────────┘  └────────────┘
```

---

## 📂 Project Structure

```
food-delivery/
├── apps/
│   ├── api/                  # NestJS backend
│   │   └── src/
│   │       ├── auth/
│   │       ├── restaurants/
│   │       ├── menu/
│   │       ├── orders/
│   │       │   └── order-state-machine.ts
│   │       ├── payments/
│   │       │   └── payments.scheduler.ts
│   │       ├── driver/
│   │       │   └── driver-assignment.service.ts
│   │       ├── location/
│   │       ├── gateway/      # Socket.IO — 11 events
│   │       ├── reviews/
│   │       ├── common/
│   │       └── prisma/
│   └── mobile/               # Expo app
│       └── src/
│           ├── app/
│           │   ├── (auth)/
│           │   ├── (customer)/
│           │   ├── (owner)/
│           │   └── (driver)/
│           ├── components/
│           │   └── KakaoMap.tsx  # WebView bridge
│           ├── hooks/
│           ├── stores/           # cart, auth, order
│           └── lib/
└── packages/
    ├── ui/                   # gluestack-ui v2 components
    ├── types/                # @food-delivery/types
    └── config/               # shared eslint, tsconfig
```

---

## 🔄 Order State Machine

```
PENDING → CONFIRMED → PREPARING → READY → PENDING_DRIVER → PICKED_UP → DELIVERED
   │           │            │                    │
   ↓           ↓            ↓                    ↓ (timeout/rejected)
CANCELLED  CANCELLED   CANCELLED            CANCELLED
                                                  │
                                                  ↓
                                         REFUND_PENDING → REFUNDED
```

> Transitions are enforced server-side by a single source of truth (`orders/order-state-machine.ts`) — no status change is accepted outside this table.

---

## 🚗 Driver Assignment

Once an order reaches `READY`, the system automatically searches for a driver:

1. Fetch all `isOnline: true` drivers
2. Calculate distance to the restaurant (haversine formula)
3. Assign the nearest driver within a **0–5 km** radius
4. If none found, expand to **10 km**
5. Driver has **2 minutes** to accept; otherwise the next-closest driver is tried
6. After **3 rejections**, the restaurant owner is notified and the order stays in `PENDING_DRIVER`

---

## ⚡ Real-time Events with Socket.IO

[![Socket.io](https://img.shields.io/badge/Namespace:-/orders-010101?style=flat-square&logo=socketdotio&logoColor=white)]()
[![JWT](https://img.shields.io/badge/Auth:-JWT_Handshake-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)]()

Location updates are **WebSocket-only** — no REST location endpoints.

| Event                       | Direction       | Recipient        |
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

## 🔐 Authentication

Two flows, both available to all three roles:

- **Kakao OAuth** [![Kakao](https://img.shields.io/badge/Kakao-FFCD00?style=flat-square&logo=kakaotalk&logoColor=000000)]() — mobile obtains a Kakao access token via the SDK, sends it to `POST /api/auth/kakao` along with the chosen `role`; the backend verifies it against Kakao's API and issues its own JWT.
- **Email/Password (fallback)** — `POST /api/auth/register` and `POST /api/auth/login`.

Rules: a role is chosen once and cannot be changed; one account = one role.

| Token          | Lifetime | Storage                                                 |
| -------------- | -------- | ------------------------------------------------------- |
| `accessToken`  | 1 hour   | In-memory                                               |
| `refreshToken` | 30 days  | PostgreSQL, rotated on every refresh, deleted on logout |

---

## 📡 API Overview

All endpoints are prefixed with `/api`. All list endpoints use **cursor-based pagination** (`?cursor&limit`, default 20, max 50).

| Group         | Base path                                                |
| ------------- | -------------------------------------------------------- |
| Auth          | `/api/auth/*`                                            |
| Restaurants   | `/api/restaurants/*`                                     |
| Menu (nested) | `/api/restaurants/:id/categories`, `/api/menu/items/:id` |
| Orders        | `/api/orders/*`                                          |
| Payments      | `/api/payments/*` (Kakao Pay)                            |
| Driver        | `/api/driver/*`                                          |
| Reviews       | `/api/reviews`, `/api/restaurants/:id/reviews`           |

All errors follow:

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Order cannot be cancelled after READY status",
  "timestamp": "2026-06-16T10:00:00Z",
  "path": "/api/orders/uuid/cancel"
}
```

---

## 🛡 Error Handling

| Scenario                | Behavior                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 💳 Payment failure      | Scheduler polls every 5 min for `READY` payments older than 30 min; unpaid orders auto-cancel with refund                              |
| 🔌 WebSocket disconnect | Exponential backoff reconnect (1s → 30s, 10 attempts); state is re-synced via REST on reconnect                                        |
| 📍 GPS signal lost      | Last known coordinate is kept with an `accuracy: "none"` flag; customer sees "driver location temporarily unavailable" after 2 minutes |
| 🏪 Restaurant timeout   | Customer notified if order isn't confirmed within 30 min; auto-cancelled with `REFUND_PENDING → REFUNDED` chain                        |
| 🚗 Driver timeout       | Driver marked `isOnline: false` after 60s without WebSocket response; reassignment attempted up to 3 times                             |

---

## ⭐ Reviews and Ratings

- Only `DELIVERED` orders can be reviewed, within **48 hours** of delivery
- One review per order (no edits)
- Restaurant rating: 1–5 stars + optional comment (max 500 chars)
- Driver rating: 1–5 stars only
- Average rating is shown only once a restaurant has **3+ reviews**

---

## 🚦 Getting Started

### Prerequisites

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9+-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)

- Expo Go or a development build (iOS/Android)
- Accounts: Neon (PostgreSQL), Upstash (Redis), Kakao Developers

### Installation

```bash
pnpm install
```

### Environment Variables

**`apps/api/.env`**

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/food_delivery
JWT_SECRET=
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=30d
KAKAOPAY_CID=TC0ONETIME
KAKAOPAY_ADMIN_KEY=
KAKAOPAY_BASE_URL=https://open-api.kakaopay.com
API_BASE_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
KAKAO_REST_API_KEY=
PORT=3000
UPLOAD_DIR=uploads
UPLOAD_BASE_URL=http://localhost:3000/uploads
```

**`apps/mobile/.env`**

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY=
KAKAO_NATIVE_APP_KEY=
```

### Database

```bash
pnpm prisma migrate dev    # create & apply migrations
pnpm prisma generate       # regenerate Prisma Client
pnpm prisma studio         # optional GUI
```

### Run

```bash
pnpm dev          # run api + mobile together (Turborepo)
pnpm dev:api      # backend only
pnpm dev:mobile   # mobile only
```

---

## 🧪 Testing

[![Jest](https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white)](https://jestjs.io)

| Type        | Tool                | Covers                                        |
| ----------- | ------------------- | --------------------------------------------- |
| Unit        | Jest                | State machine, haversine distance, pagination |
| Integration | Supertest + test DB | API endpoints, auth flow                      |
| E2E         | Detox (planned)     | Full mobile flow                              |

```bash
pnpm test        # unit tests
pnpm test:cov    # coverage report
```

---

## ✅ MVP Scope

<table>
<tr>
<td valign="top" width="50%">

**Included**

- 3-role auth (Kakao OAuth + email/password fallback)
- Restaurant & menu management
- Full order state machine (10 states)
- Kakao Pay payments & refunds
- Distance-based automatic driver assignment
- Real-time order status & live driver location
- Cursor-based pagination everywhere
- Rating & review system
- Deployment (Railway + Neon + Upstash)

</td>
<td valign="top" width="50%">

**Not included (yet)**

- Push notifications
- Promo codes / discounts
- Multiple restaurants per owner
- Admin panel
- Web version
- Multi-language support
- Dark mode

</td>
</tr>
</table>

---

## 📸 Demo Videos

Short walkthrough clips for each role, recorded from the running app:

<table>
<tr>
<td align="center" valign="top">

🧑‍🍳 **Customer**

<video src="publik/고객님.MOV" controls autoplay muted loop playsinline width="260"</video>

</td>
<td align="center" valign="top">

🏪 **Restaurant Owner**

<video src="publik/식당%20사장님.MOV" controls autoplay muted loop playsinline width="260"</video>

</td>
<td align="center" valign="top">

🚗 **Driver**

<video src="publik/라이더님.MOV" controls autoplay muted loop playsinline width="260"</video>

</td>
</tr>
</table>

---

## 📄 License

This project is built for portfolio purposes.

<div align="center">

Built with ❤️ using

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)
[![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>
