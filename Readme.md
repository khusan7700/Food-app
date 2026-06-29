<div align="center">

# 🍔 Food app Application

### A real-time, three-sided food delivery platform built with NestJS & Expo

_Customer signs up → finds a restaurant → places an order → pays via Stripe → a driver is auto-assigned by distance → order is delivered → customer rates the experience._

NestJS

Expo

React Native

TypeScript

PostgreSQL

Prisma

Redis

Stripe

Socket.io

Turborepo

</div>

---

### ✨ Highlights

- 🔄 **End-to-end real-time order flow** across customer, restaurant owner, and driver apps
- 📍 **Automatic, distance-based driver assignment** — haversine formula, 5 → 10 km radius
- 💳 **Stripe payments** with refunds, idempotency keys, and webhook-polling fallback
- 🗺️ **Live driver tracking** via Kakao Maps + Socket.IO (sub-second updates)
- 🧩 **Type-safe monorepo** — Turborepo + pnpm workspaces + shared types package

---

## 📑 Table of Contents

- Overview
- Tech Stack
- Architecture
- Project Structure
- Order State Machine
- Driver Assignment
- Real-time Events
- Authentication
- API Overview
- Error Handling
- Reviews and Ratings
- Getting Started
- Testing
- MVP Scope
- License

---

## 📱 Overview

| Role                    | What they can do                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 🧑‍🍳 **Customer**         | Browse open restaurants, search, order, pay with Stripe, track delivery live on a map, rate restaurant & driver            |
| 🏪 **Restaurant Owner** | Create/manage restaurant, manage menu & categories, receive orders in real time, update order status, view daily analytics |
| 🚗 **Driver**           | Go online/offline, receive auto-assigned orders, broadcast GPS location, mark orders as picked up / delivered              |

---

## 🧱 Tech Stack

**Backend**

- NestJS (REST + WebSocket Gateway)
- PostgreSQL + Prisma ORM
- Redis (Upstash, serverless) — caching & live location store
- Socket.IO — real-time order & location events
- Stripe — payments, refunds, webhooks
- Kakao OAuth — social login (token verified server-side)
- UploadThing — image uploads

**Mobile**

- Expo (React Native) + Expo Router (file-based routing)
- gluestack-ui v2 + NativeWind (Tailwind for RN)
- Zustand (+ AsyncStorage persistence) — cart & auth state
- Kakao Maps SDK via WebView bridge — restaurant location & live driver tracking
- Stripe React Native — Payment Sheet
- expo-location — GPS broadcasting (driver app)

**Monorepo**

- Turborepo + pnpm workspaces
- Shared packages: `packages/ui` (gluestack components), `packages/types` (shared TS types), `packages/config` (eslint/tsconfig)

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
│   │       ├── payments/
│   │       ├── driver/
│   │       ├── location/
│   │       ├── gateway/      # Socket.IO events
│   │       ├── reviews/
│   │       ├── common/
│   │       └── prisma/
│   └── mobile/                # Expo app
│       └── src/
│           ├── app/
│           │   ├── (auth)/
│           │   ├── (customer)/
│           │   ├── (owner)/
│           │   └── (driver)/
│           ├── components/
│           ├── hooks/
│           ├── stores/
│           └── lib/
└── packages/
    ├── ui/                    # gluestack-ui v2 components
    ├── types/                 # shared TypeScript types
    └── config/                # shared eslint, tsconfig
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

Namespace: `/orders` · Auth: JWT handshake · Location updates are **WebSocket-only** (no REST location endpoints).

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

- **Kakao OAuth** — mobile obtains a Kakao access token via the SDK, sends it to `POST /api/auth/kakao` along with the chosen `role`; the backend verifies it against Kakao's API and issues its own JWT.
- **Email/Password (fallback)** — `POST /api/auth/register` and `POST /api/auth/login`.

Rules: a role is chosen once and cannot be changed; one account = one role.

| Token          | Lifetime | Storage                                                 |
| -------------- | -------- | ------------------------------------------------------- |
| `accessToken`  | 1 hour   | —                                                       |
| `refreshToken` | 30 days  | PostgreSQL, rotated on every refresh, deleted on logout |

---

## 📡 API Overview

| Group         | Base path                                                |
| ------------- | -------------------------------------------------------- |
| Auth          | `/api/auth/*`                                            |
| Restaurants   | `/api/restaurants/*`                                     |
| Menu (nested) | `/api/restaurants/:id/categories`, `/api/menu/items/:id` |
| Orders        | `/api/orders/*`                                          |
| Payments      | `/api/payments/*` (Stripe only)                          |
| Driver        | `/api/driver/*`                                          |
| Reviews       | `/api/reviews`, `/api/restaurants/:id/reviews`           |

All list endpoints use **cursor-based pagination** (`?cursor&limit`, default 20, max 50). All errors follow:

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

| Scenario                | Behavior                                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💳 Payment failure      | Idempotency keys prevent double charges; polling fallback re-checks Stripe at 5/15/60 min if the webhook never arrives; unpaid orders auto-cancel after 30 min |
| 🔌 WebSocket disconnect | Exponential backoff reconnect (1s → 30s, 10 attempts); state is re-synced via REST on reconnect                                                                |
| 📍 GPS signal lost      | Last known coordinate is kept with an `accuracy: "none"` flag; customer sees "driver location temporarily unavailable" after 2 minutes                         |
| 🏪 Restaurant timeout   | Customer notified if order isn't confirmed within 15 min; auto-cancelled with refund after 30 min                                                              |

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

- Node.js 20+
- pnpm 9+
- Expo Go or a development build (iOS/Android)
- Accounts: Neon (PostgreSQL), Upstash (Redis), Stripe (test mode), UploadThing, Kakao Developers

### Installation

```bash
pnpm install
```

### Environment Variables

**`apps/api/.env`**

```
DATABASE_URL=
JWT_SECRET=
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=30d
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
UPLOADTHING_TOKEN=
KAKAO_REST_API_KEY=
PORT=3000
```

**`apps/mobile/.env`**

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
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

### Stripe Webhooks (local)

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

---

## 🧪 Testing

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
- Full order state machine
- Stripe payments & refunds
- Distance-based automatic driver assignment
- Real-time order status & live driver location
- Cursor-based pagination everywhere
- Rating system
- Deployment (Railway + Neon + Upstash)

</td>
<td valign="top" width="50%">

**Not included (yet)**

- Kakao Pay
- Push notifications
- Promo codes / discounts
- Multiple restaurants per owner
- Admin panel
- Web version
- Multi-language support (Korean only for now)
- Dark mode

</td>
</tr>
</table>

---

## 📸 Screenshots

_Add app screenshots or a short demo GIF/video here once available — highly recommended for portfolio presentation._

---

## 📄 License

This project is built for portfolio purposes.

<div align="center">

Built with using NestJS and Expo

</div>
