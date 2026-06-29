# 🤖 CLAUDE.md — Food-app Project v1.2

## Project Overview

Bu loyiha NestJS + React Native (Expo) asosida qurilgan full-stack food delivery ilovasi. Portfolio uchun mo'ljallangan — real foydalanuvchilar, real integratsiyalar.

**Asosiy oqim:** Customer ro'yxatdan o'tadi → restoran topadi → buyurtma beradi → Kakao Pay orqali to'lov qiladi → driver masofa asosida tayinlanadi → yetkazadi → baho beradi.

---

## Tech Stack

| Paket                                       | Versiya    | Maqsad                               |
| ------------------------------------------- | ---------- | ------------------------------------ |
| `@nestjs/common`                            | `11.1.27`  | NestJS yadro                         |
| `@nestjs/core`                              | `11.1.27`  | NestJS yadro                         |
| `@nestjs/platform-express`                  | `11.1.27`  | HTTP adapter                         |
| `@nestjs/websockets`                        | `11.1.27`  | Socket.IO integratsiya               |
| `@nestjs/platform-socket.io`                | `11.1.27`  | Socket.IO adapter                    |
| `@nestjs/passport`                          | `11.0.5`   | Auth (Kakao OAuth)                   |
| `@nestjs/jwt`                               | `11.0.2`   | JWT tokenlar                         |
| `@nestjs/schedule`                          | `^4.1.2`   | Cron jobs (to'lov muddati, refund)   |
| `rxjs`                                      | `7.8.2`    | Reactive streams                     |
| `reflect-metadata`                          | `0.2.2`    | Decorator support                    |
| `passport`                                  | `0.7.0`    | Auth middleware                      |
| `passport-jwt`                              | `4.0.1`    | JWT strategy                         |
| `passport-oauth2`                           | `1.8.0`    | Kakao OAuth 2.0                      |
| `@prisma/client`                            | `7.8.0`    | PostgreSQL ORM client                |
| `@upstash/redis`                            | `1.38.0`   | Redis / GPS cache                    |
| `socket.io`                                 | `4.8.3`    | Real-time (server)                   |
| `socket.io-client`                          | `4.8.3`    | Real-time (client)                   |
| `multer`                                    | `2.0.2`    | Fayl yuklash (local disk storage)    |
| `zustand`                                   | `5.0.14`   | State management                     |
| `react`                                     | `19.2.7`   | UI                                   |
| `react-native`                              | `0.76.9`   | Mobile                               |
| `expo`                                      | `56.0.12`  | Expo SDK                             |
| `expo-router`                               | `56.2.11`  | File-based routing                   |
| `expo-linking`                              | `56.0.14`  | Deep linking                         |
| `expo-constants`                            | `56.0.18`  | App constants                        |
| `expo-location`                             | `^18.0.0`  | GPS broadcast (driver)               |
| `expo-image-picker`                         | `~56.0.18` | Rasm tanlash (Multer'ga yuklash)     |
| `@expo/metro-runtime`                       | `56.0.15`  | Metro bundler                        |
| `react-native-screens`                      | `4.25.2`   | Native screens                       |
| `react-native-reanimated`                   | `4.4.1`    | Animatsiyalar                        |
| `react-native-gesture-handler`              | `3.0.1`    | Gesture                              |
| `react-native-safe-area-context`            | `5.8.0`    | Safe area                            |
| `react-native-webview`                      | `13.16.1`  | Kakao Maps va Kakao Pay WebView bridge |
| `nativewind`                                | `4.2.5`    | Tailwind for RN                      |
| `@gluestack-ui/themed`                      | `^1.1.0`   | UI komponentlar                      |
| `@gluestack-style/react`                    | `^1.0.0`   | gluestack-ui style engine            |
| `@react-native-kakao/core`                  | `2.4.5`    | Kakao OAuth + Maps                   |
| `@react-native-async-storage/async-storage` | `^2.1.0`   | Zustand persist storage              |

> ⚠️ **`@rn-primitives/*` va `react-server-dom-webpack` ishlatilmaydi.** Birinchisi `gluestack-ui v2` ga almashtirilgan, ikkinchisi React Server Components uchun va bu loyihaga aloqasi yo'q — qo'shilmasin.

### `devDependencies`

| Paket                              | Versiya    | Maqsad                  |
| ---------------------------------- | ---------- | ----------------------- |
| `typescript`                       | `5.9.3` ⚠️ | TypeScript (6.x emas!)  |
| `@nestjs/cli`                      | `11.0.23`  | NestJS CLI              |
| `@nestjs/testing`                  | `11.1.27`  | Test moduli             |
| `prisma`                           | `7.8.0`    | Prisma CLI / migrations |
| `ts-node`                          | `10.9.2`   | TS runtime              |
| `@types/node`                      | `20.19.43` | Node turlari            |
| `@types/react`                     | `19.2.17`  | React turlari           |
| `@types/passport`                  | `1.0.17`   | Passport turlari        |
| `@types/passport-jwt`              | `4.0.1`    | JWT turlari             |
| `@types/passport-oauth2`           | `1.8.0`    | OAuth2 turlari          |
| `@types/multer`                    | `2.1.0`    | Multer turlari          |
| `jest`                             | `29.7.0`   | Test framework          |
| `@types/jest`                      | `29.5.14`  | Jest turlari            |
| `ts-jest`                          | `29.4.11`  | TS + Jest               |
| `eslint`                           | `9.39.4`   | Linter                  |
| `@typescript-eslint/parser`        | `8.61.0`   | TS ESLint parser        |
| `@typescript-eslint/eslint-plugin` | `8.61.0`   | TS ESLint rules         |
| `tailwindcss`                      | `4.3.1`    | Tailwind CSS            |
| `prettier`                         | `3.8.4`    | Code formatter          |

---

## quidagi filelarni ko'rish taqiqlanadi
.env
.env.local

## Rollar

- **Customer** — restoran ko'rish, buyurtma berish, Kakao Pay to'lov, live tracking, baho berish
- **Restaurant Owner** — menyu boshqarish, buyurtmalarni qabul qilish, analytics
- **Driver** — online/offline toggle, GPS broadcasting, yetkazib berish

---

## Umumiy Qoidalar

### code my rules

- ko'd yozishdan oldin qaysi fileda qanday kod yoziladi oldindan ko'rsat agar "ok" desam kod yozishni boshla.
- kod yozilgandan kegin review qilib qayta tekshirish kodda xatolik yoki konflikt bo’lsa o’rnida hal qilish kerak.
- agar kod noto'gri bo'sa menga yoqmasa "yoq" yoki "no" desam kodni bekor qil.

### Kod Uslubi

- Barcha fayllar TypeScript (strict mode)
- `any` ishlatma — to'liq tiplar yoz
- Funksiya uzunligi maks 50 qator; kattaroq bo'lsa ajrat
- Har bir modul o'z papkasida: `module.ts`, `service.ts`, `controller.ts`, `dto/`

### Nomlash Konvensiyasi

- Fayllar: `kebab-case.ts`
- Klasslar: `PascalCase`
- O'zgaruvchilar/funksiyalar: `camelCase`
- DB kolonlar: `snake_case` (`@@map` orqali)
- Konstantalar: `UPPER_SNAKE_CASE`
- `OrderStatus` enum qiymatlari: `UPPER_SNAKE_CASE` (`PENDING_DRIVER`, `REFUND_PENDING`)

### API

- Barcha routelar `/api` prefiksi bilan
- List endpointlar: **cursor-based pagination** (`?cursor&limit`, default 20, max 50) — offset hech qachon ishlatilmaydi
- Xatolar formati: `{ statusCode, error, message, timestamp, path }` (`HttpExceptionFilter` orqali)
- DTO validatsiya: `class-validator` + `class-transformer`

### Database

- Schema `prisma/schema.prisma` faylida
- `OrderStatus` enum — 10 ta holat: `PENDING, CONFIRMED, PREPARING, READY, PENDING_DRIVER, PICKED_UP, DELIVERED, CANCELLED, REFUND_PENDING, REFUNDED`
- O'zgarishdan keyin `pnpm prisma migrate dev` ishlatiladi
- `PrismaService` — global singleton, har bir modulga inject qilinadi, hech qachon `new PrismaClient()` yozilmaydi

### Order State Machine

- Tranzitsiyalar faqat `orders/order-state-machine.ts` dagi `TRANSITIONS` jadvali orqali tekshiriladi
- **`READY → PENDING_DRIVER`** — driver bevosita `PICKED_UP` qilinmaydi, avval `PENDING_DRIVER` orqali o'tadi
- `PENDING`, `CONFIRMED`, `PREPARING` holatlaridan `CANCELLED` ga o'tish mumkin
- `CANCELLED → REFUND_PENDING → REFUNDED` — avtomatik Kakao Pay refund zanjiri (`/online/v1/payment/cancel`)

### Driver Tayinlash

- Algoritm: haversine formula, 0–5 km radius → topilmasa 10 km gacha kengaytirish
- 2 daqiqa timeout — driver javob bermasa keyingi eng yaqin driverga o'tadi
- Max 3 urinish — keyin `driver:assignment:failed` event, order `PENDING_DRIVER` da qoladi
- Implementatsiya: `driver/driver-assignment.service.ts`

### Styling (NativeWind + Tailwind)

- Barcha stillar Tailwind klasslari bilan — `className="flex-1 bg-background p-4"`
- Inline `style={{}}` faqat dinamik qiymatlar uchun (masalan, animatsiya transform)
- Ranglar `tailwind.config.js` dagi `theme.extend.colors` dan — hardcoded hex yozma
- Dark mode hozircha MVP doirasiga kirmaydi (keyingi versiya uchun)

### UI Komponentlar (gluestack-ui v2)

- Barcha asosiy komponentlar `@food-delivery/ui` packagedan import qilinadi
- `packages/ui` ichida komponentlar `@gluestack-ui/themed` ustiga quriladi
- Yangi komponent kerak bo'lsa — avval `packages/ui/components/` ga qo'sh, keyin import qil
- `@gluestack-ui/themed` ni to'g'ridan-to'g'ri ekranlarda import qilma — `@food-delivery/ui` orqali ishlatiladi
- Komponent nomlari: `Button`, `Input`, `Card`, `Badge`
- O'rnatish: `npx gluestack-ui@latest init` (`packages/ui` papkasida)

### State Management (Zustand)

- Barcha global state `apps/mobile/src/stores/` papkasida
- Har bir store alohida fayl: `cart.store.ts`, `auth.store.ts`, `order.store.ts`
- Persist: `zustand/middleware` + `AsyncStorage` (cart va auth uchun)
- Server state uchun Zustand emas — kelajakda `@tanstack/react-query` ko'rib chiqiladi

**Cart store — to'liq implementatsiya (referens, qisqartirilgan yozma yo'q):**

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
```

> ⚠️ Yangi store yozilganda yuqoridagi naqshga amal qilinadi: `totalPrice` har doim `items` bilan birga yangilanadi, qisqartirilgan / yarim implementatsiya yozilmaydi.

### Real-time (Socket.IO)

- Namespace: `/orders`
- Auth: JWT token handshake orqali
- Location yangilash **faqat WebSocket orqali** — REST `/api/location/*` endpointlari yo'q

**To'liq event ro'yxati (11 ta — barchasi majburiy):**

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

> ⚠️ `driver:location` degan yagona event **ishlatilmaydi** — bu eski nom. To'g'risi ikkiga bo'lingan: `driver:location:update` (driver yuboradi) va `driver:location:changed` (server customer ga broadcast qiladi).

### Xavfsizlik

- **JWT** — `accessToken` 1 soat, `refreshToken` 30 kun (PostgreSQL `RefreshToken` jadvalida saqlanadi, logout da o'chiriladi, har refresh da rotation)
- **Kakao OAuth** — `kakaoAccessToken` backend `/api/auth/kakao` ga yuboriladi, backend Kakao API (`/v2/user/me`) dan user info oladi, o'z JWT chiqaradi
- Kakao `REST_API_KEY` faqat backendda, `JAVASCRIPT_KEY` faqat mobileda (WebView uchun)
- Role guards (`JwtAuthGuard` + `RolesGuard`) barcha protected routelarda majburiy
- Kakao Pay `KAKAOPAY_ADMIN_KEY` faqat backendda, `Authorization: SECRET_KEY {key}` header orqali yuboriladi
- Driver location: JWT dan `userId` → faqat o'z `driverId` uchun yuborish huquqi tekshiriladi
- `.env` fayllar hech qachon commitga kirmasin

### Kakao Map (Mobile)

- WebView + Kakao Maps JS SDK (`react-native-webview`) — native module emas, Expo Go da ham ishlaydi
- `EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY` orqali kalit uzatiladi
- Driver marker yangilanishi: `driver:location:changed` Socket event → `postMessage` → WebView marker update (map qayta render qilinmaydi)

### Kakao Pay (To'lov)

- Webhook tushunchasi yo'q — redirect-based oqim: `POST /online/v1/payment/ready` → mobil WebView Kakao'ning hosted to'lov sahifasini ochadi → foydalanuvchi to'laydi → Kakao bizning `approval_url`/`cancel_url`/`fail_url`ga qaytaradi (`pg_token` bilan) → backend `POST /online/v1/payment/approve` chaqirib yakunlaydi
- `Payment` modeli `Order`ga 1:1 bog'langan (`tid`, `status: READY|APPROVED|FAILED|CANCELLED`, `amount`)
- `OrderStatus` enumga yangi qiymat **qo'shilmaydi** — to'lov holati alohida `Payment.status` orqali kuzatiladi
- `PENDING → CONFIRMED` o'tishi faqat `Payment.status === APPROVED` bo'lsa ruxsat etiladi (`orders.service.ts`)
- Test/sandbox uchun Kakao'ning rasmiy `cid: TC0ONETIME` ishlatiladi (`KAKAOPAY_CID` orqali sozlanadi)
- ⚠️ Demo uchun soddalashtirish: `total_amount` Kakao'ga `order.totalPrice`dan (USD sent) to'g'ridan-to'g'ri uzatiladi, valyuta konvertatsiyasi qilinmaydi (KRW emas, real pul emas) — production uchun bu joy almashtirilishi kerak

### GPS / Redis

- Driver location: Redis key `driver:{id}:location`, **TTL 5 daqiqa (300 sek)**
- Restoran/menyu cache: TTL 5 daqiqa, cache-aside pattern, yangilanishda invalidate
- GPS signal sifati: `accuracy: "high" | "low" | "none"` har bir location payloadda majburiy

### Error Handling

- WebSocket reconnect: exponential backoff (1s→2s→4s→8s, max 30s, 10 urinish), reconnect dan keyin REST orqali state sync
- Kakao Pay webhook yo'q — `payments.scheduler.ts` har 5 daqiqada `READY` holatda 30 daqiqadan ortiq qolgan to'lovlarni tekshiradi
- 30 daqiqada to'lov bo'lmasa: order avtomatik `CANCELLED`
- Restoran 30 daqiqada `CONFIRMED` qilmasa: avtomatik `CANCELLED → REFUND_PENDING → REFUNDED`
- Driver 60 sek WebSocket javob bermasa: `isOnline: false`

---

## Loyiha Tuzilmasi

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
│   │       ├── payments/     # Kakao Pay (ready/approve/cancel/fail)
│   │       │   └── payments.scheduler.ts   # cron: to'lov muddati, refund retry
│   │       ├── driver/
│   │       │   └── driver-assignment.service.ts  # haversine algoritm
│   │       ├── location/
│   │       ├── gateway/      # Socket.IO — 11 ta event
│   │       ├── reviews/
│   │       ├── common/
│   │       │   ├── pagination.ts
│   │       │   └── filters/http-exception.filter.ts
│   │       ├── uploads/      # Multer — local disk storage
│   │       └── prisma/
│   └── mobile/                # Expo app (NativeWind + Zustand + gluestack-ui)
│       ├── global.css
│       ├── tailwind.config.js
│       └── src/
│           ├── app/
│           │   ├── (auth)/
│           │   ├── (customer)/
│           │   ├── (owner)/
│           │   └── (driver)/
│           ├── components/
│           │   └── KakaoMap.tsx   # WebView bridge
│           ├── hooks/         # useOrderSocket, useDriverTracking
│           ├── stores/        # cart.store.ts, auth.store.ts, order.store.ts
│           └── lib/           # axios, token storage
└── packages/
    ├── ui/                    # gluestack-ui v2 komponentlar
    │   ├── components/
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── card.tsx
    │   │   └── badge.tsx
    │   ├── gluestack.config.ts
    │   └── package.json       # @food-delivery/ui
    ├── types/                 # @food-delivery/types (OrderStatus, UserRole)
    └── config/                # shared eslint, tsconfig
```

---

## Muhit O'zgaruvchilari

### API (`apps/api/.env`)

```
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

### Mobile (`apps/mobile/.env`)

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY=
KAKAO_NATIVE_APP_KEY=
```

---

## Skriptlar

```bash
# Root
pnpm dev          # Hammasi birga (turbo)
pnpm dev:api      # Faqat NestJS
pnpm dev:mobile   # Faqat Expo

# DB
pnpm prisma migrate dev    # Migration yaratish va qo'llash
pnpm prisma migrate deploy # Production migration
pnpm prisma studio         # Prisma Studio (GUI)
pnpm prisma generate       # Prisma Client regenerate

# gluestack-ui (packages/ui ichida)
npx gluestack-ui@latest init
```

---

## Claude-ga Ko'rsatmalar

1. **Avval schema yoz** — service yozishdan oldin `prisma/schema.prisma` da model aniqla (10 ta `OrderStatus` qiymati bilan), keyin `migrate dev`
2. **DTO majburiy** — controller methodlarda `@Body() dto: CreateXxxDto` ishlatiladi
3. **Guard qo'sh** — har bir controller `@UseGuards(JwtAuthGuard, RolesGuard)` bilan
4. **Shared types** — `@food-delivery/types` packagedan import qil, qayta yozma
5. **Shared UI** — komponent kerak bo'lsa `@food-delivery/ui` dan ol (gluestack-ui v2 asosida); yo'q bo'lsa `packages/ui/components/` ga qo'sh
6. **`@rn-primitives` yozma** — bu paket loyihada yo'q, har doim `gluestack-ui v2` ishlatiladi
7. **Tailwind** — har doim `className` ishlatiladi, inline `style` faqat zarur holda
8. **Zustand** — global UI state (cart, auth) uchun; cart store har doim `totalPrice` ni yangilab boradi (yuqoridagi referens kod)
9. **PrismaService** — `constructor(private prisma: PrismaService)` orqali inject qil
10. **Kakao Auth** — mobile token → backend verify → o'z JWT (1 soat / 30 kun). Kakao tokenni frontend da saqlama
11. **Kakao Map** — `driver:location:changed` event → faqat WebView marker update, map qayta render qilinmaydi
12. **Socket eventlar** — faqat yuqoridagi 11 ta event nomi ishlatiladi, `driver:location` kabi eski nom yozilmaydi
13. **Driver tayinlash** — `READY → PENDING_DRIVER` orqali, haversine algoritm bilan, bevosita `PICKED_UP` ga o'tilmaydi
14. **Pagination** — barcha list endpointlar `cursor`based, `offset`/`page` ishlatilmaydi
15. **Redis cache** — restoran/menyu uchun cache-aside, yangilanishda invalidate; GPS location TTL 5 daqiqa (300s), 30s emas
16. **Error handling** — WebSocket reconnect, Kakao Pay to'lov muddati fallback, restoran timeout — TDD v1.2 dagi cron/reconnect naqshlariga amal qilinadi
17. **Test** — har bir service uchun `.spec.ts`
18. **Commit** — `feat:`, `fix:`, `refactor:` prefikslari

---

_CLAUDE.md v1.2 | 16.06.2026 | PRD v1.4, MVP v1.2, TDD v1.2 bilan 100% mos | Food Delivery Portfolio Project_
