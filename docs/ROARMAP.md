# 🗺️ ROADMAP — Food Delivery Project v1.0

## 📌 Umumiy Maqsad

PRD v1.4 · MVP v1.2 · TDD v1.2 · CLAUDE.md v1.2 asosida loyihani tugatish.

**Stack:** NestJS + Expo/React Native + PostgreSQL (Prisma) + Upstash Redis + Stripe + Kakao OAuth/Maps

---

## 📊 Umumiy Ko'rinish

| Qadam | Mavzu                                                      | Holat  |
| ----- | ---------------------------------------------------------- | ------ |
| 1–7   | Foundation — Monorepo, Database, Auth, Restaurants, Orders | [ ✅ ] |
| 8–14  | Stripe to'lov, Driver tayinlash, Redis cache               | [ ]    |
| 15–21 | WebSocket gateway, Mobile ekranlar, Kakao Maps             | [ ]    |
| 22–28 | Driver ekranlari, Reviews, UI Polish, Deployment           | [ ]    |

---

## 🏗️ FOUNDATION

### Qadam 1 — Monorepo tozalash va qayta qurish

- [ ] `apps/frontend` (Next.js) papkasini o'chirish
- [ ] Expo loyihasini yaratish
- [ ] `pnpm-workspace.yaml` tekshirish (`apps/*`, `packages/*`)
- [ ] `turbo.json` yaratish (`dev`, `build`, `lint` tasklar)
- [ ] `packages/types`, `packages/config` papkalarini yaratish

```bash
rm -rf apps/frontend
cd apps
pnpm create expo mobile -- --template tabs
cd ..
pnpm install
pnpm add turbo -D -w
```

---

### Qadam 2 — Database (PostgreSQL + Prisma)

- [ ] Neon.tech'da Postgres bazasi ochish
- [ ] Prisma o'rnatish va init qilish
- [ ] TDD schema'sini `schema.prisma`ga ko'chirish
- [ ] Migration qilish
- [ ] `PrismaService` + `PrismaModule` yozish (`@Global()`)

```bash
cd apps/api
pnpm add prisma @prisma/client
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
npx prisma studio
```

---

### Qadam 3 — Auth backend (Email/Parol)

- [ ] Auth modulini generatsiya qilish
- [ ] JWT va bcrypt paketlarini o'rnatish
- [ ] `register`/`login` endpointlari
- [ ] `generateTokens()` funksiyasi
- [ ] `JwtStrategy` yaratish

```bash
cd apps/api
nest g module auth
nest g service auth
nest g controller auth
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
pnpm add -D @types/passport-jwt @types/bcrypt
pnpm run start:dev
```

---

### Qadam 4 — Kakao Auth + Guard'lar + Mobile ekranlar

- [ ] `POST /api/auth/kakao` endpoint
- [ ] `JwtAuthGuard`, `RolesGuard` yozish
- [ ] Mobile login/register ekranlari
- [ ] `auth.store.ts` (Zustand + AsyncStorage)

```bash
cd apps/api
pnpm add passport-oauth2
pnpm add -D @types/passport-oauth2
nest g guard auth/guards/jwt-auth
nest g guard auth/guards/roles

cd ../mobile
pnpm add zustand @react-native-async-storage/async-storage
pnpm add @react-native-kakao/core
pnpm start
```

---

### Qadam 5 — Restaurants + Menu moduli

- [ ] Restaurant/Category/MenuItem CRUD
- [ ] Cursor-based pagination
- [ ] Rasm yuklash (UploadThing)
- [ ] Mobile: restoranlar ro'yxati va detail

```bash
cd apps/api
nest g module restaurants
nest g service restaurants
nest g controller restaurants
nest g module menu
nest g service menu
nest g controller menu
pnpm add uploadthing
pnpm add @upstash/redis
```

---

### Qadam 6 — Orders moduli + State Machine

- [ ] Order/OrderItem CRUD
- [ ] `order-state-machine.ts` yozish
- [ ] Mobile: savat va checkout

```bash
cd apps/api
nest g module orders
nest g service orders
nest g controller orders
pnpm add @nestjs/schedule
```

---

### Qadam 7 — Foundation testlari

- [ ] Auth va state machine uchun `.spec.ts`
- [ ] Testlarni ishga tushirish

```bash
cd apps/api
pnpm test
pnpm test:cov
```

---

## 💳 TO'LOV VA DRIVER TAYINLASH

### Qadam 8 — Stripe to'lov moduli

- [ ] Stripe test API key olish
- [ ] Payments moduli yaratish
- [ ] `POST /api/payments/intent` va `/webhook`

```bash
cd apps/api
pnpm add stripe
nest g module payments
nest g service payments
nest g controller payments
stripe listen --forward-to localhost:3000/api/payments/webhook
```

---

### Qadam 9 — Stripe polling fallback (cron)

- [ ] `payments.scheduler.ts` yozish
- [ ] 30 daqiqa expiry logikasi

```bash
cd apps/api
pnpm add @nestjs/schedule
```

---

### Qadam 10 — Driver tayinlash algoritmi

- [ ] Driver moduli yaratish
- [ ] Haversine formula yozish
- [ ] Radius va timeout logikasi

```bash
cd apps/api
nest g module driver
nest g service driver
nest g controller driver
```

---

### Qadam 11 — Redis cache (Upstash)

- [ ] Upstash account ochish
- [ ] Cache-aside pattern yozish (restoran/menyu TTL 5 daqiqa)
- [ ] Driver location cache (`driver:{id}:location`, TTL 300s)

```bash
cd apps/api
pnpm add @upstash/redis
```

---

### Qadam 12 — To'lov va driver testlari

- [ ] Payments va driver service testlari

```bash
cd apps/api
pnpm test
pnpm test:cov
```

---

## 🔌 REAL-TIME VA MOBILE EKRANLAR

### Qadam 13 — Socket.IO Gateway

- [ ] WebSocket paketlarini o'rnatish
- [ ] Orders gateway yaratish
- [ ] 11 ta eventni implementatsiya qilish

```bash
cd apps/api
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
nest g gateway gateway/orders
```

---

### Qadam 14 — Mobile Auth ekranlari

- [ ] Login/Register ekranlari
- [ ] Rol tanlash ekrani
- [ ] `socket.io-client` o'rnatish

```bash
cd apps/mobile
pnpm add socket.io-client
```

---

### Qadam 15 — Customer ekranlari

- [ ] Restoranlar ro'yxati va detail
- [ ] Savat ekrani
- [ ] Stripe Payment Sheet
- [ ] `useOrderSocket.ts` hook

```bash
cd apps/mobile
pnpm add @stripe/stripe-react-native react-native-webview
```

---

### Qadam 16 — Kakao Maps + Live tracking

- [ ] `KakaoMap.tsx` komponenti (WebView bridge)
- [ ] Buyurtma tracking ekrani
- [ ] `driver:location:changed` → `postMessage` → marker update

```bash
cd apps/mobile
pnpm add @react-native-kakao/core
```

---

### Qadam 17 — Owner ekranlari

- [ ] Dashboard (real-time buyurtmalar)
- [ ] Menyu boshqarish (kategoriya + item CRUD)
- [ ] Buyurtma detail (holat yangilash)
- [ ] Analytics ekrani

```bash
cd apps/mobile
pnpm start
```

---

## 🚀 DRIVER, REVIEWS, POLISH, DEPLOY

### Qadam 18 — Driver mobile ekranlari

- [ ] Online/offline toggle ekrani
- [ ] GPS broadcast (`expo-location`)
- [ ] Faol yetkazib berish ekrani
- [ ] Yetkazib berish tarixi

```bash
cd apps/mobile
pnpm add expo-location
```

---

### Qadam 19 — Reviews moduli

- [ ] Reviews CRUD (`POST /api/reviews`)
- [ ] PostgreSQL trigger (averageRating real-time yangilanadi)
- [ ] Rating ekrani (48 soat vaqt oynasi)

```bash
cd apps/api
nest g module reviews
nest g service reviews
nest g controller reviews
npx prisma migrate dev --name add_rating_trigger
```

---

### Qadam 20 — UI Polish

- [ ] Loading states — skeleton/spinner
- [ ] Error states — toast xabarlar
- [ ] Empty states — bo'sh ro'yxatlar
- [ ] HTTP error format tekshiruvi

```bash
cd apps/mobile
pnpm start
```

---

### Qadam 21 — README va demo

- [ ] `README.md` yozish (tavsif, texnologiyalar, screenshots)
- [ ] Setup qadamlar (`pnpm install`, env variables, migration)
- [ ] Demo video (5 daqiqa, end-to-end xatosiz)

---

### Qadam 22 — Deployment

- [ ] API'ni Railway'ga deploy qilish
- [ ] Neon + Upstash production URL'lari sozlash
- [ ] `.env.example` fayl yaratish
- [ ] Expo production build (Android)

```bash
npm install -g @railway/cli
railway login
railway init
railway up

cd apps/mobile
npx eas login
npx eas build --platform android
```

---

## 🎯 Muvaffaqiyat Mezonlari

- [ ] Buyurtma oqimi end-to-end ishlaydi
- [ ] Bekor qilish va refund oqimi ishlaydi
- [ ] Driver masofa asosida avtomatik tayinlanadi
- [ ] Driver lokatsiyasi xaritada < 5 sek kechikish bilan ko'rinadi
- [ ] Stripe to'lov va refund test rejimida ishlaydi
- [ ] WebSocket reconnect va state sync ishlaydi
- [ ] Barcha 3 rol funksiyalari to'liq bajariladi
- [ ] `pnpm dev` bitta buyruq bilan api + mobile ishga tushadi
- [ ] Live URL va README tayyor

---

_ROADMAP v1.0 | 16.06.2026 | PRD v1.4, MVP v1.2, TDD v1.2, CLAUDE.md v1.2 asosida_
