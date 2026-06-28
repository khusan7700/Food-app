# 📜 HISTORY — Food Delivery Project

## 1. "1 qadamni boshla" — Monorepo poydevori (ROADMAP Qadam 1)

**Yozilgan/yaratilgan:**

- Root: `package.json` (turbo scriptlari: `dev`, `dev:api`, `dev:mobile`, `build`, `lint`, `type-check`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json`, `.gitignore`
- `apps/api` — NestJS 11.1.27 skeleti (`@nestjs/cli` orqali), `main.ts`ga global `/api` prefiks qo'shildi, `package.json`/`eslint.config.mjs` CLAUDE.md versiyalariga moslandi (`@typescript-eslint/parser`+`eslint-plugin` 8.61.0, eslint 9.39.4, jest 29.7.0, typescript 5.9.3)
- `apps/mobile` — Expo 56.0.12 + Expo Router (tabs shabloni). Shablon o'zi bilan keltirgan nested `.git`, `CLAUDE.md`, `AGENTS.md`, `LICENSE`, `.claude/` o'chirildi. `app/`, `components/`, `assets/`, `constants/` loyiha tuzilmasiga mos `src/` ostiga ko'chirildi (`src/app`, `src/components`, ... + bo'sh `src/stores`, `src/hooks`, `src/lib`), `app.json`dagi `expo-router.root` va asset yo'llari, `tsconfig.json` `@/*` aliasi shunga mos yangilandi
- `packages/types` (`@food-delivery/types`) — tsc build skeleti, hozircha bo'sh (`OrderStatus`/`UserRole` keyingi qadamda qo'shiladi)
- `packages/config` (`@food-delivery/config`) — umumiy `tsconfig.base.json` va `eslint-preset.mjs`

**Qaror (foydalanuvchi tasdiqlagan):** CLAUDE.md jadvalidagi `react-native@0.76.9`/`typescript@5.9.3` (mobile) Expo SDK 56 bilan real mos kelmagani aniqlandi → Expo'ning haqiqiy peer-mos versiyalari saqlandi (`react-native@0.85.3`, `typescript@6.0.3` mobile uchun). CLAUDE.md jadvali shu joyda eskirgan bo'lishi mumkin.

**Tekshirildi:** `pnpm install` (5 workspace), `pnpm --filter @food-delivery/types build`, `pnpm --filter api build/lint`, build qilingan API `node dist/main.js` orqali ko'tarilib `GET /api` → `200`, `pnpm --filter mobile type-check`, `npx expo config` orqali `expo-router.root` to'g'ri rezolyutsiya qilingani tasdiqlandi.
