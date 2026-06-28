# 🚀 MVP — Food Delivery Application v1.2

> 💡 **MVP maqsadi:** Bitta buyurtma oqimi to'liq ishlashi kerak:
> Customer ro'yxatdan o'tadi → restoran topadi → buyurtma beradi → Stripe orqali to'lov qiladi → driver yetkazadi → baho beradi.
> **Shu oqim ishlasa — MVP tayyor.**

---

## Haftalik Reja

### Hafta 1 — Foundation: Infratuzilma va Auth

**Maqsad:** Loyiha ishga tushsin, monorepo va auth to'liq ishlashi.

**Monorepo sozlash:**

- [ ] `pnpm init` + `pnpm-workspace.yaml` (`apps/*`, `packages/*`)
- [ ] `turbo.json` — `dev`, `build`, `lint`, `type-check` tasklar
- [ ] `apps/api` — NestJS loyiha yaratish
- [ ] `apps/mobile` — Expo loyiha yaratish (Expo Router)
- [ ] `packages/types` — `@food-delivery/types` paketi
- [ ] `packages/config` — shared eslint + tsconfig

**Database:**

- [ ] PostgreSQL ulanish (local yoki Neon connection string)
- [ ] Prisma ORM sozlash (`prisma/schema.prisma`, `PrismaService`)
- [ ] `prisma migrate dev --name init` — birinchi migration
- [ ] `prisma generate` — client yaratish
- [ ] Prisma sxema: `User`, `Restaurant`, `Category`, `MenuItem`, `Order`, `OrderItem`, `Review`, `RefreshToken`

**Auth moduli (backend):**

- [ ] Kakao OAuth oqimi: `POST /api/auth/kakao` → `{ kakaoAccessToken, role }` → JWT
- [ ] Email/parol zaxira oqimi: `POST /api/auth/register`, `POST /api/auth/login`
- [ ] `POST /api/auth/refresh` — refreshToken → yangi accessToken
- [ ] `DELETE /api/auth/logout` — refreshToken blacklist
- [ ] `GET /api/auth/me` — joriy user
- [ ] JWT Guard + Roles Guard (`@Roles('CUSTOMER')`)
- [ ] Kakao Developer Console: 앱 생성, 플랫폼 등록, 동의항목 (닉네임, 프로필사진)

**UI Package sozlash (`packages/ui`):**

- [ ] `gluestack-ui v2` o'rnatish: `npx gluestack-ui@latest init`
- [ ] NativeWind + Tailwind config (`apps/mobile/tailwind.config.js`)
- [ ] `gluestack.config.ts` sozlash
- [ ] Asosiy komponentlar: `Button`, `Input`, `Card`, `Badge`, `Text`
- [ ] `@food-delivery/ui` export

**State Management:**

- [ ] `packages/types` ga `OrderStatus`, `UserRole` type lar qo'shish
- [ ] `auth.store.ts` (Zustand + AsyncStorage persist)
- [ ] `cart.store.ts` (Zustand + AsyncStorage persist)

**Taslim:** `POST /api/auth/kakao` va `POST /api/auth/register` ishlaydi, JWT qaytaradi

---

### Hafta 2 — Core Backend: Restoran, Menyu, Buyurtma, To'lov

**Maqsad:** Barcha asosiy REST endpointlar va buyurtma oqimi tayyor bo'lsin.

**Restaurants moduli:**

- [ ] `POST /api/restaurants` — restoran yaratish (Owner only)
- [ ] `GET /api/restaurants` — cursor-based pagination + filtrlar (`?cursor&limit&category&minRating&sortBy&isOpen&lat&lng`)
- [ ] `PATCH /api/restaurants/:id` — tahrirlash
- [ ] `GET /api/restaurants/:id` — detail
- [ ] UploadThing integratsiya — `POST /api/upload` (rasm yuklash)
- [ ] Redis cache: restoran ro'yxati TTL 5 daqiqa, yangilanganda invalidation

**Menu moduli (nested resource):**

- [ ] `GET/POST /api/restaurants/:id/categories`
- [ ] `PATCH/DELETE /api/restaurants/:id/categories/:categoryId`
- [ ] `POST /api/restaurants/:id/categories/:categoryId/items`
- [ ] `PATCH/DELETE /api/menu/items/:id`
- [ ] `GET /api/restaurants/:id/menu` — barcha kategoriya + itemlar birgalikda
- [ ] Redis cache: menyu TTL 5 daqiqa

**Orders moduli:**

- [ ] `POST /api/orders` — buyurtma yaratish (savat → order, holat: `PENDING`)
- [ ] `GET /api/orders` — cursor-based pagination (`?cursor&limit&status`)
- [ ] `GET /api/orders/:id` — detail
- [ ] `PATCH /api/orders/:id/status` — holat yangilash
- [ ] `POST /api/orders/:id/cancel` — `{ reason }` majburiy → `CANCELLED → REFUND_PENDING`
- [ ] `GET /api/orders/:id/refund-status`
- [ ] State machine guard: faqat ruxsat etilgan tranzitsiyalar

**State machine (to'liq):**

```
PENDING → CONFIRMED → PREPARING → READY → PENDING_DRIVER → PICKED_UP → DELIVERED
   |           |            |                     |
   ↓           ↓            ↓                     ↓ (timeout/rad)
CANCELLED  CANCELLED   CANCELLED             CANCELLED → REFUND_PENDING → REFUNDED
```

**Payments moduli (faqat Stripe):**

- [ ] `POST /api/payments/intent` → `{ clientSecret, paymentIntentId }`
- [ ] `POST /api/payments/webhook`:
  - `payment_intent.succeeded` → order `CONFIRMED`
  - `payment_intent.payment_failed` → WebSocket: `order:payment:failed`
  - `charge.refunded` → order `REFUNDED`
- [ ] `idempotency key` — ikki marta to'lov oldini olish
- [ ] Polling fallback: 5, 15, 60 daqiqada Stripe API dan status so'rash

**Driver moduli:**

- [ ] `PATCH /api/driver/status` → `{ isOnline: bool }`
- [ ] `GET /api/driver/orders` — cursor-based pagination
- [ ] `GET /api/driver/:id/last-location` — Redis dan oxirgi joylashuv

**Driver tayinlash algoritmi (`READY → PENDING_DRIVER`):**

- [ ] Barcha `isOnline=true` driverlarni olish
- [ ] Haversine formula: restoran → driver masofasi
- [ ] Eng yaqin driver tanlash (0–5 km radius)
- [ ] 5 km da yo'q bo'lsa → 10 km gacha kengaytirish
- [ ] Tanlangan driverga `order:assigned` event
- [ ] 2 daqiqa timeout → keyingi driverga
- [ ] 3 marta rad etilsa → `driver:assignment:failed`, order `PENDING_DRIVER` da qoladi

**Taslim:** Stripe test to'lov muvaffaqiyatli o'tadi, order `CONFIRMED` bo'ladi, driver tayinlanadi

---

### Hafta 3 — Real-time + Mobile Asosiy Ekranlar

**Maqsad:** WebSocket gateway va customer/owner mobile ekranlar.

**Gateway (Socket.IO):**

- [ ] `/orders` namespace, JWT handshake auth
- [ ] Buyurtma eventlari:
  - `order:created` → Restaurant Owner
  - `order:updated` → Customer, Driver
  - `order:assigned` → Driver
  - `order:payment:failed` → Customer
  - `order:payment:expired` → Customer
- [ ] Driver assignment eventlari:
  - `driver:assignment:failed` → Restaurant Owner
  - `driver:assignment:timeout` → Restaurant Owner
- [ ] Location eventlari:
  - `driver:location:update` (Driver → Server) — `{ driverId, lat, lng, heading, speed, accuracy }`
  - `driver:location:changed` (Server → Customer)
  - `driver:status:update` / `driver:status:confirmed`
- [ ] Location xavfsizlik: driver faqat o'z `driverId` uchun yuborishi mumkin (JWT tekshiruv)
- [ ] Redis: location TTL 5 daqiqa

**WebSocket error handling:**

- [ ] Reconnect: exponential backoff (1s→2s→4s→8s, max 30s, 10 urinish)
- [ ] Reconnect muvaffaqiyatli → `GET /api/orders/:id` REST orqali state sync
- [ ] Driver 60 sek javob yo'q → `isOnline: false` (Redis)
- [ ] Server restart → `order:sync` event

**Restoran javob bermasa:**

- [ ] 15 daqiqada `CONFIRMED` qilinmasa → Customer ga xabar
- [ ] 30 daqiqada → avtomatik `CANCELLED → REFUND_PENDING → REFUNDED`
- [ ] Owner offline bo'lsa → keyingi ulanishda `order:created` qayta yuboriladi

**GPS error handling:**

- [ ] Signal yo'q → oxirgi koordinata + `accuracy: "none"`
- [ ] 30 sek GPS yo'q → "GPS signal zaif" ogohlantirish
- [ ] 2 daqiqa GPS yo'q → Customer: "Haydovchi joylashuvi vaqtincha mavjud emas"

**Mobile — Auth ekranlar:**

- [ ] Kakao Login tugmasi (`@react-native-kakao/core`)
- [ ] Rol tanlash ekrani
- [ ] AsyncStorage token saqlash
- [ ] Role-based redirect (3 xil layout: customer / owner / driver)

**Mobile — Customer ekranlar (6+1 ta):**

- [ ] Restoranlar ro'yxati (cursor pagination, search, filtr)
- [ ] Restoran detail + menyu
- [ ] Savat
- [ ] Stripe Payment Sheet
- [ ] Buyurtma tracking (WebSocket holat + Kakao Map live driver joylashuvi)
  - [ ] Kakao Maps SDK integratsiya (WebView bridge)
  - [ ] WebView ↔ RN bridge: `postMessage` orqali driver koordinata uzatish
  - [ ] "Aloqa uzildi" banner + Pull-to-refresh
- [ ] Buyurtmalar tarixi
- [ ] Baho berish ekrani (DELIVERED dan 48 soat ichida)

**Mobile — Owner ekranlar (4 ta):**

- [ ] Dashboard (kiruvchi buyurtmalar, real-time)
- [ ] Menyu boshqarish (kategoriya + item CRUD)
- [ ] Buyurtma detail (holat yangilash tugmalari)
- [ ] Analytics (kunlik daromad, buyurtma soni)

**Taslim:** Customer buyurtma beradi → Owner real-time ko'radi → Driver tayinlanadi → Customer xaritada ko'radi

---

### Hafta 4 — Driver Ekranlar, Reviews, Polish, Deployment

**Maqsad:** Driver oqimi, baholar, UI polish, deployment.

**Mobile — Driver ekranlar (3 ta):**

- [ ] Uy ekrani (online/offline toggle, aktiv buyurtma badge)
- [ ] Faol yetkazib berish (GPS broadcast, `PICKED_UP` → `DELIVERED`)
- [ ] Yetkazib berish tarixi (cursor pagination)

**Reviews moduli:**

- [ ] `POST /api/reviews` — `{ orderId, restaurantRating, restaurantComment?, driverRating }`
  - Faqat `DELIVERED` buyurtma
  - Bir buyurtma — bir baho (qayta yozib bo'lmaydi)
  - 48 soat vaqt oynasi
- [ ] `GET /api/restaurants/:id/reviews` — cursor pagination
- [ ] `GET /api/restaurants/:id/rating` — `{ averageRating, totalCount, distribution }`
- [ ] PostgreSQL trigger: yangi baho → `averageRating` real-time yangilanadi
- [ ] Minimal 3 ta baho bo'lganda reyting ko'rsatiladi

**UI Polish:**

- [ ] Loading states — barcha ekranlarda skeleton/spinner
- [ ] Error states — toast xabarlar (to'lov xatosi, network xato)
- [ ] Empty states — bo'sh ro'yxatlar uchun UI
- [ ] HTTP error format tekshiruvi: barcha endpointlar `{ statusCode, error, message, timestamp, path }` qaytaradi

**README va Portfolio:**

- [ ] `README.md` — loyiha tavsifi, texnologiyalar, ekran screenshots
- [ ] Setup qadamlar (`pnpm install`, env variables, migration)
- [ ] Demo video (5 daqiqa, end-to-end oqim xatosiz)
- [ ] Live URL (deployment dan keyin)

**Deployment (shart — ixtiyoriy emas):**

- [ ] API: Railway (`apps/api/Dockerfile`)
- [ ] DB: Neon (serverless PostgreSQL, bepul tier)
- [ ] Redis: Upstash (serverless, bepul tier)
- [ ] Environment variables: `.env.example` fayl
- [ ] `pnpm dev` — bitta buyruq bilan api + mobile ishga tushadi

**Taslim:** To'liq end-to-end oqim ishlaydi, live URL mavjud, README tayyor, demo video yuklangan

---

## MVP Doirasi

### Kiradi ✅

- 3 rolda auth (Kakao OAuth + email/parol zaxira)
- Restoran va menyu boshqaruvi
- Buyurtma oqimi (to'liq state machine)
- Stripe to'lov va refund
- Driver masofa asosida avtomatik tayinlash
- Real-time WebSocket (buyurtma holati + driver location)
- Cursor-based pagination barcha list endpointlarda
- Error handling (to'lov, WebSocket, GPS, restoran timeout)
- Baho berish tizimi
- Deployment (Railway + Neon + Upstash)

### Kirmaydi ❌

- Kakao Pay (faqat Stripe)
- Push notifications (Expo Notifications)
- Promo codes / chegirmalar
- Ko'p restoran bir owner
- Admin panel
- Web versiya
- Multi-language (hozircha faqat 한국어)
- Dark mode
- Driver reytingi asosida avtomatik tanlash

---

## Minimal Kerakli Ekranlar

### Customer (7 ta)

| #   | Ekran                                | Hafta |
| --- | ------------------------------------ | ----- |
| 1   | Login / Register (Kakao + email)     | H3    |
| 2   | Restoranlar ro'yxati (search, filtr) | H3    |
| 3   | Restoran detail + menyu              | H3    |
| 4   | Savat                                | H3    |
| 5   | Stripe Payment Sheet                 | H3    |
| 6   | Buyurtma tracking (live xarita)      | H3    |
| 7   | Buyurtmalar tarixi + Baho berish     | H4    |

### Restaurant Owner (4 ta)

| #   | Ekran                                       | Hafta |
| --- | ------------------------------------------- | ----- |
| 1   | Dashboard (kiruvchi buyurtmalar, real-time) | H3    |
| 2   | Menyu boshqarish (kategoriya + item)        | H3    |
| 3   | Buyurtma detail (holat yangilash)           | H3    |
| 4   | Analytics (kunlik daromad)                  | H4    |

### Driver (3 ta)

| #   | Ekran                                       | Hafta |
| --- | ------------------------------------------- | ----- |
| 1   | Uy (online/offline toggle)                  | H4    |
| 2   | Faol yetkazib berish (GPS, holat yangilash) | H4    |
| 3   | Yetkazib berish tarixi                      | H4    |

**Jami: 14 ta ekran**

---

## Muvaffaqiyat Ko'rsatkichlari

| Mezon            | Maqsad                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| Auth             | 3 rolda register/login ishlaydi (Kakao + email)                                |
| Buyurtma oqimi   | Customer → Stripe to'lov → restaurant → driver → delivered (end-to-end)        |
| Driver tayinlash | Masofa asosida (haversine, 5→10 km), PENDING_DRIVER holati                     |
| Real-time        | Holat yangilanishi < 1 sek kechikish                                           |
| GPS              | Driver xaritada < 5 sek kechikish bilan ko'rinadi                              |
| Error handling   | To'lov xatosi, WebSocket reconnect, GPS signal yo'q — barchasi UI da ko'rinadi |
| Deployment       | Live URL mavjud, README tayyor                                                 |
| Demo             | 5 daqiqalik video xatosiz o'tadi                                               |

---

## Texnologiya Ro'yxati (Boshlashdan Oldin)

**Accountlar:**

- [ ] Neon — serverless PostgreSQL (bepul tier, connection string)
- [ ] Upstash — serverless Redis (bepul tier, REST URL + token)
- [ ] Stripe — test account (Publishable key + Secret key + Webhook secret)
- [ ] UploadThing — account + token (rasm yuklash)
- [ ] Kakao Developer Console — 앱 생성, REST API 키, JavaScript 키, 네이티브 앱 키

**Local muhit:**

- [ ] Node.js 20+
- [ ] pnpm 9+
- [ ] Expo Go yoki development build (iOS/Android)

**Asosiy paketlar (`pnpm install` bilan avtomatik):**

- [ ] `gluestack-ui v2` + `nativewind` — UI komponentlar
- [ ] `zustand` — state management
- [ ] `@react-native-kakao/core` — Kakao OAuth
- [ ] `socket.io-client` — WebSocket
- [ ] `@stripe/stripe-react-native` — Stripe Payment Sheet
- [ ] `prisma` + `@prisma/client` — ORM
- [ ] `ioredis` — Redis client
- [ ] `@nestjs/jwt` + `passport` — JWT auth

---

_MVP v1.2 | 16.06.2026 | Food Delivery Portfolio Project_
