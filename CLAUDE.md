# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"奶龙的家" (Nailong's Home) — a WeChat Mini Program for couples. Two users pair via a 6-digit invite code to share a virtual currency (互动币), diary, dreams, shop, mini-games, and expense tracking. All UI text is Chinese.

## Tech Stack

- **Frontend:** uni-app with Vue 3 Composition API (`<script setup lang="ts">`)
- **State:** Pinia (single store in `store/index.ts`)
- **Styling:** SCSS with global theme variables in `uni.scss`; rpx units throughout
- **Backend:** WeChat Cloud Development — serverless cloud functions (`wx-server-sdk`) + cloud database
- **Build:** HBuilderX (no npm scripts, no CLI build). WeChat DevTools for preview/upload.
- **No test framework, linter, or CI/CD configured.**

## Build & Run

There is no `package.json` at root and no CLI commands. All operations are IDE-driven:

- **Dev:** HBuilderX → "运行" → "运行到小程序模拟器" → "微信开发者工具"
- **Build:** HBuilderX → "发行" → "小程序-微信"
- **Deploy cloud functions:** WeChat DevTools → right-click each folder in `cloudfunctions/` → "上传并部署：云端安装依赖"

## Architecture

### Frontend (`pages/`, `components/`, `store/`, `utils/`)

10 pages behind a 4-tab tabBar (首页/记录/乐园/更多). Components use uni-app easycom (auto-imported, no manual registration).

Key pages:
- `pages/setup` — onboarding: create or join couple space via invite code
- `pages/home` — dashboard: avatars, days-together, coin balance, quick links
- `pages/record` — merged tab: diary (calendar + CRUD) and dreams (bucket-list)
- `pages/arcade` — scratch card, dice, slot machine
- `pages/shop` / `pages/wheel` / `pages/expense` — coin economy features

Single Pinia store manages auth state: `openid`, `coupleId`, `user`, `partner`, `balance`. Persisted `inviteCode` in localStorage.

### Backend (`cloudfunctions/`)

~40 cloud functions, all following the same pattern:
```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
// extract OPENID from cloud.getWXContext()
// db operations on one of 9 collections
// return { success: true/false, ...data }
```

### Database Collections

`users`, `couples`, `diary_entries`, `dreams`, `shop_items`, `coupons`, `expenses`, `coin_logs`, `wheel_items` (migrated to local storage).

All collections use `coupleId` as the shared-scoping key. Auth is via WeChat `OPENID` from `cloud.getWXContext()`.

### Theme & Design

Global SCSS variables in `uni.scss`: primary `#FFB800` (gold/amber), glassmorphism cards (`backdrop-filter: blur`), `24rpx` border-radius, warm gradient background. Use these variables — don't hardcode colors.

## Conventions

- Pages use `<script setup lang="ts">` with Composition API
- Cloud functions are plain JavaScript (no TypeScript)
- Cloud function calls use `wx.cloud.callFunction({ name: '...', data: {...} })`
- Responsive sizing via `rpx` units (not px/rem)
- Couple-scoped data always requires `coupleId` filter in queries
- All user-facing strings are in Chinese
