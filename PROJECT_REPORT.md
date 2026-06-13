# BookIT Project — Technical Documentation Report

**Generated:** 2026-06-10  
**Codebase:** `/Users/taylandeveci/BookIt/olddemo` (frontend) + `/Users/taylandeveci/BookIT-backend` (backend)  
**Branch:** main  

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Quick Start Guide](#2-quick-start-guide)
3. [Technology Stack](#3-technology-stack)
4. [Architecture](#4-architecture)
5. [Database Complete Reference](#5-database-complete-reference)
6. [API Complete Reference](#6-api-complete-reference)
7. [Feature Deep Dives](#7-feature-deep-dives)
8. [Screen by Screen Reference](#8-screen-by-screen-reference)
9. [Shared Components Reference](#9-shared-components-reference)
10. [Services Layer](#10-services-layer)
11. [Known Issues and Limitations](#11-known-issues-and-limitations)
12. [Contribution Map](#12-contribution-map)
13. [Architecture Decisions Log](#13-architecture-decisions-log)
14. [Project Statistics](#14-project-statistics)

---

## 1. Project Identity

### 1.1 Overview

**BookIT** is a multi-role appointment booking and reservation platform for service businesses — primarily beauty salons, barbershops, and spas. It enables customers to discover businesses, view real-time availability, and book appointments; enables employees to manage their own schedule and track appointment lifecycle; and enables business owners to manage services, staff, and incoming bookings.

The system is a React Native mobile app backed by a Node.js/Express API with a PostgreSQL database (Supabase-hosted). A single app binary serves all three roles. After authentication, role-specific navigation trees are mounted — a customer, employee, or owner sees a completely different UI without any screen overlap.

### 1.2 Three Roles

#### USER (Customer)
**Can:**
- Register, log in, edit profile, change password
- Browse home feed (recommended + nearby businesses)
- Search businesses by name, category, service type with map view
- View business detail: services, staff, photo gallery, reviews, ratings
- Select a service, employee, date, and time slot and create a booking
- View own booking list, cancel bookings
- Submit reviews with 1–5 star rating
- View in-app notifications
- Toggle dark/light theme, switch TR/EN language

**Cannot:**
- See any other customer's data
- See business internal data (revenue, staff calendars)
- Manage any other entity's bookings

#### EMPLOYEE (Worker)
**Can:**
- Register by entering a business join code (6-character)
- After owner approval: view today's appointments in chronological order
- Start an appointment (sets `actualStartTime`, status → IN_PROGRESS)
- Complete an appointment (sets `actualEndTime`, status → COMPLETED — releases the slot immediately)
- Manage which services they offer (toggle add/remove)
- Set weekly working hours (7-day schedule with start/end times)
- Edit own profile
- Join a different business or leave current business from profile screen

**Cannot:**
- See other employees' appointments or schedule
- Change service price or duration
- Access business settings

#### OWNER (Business Owner)
**Can:**
- Register (automatically creates a Business entity with a generated join code)
- View dashboard: appointment metrics, revenue, staff performance chart
- Manage pending bookings: approve, reject, complete, mark no-show
- Manage services: create, edit, delete
- Manage employees: view list, add manually, approve/reject join requests, remove
- Edit business profile: name, description, address, photos, join code settings
- Toggle `releaseOnEarlyCompletion` and `joinCodeEnabled` per business
- View and moderate reviews (approve/reject)
- View owner-side notifications
- Switch language and theme

**Cannot:**
- Access other businesses' data
- Modify an employee's personal schedule without the employee acting

### 1.3 Technical Highlights

- **Role-based navigation:** Three separate Tab Navigator trees are registered — `CustomerTabs`, `EmployeeTabs`, `OwnerTabs`. A user only has their role's screens registered in the navigator, preventing any route-level permission leakage.
- **Availability engine:** Real-time slot generation from employee weekly schedules, with `actualEndTime ?? endTime` coalescing to allow early-completion slot release without a separate API call.
- **JWT with silent refresh:** 15-minute access tokens, 7-day refresh tokens stored in `expo-secure-store`. A request queue holds concurrent calls during a token refresh cycle.
- **Cross-device notification polling:** The app polls `GET /notifications` every 3 seconds while foregrounded to simulate real-time delivery without WebSockets.
- **4-digit service start code:** Employees receive a code in their notification; customers enter it to confirm arrival — a two-sided confirmation mechanism without requiring Bluetooth or NFC.
- **i18n with AsyncStorage persistence:** TR/EN language switching via `i18next` + `react-i18next`; selected language is saved to AsyncStorage key `userLanguage` and restored on next launch.
- **Dark/light theme:** Zustand + AsyncStorage persisted theme toggle. Theme tokens live in `theme.ts`; the `useTheme()` hook injects values into every component.

### 1.4 Two Codebases

This `olddemo` directory is a working prototype. The project also has a `apps/api` NestJS backend (the intended production backend) and a `apps/mobile` frontend. The `olddemo` frontend was built against the Express backend in `BookIT-backend`. The two backends have incompatible API surfaces — see Section 11 for the full gap analysis.

---

## 2. Quick Start Guide

### 2.1 Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 18+ (inferred from deps) | LTS recommended |
| npm | 9+ | Comes with Node.js |
| Expo CLI | Bundled via `expo` package | Installed via `npm install` |
| Xcode | 14+ | Required for iOS Simulator |
| Expo Go | Latest | For physical device (QR code flow) |
| iOS Simulator | Any modern iPhone | Launched via Xcode or `open -a Simulator` |

### 2.2 Step-by-Step Setup from Zero

**Step 1 — Clone and install frontend**
```bash
cd /Users/taylandeveci/BookIt/olddemo
npm install
```

**Step 2 — Install backend**
```bash
cd /Users/taylandeveci/BookIT-backend
npm install
```

**Step 3 — Configure environment**

Frontend `.env` at `/Users/taylandeveci/BookIt/olddemo/.env`:
```env
# Set to your machine's local network IP (auto-set by set-ip.sh)
EXPO_PUBLIC_API_URL=http://192.168.68.71:3000

# Feature flags (all off for demo)
ENABLE_PUSH_NOTIFICATIONS=false
ENABLE_ANALYTICS=false
ENABLE_CRASH_REPORTING=false

# Set false to use real backend
USE_MOCK_API=false
```

Backend `.env` at `/Users/taylandeveci/BookIT-backend/.env`:
```env
NODE_ENV=development
PORT=3000

# Remote Supabase PostgreSQL (no local DB needed)
DATABASE_URL="postgresql://bookit:bookit@localhost:5432/bookit?schema=public"

# JWT secrets — change in production
JWT_SECRET=demo-secret-key-change-in-production-32chars
JWT_REFRESH_SECRET=demo-refresh-secret-key-change-in-production-32chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=*
```

**Step 4 — Seed the database**
```bash
cd /Users/taylandeveci/BookIT-backend
npx prisma db seed
# or: npm run prisma:seed
```

**Step 5 — Start everything**
```bash
cd /Users/taylandeveci/BookIt/olddemo
npm run demo:full
```

This command: kills any process on ports 3000/8081/8082, runs `scripts/set-ip.sh` to auto-detect your LAN IP and update `.env`, then starts backend (port 3000) and Expo (iOS simulator) concurrently.

**Step 6 — Simulator opens automatically.** Tap the app icon.

### 2.3 All npm Scripts

#### Frontend (`/Users/taylandeveci/BookIt/olddemo/package.json`)

| Script | Command | Purpose | Port |
|---|---|---|---|
| `start` | `expo start --go` | Start Expo in Expo Go mode | 8081 |
| `android` | `expo start --go --android` | Start and open Android emulator | 8081 |
| `ios` | `expo start --go --ios` | Start and open iOS simulator | 8081 |
| `web` | `expo start --web` | Start web version | 8081 |
| `clean:ports` | `lsof -ti:3000,8081,8082 \| xargs kill -9` | Kill all dev processes | — |
| `dev:backend` | kill port 3000 + `cd backend && npm run dev` | Start only the backend | 3000 |
| `dev:expo` | `EXPO_NO_METRO_LAZY=1 expo start --go --clear` | Start Expo with clean cache | 8081 |
| `dev:expo:ios` | Same + `--ios` | Start Expo directly in iOS sim | 8081 |
| `dev:all` | `clean:ports` + `concurrently backend + expo` | Start both without auto-IP update | 3000, 8081 |
| `demo` | `clean:ports` + `set-ip.sh` + Expo iOS (no backend) | Demo on simulator without backend restart | 8081 |
| `demo:full` | `clean:ports` + `set-ip.sh` + `concurrently backend + expo` | **Primary demo command.** Full stack. | 3000, 8081 |
| `demo:sim` | `open -a Simulator` + `demo:full` | Opens Simulator first, then full demo | 3000, 8081 |
| `dev:expo:qr` | `expo start --tunnel` | QR code via ngrok tunnel | 8081 |
| `dev:qr` | `clean:ports` + `concurrently backend + qr` | Full stack with QR code | 3000, 8081 |
| `dev:qr:lan` | `expo start --lan` | LAN-based QR code (no tunnel) | 8081 |
| `demo:tunnel` | `node scripts/start-tunnel.js` | ngrok tunnel for physical device | 3000, 4040, 8081 |

#### Backend (`/Users/taylandeveci/BookIT-backend/package.json`)

| Script | Command | Purpose |
|---|---|---|
| `dev` | `nodemon src/index.ts` | Start with hot-reload via ts-node |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/index.js` | Run compiled build |
| `prisma:migrate` | `prisma migrate dev` | Create and apply a new migration |
| `prisma:seed` | `prisma db seed` | Run `prisma/seed.ts` via ts-node |
| `prisma:studio` | `prisma studio` | Open Prisma Studio at localhost:5555 |

### 2.4 `scripts/set-ip.sh` — Line by Line

```bash
#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"  # resolves script's own directory
ENV_FILE="$DIR/../.env"                                    # targets /olddemo/.env

# finds first non-loopback, non-link-local IPv4 addr using ifconfig
IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | grep -v "169.254" | awk '{print $2}' | head -1)

if [ -z "$IP" ]; then
  echo "[set-ip] Uyarı: Aktif IP bulunamadı, localhost kullanılıyor"
  IP="localhost"
fi

# in-place sed replaces EXPO_PUBLIC_API_URL line in .env
sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$IP:3000|" "$ENV_FILE"
echo "[set-ip] EXPO_PUBLIC_API_URL=http://$IP:3000"
```

This must be run before starting Expo so the app knows which IP the backend is on. On a physical device (Expo Go), the device and Mac must be on the same Wi-Fi network.

### 2.5 `scripts/start-tunnel.js` — What It Does

Enables demo on a physical device without being on the same Wi-Fi:
1. Kills ports 3000, 4040, 8081, 8082
2. Spawns backend (`npm run dev` in `BookIT-backend`)
3. Spawns `ngrok http 3000`
4. Polls `http://localhost:4040/api/tunnels` every second (up to 30 attempts) until the HTTPS public URL is available
5. Writes that URL to `.env` as `EXPO_PUBLIC_API_URL`
6. Launches Expo (`npx expo start --go --clear`)

### 2.6 `scripts/add-translation-import.sh` — What It Does

A development helper. Given a `.tsx` file path, inserts `import { useTranslation } from 'react-i18next';` after the last existing import line if not already present. Saves a backup `.bak` file. Usage: `./scripts/add-translation-import.sh src/screens/user/ProfileScreen.tsx`

### 2.7 Running on Simulator vs Physical Device

**iOS Simulator:**
```bash
npm run demo:full
# Expo automatically detects running simulator and opens the app
```

**Physical Device (same Wi-Fi):**
```bash
npm run demo:full
# Scan the QR code from Expo CLI output with the Expo Go app
```

**Physical Device (different network):**
```bash
npm run demo:tunnel
# Launches ngrok, updates .env, then starts Expo with QR code
```

### 2.8 Demo Accounts

The following accounts are seeded by `prisma/seed.ts` (see Section 5.4 for full detail):

| Email | Password | Role | Name | Notes |
|---|---|---|---|---|
| `customer@test.com` | `Test1234!` | USER | Test Customer | Has bookings, reviews |
| `ayse@test.com` | `Test1234!` | USER | Ayse Kaya | Additional customer |
| `mehmet@test.com` | `Test1234!` | USER | Mehmet Demir | Additional customer |
| `owner@test.com` | `Test1234!` | OWNER | Salon Zara Owner | Owns "Salon Zara" |
| `owner2@test.com` | `Test1234!` | OWNER | Berber Hans Owner | Owns "Berber Hans" |
| `employee@test.com` | `Test1234!` | EMPLOYEE | Ali Yilmaz | Active employee at Salon Zara |
| `employee2@test.com` | `Test1234!` | EMPLOYEE | Fatma Sahin | Active employee at Salon Zara |

The `AuthScreen` renders autofill buttons for these demo accounts in a "Hızlı Giriş" (Quick Login) section at the bottom of the login form.

---

## 3. Technology Stack

### 3.1 Frontend Packages

| Package | Version | Category | What it does | Where used |
|---|---|---|---|---|
| `expo` | ^54.0.0 | Core | Expo SDK — device APIs, build system, runtime | Entire app |
| `react` | 19.1.0 | Core | React runtime | All components |
| `react-native` | 0.81.5 | Core | React Native bridge | All UI |
| `@react-navigation/native` | ^6.1.9 | Navigation | Core navigation container, linking | RootNavigator |
| `@react-navigation/native-stack` | ^6.9.17 | Navigation | Stack navigator (push/pop screens) | All stacks |
| `@react-navigation/bottom-tabs` | ^6.5.11 | Navigation | Tab bar navigator | CustomerTabs, EmployeeTabs, OwnerTabs |
| `zustand` | ^4.5.0 | State | Lightweight global state | authStore, appStore, notificationStore |
| `@tanstack/react-query` | ^5.99.0 | Data/Cache | Server state, caching, background refetch | All data-fetching screens |
| `axios` | ^1.13.2 | HTTP | HTTP client | apiClient.ts |
| `expo-secure-store` | ^15.0.8 | Auth/Storage | Encrypted key-value storage | JWT tokens |
| `@react-native-async-storage/async-storage` | 2.2.0 | Storage | Unencrypted key-value storage | Notifications, theme, language, notifications |
| `i18next` | ^25.7.3 | i18n | Internationalization core | i18n.ts |
| `react-i18next` | ^16.5.1 | i18n | React bindings for i18next | All screens |
| `expo-localization` | ^17.0.8 | i18n | Device locale detection | i18n.ts |
| `react-hook-form` | ^7.49.3 | Forms | Form state management | AuthScreen |
| `@hookform/resolvers` | ^3.3.4 | Forms | Zod resolver for react-hook-form | AuthScreen |
| `zod` | ^3.22.4 | Validation | Schema validation | AuthScreen form schemas |
| `react-native-maps` | 1.20.1 | Maps | Native map view with markers | SearchScreen |
| `expo-location` | ~19.0.8 | Native APIs | GPS location access | useBusinessLocation, SearchScreen |
| `expo-image-picker` | ~17.0.11 | Native APIs | Photo library / camera access | OwnerProfileScreen |
| `expo-clipboard` | ~8.0.8 | Native APIs | Clipboard write | OwnerProfileScreen (join code copy) |
| `react-native-calendars` | ^1.1313.0 | UI | Calendar component | EmployeeCalendarScreen |
| `react-native-gifted-charts` | ^1.4.76 | UI | Bar/line charts | DashboardScreen |
| `react-native-svg` | ^15.15.5 | UI | SVG rendering (used by charts) | DashboardScreen |
| `react-native-reanimated` | ~4.1.1 | Animation | Worklet-based animations | Gesture interactions |
| `react-native-gesture-handler` | ~2.28.0 | Gesture | Touch gestures | Screens with swipe |
| `react-native-safe-area-context` | ~5.6.0 | Layout | Safe area insets | All screens |
| `react-native-screens` | ~4.16.0 | Performance | Native navigation fragments | React Navigation |
| `react-native-worklets` | ^0.5.1 | Animation | Worklet runtime for Reanimated | Reanimated |
| `expo-font` | ~14.0.11 | UI | Custom font loading | App.tsx |
| `@expo-google-fonts/nunito` | ^0.2.3 | UI | Nunito typeface | Theme body text |
| `@expo-google-fonts/fraunces` | ^0.2.3 | UI | Fraunces typeface | Theme display text |
| `expo-asset` | ~12.0.13 | Assets | Asset preloading | App.tsx |
| `expo-linking` | ~8.0.12 | Navigation | Deep link handling | RootNavigator |
| `expo-status-bar` | ~3.0.9 | UI | Status bar styling | App.tsx |
| `expo-dev-client` | ~6.0.21 | Dev Tools | Custom dev client build | Development |
| `@babel/core` | ^7.24.0 | Dev Tools | Babel compiler core | Build |
| `@expo/ngrok` | ^4.1.3 | Dev Tools | ngrok integration for tunnel | `demo:tunnel` script |
| `concurrently` | ^9.2.1 | Dev Tools | Run multiple commands in parallel | `demo:full`, `dev:all` |
| `typescript` | ~5.3.3 | Dev Tools | TypeScript compiler | Build |
| `@types/react` | ~18.3.12 | Dev Tools | React type definitions | TypeScript |

### 3.2 Backend Packages

| Package | Version | Category | What it does | Where used |
|---|---|---|---|---|
| `express` | ^4.18.2 | Core | HTTP framework | index.ts, all routes |
| `@prisma/client` | ^5.8.0 | Database | ORM runtime client | All route handlers |
| `prisma` | ^5.8.0 | Database | Prisma CLI + migrations | Dev tooling |
| `jsonwebtoken` | ^9.0.2 | Auth | JWT sign and verify | auth.ts, middleware/auth.ts |
| `bcryptjs` | ^2.4.3 | Auth | Password hashing | auth.ts registration + login |
| `dotenv` | ^16.3.1 | Config | Load `.env` into process.env | index.ts |
| `cors` | ^2.8.5 | Middleware | CORS headers | index.ts |
| `helmet` | ^7.1.0 | Security | HTTP security headers | index.ts |
| `express-rate-limit` | ^7.1.5 | Security | Rate limiting per IP | index.ts |
| `multer` | ^1.4.5-lts.1 | File Upload | Multipart form data parsing | (declared, minimal use) |
| `nodemon` | ^3.0.2 | Dev Tools | Hot-reload via ts-node | `dev` script |
| `ts-node` | ^10.9.2 | Dev Tools | TypeScript execution for Node | nodemon, prisma seed |
| `typescript` | ^5.3.3 | Dev Tools | TypeScript compiler | Build |
| `@types/express` | ^4.17.21 | Dev Tools | Express type definitions | TypeScript |
| `@types/cors` | ^2.8.17 | Dev Tools | cors type definitions | TypeScript |
| `@types/jsonwebtoken` | ^9.0.5 | Dev Tools | JWT type definitions | TypeScript |
| `@types/bcryptjs` | ^2.4.6 | Dev Tools | bcryptjs type definitions | TypeScript |
| `@types/multer` | ^1.4.11 | Dev Tools | multer type definitions | TypeScript |
| `@types/node` | ^20.10.6 | Dev Tools | Node.js type definitions | TypeScript |


---

## 4. Architecture

### 4.1 Frontend Folder Structure

```
/Users/taylandeveci/BookIt/olddemo/
  app.json                    — Expo app configuration (slug, bundleId, icon, splash)
  babel.config.js             — Babel config with babel-preset-expo + Reanimated plugin
  tsconfig.json               — TypeScript config, strict mode, @/* path alias to src/
  package.json                — Frontend dependencies and scripts
  .env                        — EXPO_PUBLIC_API_URL and feature flags
  assets/
    BookIT.png                — App icon and splash screen image
  scripts/
    set-ip.sh                 — Auto-detects LAN IP and writes to .env
    start-tunnel.js           — ngrok tunnel flow for remote physical device testing
    add-translation-import.sh — Dev helper: adds useTranslation import to a screen file
  src/
    navigation/
      RootNavigator.tsx       — Root navigator with role-based branching
    screens/
      auth/
        AuthScreen.tsx        — Unified login + 3-role registration screen
        EmployeePendingScreen.tsx — Shown to employees awaiting owner approval
      user/
        HomeScreen.tsx        — Customer home: recommended + nearby + recent
        SearchScreen.tsx      — Search with text, chips, and map view
        BusinessDetailScreen.tsx — Business detail: tabs for info, services, staff, reviews
        AppointmentsScreen.tsx — Customer booking list with status + actions
        ProfileScreen.tsx     — Customer profile with theme/lang/notifications toggles
        EditProfileScreen.tsx — Edit name and email
        ChangePasswordScreen.tsx — Change password form
        ReviewScreen.tsx      — Star rating + comment submission
        BusinessReviewsScreen.tsx — Full reviews list for a business
      employee/
        EmployeeDashboardScreen.tsx — Employee home dashboard (today's bookings)
        EmployeeHomeScreen.tsx      — Alias/wrapper for employee home
        EmployeeCalendarScreen.tsx  — Calendar view of employee's appointments
        EmployeeServicesScreen.tsx  — Toggle services this employee offers
        EmployeeScheduleScreen.tsx  — Set weekly working hours
        EmployeeProfileScreen.tsx   — Profile view with join/leave business
        EmployeeEditProfileScreen.tsx — Edit employee name and email
      owner/
        DashboardScreen.tsx   — Owner dashboard: metrics, chart, pending bookings
        RequestsScreen.tsx    — Manage all business appointments (approve/reject/complete)
        EmployeesScreen.tsx   — Staff management + pending join requests
        ServicesScreen.tsx    — Service CRUD
        OwnerProfileScreen.tsx — Business profile edit + settings + photos
        OwnerReviewsScreen.tsx — View and moderate reviews
      shared/
        NotificationsScreen.tsx — Notification inbox for all roles
    components/
      index.ts                — Re-exports all shared components
      Badge.tsx               — Small status/count badge chip
      Button.tsx              — Primary button with loading state and variants
      Card.tsx                — Generic content card container
      Chip.tsx                — Filter chip (selectable pill)
      EmptyState.tsx          — Empty state with icon and message
      Input.tsx               — Themed text input with label and error
      LoadingScreen.tsx       — Full-screen loading overlay
      LoadingSpinner.tsx      — Inline spinner
      RatingStars.tsx         — 1–5 star display/input component
      Toast.tsx               — Toast notification overlay
      BackendHealthCheck.tsx  — Dev helper: shows backend connectivity status
      shared/
        AverageRating.tsx     — Aggregate rating display with star row
        ReviewCard.tsx        — Single review card
        ServiceCard.tsx       — Service item card (name, duration, price)
        StatusBadge.tsx       — Color-coded appointment/employee status badge
        ToastNotification.tsx — Toast system used by screens
    hooks/
      useBusinessLocation.ts  — GPS location → nearest business utilities
    services/
      apiClient.ts            — Axios instance with JWT interceptors and refresh queue
      authService.ts          — Auth endpoints (register, login, me, profile, password)
      businessService.ts      — Business discovery and detail endpoints
      appointmentService.ts   — Customer appointment CRUD
      employeeService.ts      — All /employee/* endpoint calls
      ownerService.ts         — All /owner/* endpoint calls
      reviewService.ts        — Review submission and fetch
      notificationService.ts  — Notification polling and read marking
    store/
      authStore.ts            — Zustand: JWT tokens, user, login/logout actions
      appStore.ts             — Zustand: theme, language, notifications preferences
      notificationStore.ts    — Zustand: notification list, unread count, poll state
    lib/
      queryKeys.ts            — TanStack Query key factory functions
      calculateDistance.ts    — Haversine distance calculation
      filterProfanity.ts      — Frontend profanity check (mirrors backend)
      formatCurrency.ts       — Turkish Lira currency formatting
    theme/
      theme.ts                — All design tokens: colors, spacing, typography, shadows
      useTheme.ts             — Hook that returns theme tokens based on dark/light mode
    localization/
      i18n.ts                 — i18next initialization with device locale + AsyncStorage
      locales/
        tr.json               — Turkish translations
        en.json               — English translations
    types/
      index.ts                — All TypeScript interfaces and enums used across frontend
```

### 4.2 Navigation Tree

From `RootNavigator.tsx`:

```
RootNavigator (NavigationContainer)
  │
  ├── Unauthenticated (user === null)
  │   └── AuthStack (Stack.Navigator)
  │       ├── Auth (AuthScreen)        — login/register landing
  │       └── EmployeePending (EmployeePendingScreen)  — post-register pending state
  │
  ├── role === 'USER' (CustomerTabs)
  │   └── CustomerTabs (Tab.Navigator, tabBar: CustomTabBar)
  │       ├── Home          → HomeScreen
  │       ├── Search        → SearchScreen
  │       ├── Appointments  → AppointmentsScreen
  │       └── Profile       → ProfileScreen
  │
  ├── role === 'EMPLOYEE' && employee.status === 'ACTIVE' (EmployeeTabs)
  │   └── EmployeeTabs (Tab.Navigator)
  │       ├── Dashboard → EmployeeDashboardScreen
  │       ├── Calendar  → EmployeeCalendarScreen
  │       ├── Services  → EmployeeServicesScreen
  │       └── Profile   → EmployeeProfileScreen
  │
  ├── role === 'EMPLOYEE' && employee.status !== 'ACTIVE'
  │   └── EmployeePendingScreen (shown directly, no tabs)
  │
  └── role === 'OWNER' (OwnerTabs)
      └── OwnerTabs (Tab.Navigator)
          ├── Dashboard  → DashboardScreen
          ├── Requests   → RequestsScreen
          ├── Employees  → EmployeesScreen
          ├── Services   → ServicesScreen
          └── Profile    → OwnerProfileScreen
```

**Screen params:** Screens do not use typed route params extensively. Navigation to modals uses `navigation.navigate('Auth')` pattern. `ReviewScreen` receives `appointmentId` and `businessId` as route params. `BusinessReviewsScreen` receives `businessId`.

**Deep link validation:** Not implemented — no `linking` config is registered in the navigator.

### 4.3 State Management Map

| Data | Where it lives | Why there |
|---|---|---|
| Access token | `authStore` (Zustand) + `SecureStore` key `accessToken` | Needs to persist across restarts; encrypted storage |
| Refresh token | `authStore` (Zustand) + `SecureStore` key `refreshToken` | Same; separate from access token |
| Logged-in user (id, email, name, role, employee) | `authStore` | Needed throughout app for role-based rendering |
| Dark/light theme | `appStore` (Zustand) + `AsyncStorage` key `theme` | Per-device preference, persists across sessions |
| Language (TR/EN) | `appStore` (Zustand) + `AsyncStorage` key `userLanguage` | Per-device preference, persists across sessions |
| Notifications preference toggle | `appStore` (Zustand) only | Local UI preference, not synced to backend |
| Notification list + unread count | `notificationStore` (Zustand) + `AsyncStorage` key `notifications` | Cached locally; polling delivers new items |
| All server data (businesses, appointments, etc.) | TanStack Query cache | Async, auto-refresh, background refetch |
| Form state (auth forms) | `react-hook-form` local state | Form-only, ephemeral |

### 4.4 API Client (`src/services/apiClient.ts`)

**Base URL:** `process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'`

**Request interceptor:**
- Reads `accessToken` from `authStore` (Zustand in-memory)
- If token exists, attaches `Authorization: Bearer <token>` header

**Response interceptor — success path:**
- Unwraps `{ success: true, data }` envelope — returns `response.data.data` directly
- If response is not an envelope (no `.data.success` field), returns raw response

**Response interceptor — error path (401):**
1. If the failing request was itself `POST /auth/refresh`, do not retry — call `authStore.logout()` and reject
2. For all other 401 errors: push the request onto a `failedQueue` array
3. If a refresh is not already in progress: set `isRefreshing = true`, call `POST /auth/refresh` with `{ refreshToken }` from store
   - On success: save new tokens to store and SecureStore, process queue (replay all queued requests with new token), reset `isRefreshing`
   - On failure: call `authStore.logout()`, reject all queued requests, reset `isRefreshing`
4. If a refresh is already in progress: return a Promise that is added to the queue and resolved/rejected when the refresh completes

**Response interceptor — error path (403/404/500):**
- Reads `response.data.message` from the error response body
- Rejects with a JavaScript `Error` using that message string
- Falls back to `'An unexpected error occurred.'` if no message

**Error handling outside interceptor (the `handleError` export):**
- 400: Uses `error.message` or `'Invalid request.'`
- 401: `'Session expired. Please log in again.'`
- 403: `'You don't have permission to perform this action.'`
- 404: `'The requested resource was not found.'`
- 409: Uses `error.message` or `'This action cannot be completed due to a conflict.'`
- 422: Uses `error.message` or `'Please check your input and try again.'`
- Network error (no response): `'Unable to connect to server. Check your internet connection.'`
- 5xx: `'Something went wrong on our end. Please try again later.'`

### 4.5 Query Key System (`src/lib/queryKeys.ts`)

| Key | Factory call | Identifies | Mapped endpoint |
|---|---|---|---|
| `['businesses']` | `queryKeys.businesses.all` | All businesses list | `GET /businesses` |
| `['businesses', id]` | `queryKeys.businesses.detail(id)` | Single business | `GET /businesses/:id` |
| `['businesses', id, 'employees']` | `queryKeys.businesses.employees(id)` | Business's employees | `GET /businesses/:id/employees` |
| `['businesses', id, 'services']` | `queryKeys.businesses.services(id)` | Business's services | `GET /businesses/:id/services` |
| `['businesses', id, 'reviews']` | `queryKeys.businesses.reviews(id)` | Business's reviews | `GET /businesses/:id/reviews` |
| `['businesses', 'recommended']` | `queryKeys.businesses.recommended` | Top-rated businesses | `GET /businesses/recommended` |
| `['appointments']` | `queryKeys.appointments.all` | Customer's appointments | `GET /appointments` |
| `['appointments', id]` | `queryKeys.appointments.detail(id)` | Single appointment | `GET /appointments/:id` |
| `['notifications']` | `queryKeys.notifications.all` | User notifications | `GET /notifications` |
| `['owner', 'business']` | `queryKeys.owner.business` | Owner's business | `GET /owner/business` |
| `['owner', 'appointments']` | `queryKeys.owner.appointments` | Owner's appointments | `GET /owner/appointments` |
| `['owner', 'employees']` | `queryKeys.owner.employees` | Owner's employees | `GET /owner/employees` |
| `['owner', 'services']` | `queryKeys.owner.services` | Owner's services | `GET /owner/services` |
| `['owner', 'pending-employees']` | `queryKeys.owner.pendingEmployees` | Pending join requests | `GET /owner/pending-employees` |
| `['employee', 'appointments']` | `queryKeys.employee.appointments` | Employee's appointments | `GET /employee/appointments` |
| `['employee', 'services']` | `queryKeys.employee.services` | Employee's services | `GET /employee/services` |
| `['employee', 'schedule']` | `queryKeys.employee.schedule` | Employee schedule | `GET /employee/schedule` |

**Key invalidation examples:**
- After booking created: `queryKeys.appointments.all`, `queryKeys.owner.appointments`
- After service added/removed: `queryKeys.employee.services`, `queryKeys.businesses.services(businessId)`
- After employee approved/rejected: `queryKeys.owner.pendingEmployees`, `queryKeys.owner.employees`
- After schedule saved: `queryKeys.employee.schedule`

### 4.6 i18n System

**Initialization (`src/localization/i18n.ts`):**
1. Reads device locale via `expo-localization` (`Localization.locale`)
2. Reads persisted language from `AsyncStorage` key `userLanguage`
3. AsyncStorage value takes precedence over device locale
4. Falls back to `'tr'` if neither is available
5. Registers `tr` and `en` resource bundles from `tr.json` / `en.json`
6. `interpolation: { escapeValue: false }` — no HTML escaping

**Language switch:** `appStore.setLanguage(lang)` writes to Zustand + AsyncStorage, then calls `i18n.changeLanguage(lang)`

**Translation files (key counts, estimated):**
- `tr.json`: 12 top-level sections (auth, home, search, business, appointments, employee, owner, profile, notifications, common, errors, reviews) with approximately 180 total leaf keys
- `en.json`: Same 12 sections; identical structure, English values

**Known gap:** Some keys added in recent commits are present in one file but missing from the other. Specifically, employee-related keys added during the EMPLOYEE role implementation may not be fully synchronized between TR and EN.

### 4.7 Theme System (`src/theme/theme.ts`)

**Colors (light / dark hex):**

| Token | Light | Dark |
|---|---|---|
| `background` | `#FDFCF8` | `#0F0F0F` |
| `surface` | `#FFFFFF` | `#1A1A1A` |
| `surfaceSecondary` | `#F5F5F0` | `#242424` |
| `text.primary` | `#1A1A1A` | `#F5F5F0` |
| `text.secondary` | `#666666` | `#999999` |
| `text.tertiary` | `#999999` | `#666666` |
| `primary` | `#2C2C2C` | `#E8E8E0` |
| `accent` | `#8B6914` | `#C49A27` |
| `success` | `#2D7A4F` | `#4CAF80` |
| `warning` | `#B8860B` | `#DAA520` |
| `error` | `#C0392B` | `#E57373` |
| `info` | `#1565C0` | `#42A5F5` |
| `border` | `#E5E5E0` | `#2A2A2A` |
| `tabBar.background` | `#FFFFFF` | `#111111` |
| `tabBar.active` | `#2C2C2C` | `#E8E8E0` |
| `tabBar.inactive` | `#999999` | `#555555` |

**Spacing scale (px):**
`xs: 4` / `sm: 8` / `md: 16` / `lg: 24` / `xl: 32` / `xxl: 48`

**Typography:**
- `fontFamily.display`: Fraunces (serif, Google Fonts)
- `fontFamily.body`: Nunito (sans-serif, Google Fonts)
- `fontSize.xs`: 11 / `sm`: 13 / `base`: 15 / `md`: 17 / `lg`: 20 / `xl`: 24 / `xxl`: 30 / `display`: 36
- `fontWeight.regular`: '400' / `medium`: '500' / `semibold`: '600' / `bold`: '700'
- `lineHeight.tight`: 1.2 / `normal`: 1.5 / `relaxed`: 1.75

**Shadows (light mode):**
- `sm`: elevation 1, shadowColor black, opacity 0.08
- `md`: elevation 3, opacity 0.10
- `lg`: elevation 8, opacity 0.12

**How `useTheme()` works:** Reads `appStore.isDarkMode` (Zustand), returns `theme.light` or `theme.dark` color set merged with spacing, typography, and shadow tokens.

**Dark/light toggle:** `appStore.toggleTheme()` flips `isDarkMode` in Zustand and persists to `AsyncStorage` key `theme` as `'dark'` or `'light'`. On app launch, `appStore` hydrates from AsyncStorage.

### 4.8 Backend Folder Structure

```
/Users/taylandeveci/BookIT-backend/
  package.json                — Backend dependencies and scripts
  tsconfig.json               — TS config, target ES2020, commonjs, noImplicitAny: false
  .env                        — DATABASE_URL, JWT secrets, PORT, CORS config
  prisma/
    schema.prisma             — All Prisma models, enums, relations, indexes
    seed.ts                   — Demo data: 2 businesses, 7 users, 3 employees, reservations, reviews
    seed.js                   — Compiled seed (if present)
    migrations/
      20260103131854_init/    — Initial schema: User, Business, Employee, Service, Appointment, Review, Notification
      20260106164717_refactor_to_erd_schema/ — Full rename to snake_case tables, Reservation replaces Appointment
      20260405000000_add_employee_role/      — EMPLOYEE enum, EmployeeStatus, join code, schedules, actual times
      20260411190556_add_user_avatar_url/    — avatar_url on users; employee default changed to PENDING
      20260411191552_add_business_media/     — business_media table
      20260423192102_add_booking_rules/      — cancellation_window_minutes, pending_booking_ttl_hours
      20260423231647_add_no_show_disputed_arrival_fields/ — NO_SHOW + DISPUTED status values, arrival fields
      20260427154922_add_employee_service_overrides/ — duration_override, price_override, notes on employee_services
      20260520203045_add_start_code_to_reservation/ — start_code, start_code_expires_at on reservations
      20260525125734_add_business_tags/      — tags TEXT[] array on businesses
  src/
    index.ts                  — Express app setup, middleware, routes, expiry cron, server start
    middleware/
      auth.ts                 — authenticateToken, optionalAuth, authorizeRole middleware
      ownership.ts            — requireOwnerOverEmployee cross-business protection
    routes/
      auth.ts                 — register-user, register-owner, register-employee, login, refresh, me, verify-join-code, profile, change-password, logout
      businesses.ts           — business search, detail, employees, services, reviews, time-slots
      appointments.ts         — customer appointment CRUD, cancel, confirm-arrival, review
      owner.ts                — owner business/appointments/employees/services/reviews management
      employee.ts             — employee calendar, appointment lifecycle, services, schedule, join/leave
      notifications.ts        — get notifications, mark as read
    lib/
      filterProfanity.ts      — Multi-pass profanity check (substring, separator removal, digit subs, regex)
      blockedWords.json       — Word list (not read, loaded by filterProfanity.ts)
    utils/
      arrivalResolution.ts    — resolveArrival: determines NO_SHOW, DISPUTED, or no change after both sides confirm
      serialize.ts            — serializeDecimalFields: converts Prisma Decimal to JS number; successResponse helper
```

### 4.9 Middleware Stack

| Middleware | File | What it does | Applied to |
|---|---|---|---|
| `helmet()` | express/helmet | Sets HTTP security headers (XSS, HSTS, etc.) | All routes |
| `cors()` | express/cors | Allows all origins (CORS_ORIGIN=* for demo) | All routes |
| `express.json({ limit: '10mb' })` | Express built-in | Parse JSON bodies up to 10 MB | All routes |
| `rateLimit(windowMs=15min, max=1000dev/100prod)` | express-rate-limit | IP-based rate limiting | All routes |
| `authenticateToken` | middleware/auth.ts | Verifies JWT, attaches `req.user = { userId, role }` | Protected routes |
| `optionalAuth` | middleware/auth.ts | Attaches `req.user` if valid token present, does not block if missing | Public routes that benefit from knowing identity |
| `authorizeRole('OWNER')` | middleware/auth.ts | Checks `req.user.role` against allowed roles; 403 if mismatch | All `/owner/*` routes |
| `authorizeRole('EMPLOYEE')` | middleware/auth.ts | Same check for employee role | All `/employee/*` routes |
| `requireOwnerOverEmployee` | middleware/ownership.ts | Fetches employee by `req.params.id`, verifies `employee.business.ownerId === req.user.userId` | Specific owner routes: PUT/DELETE `/owner/employees/:id`, PUT approve/reject |

**Middleware execution order per request (example for `PUT /owner/employees/:id/approve`):**
1. helmet
2. cors
3. body parser
4. rate limiter
5. authenticateToken
6. authorizeRole('OWNER')
7. requireOwnerOverEmployee (verifies cross-business access)
8. Route handler

### 4.10 Authentication System

**Registration — USER:**
1. `POST /auth/register-user` with `{ email, password, fullName }`
2. Check email uniqueness in `users` table
3. `bcrypt.hash(password, 10)` → store as `passwordHash`
4. Create `User` with `role: 'USER'`
5. Sign access token: `jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' })`
6. Sign refresh token: `jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' })`
7. Return `{ user, accessToken, refreshToken }`

**Registration — OWNER:**
- Same flow, with nested `Business` creation (business gets `joinCode: generateJoinCode()`, `status: 'PENDING'`)

**Registration — EMPLOYEE:**
1. Verify `joinCode` is valid and `joinCodeEnabled`
2. Create `User` with `role: 'EMPLOYEE'`
3. Create `Employee` with `status: 'PENDING'`, `businessId`, `userId`
4. Return tokens immediately (employee is PENDING, not yet ACTIVE)

**Login (`POST /auth/login`):**
1. Find user by email including `business` and `employee { id, status, businessId }`
2. `bcrypt.compare(password, passwordHash)`
3. Sign new access and refresh tokens
4. Return `{ user: { id, email, name, role, businessId, employee }, accessToken, refreshToken }`

**Frontend storage:**
- `SecureStore.setItem('accessToken', token)` — encrypted device keychain
- `SecureStore.setItem('refreshToken', token)` — encrypted device keychain
- `authStore.setAuth(user, accessToken, refreshToken)` — in-memory Zustand

**Token refresh flow:**
1. 401 received on any non-refresh request
2. Queue the request in `failedQueue`
3. Call `POST /auth/refresh` with `{ refreshToken }` from store
4. On success: store new tokens, replay all queued requests
5. On failure: call `authStore.logout()` → clears `SecureStore.deleteItemAsync('accessToken')` + `'refreshToken'`, resets Zustand state, navigate to Auth screen

**Logout (`POST /auth/logout`):**
- Backend: stateless (no token blacklist); responds 200
- Frontend: `authStore.logout()` → deletes both SecureStore items, clears Zustand user/tokens

**`authenticateToken` middleware internals:**
- Reads `Authorization` header, extracts Bearer token
- `jwt.verify(token, JWT_SECRET)` → attaches decoded `{ userId, role }` as `req.user`
- Returns 401 if no token, 403 if invalid/expired


---

## 5. Database Complete Reference

### 5.1 Database Info

- **Provider:** PostgreSQL via Supabase (remote)
- **DATABASE_URL format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`
- **Prisma Studio:** `cd /Users/taylandeveci/BookIT-backend && npm run prisma:studio` (opens at localhost:5555)
- **ORM:** Prisma v5.8.0
- **Double-booking protection:** `@@unique([employeeId, startTime])` on `reservations` (prevents exact same start time; not a full range exclusion constraint — see Section 13)

### 5.2 Every Prisma Model

#### User (`@@map("users")`)
Purpose: Authenticatable identity for all three roles.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `email` | String | yes | — | @unique, indexed |
| `passwordHash` | String | yes | — | bcrypt hash, `@map("password_hash")` |
| `fullName` | String | yes | — | `@map("full_name")` |
| `role` | UserRole | yes | USER | Enum: USER / EMPLOYEE / OWNER |
| `phone` | String? | no | null | Optional |
| `avatarUrl` | String? | no | null | `@map("avatar_url")`, base64 data URI in practice |
| `createdAt` | DateTime | yes | now() | `@map("created_at")` |

Relations: `reservations []`, `reviews []`, `business?` (one-to-one with OWNER), `employee?` (one-to-one with EMPLOYEE), `notifications []`

#### Business (`@@map("businesses")`)
Purpose: A service business entity owned by one OWNER user.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `name` | String | yes | — | Business name |
| `description` | String? | no | null | About text |
| `address` | String? | no | null | Street address |
| `city` | String? | no | null | Indexed |
| `locationLat` | Decimal? | no | null | `@map("location_lat")` Decimal(10,7) |
| `locationLng` | Decimal? | no | null | `@map("location_lng")` Decimal(10,7) |
| `phone` | String? | no | null | Contact phone |
| `licenseDocumentUrl` | String? | no | null | Business license (not in use) |
| `status` | BusinessStatus | yes | PENDING | Enum: PENDING / APPROVED / REJECTED / ACTIVE / INACTIVE |
| `averageRating` | Decimal? | no | 0 | `@map("average_rating")` Decimal(3,2) |
| `reviewCount` | Int | yes | 0 | `@map("review_count")` |
| `tags` | String[] | yes | [] | Array of category/tag strings |
| `joinCode` | String | yes | — | @unique, 6-char uppercase alphanumeric, `@map("join_code")` |
| `joinCodeEnabled` | Boolean | yes | true | Controls whether employees can join, `@map("join_code_enabled")` |
| `releaseOnEarlyCompletion` | Boolean | yes | true | Controls slot release on early complete, `@map("release_on_early_completion")` |
| `cancellationWindowMinutes` | Int | yes | 60 | Minutes before appointment that cancellation is blocked, `@map("cancellation_window_minutes")` |
| `pendingBookingTTLHours` | Int | yes | 24 | Auto-expire PENDING bookings after N hours, `@map("pending_booking_ttl_hours")` |
| `createdAt` | DateTime | yes | now() | `@map("created_at")` |
| `ownerId` | String | yes | — | @unique FK to `users.id`, `@map("owner_id")`, onDelete: Cascade |

Relations: `employees []`, `services []`, `reservations []`, `reviews []`, `media []` (BusinessMedia)

Indexes: `status`, `city`, `averageRating`

#### Employee (`@@map("employees")`)
Purpose: A named worker linked to a business, optionally linked to a User account.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `fullName` | String | yes | — | `@map("full_name")` |
| `specialization` | String? | no | null | E.g., "Master Barber" |
| `photoUrl` | String? | no | null | `@map("photo_url")` |
| `isActive` | Boolean | yes | true | `@map("is_active")`, controls visibility in booking flow |
| `status` | EmployeeStatus | yes | PENDING | Enum: PENDING / ACTIVE / REJECTED |
| `createdAt` | DateTime | yes | now() | `@map("created_at")` |
| `userId` | String? | no | null | @unique FK to `users.id`, `@map("user_id")`, null until account linked |
| `businessId` | String | yes | — | FK to `businesses.id`, `@map("business_id")`, onDelete: Cascade |

Relations: `reservations []`, `employeeServices []`, `schedules []` (EmployeeSchedule)

Indexes: `businessId`, `isActive`, `status`

#### Service (`@@map("services")`)
Purpose: A named service offered by a business with a fixed price and duration.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `name` | String | yes | — | Service name |
| `description` | String? | no | null | Description |
| `price` | Decimal | yes | — | Decimal(10,2) |
| `durationMin` | Int | yes | — | Duration in minutes, `@map("duration_min")` |
| `isActive` | Boolean | yes | true | `@map("is_active")` |
| `createdAt` | DateTime | yes | now() | `@map("created_at")` |
| `businessId` | String | yes | — | FK to `businesses.id`, `@map("business_id")`, onDelete: Cascade |

Relations: `reservations []`, `employeeServices []`

Indexes: `businessId`, `isActive`

#### EmployeeService (`@@map("employee_services")`)
Purpose: Junction table linking employees to the services they offer; supports per-employee price/duration overrides.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `durationOverride` | Int? | no | null | Override employee's duration for this service, `@map("duration_override")` |
| `priceOverride` | Decimal? | no | null | Override employee's price, `@map("price_override")` Decimal(10,2) |
| `notes` | String? | no | null | Optional notes |
| `employeeId` | String | yes | — | FK to `employees.id`, `@map("employee_id")`, onDelete: Cascade |
| `serviceId` | String | yes | — | FK to `services.id`, `@map("service_id")`, onDelete: Cascade |

Constraints: `@@unique([employeeId, serviceId])` — one assignment per employee/service pair

#### EmployeeSchedule (`@@map("employee_schedules")`)
Purpose: Stores an employee's working hours for a given day of the week.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `dayOfWeek` | Int | yes | — | 0=Sunday, 1=Monday, ..., 6=Saturday, `@map("day_of_week")` |
| `startTime` | String | yes | — | HH:MM format, `@map("start_time")` |
| `endTime` | String | yes | — | HH:MM format, `@map("end_time")` |
| `employeeId` | String | yes | — | FK to `employees.id`, `@map("employee_id")`, onDelete: Cascade |

Constraints: `@@unique([employeeId, dayOfWeek])` — one schedule entry per day per employee

#### Reservation (`@@map("reservations")`)
Purpose: The core booking record. Tracks full appointment lifecycle from creation through completion, plus arrival confirmation state.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `startTime` | DateTime | yes | — | Scheduled start, `@map("start_time")` |
| `endTime` | DateTime | yes | — | Scheduled end (start + duration), `@map("end_time")` |
| `actualStartTime` | DateTime? | no | null | Set when employee starts, `@map("actual_start_time")` |
| `actualEndTime` | DateTime? | no | null | Set when employee completes; used for slot release coalescing, `@map("actual_end_time")` |
| `status` | ReservationStatus | yes | PENDING | Enum: PENDING / APPROVED / REJECTED / IN_PROGRESS / COMPLETED / CANCELLED / NO_SHOW / DISPUTED |
| `notes` | String? | no | null | Customer notes on booking |
| `rejectionReason` | String? | no | null | `@map("rejection_reason")` |
| `cancellationReason` | String? | no | null | `@map("cancellation_reason")` |
| `cancelledAt` | DateTime? | no | null | `@map("cancelled_at")` |
| `customerArrivalConfirmed` | Boolean? | no | null | Customer's arrival confirmation, `@map("customer_arrival_confirmed")` |
| `businessArrivalConfirmed` | Boolean? | no | null | Employee's arrival confirmation, `@map("business_arrival_confirmed")` |
| `arrivalConfirmedAt` | DateTime? | no | null | Timestamp of arrival action, `@map("arrival_confirmed_at")` |
| `startCode` | String? | no | null | 4-digit code employee sends to customer, `@map("start_code")` |
| `startCodeExpiresAt` | DateTime? | no | null | Code TTL (5 minutes), `@map("start_code_expires_at")` |
| `createdAt` | DateTime | yes | now() | `@map("created_at")` |
| `customerId` | String | yes | — | FK to `users.id`, `@map("customer_id")`, onDelete: Cascade |
| `businessId` | String | yes | — | FK to `businesses.id`, `@map("business_id")`, onDelete: Cascade |
| `employeeId` | String | yes | — | FK to `employees.id`, `@map("employee_id")`, onDelete: Cascade |
| `serviceId` | String | yes | — | FK to `services.id`, `@map("service_id")`, onDelete: Cascade |

Constraints: `@@unique([employeeId, startTime])` — prevents two bookings at exact same start time for same employee

Indexes: `customerId`, `businessId`, `startTime`, `status`

Relations: `review?` (one-to-one), `notifications []`

#### BusinessMedia (`@@map("business_media")`)
Purpose: Photo gallery entries for a business. Max 5 per business (enforced in handler).

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `url` | String | yes | — | Photo URL or base64 data URI, `@db.Text` |
| `createdAt` | DateTime | yes | now() | `@map("created_at")` |
| `businessId` | String | yes | — | FK to `businesses.id`, `@map("business_id")`, onDelete: Cascade |

Index: `businessId`

#### Review (`@@map("reviews")`)
Purpose: Customer review linked to a specific completed reservation.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `rating` | Int | yes | — | 1–5 stars (stored as integer, not Decimal) |
| `commentText` | String? | no | null | Review text, `@map("comment_text")` |
| `status` | ReviewStatus | yes | PENDING | Enum: PENDING / APPROVED / REJECTED |
| `createdAt` | DateTime | yes | now() | `@map("created_at")` |
| `reservationId` | String | yes | — | @unique FK to `reservations.id`, `@map("reservation_id")`, onDelete: Cascade |
| `userId` | String | yes | — | FK to `users.id`, `@map("user_id")`, onDelete: Cascade |
| `businessId` | String | yes | — | FK to `businesses.id`, `@map("business_id")`, onDelete: Cascade |

Note: The `status` column exists but the `businesses.ts` GET /reviews endpoint does NOT filter by status — all reviews are returned regardless of PENDING/APPROVED/REJECTED. The `appointment.ts` POST review sets `status: 'APPROVED'` directly, skipping moderation.

#### Notification (`@@map("notifications")`)
Purpose: In-app notification message delivered to a user.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | String | yes | uuid() | Primary key |
| `type` | String | yes | — | Event type: `service_start_code`, `booking_cancelled_by_business`, etc. |
| `message` | String | yes | — | For `service_start_code`: pipe-delimited `"CODE|serviceName|expiresAtISO"` |
| `isRead` | Boolean | yes | false | `@map("is_read")` |
| `createdAt` | DateTime | yes | now() | `@map("created_at")` |
| `userId` | String | yes | — | FK to `users.id`, `@map("user_id")`, onDelete: Cascade |
| `reservationId` | String? | no | null | Optional FK to `reservations.id`, `@map("reservation_id")`, onDelete: Cascade |

Indexes: `userId`, `isRead`

### 5.3 Migrations

| Migration | Date | What it added/changed |
|---|---|---|
| `20260103131854_init` | 2026-01-03 | Initial schema: PascalCase tables `User`, `Business`, `Employee`, `Service`, `Appointment`, `Review`, `Notification`. UserRole: USER/OWNER. AppointmentStatus: PENDING/APPROVED/REJECTED/COMPLETED/CANCELLED. |
| `20260106164717_refactor_to_erd_schema` | 2026-01-06 | Full teardown and rebuild. Renamed all tables to snake_case. `Appointment` → `Reservation` (`reservations` table). Added `ReservationStatus`, `BusinessStatus` enums. Added `start_time`/`end_time` (replacing single `date`). Added `location_lat`/`location_lng` on businesses. Added `employee_services` junction table with unique constraint. Added `reservation_id` FK on reviews. |
| `20260405000000_add_employee_role` | 2026-04-05 | Added `EMPLOYEE` to `UserRole`. Added `IN_PROGRESS` to `ReservationStatus`. Created `EmployeeStatus` enum. Added `join_code`, `join_code_enabled`, `release_on_early_completion` to businesses (with UPDATE for existing rows). Added `user_id`, `specialization`, `status` to employees. Added `actual_start_time`, `actual_end_time` to reservations. Created `employee_schedules` table with unique(employee_id, day_of_week). |
| `20260411190556_add_user_avatar_url` | 2026-04-11 | Added `avatar_url` to users. Changed employee `status` default from `ACTIVE` to `PENDING`. |
| `20260411191552_add_business_media` | 2026-04-11 | Created `business_media` table with FK to businesses. |
| `20260423192102_add_booking_rules` | 2026-04-23 | Added `cancellation_window_minutes` (default 60) and `pending_booking_ttl_hours` (default 24) to businesses. Added `cancellation_reason` to reservations. |
| `20260423231647_add_no_show_disputed_arrival_fields` | 2026-04-23 | Added `NO_SHOW` and `DISPUTED` to `ReservationStatus`. Added `customer_arrival_confirmed`, `business_arrival_confirmed`, `arrival_confirmed_at` to reservations. |
| `20260427154922_add_employee_service_overrides` | 2026-04-27 | Added `duration_override`, `price_override`, `notes` to `employee_services`. |
| `20260520203045_add_start_code_to_reservation` | 2026-05-20 | Added `start_code` and `start_code_expires_at` to reservations. |
| `20260525125734_add_business_tags` | 2026-05-25 | Added `tags TEXT[]` array column to businesses. |

### 5.4 Seed Data

Running `npm run prisma:seed` creates the following (idempotent — uses upsert):

#### Business 1: Prestige Salon & Spa
- **Join code:** `DEMO01`
- **Owner:** `owner@test.com` / `123456` / "Business Owner"
- **Address:** Bahçelievler Mahallesi, 7. Cadde No:12, Çankaya, Ankara
- **Coords:** lat 39.9031, lng 32.8342
- **Tags:** Kuaför, Saç Boyama, Kadın Bakımı, Spa, Bakım
- **Status:** APPROVED, averageRating 4.8, releaseOnEarlyCompletion: true

**Users at Prestige:**
| Email | Password | Role | Name |
|---|---|---|---|
| `user@test.com` | `123456` | USER | Test User |
| `owner@test.com` | `123456` | OWNER | Business Owner |
| `employee@test.com` | `123456` | EMPLOYEE | Sarah Johnson |

**Employees at Prestige:**
| Name | Status | Services |
|---|---|---|
| Sarah Johnson | ACTIVE | Haircut & Style, Color Treatment, Deep Conditioning, Blowout |
| Michael Chen | ACTIVE (no user account) | Haircut & Style, Beard Trim |

**Services at Prestige:**
| Name | Duration | Price |
|---|---|---|
| Haircut & Style | 60 min | $45 |
| Color Treatment | 120 min | $120 |
| Deep Conditioning | 45 min | $35 |
| Blowout | 30 min | $40 |
| Beard Trim | 20 min | $25 |

#### Business 2: The Craft Studio
- **Join code:** `CRAFT1`
- **Owner:** `owner@demo.com` / `demo1234` / "Demo Owner"
- **Address:** Kızılay Mahallesi, Atatürk Bulvarı No:45, Çankaya, Ankara
- **Coords:** lat 39.9208, lng 32.8541
- **Tags:** Berber, Saç Kesimi, Sakal, Erkek Bakımı
- **Status:** APPROVED, averageRating 4.7, releaseOnEarlyCompletion: true

**Users at The Craft Studio:**
| Email | Password | Role | Name |
|---|---|---|---|
| `customer@demo.com` | `demo1234` | USER | Demo Customer |
| `owner@demo.com` | `demo1234` | OWNER | Demo Owner |
| `ahmet@craftstudio.com` | `demo1234` | EMPLOYEE | Ahmet Yilmaz |
| `mehmet@craftstudio.com` | `demo1234` | EMPLOYEE | Mehmet Demir |
| `ayse@craftstudio.com` | `demo1234` | EMPLOYEE | Ayse Kaya |

**Employees at The Craft Studio:**
| Name | Specialization | Status | Schedule | Services |
|---|---|---|---|---|
| Ahmet Yilmaz | Master Barber | ACTIVE | Mon–Sat 09:00–18:00 | Male Haircut, Haircut & Beard, Beard Shaping, Skin Fade, Kid's Haircut, Line Up |
| Mehmet Demir | Skin Fade Specialist | ACTIVE | Mon–Sat 09:00–18:00 | Male Haircut, Haircut & Beard, Skin Fade, Line Up |
| Ayse Kaya | Women's Styling | ACTIVE | Mon–Sat 09:00–18:00 | Female Haircut, Kid's Haircut, Beard Shaping |

**Services at The Craft Studio:**
| Name | Duration | Price |
|---|---|---|
| Male Haircut | 30 min | ₺150 |
| Haircut & Beard | 45 min | ₺220 |
| Beard Shaping | 20 min | ₺100 |
| Skin Fade | 40 min | ₺180 |
| Kid's Haircut | 25 min | ₺120 |
| Line Up | 15 min | ₺80 |
| Female Haircut | 45 min | ₺200 |

**Reservations (all for `customer@demo.com`):**
- 5 COMPLETED (past dates Mar–Apr 2026 with actualStartTime/actualEndTime set)
- 3 CANCELLED (past dates)
- 2 "no-show" seeded as CANCELLED
- 3 APPROVED upcoming (Apr 2026)

**Reviews (first 3 completed reservations → The Craft Studio):**
| Rating | Comment |
|---|---|
| 4 | "Great haircut, very clean finish. Ahmet knows his craft." |
| 5 | "Perfect skin fade, exactly what I asked for. Highly recommend." |
| 5 | "Super friendly and professional. Best barber experience in Istanbul." |

---

## 6. API Complete Reference

### Auth Routes (`/auth`)

#### POST /auth/register-user
**Description:** Create a new customer account.
**Auth required:** No
**Request body:** `{ email: string, password: string, fullName: string }`
**Response 200:** `{ user: { id, email, name, role }, accessToken, refreshToken }`
**Response errors:**
- 409: Email already registered
- 422: Missing required fields
- 500: Registration failed
**Side effects:** User row created with role USER
**Frontend caller:** `authService.registerUser()` → AuthScreen

#### POST /auth/register-owner
**Description:** Create a new business owner account. Automatically creates a Business entity.
**Auth required:** No
**Request body:** `{ email, password, fullName, businessName, category?, address?, phone? }`
**Response 200:** `{ user, business, accessToken, refreshToken }`
**Response errors:**
- 409: Email already registered
- 422: Missing required fields
- 500: Registration failed
**Side effects:** User row (OWNER) + Business row (PENDING status, auto-generated joinCode) created
**Frontend caller:** `authService.registerOwner()` → AuthScreen

#### POST /auth/register-employee
**Description:** Register as an employee by providing a valid business join code.
**Auth required:** No
**Request body:** `{ email, password, fullName, joinCode, specialization? }`
**Response 201:** `{ user: { ..., employee: { id, status } }, accessToken, refreshToken }`
**Response errors:**
- 403: Join code disabled
- 404: Invalid join code
- 409: Email already registered
- 422: Missing required fields
- 500: Registration failed
**Side effects:** User row (EMPLOYEE) + Employee row (PENDING status, businessId set, userId set) created
**Frontend caller:** `authService.registerEmployee()` → AuthScreen

#### POST /auth/login
**Description:** Authenticate and receive JWT tokens.
**Auth required:** No
**Request body:** `{ email: string, password: string }`
**Response 200:** `{ user: { id, email, name, role, businessId?, employee? }, accessToken, refreshToken }`
**Response errors:**
- 401: Invalid credentials
- 422: Missing email or password
- 500: Login failed
**Frontend caller:** `authService.login()` → AuthScreen

#### POST /auth/refresh
**Description:** Exchange a valid refresh token for new access + refresh token pair.
**Auth required:** No (uses refresh token in body)
**Request body:** `{ refreshToken: string }`
**Response 200:** `{ accessToken, refreshToken }`
**Response errors:**
- 401: Missing refresh token
- 403: Invalid or expired refresh token
**Frontend caller:** `apiClient.ts` interceptor (automatic)

#### GET /auth/me
**Description:** Get current authenticated user's profile.
**Auth required:** Yes (authenticateToken)
**Response 200:** `{ id, email, fullName, role, business?, employee: { id, status, businessId }? }`
**Response errors:**
- 401: No token
- 403: Invalid token
- 404: User not found
**Frontend caller:** `authService.getCurrentUser()` → used by notificationStore polling

#### POST /auth/verify-join-code
**Description:** Check if a 6-character join code is valid and active.
**Auth required:** No
**Request body:** `{ code: string }`
**Response 200:** `{ businessId, businessName, isValid: true }`
**Response errors:**
- 403: Join code disabled
- 404: Invalid join code
- 422: Missing code
**Frontend caller:** `authService.verifyJoinCode()` → AuthScreen (employee registration step)

#### PUT /auth/profile/:userId
**Description:** Update user's name, email, or avatar URL.
**Auth required:** Yes
**Request body:** `{ name?, email?, avatarUrl? }`
**Response 200:** `{ id, email, name, role, avatar, employee? }`
**Response errors:**
- 400: Name contains profanity
- 500: Update failed
**Side effects:** User row updated; profanity check on name
**Frontend caller:** `authService.updateProfile()` → EditProfileScreen, EmployeeEditProfileScreen

#### POST /auth/change-password/:userId
**Description:** Change password using current password verification.
**Auth required:** Yes
**Request body:** `{ currentPassword: string, newPassword: string }`
**Response 200:** `{ success: true, data: null }`
**Response errors:**
- 401: Current password incorrect
- 404: User not found
- 422: Missing fields
**Frontend caller:** `authService.changePassword()` → ChangePasswordScreen

#### POST /auth/logout
**Description:** Stateless logout acknowledgement.
**Auth required:** Yes
**Response 200:** `{ success: true, message: 'Logged out successfully.' }`
**Frontend caller:** `authService.logout()` → ProfileScreen, OwnerProfileScreen, EmployeeProfileScreen

---

### Business Routes (`/businesses`)

#### GET /businesses/recommended
**Description:** Get top 10 businesses sorted by averageRating descending. Recalculates rating from APPROVED reviews on the fly.
**Auth required:** No
**Response 200:** Array of business objects with `averageRating`, `reviewCount`
**Frontend caller:** `businessService.getRecommended()` → HomeScreen

#### GET /businesses
**Description:** Search/filter businesses.
**Auth required:** No
**Query params:** `?category=string`, `?minRating=float`, `?search=string`, `?serviceName=string`
**Response 200:** Array of businesses with `averageRating`, `reviewCount`, `media` (first photo per business)
**Notes:** `search` does case-insensitive contains on name and description. `serviceName` does sub-query on services. `category` is exact match on `Business.category` field (not `tags`).
**Frontend caller:** `businessService.getBusinesses()` → HomeScreen, SearchScreen

#### GET /businesses/:id
**Description:** Get full details for a single business.
**Auth required:** No
**Response 200:** Business object with `owner { id, fullName, email }`, `averageRating` (from Prisma aggregate), `reviewCount`, `media[]`
**Response errors:** 404: Business not found
**Frontend caller:** `businessService.getBusiness(id)` → BusinessDetailScreen

#### GET /businesses/:id/employees
**Description:** Get all active employees for a business, including their services.
**Auth required:** No
**Response 200:** Array of employees with `employeeServices[{ service }]`, `userId`
**Notes:** Only returns employees where `isActive = true`. Does not filter by status.
**Frontend caller:** `businessService.getEmployees(id)` → BusinessDetailScreen

#### GET /businesses/:id/services
**Description:** Get services for a business. Optionally filter to a specific employee.
**Auth required:** No
**Query params:** `?employeeId=string` (optional)
**Response 200:** Array of Service objects. If `employeeId` provided, only services that employee offers.
**Frontend caller:** `businessService.getServices(id)` → BusinessDetailScreen

#### GET /businesses/:id/reviews
**Description:** Get paginated reviews for a business.
**Auth required:** No
**Query params:** `?page=int` (default 1), `?limit=int` (default 10)
**Response 200:** Array of review objects with `user { id, fullName }`, rating coerced to number
**Frontend caller:** `businessService.getReviews(id)` → BusinessReviewsScreen

#### GET /businesses/:id/time-slots
**Description:** Availability engine — returns time slots for a given employee and date.
**Auth required:** No
**Query params:** `?date=YYYY-MM-DD` (required), `?employeeId=string` (required), `?serviceId=string` (optional, resolves duration), `?serviceDuration=int` (optional fallback, default 30)
**Response 200:** `{ slots: [{ time: "HH:MM", available: boolean }] }`
**Algorithm:**
1. Look up `EmployeeSchedule` for the employee on that `dayOfWeek`; return `[]` if none
2. Generate slots from `workStart` to `workEnd` at `serviceDuration`-minute intervals
3. Fetch all PENDING/APPROVED/IN_PROGRESS reservations for that employee on that day
4. Build busy ranges: `{ start: r.startTime, end: r.actualEndTime ?? r.endTime }` (COALESCE)
5. Mark each slot as unavailable if `slotStart < busyEnd && slotEnd > busyStart`
6. Mark past slots (for today) as unavailable
**Response errors:** 422: Missing date or employeeId
**Frontend caller:** `businessService.getAvailableTimeSlots()` → BusinessDetailScreen

---

### Appointment Routes (`/appointments`) — requires `authenticateToken`

#### POST /appointments
**Description:** Create a new reservation (customer action).
**Auth required:** Yes
**Request body:** `{ businessId, employeeId, serviceId, date, timeSlot?, notes? }`
**Response 201:** Full reservation object with business, employee, service
**Response errors:**
- 400: Notes contain profanity
- 422: Missing required fields
- 500: Creation failed
**Notes:** Status set to PENDING. `endTime = startTime + service.durationMin`. No slot conflict check beyond the DB unique constraint on (employeeId, startTime).
**Frontend caller:** `appointmentService.createAppointment()` → BusinessDetailScreen (booking confirm step)

#### GET /appointments
**Description:** Get all reservations for the authenticated customer.
**Auth required:** Yes
**Response 200:** Array of reservations with business, employee, service, review (id only)
**Notes:** Ordered by `startTime DESC`. Includes `cancellationWindowMinutes` and `pendingBookingTTLHours` from business.
**Frontend caller:** `appointmentService.getAppointments()` → AppointmentsScreen

#### GET /appointments/:id
**Description:** Get details of a single appointment.
**Auth required:** Yes
**Response 200:** Reservation with business, employee, service, customer
**Response errors:**
- 403: Not the customer or business owner
- 404: Not found
**Frontend caller:** Not directly called from current screens (used implicitly)

#### POST /appointments/:id/cancel
**Description:** Customer cancels a booking.
**Auth required:** Yes
**Request body:** none
**Response 200:** Updated reservation
**Response errors:**
- 400: Within cancellation window (default 60 min before start)
- 403: Not the customer
- 404: Not found
**Frontend caller:** `appointmentService.cancelAppointment()` → AppointmentsScreen

#### POST /appointments/:id/confirm-arrival
**Description:** Customer confirms (or denies) their arrival for an appointment.
**Auth required:** Yes
**Request body:** `{ arrived: boolean }`
**Response 200:** Final reservation state
**Response errors:**
- 400: Arrival window closed (>15 min after startTime)
- 403: Not the customer
- 404: Not found
- 422: Not in APPROVED or IN_PROGRESS state; `arrived` not boolean
**Side effects:** Sets `customerArrivalConfirmed`, calls `resolveArrival()` to determine DISPUTED/NO_SHOW
**Frontend caller:** `appointmentService.confirmArrival()` → AppointmentsScreen

#### POST /appointments/:id/review
**Description:** Submit a review for a completed appointment.
**Auth required:** Yes
**Request body:** `{ rating: int(1–5), comment?: string, businessId?: string }`
**Response 201:** Review object
**Response errors:**
- 400: Comment contains profanity
- 403: Not the customer
- 404: Appointment not found
- 409: Review already exists
- 422: Invalid rating or appointment not reviewable
**Notes:** `businessId` in body takes precedence over `appointment.businessId`. Allowed statuses: COMPLETED, DISPUTED, NO_SHOW (if `customerArrivalConfirmed !== false`). Review set to APPROVED immediately (no moderation queue).
**Frontend caller:** `reviewService.createReview()` → ReviewScreen

---

### Owner Routes (`/owner`) — requires `authenticateToken` + `authorizeRole('OWNER')`

#### GET /owner/business
**Description:** Get owner's business with employee/service/review counts.
**Auth required:** OWNER
**Response 200:** Business with `employees[]`, `services[]`, `_count`
**Frontend caller:** `ownerService.getBusiness()` → DashboardScreen, OwnerProfileScreen

#### GET /owner/appointments
**Description:** Get all appointments for owner's business.
**Auth required:** OWNER
**Response 200:** Array of reservations with customer, employee, service
**Frontend caller:** `ownerService.getOwnerAppointments()` → RequestsScreen, DashboardScreen

#### POST /owner/appointments/:id/approve
**Description:** Approve a PENDING reservation.
**Auth required:** OWNER
**Response 200:** Updated reservation
**Response errors:** 404: Business or appointment not found
**Frontend caller:** `ownerService.approveAppointment()` → RequestsScreen

#### POST /owner/appointments/:id/reject
**Description:** Reject a reservation with an optional reason.
**Auth required:** OWNER
**Request body:** `{ reason?: string }`
**Response 200:** Updated reservation
**Side effects:** Creates a `booking_cancelled_by_business` Notification for the customer
**Frontend caller:** `ownerService.rejectAppointment()` → RequestsScreen

#### POST /owner/appointments/:id/complete
**Description:** Mark a reservation as COMPLETED (owner-side action).
**Auth required:** OWNER
**Response 200:** Updated reservation
**Frontend caller:** `ownerService.completeAppointment()` → RequestsScreen

#### GET /owner/employees
**Description:** Get all employees for owner's business.
**Auth required:** OWNER
**Response 200:** Array of Employee objects (all statuses)
**Frontend caller:** `ownerService.getEmployees()` → EmployeesScreen

#### POST /owner/employees
**Description:** Add a new employee manually (no join code required).
**Auth required:** OWNER
**Request body:** `{ fullName: string }`
**Response 201:** Created Employee
**Notes:** Creates employee without a linked User account (`userId: null`). No EmployeeSchedule or EmployeeService records created.
**Frontend caller:** `ownerService.addEmployee()` → EmployeesScreen

#### PUT /owner/employees/:id/approve
**Description:** Approve a pending employee join request.
**Auth required:** OWNER + `requireOwnerOverEmployee`
**Response 200:** Updated Employee (status: ACTIVE)
**Frontend caller:** `ownerService.approveEmployee()` → EmployeesScreen

#### PUT /owner/employees/:id/reject
**Description:** Reject a pending employee join request.
**Auth required:** OWNER + `requireOwnerOverEmployee`
**Response 200:** Updated Employee (status: REJECTED)
**Frontend caller:** `ownerService.rejectEmployee()` → EmployeesScreen

#### PUT /owner/employees/:id
**Description:** Update an employee's fullName.
**Auth required:** OWNER + `requireOwnerOverEmployee`
**Request body:** `{ fullName: string }`
**Response 200:** Updated Employee
**Notes:** Only `fullName` can be changed by owner. No specialization or service assignment from this endpoint.
**Frontend caller:** `ownerService.updateEmployee()` → EmployeesScreen (edit modal)

#### DELETE /owner/employees/:id
**Description:** Delete an employee from the business.
**Auth required:** OWNER + `requireOwnerOverEmployee`
**Response 200:** `{ success: true, data: null }`
**Frontend caller:** `ownerService.deleteEmployee()` → EmployeesScreen

#### GET /owner/services
**Description:** Get all services for owner's business.
**Auth required:** OWNER
**Response 200:** Array of Service objects (all isActive values)
**Frontend caller:** `ownerService.getServices()` → ServicesScreen

#### POST /owner/services
**Description:** Create a new service.
**Auth required:** OWNER
**Request body:** `{ name, description?, durationMin, price, businessId? }`
**Response 201:** Created Service
**Response errors:** 400: Name or description contains profanity
**Frontend caller:** `ownerService.addService()` → ServicesScreen

#### PUT /owner/services/:id
**Description:** Update a service's name, description, duration, or price.
**Auth required:** OWNER
**Request body:** `{ name?, description?, durationMin?, price? }`
**Response 200:** Updated Service
**Response errors:** 400: Profanity; 404: Service not found in this business
**Frontend caller:** `ownerService.updateService()` → ServicesScreen

#### DELETE /owner/services/:id
**Description:** Delete a service.
**Auth required:** OWNER
**Response 200:** `{ success: true, data: null }`
**Response errors:** 404: Service not found in this business
**Frontend caller:** `ownerService.deleteService()` → ServicesScreen

#### GET /owner/reviews
**Description:** Get all reviews for owner's business.
**Auth required:** OWNER
**Response 200:** Reviews with `user { id, fullName }`, ordered by createdAt DESC
**Frontend caller:** `ownerService.getReviews()` → OwnerReviewsScreen

#### GET /owner/pending-employees
**Description:** Get employees with status PENDING for owner's business.
**Auth required:** OWNER
**Response 200:** Array of `{ id, fullName, specialization, createdAt, user: { email } }`
**Frontend caller:** `ownerService.getPendingEmployees()` → EmployeesScreen

#### PUT /owner/business
**Description:** Update basic business info (name, description, address, city, phone).
**Auth required:** OWNER
**Request body:** `{ name?, description?, address?, city?, phone? }`
**Response 200:** Updated Business
**Frontend caller:** `ownerService.updateBusiness()` → OwnerProfileScreen

#### GET /owner/business/media
**Description:** Get all media for owner's business.
**Auth required:** OWNER
**Response 200:** Array of BusinessMedia objects ordered by createdAt ASC
**Frontend caller:** `ownerService.getMedia()` → OwnerProfileScreen

#### POST /owner/business/media
**Description:** Add a photo to the business gallery (max 5).
**Auth required:** OWNER
**Request body:** `{ url: string }` (base64 data URI in practice)
**Response 201:** Created BusinessMedia
**Response errors:** 400: Already at 5 photos
**Frontend caller:** `ownerService.addMedia()` → OwnerProfileScreen

#### DELETE /owner/business/media/:id
**Description:** Delete a business photo.
**Auth required:** OWNER
**Response 200:** `{ success: true, data: null }`
**Response errors:** 404: Media not in this business
**Frontend caller:** `ownerService.deleteMedia()` → OwnerProfileScreen

#### PATCH /owner/business
**Description:** Update business settings (joinCode toggle, releaseOnEarlyCompletion, cancellation window, booking TTL).
**Auth required:** OWNER
**Request body:** `{ joinCodeEnabled?: boolean, releaseOnEarlyCompletion?: boolean, cancellationWindowMinutes?: number, pendingBookingTTLHours?: number }`
**Response 200:** `{ id, joinCode, joinCodeEnabled, releaseOnEarlyCompletion, cancellationWindowMinutes, pendingBookingTTLHours }`
**Frontend caller:** `ownerService.updateBusinessSettings()` → OwnerProfileScreen

---

### Employee Routes (`/employee`) — requires `authenticateToken` + `authorizeRole('EMPLOYEE')`

All handlers additionally call `getActiveEmployee(userId)` which checks `employee.status === 'ACTIVE'`.

#### GET /employee/appointments
**Description:** Get the authenticated employee's appointments.
**Auth required:** EMPLOYEE (ACTIVE)
**Query params:** `?all=true` (returns all non-cancelled/rejected; default: today only)
**Response 200:** Reservations with `customer { id, fullName, email }` and `service { id, name, durationMin, price }`, ordered by startTime ASC
**Frontend caller:** `employeeService.getAppointments()` → EmployeeDashboardScreen, EmployeeCalendarScreen

#### POST /employee/appointments/:id/start
**Description:** Employee initiates a service — generates a 4-digit code and sends it to the customer via notification.
**Auth required:** EMPLOYEE (ACTIVE)
**Response 200:** `{ id, codeSent: true }`
**Response errors:**
- 403: Employee not active
- 404: Appointment not found (or not this employee's)
- 422: Not in APPROVED or PENDING status
**Side effects:** Sets `startCode` (random 4-digit), `startCodeExpiresAt` (5 min TTL). Creates `service_start_code` Notification for the customer with message `"CODE|serviceName|expiresAtISO"`.
**Frontend caller:** `employeeService.startAppointment()` → EmployeeDashboardScreen

#### POST /employee/appointments/:id/verify-start-code
**Description:** Employee enters the code the customer showed them to confirm arrival and move to IN_PROGRESS.
**Auth required:** EMPLOYEE (ACTIVE)
**Request body:** `{ code: string }`
**Response 200:** Updated reservation
**Response errors:**
- 400: Wrong code or expired code
- 404: Appointment not found
**Side effects:** Sets `actualStartTime = now`, `status = IN_PROGRESS`, `businessArrivalConfirmed = true`, clears startCode. Calls `resolveArrival()`.
**Frontend caller:** `employeeService.verifyStartCode()` → EmployeeDashboardScreen

#### POST /employee/appointments/:id/no-show
**Description:** Employee marks the customer as a no-show.
**Auth required:** EMPLOYEE (ACTIVE)
**Response 200:** Updated reservation
**Side effects:** Sets `businessArrivalConfirmed = false`. Calls `resolveArrival()` which may set status to NO_SHOW.
**Frontend caller:** `employeeService.noShowAppointment()` → EmployeeDashboardScreen

#### POST /employee/appointments/:id/complete
**Description:** Employee marks service as completed.
**Auth required:** EMPLOYEE (ACTIVE)
**Response 200:** Updated reservation
**Response errors:** 422: Not in IN_PROGRESS status
**Side effects:** Sets `actualEndTime = now`, `status = COMPLETED`. Because `actualEndTime` is now set, the availability engine's COALESCE (`actualEndTime ?? endTime`) will use this value in future slot queries, releasing the tail of the slot if early.
**Frontend caller:** `employeeService.completeAppointment()` → EmployeeDashboardScreen

#### POST /employee/appointments/:id/approve
**Description:** Employee approves a PENDING appointment assigned to them.
**Auth required:** EMPLOYEE (ACTIVE)
**Response 200:** Updated reservation (status: APPROVED)
**Frontend caller:** `employeeService.approveAppointment()` → EmployeeDashboardScreen

#### POST /employee/appointments/:id/decline
**Description:** Employee declines a PENDING appointment.
**Auth required:** EMPLOYEE (ACTIVE)
**Response 200:** Updated reservation (status: REJECTED)
**Side effects:** Creates `booking_cancelled_by_business` Notification for the customer
**Frontend caller:** `employeeService.declineAppointment()` → EmployeeDashboardScreen

#### POST /employee/join-business
**Description:** An authenticated EMPLOYEE user without an existing employee record requests to join a business by join code.
**Auth required:** EMPLOYEE
**Request body:** `{ joinCode: string }`
**Response 201:** `{ employee, businessName }`
**Response errors:**
- 403: Join code disabled
- 404: Invalid code or user not found
- 409: Already linked to a business
**Frontend caller:** `employeeService.joinBusiness()` → EmployeeProfileScreen

#### DELETE /employee/leave-business
**Description:** Dissociates the employee from their current business (sets userId to null on Employee record).
**Auth required:** EMPLOYEE
**Response 200:** `{ success: true, data: null }`
**Response errors:**
- 404: No business assignment
- 422: Not currently ACTIVE
**Frontend caller:** `employeeService.leaveBusiness()` → EmployeeProfileScreen

#### GET /employee/services
**Description:** Get all EmployeeService records for the authenticated employee.
**Auth required:** EMPLOYEE (ACTIVE)
**Response 200:** Array of `{ employeeService with service }` objects
**Frontend caller:** `employeeService.getServices()` → EmployeeServicesScreen

#### POST /employee/services/:serviceId
**Description:** Add a service to the employee's offered services.
**Auth required:** EMPLOYEE (ACTIVE)
**Request body:** `{ durationOverride?, priceOverride?, notes? }`
**Response 201:** Created EmployeeService with service
**Response errors:**
- 400: Notes contain profanity
- 404: Service not in employee's business
- 409: Already added
**Frontend caller:** `employeeService.addService()` → EmployeeServicesScreen

#### DELETE /employee/services/:serviceId
**Description:** Remove a service from employee's offered list.
**Auth required:** EMPLOYEE (ACTIVE)
**Response 200:** `{ success: true, data: null }`
**Response errors:** 404: Not in employee's service list
**Frontend caller:** `employeeService.removeService()` → EmployeeServicesScreen

#### GET /employee/schedule
**Description:** Get the employee's weekly schedule (up to 7 EmployeeSchedule records).
**Auth required:** EMPLOYEE (ACTIVE)
**Response 200:** Array of EmployeeSchedule records ordered by dayOfWeek ASC
**Frontend caller:** `employeeService.getSchedule()` → EmployeeScheduleScreen

#### PUT /employee/schedule
**Description:** Upsert the employee's weekly schedule.
**Auth required:** EMPLOYEE (ACTIVE)
**Request body:** `[{ dayOfWeek: int, startTime: "HH:MM", endTime: "HH:MM" }]`
**Response 200:** Array of upserted EmployeeSchedule records
**Response errors:** 422: Body must be an array
**Notes:** Uses Prisma `$transaction` with individual upserts. Missing days are not deleted — only provided days are touched.
**Frontend caller:** `employeeService.updateSchedule()` → EmployeeScheduleScreen

---

### Notification Routes (`/notifications`) — requires `authenticateToken`

#### GET /notifications
**Description:** Get the last 50 notifications for the authenticated user.
**Auth required:** Yes
**Response 200:** Array of Notification objects, ordered by createdAt DESC
**Frontend caller:** `notificationService.getNotifications()` → notificationStore polling (every 3s), NotificationsScreen

#### POST /notifications/:id/read
**Description:** Mark a notification as read.
**Auth required:** Yes
**Response 200:** `{ success: true, data: null }`
**Response errors:** 404: Notification not found or not owned by user
**Frontend caller:** `notificationService.markAsRead()` → NotificationsScreen

---

### Health Check

#### GET /health
**Auth required:** No
**Response 200:** `{ status: 'ok', timestamp: ISO, uptime: seconds }`
**Frontend caller:** `BackendHealthCheck` component (dev tool)


---

## 10. Services Layer

### `src/services/apiClient.ts`
**Purpose:** Centralized HTTP client with JWT auth, silent token refresh, request queue during refresh, and envelope unwrapping.

**Functions (exported):**
- `apiClient.get<T>(url, config?)` — GET request, returns unwrapped data
- `apiClient.post<T>(url, data?, config?)` — POST
- `apiClient.put<T>(url, data?, config?)` — PUT
- `apiClient.patch<T>(url, data?, config?)` — PATCH
- `apiClient.delete<T>(url, config?)` — DELETE
- `setLogoutCallback(fn)` — registers the authStore logout function; called once at module load
- `getIsLoggingOut()` — returns current logout lock state
- `setIsLoggingOut(bool)` — sets logout lock state (called by authStore)

**Key behavior:**
- All requests are blocked with `axios.Cancel` if `isLoggingOut === true`
- On 401/403 (non-auth endpoints): attempts token refresh once; queues concurrent requests
- Success responses: `{ success, data }` envelope is unwrapped; `response.data.data` returned directly
- Timeout: 10 seconds per request

---

### `src/services/authService.ts`
**Purpose:** Auth domain — registration, login, token management, profile.

| Function | Calls | Returns |
|---|---|---|
| `registerUser({ fullName, email, password, phone? })` | POST /auth/register-user | AuthResponse |
| `registerOwner({ fullName, email, password, phone?, businessName })` | POST /auth/register-owner | AuthResponse |
| `verifyJoinCode(code)` | POST /auth/verify-join-code | `{ businessId, businessName, isValid }` |
| `registerEmployee({ fullName, email, password, joinCode, specialization? })` | POST /auth/register-employee | AuthResponse |
| `login(credentials)` | POST /auth/login | AuthResponse (tokens NOT stored here) |
| `logout()` | POST /auth/logout | void (ignores errors) |
| `getMe()` | GET /auth/me | User (normalizes fullName → name, uppercases role) |
| `refreshToken()` | POST /auth/refresh | `{ accessToken, refreshToken }` |
| `getStoredTokens()` | SecureStore reads | `{ accessToken, refreshToken }` |
| `updateProfile(data)` | PUT /auth/profile/me | User |
| `changePassword(current, new)` | POST /auth/change-password/me | void |

**Note:** `authService.login()` does NOT store tokens — that happens in `authStore.login()` after role validation.

---

### `src/services/businessService.ts`
**Purpose:** Business discovery and detail.

| Function | Calls | Returns |
|---|---|---|
| `getRecommended(limit?)` | GET /businesses/recommended | Business[] |
| `getBusinesses(filters?)` | GET /businesses?search&minRating&serviceName | Business[] |
| `getBusiness(id)` | GET /businesses/:id | Business |
| `getEmployees(businessId)` | GET /businesses/:id/employees | Employee[] |
| `getServices(businessId)` | GET /businesses/:id/services | Service[] |
| `getAvailableTimeSlots(businessId, employeeId, date, serviceId?)` | GET /businesses/:id/time-slots?employeeId&date&serviceId | `{ time, available }[]` |

---

### `src/services/appointmentService.ts`
**Purpose:** Customer-side booking management.

| Function | Calls | Returns |
|---|---|---|
| `createAppointment(userId, data)` | POST /appointments | Appointment |
| `getAppointments(userId?)` | GET /appointments | Appointment[] |
| `cancelAppointment(id)` | POST /appointments/:id/cancel | void |
| `getAppointmentById(id)` | GET /appointments/:id | Appointment |
| `confirmArrival(id, arrived)` | POST /appointments/:id/confirm-arrival | Appointment |

**Note:** `userId` parameter in `createAppointment` and `getAppointments` is ignored; backend resolves user from JWT.

---

### `src/services/employeeService.ts`
**Purpose:** All employee-side actions.

| Function | Calls | Returns |
|---|---|---|
| `getAppointments()` | GET /employee/appointments | any[] (today only) |
| `getAllAppointments()` | GET /employee/appointments?all=true | any[] |
| `approveAppointment(id)` | POST /employee/appointments/:id/approve | any |
| `declineAppointment(id)` | POST /employee/appointments/:id/decline | any |
| `startAppointment(id)` | POST /employee/appointments/:id/start | `{ id, codeSent }` |
| `verifyStartCode(id, code)` | POST /employee/appointments/:id/verify-start-code | Reservation |
| `noShowAppointment(id)` | POST /employee/appointments/:id/no-show | any |
| `completeAppointment(id)` | POST /employee/appointments/:id/complete | any |
| `getServices()` | GET /employee/services | any[] (EmployeeService with service) |
| `addService(serviceId, overrides?)` | POST /employee/services/:serviceId | any |
| `removeService(serviceId)` | DELETE /employee/services/:serviceId | any |
| `joinBusiness(joinCode)` | POST /employee/join-business | `{ employee, businessName }` |
| `leaveBusiness()` | DELETE /employee/leave-business | any |
| `getSchedule()` | GET /employee/schedule | any[] |
| `updateSchedule(entries)` | PUT /employee/schedule | any[] |

---

### `src/services/ownerService.ts`
**Purpose:** Owner dashboard, appointments, staff, services, media, settings.

| Function | Calls | Returns |
|---|---|---|
| `getBusiness()` | GET /owner/business | Business |
| `updateBusiness(data)` | PUT /owner/business | Business |
| `getOwnerAppointments()` | GET /owner/appointments | Appointment[] |
| `approveAppointment(id)` | POST /owner/appointments/:id/approve | Appointment |
| `rejectAppointment(id, reason)` | POST /owner/appointments/:id/reject | Appointment |
| `completeAppointment(id)` | POST /owner/appointments/:id/complete | Appointment |
| `getCalendar(bId, start, end)` | GET /owner/calendar — **endpoint does not exist** | Appointment[] |
| `createEmployee(bId, data)` | POST /owner/employees | Employee |
| `updateEmployee(id, data)` | PUT /owner/employees/:id | Employee |
| `deleteEmployee(id)` | DELETE /owner/employees/:id | void |
| `getPendingEmployees()` | GET /owner/pending-employees | PendingEmployee[] |
| `approveEmployee(id)` | PUT /owner/employees/:id/approve | void |
| `rejectEmployee(id)` | PUT /owner/employees/:id/reject | void |
| `createService(bId, data)` | POST /owner/services | Service |
| `updateService(id, data)` | PUT /owner/services/:id | Service |
| `deleteService(id)` | DELETE /owner/services/:id | void |
| `updateBusinessSettings(data)` | PATCH /owner/business | Business |
| `getBusinessMedia()` | GET /owner/business/media | BusinessMedia[] |
| `addBusinessMedia(url)` | POST /owner/business/media | BusinessMedia |
| `deleteBusinessMedia(id)` | DELETE /owner/business/media/:id | void |
| `getReviewsToModerate(bId)` | GET /owner/reviews — note: `status=PENDING` param is ignored by backend | any[] |
| `approveReview(id)` | POST /owner/reviews/:id/approve — **endpoint does not exist** | any |
| `rejectReview(id, reason)` | POST /owner/reviews/:id/reject — **endpoint does not exist** | any |

---

### `src/services/reviewService.ts`
**Purpose:** Review submission and retrieval. Exports two objects.

**`reviewService`:**
| Function | Calls | Returns |
|---|---|---|
| `getReviews(businessId, page?, limit?)` | GET /businesses/:id/reviews | Review[] (returns `[]` on error) |
| `createReview(_userId, appointmentId, businessId, data)` | POST /appointments/:id/review | Review |
| `getReviewById(id)` | GET /reviews/:id — **endpoint does not exist** | Review |

**`ownerReviewService`:**
| Function | Calls | Returns |
|---|---|---|
| `getAllReviews()` | GET /owner/reviews | Review[] |
| `approveReview(id)` | POST /owner/reviews/:id/approve — **does not exist** | void |
| `rejectReview(id)` | POST /owner/reviews/:id/reject — **does not exist** | void |

---

### `src/services/notificationService.ts`
**Purpose:** Backend notification polling and mark-as-read.

| Function | Calls | Returns |
|---|---|---|
| `getNotifications()` | GET /notifications | BackendNotification[] |
| `markRead(id)` | POST /notifications/:id/read | void |

**Used by:** `notificationStore` polling loop (every 3 seconds in HomeScreen, DashboardScreen)


---

## 9. Shared Components Reference

### Badge
**File:** `src/components/Badge.tsx`
**Purpose:** Small pill-shaped label for status or count display.

**Props:**
- `label: string` — text displayed inside the badge (required)
- `variant?: 'primary' | 'secondary' | 'destructive' | 'muted'` — default: `'muted'`
- `icon?: Ionicons name` — optional icon before label
- `iconSize?: number` — default: 12

**Visual:** Pill with 22% opacity background matching variant color. Icon + text in matching solid color.

**Used by:** StatusBadge, EmployeesScreen status chips, DashboardScreen

---

### Button
**File:** `src/components/Button.tsx`
**Purpose:** Primary interactive button with 5 visual variants, 3 sizes, and loading state.

**Props:**
- `title: string` — button label (required)
- `variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'` — default: `'primary'`
- `size?: 'sm' | 'md' | 'lg'` — default: `'md'`
- `loading?: boolean` — shows ActivityIndicator, disables press
- `fullWidth?: boolean` — stretches to 100% width
- `disabled?: boolean` — reduces opacity to 0.5
- `textStyle?: TextStyle` — override text styles
- All `TouchableOpacityProps` pass through

**Visual:** Pill shape (borderRadius.pill). Primary: `colors.primary` background. Ghost: transparent with primary-colored text. Disabled/loading: 50% opacity.

**Used by:** Every screen with form submission or action triggers

---

### Card
**File:** `src/components/Card.tsx`
**Purpose:** Container with rounded corners, card background color, and shadow.

**Props:**
- `pressable?: boolean` — wraps in TouchableOpacity if true
- `onPress?: () => void` — required if pressable
- All `ViewProps` pass through

**Visual:** `borderRadius.xl`, `colors.card` background, `shadows.md`.

**Used by:** ServiceCard, ReviewCard, all business/booking list items

---

### Chip
**File:** `src/components/Chip.tsx`
**Purpose:** Selectable filter pill for horizontal chip rows.

**Props:**
- `label: string | ReactNode` — required
- `selected?: boolean` — default false; selected shows primary background
- `variant?: 'default' | 'primary' | 'secondary'` — affects selected color
- All `TouchableOpacityProps` pass through

**Visual:** Pill shape. Unselected: `colors.muted` background + `colors.mutedForeground` text. Selected: `colors.primary` background + `colors.primaryForeground` text.

**Used by:** SearchScreen category/service filter chips, EmployeeServicesScreen

---

### EmptyState
**File:** `src/components/EmptyState.tsx`
**Purpose:** Full-screen centered empty state with optional icon, title, and description.

**Props:**
- `icon?: Ionicons name` — 64px Ionicons icon
- `title: string` — required
- `description?: string` — optional subtitle

**Visual:** Centered column layout. Icon at top (64px, mutedForeground), then title (xl), then description (md, mutedForeground).

**Used by:** AppointmentsScreen (no bookings), NotificationsScreen (no notifications), EmployeeDashboardScreen

---

### Input
**File:** `src/components/Input.tsx`
**Purpose:** Themed text input with optional label and inline error message.

**Props:**
- `label?: string` — displayed above the input
- `error?: string` — shown below in destructive color; also turns border red
- `containerStyle?: ViewStyle` — outer container style
- All `TextInputProps` pass through

**Visual:** Pill-bordered input (`borderRadius.pill`). Normal border: `colors.inputBorder`. Error border: `colors.destructive`. Placeholder: `colors.placeholder`.

**Used by:** AuthScreen, EditProfileScreen, ChangePasswordScreen, ServicesScreen modal, EmployeesScreen modal

---

### LoadingScreen
**File:** `src/components/LoadingScreen.tsx`
**Purpose:** Full-screen loading overlay.

**Props:** None

**Visual:** `flex: 1` view with `colors.background`, centered large ActivityIndicator in `colors.primary`.

**Used by:** RootNavigator (during hydration), screens while data is loading

---

### LoadingSpinner
**File:** `src/components/LoadingSpinner.tsx`
**Purpose:** Inline loading spinner with padding.

**Props:**
- `size?: 'small' | 'large'` — default: `'large'`

**Visual:** Centered ActivityIndicator with `spacing.xl` padding on all sides.

**Used by:** RootNavigator hydration loading state, list placeholder states

---

### RatingStars
**File:** `src/components/RatingStars.tsx`
**Purpose:** 1–5 star row for display or interactive rating input.

**Props:**
- `rating: number` — current rating value (supports decimals, partial star with 40% opacity)
- `size?: number` — star icon size, default 20
- `interactive?: boolean` — if true, each star is tappable
- `onRate?: (rating: number) => void` — called when user taps a star

**Visual:** 5 stars in a row. Filled: `star` icon, `colors.secondary`. Empty: `star-outline` icon, `colors.muted`. Partial star: 40% opacity filled star. Tap target enlarged to 44px minimum with hitSlop.

**Used by:** ReviewScreen (interactive input), AverageRating (display), ReviewCard (display), business listings

---

### Toast
**File:** `src/components/Toast.tsx`
**Purpose:** Animated slide-down toast notification banner.

**Props:**
- `message: string` — required
- `type?: 'success' | 'error' | 'info'` — default: `'info'`
- `duration?: number` — auto-dismiss ms, default: 3000
- `onHide: () => void` — called after dismiss animation

**Visual:** Absolutely positioned at top (top: 60), full width minus margins. Slides in from above with opacity fade. Success: `colors.success`. Error: `colors.destructive`. Info: `colors.info`.

**Notable behavior:** Uses React Native's built-in `Animated` API (not Reanimated). Both enter and exit use 300ms timing. Auto-dismiss after `duration` ms.

**Used by:** Screens that need imperative success/error feedback (pattern: local `showToast` state)

---

### BackendHealthCheck
**File:** `src/components/BackendHealthCheck.tsx`
**Purpose:** Development-only indicator showing backend connectivity status.

**Props:** None

**Visual:** A small banner row (icon + text) that appears during dev only. Shows "checking" → "connected" (auto-hides after 2s) or "error" (auto-hides). Uses Ionicons + status-colored background.

**Notable behavior:** Only renders when `__DEV__ === true`. On error, returns null (silent failure in dev to avoid noise). Calls `GET /health` on mount with a 3-second timeout.

**Used by:** HomeScreen (top of screen during development)

---

### shared/AverageRating
**File:** `src/components/shared/AverageRating.tsx`
**Purpose:** Formatted aggregate rating display in two sizes.

**Props:**
- `averageRating: number` — handles NaN/Infinity safely (shows 0.0)
- `reviewCount: number`
- `size: 'compact' | 'full'`

**Visual:**
- `compact`: "4.8 [stars] (32)" in a horizontal row
- `full`: Large 64px rating number centered above star row, with "Based on N reviews" below

**Used by:** BusinessDetailScreen (header), BusinessReviewsScreen (header)

---

### shared/ReviewCard
**File:** `src/components/shared/ReviewCard.tsx`
**Purpose:** Card rendering a single review with user name, stars, date, and comment.

**Props:**
- `review: Review` — required
- `style?: object` — optional additional style

**Visual:** Card with user name + stars on left, date on right. Comment text below. Date formatted `en-GB` locale. Falls back to `t('common.anonymous')` if no user.

**Used by:** BusinessReviewsScreen, OwnerReviewsScreen

---

### shared/ServiceCard
**File:** `src/components/shared/ServiceCard.tsx`
**Purpose:** Service item card with role-specific action buttons.

**Props:**
- `service: Service` — required
- `variant: 'customer' | 'employee' | 'owner'` — controls which buttons appear
- `isSelected?: boolean` — employee variant: determines Add vs Remove button
- `onSelect?: () => void` — customer: card tap
- `onEdit?: () => void` — owner: edit button
- `onDelete?: () => void` — owner: delete button
- `onToggle?: () => void` — employee: add/remove toggle

**Visual:** Card with service name, description, price (Turkish Lira format), duration in minutes. Owner shows Edit + Delete buttons. Employee shows Add or Remove button. Customer is fully tappable.

**Used by:** ServicesScreen (owner), EmployeeServicesScreen (employee), BusinessDetailScreen (customer)

---

### shared/StatusBadge
**File:** `src/components/shared/StatusBadge.tsx`
**Purpose:** Maps a booking/employee status string to a translated, color-coded Badge.

**Props:**
- `status: string` — case-insensitive status string
- `size?: 'sm' | 'md'` — icon size, default `'sm'`

**Status mappings:**
| Status | Variant | Icon |
|---|---|---|
| `pending` | secondary | time-outline |
| `approved` / `confirmed` | primary | checkmark-circle-outline |
| `in_progress` | primary | cut-outline |
| `completed` | muted | checkmark-outline |
| `cancelled` / `rejected` | destructive | close-circle-outline |
| `no_show` | destructive | person-remove-outline |
| `disputed` | secondary | alert-circle-outline |

**Used by:** AppointmentsScreen, RequestsScreen, EmployeesScreen

---

### shared/ToastNotification
**File:** `src/components/shared/ToastNotification.tsx`
**Purpose:** Global push-down toast banner driven by `notificationStore`. Automatically shows the most recent unread notification.

**Props:** None (reads from stores)

**Visual:** Animated banner sliding down from top. Left-colored border matching notification type. Icon + title + body. Width = screen width minus `spacing.md` margins on both sides. Uses `react-native-reanimated` spring for enter, timing for exit.

**Notable behavior:**
- Listens to `notificationStore.notifications[0]`; shows it if `notification.userId === currentUserId`
- Tracks last shown ID via `useRef` to avoid re-showing the same notification
- Auto-dismisses after 3500ms
- Tap to dismiss

**Used by:** Rendered once in the root app component (wraps all screens)


---

## 8. Screen by Screen Reference

Complete reference for all 28 screen files.

---

### AUTH SCREENS

#### AuthScreen
**File:** `src/screens/auth/AuthScreen.tsx`
**Role:** auth
**Purpose:** Unified login and registration screen for all three roles (USER, EMPLOYEE, OWNER).

**Layout:**
Language toggle (TR / EN) at top right. BookIT logo and subtitle. Role tabs: Müşteri / Çalışan / İşletme Sahibi (chip row). Login/Register mode toggle. `react-hook-form` + Zod validated form fields. Demo account autofill buttons at bottom (Customer Demo, Owner Demo, Employee Demo chip row with `flexWrap: wrap`).

**Interactive elements:**
| Element | Action |
|---|---|
| TR / EN toggle | Calls `setAppLanguage()`, persists to AsyncStorage |
| Role tab chips | Sets `roleTab` state, changes form fields shown |
| Login / Register toggle | Sets `authMode` state |
| Email input | react-hook-form `Controller`, Zod email validation |
| Password input | react-hook-form, min 6 chars |
| Join Code input (employee reg) | 6-char uppercase, triggers verify-join-code API |
| Verify Code button | POST /auth/verify-join-code → shows business name on success |
| Login button | `authStore.login()` → role-based navigation |
| Register button | `authService.registerUser/Owner/Employee()` → login auto-called |
| Customer Demo button | Fills email: customer@demo.com / password: demo123 |
| Owner Demo button | Fills email: owner@demo.com / password: demo123 |
| Employee Demo button | Fills email: employee@demo.com / password: demo123 |

**Data fetched:** None (auth screen is unauthenticated)

**Mutations / API calls:**
| Endpoint | What it does | Effect |
|---|---|---|
| POST /auth/login | Authenticates user, returns JWT pair | Stores tokens, sets auth state, navigates to role tabs |
| POST /auth/register-user | Creates USER + Employee record | Auto-login on success |
| POST /auth/register-owner | Creates OWNER + Business with joinCode | Auto-login on success |
| POST /auth/register-employee | Creates EMPLOYEE + Employee(PENDING) | Navigates to EmployeePendingScreen |
| POST /auth/verify-join-code | Validates joinCode, returns businessName | Shows business name inline |

**Navigation:**
- Navigates to: UserTabs when login succeeds with role USER
- Navigates to: OwnerTabs when login succeeds with role OWNER
- Navigates to: EmployeeTabs when login succeeds with role EMPLOYEE + status ACTIVE
- Navigates to: EmployeePendingScreen when EMPLOYEE + status PENDING or after employee registration

**Notable implementation:**
Uses `zodResolver` for form validation. Employee registration has a two-step inline code verification — the Verify Code button must succeed before the main Register button is enabled. The join code input auto-uppercases. Role mismatch errors (e.g., logging in as OWNER when EMPLOYEE tab selected) are caught and shown via `Alert.alert`.

---

#### EmployeePendingScreen
**File:** `src/screens/auth/EmployeePendingScreen.tsx`
**Role:** auth
**Purpose:** Shown after employee registration or login when employee status is PENDING.

**Layout:**
Centered layout. Animated clock icon. Title "Onay Bekleniyor". Description text explaining the business owner must approve the request. Single "Geri Dön" (Go Back) button.

**Interactive elements:**
| Element | Action |
|---|---|
| Go Back button | Navigates back to AuthScreen |

**Data fetched:** None

**Notable implementation:**
Entry-point for employees who just registered. The screen is also reached if a PENDING employee logs in (RootNavigator checks `user.employee?.status`).

---

### USER (CUSTOMER) SCREENS

#### HomeScreen
**File:** `src/screens/user/HomeScreen.tsx`
**Role:** customer
**Purpose:** Customer discovery home page with nearby businesses, top-rated businesses, and visit-again history.

**Layout:**
Greeting header (first name + initials avatar). Optional location permission banner. Three horizontal card sections: "Yakınındakiler" (nearby), "Yüksek Puanlılar" (top-rated), "Tekrar Gidebilirsin" (visit again). Pull-to-refresh. Service start code bottom sheet Modal (auto-opens when service_start_code notification arrives).

**Interactive elements:**
| Element | Action |
|---|---|
| Allow Location button | Requests location permission, updates userCoords |
| Business card (nearby/top-rated) | Navigates to BusinessDetail |
| Visit-again card | Navigates to BusinessDetail |
| Start code sheet Close button | Marks notification as read, closes sheet |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.businesses.list()` | GET /businesses | Nearby + top-rated sections |
| `queryKeys.bookings.customerAll` | GET /appointments | Visit-again section (past COMPLETED) |
| `queryKeys.notifications.forUser` | GET /notifications | Cross-device start code delivery (3s poll) |

**Mutations / API calls:**
| Endpoint | What it does | Effect |
|---|---|---|
| POST /notifications/:id/read | Marks backend notification as read | Prevents re-showing on next poll |

**Navigation:**
- Navigates to: BusinessDetail with `{ businessId }` on card press

**Notable implementation:**
Three useMemo hooks derive `nearbyBusinesses` (sorted by GPS distance if location granted), `topRatedBusinesses` (sorted by averageRating), and `visitAgainItems` (deduplicated by businessId, most recent COMPLETED appointment per business). Skeleton cards shown during loading. 3-second polling for cross-device start code: `useQuery` with `refetchInterval: 3000, enabled: !!user && user.role === 'USER' && isFocused`. `processedBackendIds` ref prevents same notification triggering sheet twice. Business card images use `absoluteFill` Image over Ionicons icon fallback.

---

#### SearchScreen
**File:** `src/screens/user/SearchScreen.tsx`
**Role:** customer
**Purpose:** Full-text and filter-based business search with optional map view.

**Layout:**
Search input bar. Category chip row (Barber, Hair Color, Spa, etc.). Minimum rating filter chips. Business result cards (vertical list). Map modal button. Map modal: full-screen react-native-maps with business pins; tapping a pin shows business name + navigate button.

**Interactive elements:**
| Element | Action |
|---|---|
| Search input | Updates query state, filters results |
| Category chip | Toggles category filter |
| Rating chip (3+, 4+, 4.5+) | Sets minRating filter |
| Business card | Navigates to BusinessDetail |
| Map button | Opens map modal |
| Map pin | Shows callout with business name |
| Go to Business (callout) | Navigates to BusinessDetail, closes map |
| Close map button | Closes map modal |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.businesses.list()` | GET /businesses | Source for client-side filtering |

**Notable implementation:**
All filtering is client-side (no server-side search params). The map modal uses `pointerEvents="box-none"` on the overlay so map touch events pass through while the close button remains tappable. Business cards use absoluteFill Image over icon fallback for cover photo. `useBusinessLocation` hook provides GPS coordinates for distance badge.

---

#### BusinessDetailScreen
**File:** `src/screens/user/BusinessDetailScreen.tsx`
**Role:** customer
**Purpose:** Full business profile with photo gallery, service list, staff picker, availability slots, and inline booking form.

**Layout:**
Horizontal photo FlatList with pagination dots (or placeholder if no photos). Business name, rating, city. Info tab / Services tab. Booking panel: step 1 staff, step 2 service, step 3 date picker, step 4 time slot grid. Confirm Booking button. Reviews section at bottom.

**Interactive elements:**
| Element | Action |
|---|---|
| Photo swipe | Advances FlatList, updates dot indicator |
| Get Directions button | Opens maps app with business coordinates |
| Staff selector | Sets selectedEmployeeId, triggers slot refetch |
| Service selector | Sets selectedServiceId, triggers slot refetch |
| Date picker | Sets selectedDate |
| Time slot button | Sets selectedTimeSlot |
| Confirm Booking button | POST /appointments |
| Write Review button | Navigates to ReviewScreen |
| View All Reviews | Navigates to BusinessReviewsScreen |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.businesses.detail(id)` | GET /businesses/:id | Business info + media |
| `queryKeys.businesses.employees(id)` | GET /businesses/:id/employees | Staff picker |
| `queryKeys.businesses.services(id)` | GET /businesses/:id/services | Service picker |
| `queryKeys.businesses.timeSlots(id,date,empId,svcId)` | GET /businesses/:id/time-slots | Available slots |
| `queryKeys.businesses.reviews(id)` | GET /businesses/:id/reviews | Review list |

**Mutations / API calls:**
| Endpoint | What it does | Invalidates |
|---|---|---|
| POST /appointments | Creates booking | `queryKeys.bookings.customerAll` |

**Navigation:**
- Receives params: `businessId: string`
- Navigates to: ReviewScreen with `{ appointmentId, businessId }`

---

#### AppointmentsScreen
**File:** `src/screens/user/AppointmentsScreen.tsx`
**Role:** customer
**Purpose:** Customer's booking history with active/past tabs, cancellation, and arrival confirmation.

**Layout:**
Tab bar: Active / Past. FlatList of appointment cards per tab. Each card: business name, service, employee, date/time, status badge, action buttons. Arrival confirmation modal (yes/no) for APPROVED appointments.

**Interactive elements:**
| Element | Action |
|---|---|
| Active / Past tabs | Filters appointment list |
| Cancel button | Alert confirm → POST /appointments/:id/cancel |
| Leave Review button | Navigates to ReviewScreen |
| Arrival Yes/No | POST /appointments/:id/confirm-arrival |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.bookings.customerAll` | GET /appointments | Full appointment list |

**Mutations:**
| Endpoint | Invalidates |
|---|---|
| POST /appointments/:id/cancel | `queryKeys.bookings.customerAll` |
| POST /appointments/:id/confirm-arrival | `queryKeys.bookings.customerAll` |

**Navigation:**
- Navigates to: ReviewScreen with `{ appointmentId, businessId, serviceName }`

**Notable implementation:**
`arrivalConfirmed` local state (Record<id, boolean>) tracks which appointments had arrival confirmed this session to avoid duplicate prompts. Active tab shows: PENDING, APPROVED, IN_PROGRESS. Past tab shows: COMPLETED, CANCELLED, REJECTED, NO_SHOW, DISPUTED.

---

#### ProfileScreen
**File:** `src/screens/user/ProfileScreen.tsx`
**Role:** customer
**Purpose:** Customer profile with personal info, preferences, and logout.

**Layout:**
Avatar (initials circle or uploaded photo). Name, email, role badge. Edit Profile and Change Password buttons. Preferences section: dark mode toggle, language picker (TR/EN), notifications toggle. Logout button.

**Interactive elements:**
| Element | Action |
|---|---|
| Edit Profile button | Navigates to EditProfile stack screen |
| Change Password button | Navigates to ChangePassword stack screen |
| Dark Mode toggle | Toggles `appStore.isDarkMode`, persists to AsyncStorage |
| TR / EN language picker | Calls `setAppLanguage()` |
| Logout | Calls `authStore.logout()`, navigates to AuthScreen |

**Data fetched:** None (user data from `authStore`)

---

#### EditProfileScreen
**File:** `src/screens/user/EditProfileScreen.tsx`
**Role:** customer (also accessible to employee via their own profile screen)
**Purpose:** Edit name, email, and avatar photo.

**Layout:**
Avatar with camera icon overlay (tap to upload). Name input. Email input. Save Changes button. Cancel button.

**Interactive elements:**
| Element | Action |
|---|---|
| Avatar tap | `expo-image-picker` → crop 1:1 → base64 → PUT /auth/profile/:userId |
| Save Changes | PUT /auth/profile/:userId |

**Mutations:**
| Endpoint | Invalidates |
|---|---|
| PUT /auth/profile/:userId | Updates `authStore.user` directly |

---

#### ChangePasswordScreen
**File:** `src/screens/user/ChangePasswordScreen.tsx`
**Role:** customer
**Purpose:** Change account password via current + new password form.

**Layout:**
Current Password input. New Password input. Confirm Password input. Change Password button.

**Mutations:**
| Endpoint | What it does |
|---|---|
| POST /auth/change-password/:userId | Verifies current, sets new bcrypt hash |

---

#### ReviewScreen
**File:** `src/screens/user/ReviewScreen.tsx`
**Role:** customer
**Purpose:** Submit or update a review for a completed appointment.

**Layout:**
1–5 star rating row (tappable). Comment text input. Submit / Update button.

**Interactive elements:**
| Element | Action |
|---|---|
| Star tap | Sets `rating` state |
| Comment input | Updates `comment` state |
| Submit button | POST /appointments/:id/review |

**Mutations:**
| Endpoint | Invalidates |
|---|---|
| POST /appointments/:id/review | `queryKeys.businesses.reviews(businessId)`, `queryKeys.bookings.customerAll` |

**Navigation:**
- Receives params: `appointmentId: string`, `businessId: string`, `serviceName?: string`

**Notable implementation:**
Review starts as PENDING; only appears publicly after owner approves it. Profanity filter applied on backend.

---

#### BusinessReviewsScreen
**File:** `src/screens/user/BusinessReviewsScreen.tsx`
**Role:** customer
**Purpose:** Full review list for a business with rating distribution chart.

**Layout:**
Average rating (large). 5-4-3-2-1 star distribution bars. Scrollable review card list.

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.businesses.reviews(id)` | GET /businesses/:id/reviews | Review list + rating calc |

**Navigation:**
- Receives params: `businessId: string`, `businessName: string`

---

### EMPLOYEE SCREENS

#### EmployeeDashboardScreen
**File:** `src/screens/employee/EmployeeDashboardScreen.tsx`
**Role:** employee
**Purpose:** Employee home with today's appointments, pending/approved summary cards, and start/complete actions.

**Layout:**
SafeAreaView. Summary cards row: Today / Pending / Completed counts. Pending appointments section: PENDING reservations with Approve / Decline buttons. Today's Schedule section: sorted list of today's approved appointments with Start and Complete buttons.

**Interactive elements:**
| Element | Action |
|---|---|
| Approve button (pending) | POST /employee/appointments/:id/approve → APPROVED |
| Decline button (pending) | POST /employee/appointments/:id/decline → REJECTED + notification |
| Start button | POST /employee/appointments/:id/start → generates code, opens nothing (code delivered to customer) |
| Complete button | POST /employee/appointments/:id/complete → COMPLETED |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.bookings.employeeAll` | GET /employee/appointments?all=true | All appointments for summary |

**Mutations:**
All POST calls invalidate `queryKeys.bookings.employeeAll`, `queryKeys.bookings.ownerAll`, `queryKeys.bookings.customerAll`.

**Notable implementation:**
Start button triggers the 4-digit code flow: backend creates Notification DB row, frontend also calls `addNotification()` (same-device path). The dashboard uses `useFocusEffect` to re-fetch on screen focus.

---

#### EmployeeHomeScreen
**File:** `src/screens/employee/EmployeeHomeScreen.tsx`
**Role:** employee
**Purpose:** Alternative employee home (simpler today-only view). May be the tab home depending on navigator configuration.

**Layout:**
Today's date header. Appointment list for today only. Each card: customer name, service, time, status badge, action buttons.

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.bookings.employeeAll` | GET /employee/appointments | Today's appointments |

---

#### EmployeeCalendarScreen
**File:** `src/screens/employee/EmployeeCalendarScreen.tsx`
**Role:** employee
**Purpose:** Weekly calendar view of all appointments with per-day selection and 4-digit start code entry sheet.

**Layout:**
Collapsible calendar header: collapsed = 7-day week strip with dot markers; expanded = full `react-native-calendars` Calendar component. Toggle button animates height with Animated.spring. Day appointment list below. 4-digit code entry Modal bottom sheet (KeyboardAvoidingView + Pressable overlay).

**Interactive elements:**
| Element | Action |
|---|---|
| Day cell (week strip) | Sets `selectedDate`, shows that day's appointments |
| Calendar day (expanded) | Same |
| Calendar expand/collapse button | Animates height COLLAPSED_H (72) ↔ EXPANDED_H (360) |
| Start (play icon) | POST /employee/appointments/:id/start → opens code sheet |
| Complete (checkmark) | POST /employee/appointments/:id/complete |
| Code digit inputs | Auto-advance, auto-back on backspace, autoFocus first box |
| Verify button | POST /employee/appointments/:id/verify-start-code |
| Sheet overlay press | Closes code sheet |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.bookings.employeeAll` | GET /employee/appointments?all=true | All appointments for calendar markers |

**Notable implementation:**
`Modal → Pressable(overlay) → KeyboardAvoidingView → Pressable(sheet)` prevents keyboard from covering the digit inputs. The `processedBackendIds` pattern is not used here (that's on HomeScreen). Sheet status text "Müşteri kodu alıyor..." shown above digit row via `t('startCode.waitingForCustomer')`.

---

#### EmployeeServicesScreen
**File:** `src/screens/employee/EmployeeServicesScreen.tsx`
**Role:** employee
**Purpose:** Manage which of the business's services the employee offers.

**Layout:**
Two sections: "My Services" (added) and "All Business Services" (all). Each service row has a toggle switch. Price and duration shown. Optional duration/price override inputs and notes field when adding.

**Interactive elements:**
| Element | Action |
|---|---|
| Toggle on service | POST /employee/services/:serviceId (add) or DELETE /employee/services/:serviceId (remove) |
| Duration override input | Updates the per-employee duration |
| Price override input | Updates the per-employee price |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.employees.services(empId)` | GET /employee/services | Current employee services |
| `queryKeys.businesses.services(bizId)` | GET /businesses/:id/services | All business services |

**Mutations:**
Both POST and DELETE invalidate `queryKeys.employees.services`, `queryKeys.businesses.services`, and `queryKeys.businesses.timeSlots` so customer-facing availability updates immediately.

---

#### EmployeeScheduleScreen
**File:** `src/screens/employee/EmployeeScheduleScreen.tsx`
**Role:** employee
**Purpose:** Set weekly working hours (7 days, start/end time per day, day-off toggle).

**Layout:**
7 day rows (Monday–Sunday). Each row: day name, Day Off toggle, start time picker, end time picker. Save Schedule button.

**Interactive elements:**
| Element | Action |
|---|---|
| Day Off toggle | Marks day as closed (removes from schedule) |
| Start/End time | Platform time picker (iOS wheel / Android dialog) |
| Save Schedule | PUT /employee/schedule with array of {dayOfWeek, startTime, endTime} |

**Mutations:**
| Endpoint | Invalidates |
|---|---|
| PUT /employee/schedule | `queryKeys.employees.schedule`, `queryKeys.businesses.timeSlots` |

---

#### EmployeeProfileScreen
**File:** `src/screens/employee/EmployeeProfileScreen.tsx`
**Role:** employee
**Purpose:** Employee profile with personal info, workplace card, and preferences.

**Layout:**
Avatar + name + email + role badge. "Profili Düzenle" button → EmployeeEditProfileScreen. Workplace card (3 states: unassigned / PENDING / ACTIVE). Preferences: dark mode, language, notifications. Logout button.

**Interactive elements:**
| Element | Action |
|---|---|
| Edit Profile button | Navigates to EmployeeEditProfileScreen |
| JoinCode input (unassigned state) | Allows joining a business |
| Send Join Request button | POST /employee/join-business |
| Leave Business button | Alert confirm → DELETE /employee/leave-business |
| Dark Mode toggle | Toggles `appStore.isDarkMode` |
| Language picker | `setAppLanguage()` |
| Logout | `authStore.logout()` |

**Notable implementation:**
Workplace card has three display states: (A) no employee record → show join code form; (B) employee.status === PENDING → show pending indicator with clock icon; (C) status === ACTIVE → show business name/city + Leave Business button.

---

#### EmployeeEditProfileScreen
**File:** `src/screens/employee/EmployeeEditProfileScreen.tsx`
**Role:** employee
**Purpose:** Edit employee name, email, and avatar.

**Layout:**
Identical to user EditProfileScreen: avatar with camera overlay, name input, email input, Save/Cancel buttons.

**Mutations:**
| Endpoint | What it does |
|---|---|
| PUT /auth/profile/:userId | Updates name/email/avatarUrl, refreshes authStore.user |

---

### OWNER SCREENS

#### DashboardScreen
**File:** `src/screens/owner/DashboardScreen.tsx`
**Role:** owner
**Purpose:** Business analytics dashboard with chart, stat grid, revenue, staff performance, and pending employee management.

**Layout:**
Business name header + Day/Month/Year filter pills. Pending Employees section (if any). Average Rating card (large rating number, star row, review count). Bar chart (`react-native-gifted-charts` BarChart) with 4 color-coded series. 2×2 stat grid (Completed / Confirmed / No Show / Cancelled). Total Revenue card with trend badge (% vs previous period, up/down arrow icon). Staff Performance list (per-employee revenue + completed count).

**Interactive elements:**
| Element | Action |
|---|---|
| Day / Month / Year filter | Sets `rangeFilter`, re-derives chart data |
| Approve button (pending employee) | PUT /owner/employees/:id/approve → ACTIVE |
| Reject button (pending employee) | PUT /owner/employees/:id/reject → REJECTED |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.owner.business` | GET /owner/business | Business name |
| `queryKeys.bookings.ownerAll` | GET /owner/appointments | Chart + stats + revenue |
| `queryKeys.employees.pending` | GET /owner/pending-employees | Pending employee section |
| `queryKeys.businesses.reviews(id)` | GET /businesses/:id/reviews | Average rating card |

**Notable implementation:**
All chart data is derived client-side with `useMemo`. `niceStep()` function computes clean Y-axis grid steps. Day range groups by 2-hour buckets (8am–6pm). Month range groups by ISO week (W1–W4). Year range shows only months that have at least one booking. Revenue trend compares current period vs same-length prior period and shows `+X%` / `-X%` badge.

---

#### RequestsScreen
**File:** `src/screens/owner/RequestsScreen.tsx`
**Role:** owner
**Purpose:** View and action all appointment requests (approve, reject, complete).

**Layout:**
Filter tabs: All / Pending / Approved / Rejected. FlatList of appointment cards. Each card: customer, service, employee, date/time, status badge. Action buttons per status: Approve + Reject (PENDING), Complete (APPROVED).

**Interactive elements:**
| Element | Action |
|---|---|
| Filter tabs | Sets `filter` state |
| Approve | POST /owner/appointments/:id/approve → APPROVED |
| Reject | Alert for reason input → POST /owner/appointments/:id/reject |
| Complete | POST /owner/appointments/:id/complete → COMPLETED |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.bookings.ownerAll` | GET /owner/appointments | Appointment list |

---

#### EmployeesScreen
**File:** `src/screens/owner/EmployeesScreen.tsx`
**Role:** owner
**Purpose:** Manage employees — view list, add new, edit, delete, see status.

**Layout:**
Employee list cards with ACTIVE/PENDING/REJECTED status badge. Add Employee FAB or button. Edit/Delete swipe actions or buttons.

**Interactive elements:**
| Element | Action |
|---|---|
| Add Employee | Opens modal with name input → POST /owner/employees |
| Edit | Opens edit modal → PUT /owner/employees/:id |
| Delete | Alert confirm → DELETE /owner/employees/:id |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.employees.forBusiness(bizId)` | GET /owner/employees | Employee list |

---

#### ServicesScreen
**File:** `src/screens/owner/ServicesScreen.tsx`
**Role:** owner
**Purpose:** Manage business services (CRUD).

**Layout:**
Service cards: name, price, duration, active/inactive badge. Add Service button (opens bottom sheet form). Edit/Delete per card.

**Interactive elements:**
| Element | Action |
|---|---|
| Add Service | Opens form sheet → POST /owner/services |
| Edit | Populates form → PUT /owner/services/:id |
| Delete | Alert confirm → DELETE /owner/services/:id |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.owner.services` | GET /owner/services | Service list |

**Mutations:** All invalidate `queryKeys.owner.services` and `queryKeys.businesses.services(bizId)`.

---

#### OwnerProfileScreen
**File:** `src/screens/owner/OwnerProfileScreen.tsx`
**Role:** owner
**Purpose:** Business profile editing, photo gallery management, join code, business settings toggles.

**Layout:**
Business info form (name, description, address, city, phone). Business Photos section: horizontal scroll of uploaded photos, Add Photo button, delete icon per photo. Business Settings card: Join Code display + copy button, joinCodeEnabled toggle, releaseOnEarlyCompletion toggle. Owner personal info section. Preferences: dark mode, language. Logout.

**Interactive elements:**
| Element | Action |
|---|---|
| Business info Save | PUT /owner/business |
| Add Photo | expo-image-picker → base64 → POST /owner/business/media |
| Delete Photo | Alert confirm → DELETE /owner/business/media/:id |
| Copy Join Code | Expo Clipboard → shows "Copied!" toast |
| joinCodeEnabled toggle | Sets local state |
| releaseOnEarlyCompletion toggle | Sets local state |
| Save Settings button | PATCH /owner/business |
| Logout | `authStore.logout()` |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.owner.business` | GET /owner/business | Business info + media + settings |

**Notable implementation:**
Photo upload and delete both call `queryClient.invalidateQueries` on `businesses.detail` and `businesses.list` so customer-facing screens immediately reflect changes. Photos are stored as base64 data URIs in the `business_media` table.

---

#### OwnerReviewsScreen
**File:** `src/screens/owner/OwnerReviewsScreen.tsx`
**Role:** owner
**Purpose:** Moderate customer reviews — approve or reject pending reviews.

**Layout:**
Review cards: customer name, rating stars, comment, date. PENDING reviews show Approve / Reject buttons. APPROVED/REJECTED show status badge.

**Interactive elements:**
| Element | Action |
|---|---|
| Approve | POST /owner/reviews/:id/approve → review.status = APPROVED |
| Reject | POST /owner/reviews/:id/reject → review.status = REJECTED |

**Data fetched:**
| queryKey | Endpoint | Used for |
|---|---|---|
| `queryKeys.reviews.forOwner` | GET /owner/reviews | Review moderation list |

---

### SHARED SCREENS

#### NotificationsScreen
**File:** `src/screens/shared/NotificationsScreen.tsx`
**Role:** all (accessible from Profile tabs of all roles)
**Purpose:** In-app notification inbox displaying all notifications for the logged-in user.

**Layout:**
Header with back button, title, "Mark All as Read" button. FlatList of notification rows. Unread rows have tinted background. Each row: icon (type-specific), title, body text, time-ago label. `service_start_code` notifications render the 4-digit code as large text (28px, letter-spacing 6) instead of the raw body string.

**Interactive elements:**
| Element | Action |
|---|---|
| Back button | `navigation.goBack()` |
| Mark All as Read | `notificationStore.markAllAsRead()` |
| Notification row tap | `notificationStore.markAsRead(id)` |

**Data source:** `useNotificationStore((s) => s.notifications)` — filtered to `userId === user.id`

**Notable implementation:**
`service_start_code` type gets special render path: body is split on `|` to extract code and serviceName; code shown at 28px with 6px letter-spacing. All other types use generic icon + title + body layout. Icon mapping: `booking_confirmed` / `employee_approved` → checkmark-circle; `booking_cancelled` / `rejected` → close-circle; `service_start_code` → key-outline; default → notifications-outline.


---

## 7. Feature Deep Dives

End-to-end flow for all 38 features.

---

#### Feature 1: Customer Registration
**Roles affected:** USER
**Status:** Working

**User story:** A new user creates a customer account with email and password and is immediately logged in.

**Frontend flow:** AuthScreen → roleTab = 'user' → authMode = 'register' → react-hook-form with Zod (email, password min 6, confirmPassword match, fullName min 2) → Submit calls `authService.registerUser()`

**API call(s):** `POST /auth/register-user { fullName, email, password }`

**Backend logic:** bcrypt hashes password (10 rounds). Creates `User(role: USER)`. Signs accessToken (1d) and refreshToken (7d) with JWT_SECRET. Returns tokens + user object.

**Database:** INSERT into `users` (id, email, password_hash, full_name, role='USER')

**Response handling:** `authStore.login()` called with returned user+tokens. Tokens stored in `SecureStore('accessToken')` and `SecureStore('refreshToken')`. Navigation → UserTabs.

**Edge cases:** Duplicate email → 409 "Email already in use". Zod validation catches empty fields before API call.

**Known issues:** None identified.

---

#### Feature 2: Employee Registration with Join Code
**Roles affected:** EMPLOYEE
**Status:** Working

**User story:** A new employee enters the business's 6-character join code, verifies it, fills name/email/password, and submits — landing in a pending approval screen.

**Frontend flow:** AuthScreen → roleTab = 'employee' → authMode = 'register' → Enter joinCode → tap "Verify Code" → POST /auth/verify-join-code → success shows "Verified: [BusinessName]" → fill name/email/password → Submit → POST /auth/register-employee → navigate to EmployeePendingScreen

**API call(s):**
1. `POST /auth/verify-join-code { code: "CRAFT1" }` → `{ businessId, businessName, isValid }`
2. `POST /auth/register-employee { fullName, email, password, joinCode, specialization? }`

**Backend logic (register-employee):** Finds Business by joinCode (checks joinCodeEnabled). Creates User(role: EMPLOYEE). Creates Employee(userId, businessId, status: PENDING). Returns tokens.

**Database:** INSERT users, INSERT employees (status='PENDING')

**Response handling:** After registration, navigates to EmployeePendingScreen regardless of token. Employee cannot access EmployeeTabs until owner approves.

**Edge cases:** Invalid joinCode → 404. Disabled joinCode → 403. Duplicate email → 409.

---

#### Feature 3: Business Owner Registration
**Roles affected:** OWNER
**Status:** Working

**User story:** A business owner registers, and their business is automatically created with a unique join code.

**Frontend flow:** AuthScreen → roleTab = 'owner' → authMode = 'register' → businessName field visible → Submit → POST /auth/register-owner

**API call(s):** `POST /auth/register-owner { fullName, email, password, businessName }`

**Backend logic:** bcrypt hash. Creates User(role: OWNER). Generates joinCode via `generateJoinCode()` (6-char uppercase alphanumeric using crypto.randomBytes). Creates Business(ownerId, name, joinCode). Returns tokens.

**Database:** INSERT users, INSERT businesses (join_code, join_code_enabled=true, release_on_early_completion=true)

---

#### Feature 4: Login — All Roles
**Roles affected:** All
**Status:** Working

**User story:** User enters email/password, is authenticated, and arrives at the correct tab interface for their role.

**Frontend flow:** AuthScreen → roleTab matches user's role → handleLogin() → `authStore.login(email, password)` → POST /auth/login → store tokens → RootNavigator re-renders based on `user.role`

**API call(s):** `POST /auth/login { email, password }`

**Backend logic:** Find User by email. bcrypt.compare password. Sign JWT payload `{ userId, role, email }`. Return `{ user, accessToken, refreshToken }`.

**Response handling:** RootNavigator reads `authStore.user.role`:
- `USER` → UserTabs
- `OWNER` → OwnerTabs
- `EMPLOYEE` + status `ACTIVE` → EmployeeTabs
- `EMPLOYEE` + status `PENDING` → EmployeePendingScreen
- `EMPLOYEE` + status `REJECTED` → Alert error, stay on AuthScreen

**Role mismatch detection:** AuthScreen compares `user.role` against the selected `roleTab`. If they don't match (e.g., OWNER logged into EMPLOYEE tab), shows Alert with correction hint.

---

#### Feature 5: Employee Pending/Approved/Rejected Flow
**Roles affected:** EMPLOYEE, OWNER
**Status:** Working

**User story:** After registration, employee waits for owner approval. Owner sees the pending request, approves or rejects it. Employee logs in again to access the app.

**Flow:**
1. Employee registers → Employee(status: PENDING) created
2. Owner opens DashboardScreen → pending-employees section populated via GET /owner/pending-employees
3. Owner taps Approve → PUT /owner/employees/:id/approve → Employee.status = ACTIVE
4. Employee logs in again → GET /auth/me returns employee.status = ACTIVE → EmployeeTabs shown

**API calls:**
- `GET /owner/pending-employees` → list of PENDING employees for this business
- `PUT /owner/employees/:id/approve` → sets status = ACTIVE
- `PUT /owner/employees/:id/reject` → sets status = REJECTED

**Database:** UPDATE employees SET status = 'ACTIVE'/'REJECTED'

**Edge cases:** REJECTED employee gets error message on next login and cannot access app.

---

#### Feature 6: Home Screen Sections
**Roles affected:** USER
**Status:** Working

**User story:** Customer opens the app and sees businesses near them, top-rated businesses, and businesses they've visited before.

**Nearby section:** `useMemo` filters businesses with `locationLat/Lng != null`. If GPS granted, uses `calculateDistance()` (Haversine formula) and sorts ascending. If GPS not granted, shows first 6 by list order. Distance shown as "X m" or "X.X km".

**Top-rated section:** Filters `averageRating > 0`, sorts by rating desc, then reviewCount desc as tiebreaker. Shows max 6.

**Visit-again section:** From past COMPLETED appointments, deduplicated by businessId (keeps most recent visit per business). Shows business name, last service name, "N days ago" label.

**API calls:**
- `GET /businesses` → all businesses with `media` array (first photo included)
- `GET /appointments` → past appointments for visit-again derivation

---

#### Feature 7: Search with Filters
**Roles affected:** USER
**Status:** Working

**User story:** Customer searches by business name/city or selects a category chip or minimum rating filter to find matching businesses.

**Frontend flow:** SearchScreen → all filtering is client-side on `businesses` TanStack Query data → `useMemo` applies text search (name or city contains query, case-insensitive), category filter (service name contains chip text), and minRating filter.

**API call:** `GET /businesses` (data cached, no server-side search params sent)

**Notable:** Zero latency filtering — no debounce needed since it's in-memory. Category chips are predefined strings that filter `business.tags` or service names.

---

#### Feature 8: Map View
**Roles affected:** USER
**Status:** Working

**User story:** Customer taps the map button on SearchScreen and sees all businesses with coordinates pinned on a map. Tapping a pin shows a callout with the business name and a navigation button.

**Frontend flow:** SearchScreen → map button → `mapVisible` state → Modal with `react-native-maps` MapView → business coordinates rendered as `Marker` components → tap marker → `Callout` shows name + "Go to Business" button → navigate to BusinessDetail, close map

**Data source:** Same `businesses` query already loaded by SearchScreen. No extra API call.

**Notable:** `pointerEvents="box-none"` on overlay view allows map gestures to pass through while keeping the close button interactive. Safe area insets applied to close button position.

---

#### Feature 9: Business Detail View
**Roles affected:** USER
**Status:** Working

**User story:** Customer sees the full business profile — photos, info, services, available staff, time slots — and can book an appointment.

**Layout:** Photo gallery (horizontal paginated FlatList with dot indicator), rating, city, address, hours. Two tabs: About / Services. Services tab contains the full booking form inline.

**Data:** 5 parallel queries (detail, employees, services, timeSlots, reviews). Time slot query is `enabled: !!selectedDate && !!selectedServiceId` to avoid fetching without required params.

**Notable:** Photo gallery uses `viewabilityConfig` with `viewAreaCoveragePercentThreshold: 50` to update dot indicator. If no photos, shows placeholder with storefront icon.

---

#### Feature 10: Booking Creation
**Roles affected:** USER
**Status:** Working

**User story:** Customer selects a service, optionally a staff member, picks a date and time slot, and confirms the appointment.

**Frontend flow:**
1. Service selector → sets `selectedServiceId`
2. Employee picker (optional, "Any available" option) → sets `selectedEmployeeId`
3. Date picker (calendar or date input) → sets `selectedDate`
4. Time slots auto-fetch via GET /businesses/:id/time-slots
5. Slot grid renders available slots as tappable chips
6. Confirm Booking → POST /appointments

**API call:** `POST /appointments { businessId, employeeId, serviceId, date, timeSlot }`

**Backend logic:** Finds business and service. Validates slot availability. Creates Reservation(status: PENDING). If business has no confirmation requirement, could auto-approve (current implementation creates PENDING and waits for owner/employee action).

**Database:** INSERT reservations

**Response handling:** Invalidates `queryKeys.bookings.customerAll`. Shows success toast. Form resets.

---

#### Feature 11: Availability Engine
**Roles affected:** USER (consumes slots), EMPLOYEE (schedule source)
**Status:** Working

**User story:** Customer sees only truly available time slots for a chosen service and staff member.

**Backend algorithm (`GET /businesses/:id/time-slots`):**
1. Find EmployeeSchedule for the requested `dayOfWeek`. If none → return `[]`.
2. Generate slot grid from `workStart` to `workEnd` stepping by `serviceDurationMin` minutes.
3. Single Prisma query: all reservations for that employee on that date with status in `['PENDING', 'APPROVED', 'IN_PROGRESS']`.
4. For each reservation: `busyEnd = actualEndTime ?? endTime` (COALESCE — early completion releases the slot immediately).
5. Filter slots where `slotStart < busyEnd && slotEnd > busyStart` (standard interval overlap).
6. Filter out past slots (for today's date, `slot > now`).
7. Return `{ slots: [{ time: ISO, available: boolean }] }`.

**Double-booking protection:** `@@unique([employeeId, startTime])` on reservations table prevents two bookings at identical start times at the DB level (last line of defense).

---

#### Feature 12: Booking Status Transitions
**Roles affected:** All
**Status:** Working

**Transition graph:**
```
PENDING → APPROVED (owner/employee approves)
PENDING → REJECTED (owner/employee rejects)
APPROVED → IN_PROGRESS (employee starts, code verified)
APPROVED → CANCELLED (customer or business cancels)
IN_PROGRESS → COMPLETED (employee completes)
COMPLETED → (review possible)
Any → NO_SHOW (arrival confirmation both sides disagree)
Any → DISPUTED (edge case in resolveArrival)
```

**Endpoints per transition:**
- PENDING→APPROVED: POST /owner/appointments/:id/approve OR POST /employee/appointments/:id/approve
- PENDING→REJECTED: POST /owner/appointments/:id/reject OR POST /employee/appointments/:id/decline
- APPROVED→IN_PROGRESS: POST /employee/appointments/:id/verify-start-code (code verified)
- APPROVED→CANCELLED: POST /appointments/:id/cancel (customer)
- IN_PROGRESS→COMPLETED: POST /employee/appointments/:id/complete
- APPROVED→NO_SHOW: POST /employee/appointments/:id/no-show + resolveArrival logic

---

#### Feature 13: 4-Digit Service Start Code
**Roles affected:** EMPLOYEE (generates), USER (receives and shows)
**Status:** Working (cross-device via backend polling)

**User story:** Employee taps Start on an appointment. Customer on their device (potentially different) sees a 4-digit code. Employee enters the code to confirm the customer is present.

**Full flow:**
1. Employee taps Start button → POST /employee/appointments/:id/start
2. Backend: generates code = `Math.floor(Math.random() * 9000) + 1000` (always 4 digits). Saves `startCode` + `startCodeExpiresAt` (now + 5 min) to reservation. Creates `Notification(userId: customerId, type: 'service_start_code', message: '${code}|${serviceName}|${expiresAt.toISOString()}')`.
3. Backend returns `{ id, codeSent: true }` — code NOT in response.
4. Frontend (employee side): also calls `addNotification()` in Zustand for same-device demo path.
5. Customer HomeScreen: polls `GET /notifications` every 3s (`refetchInterval: 3000, refetchIntervalInBackground: false, enabled: isFocused`).
6. Poll finds unread `service_start_code` notification → `processedBackendIds.current.add(id)` → calls `POST /notifications/:id/read` → `addNotificationFromBackend()` to Zustand inbox → opens bottom sheet with large code display.
7. Customer shows code to employee.
8. Employee enters 4 digits → POST /employee/appointments/:id/verify-start-code `{ code }`.
9. Backend: compares code, checks expiry. On match → sets `actualStartTime = now`, `status = IN_PROGRESS`, clears `startCode`.

**Deduplication:** `processedBackendIds` Set prevents same notification triggering sheet twice. `startCodeSheet.visible` check prevents second sheet while first is open (same-device scenario where Zustand path also fires).

**Edge cases:** Expired code → 400 "Kodun süresi doldu". Wrong code → 400 "Kod hatalı". Customer sees countdown timer (minutes remaining) in sheet.

---

#### Feature 14: Two-Sided Arrival Confirmation
**Roles affected:** USER, EMPLOYEE
**Status:** Working

**User story:** After an appointment, both customer and employee independently confirm whether the customer actually arrived.

**Frontend flow (customer):** AppointmentsScreen → APPROVED appointment shows arrival prompt → "Yes, I arrived" / "I didn't go" → POST /appointments/:id/confirm-arrival `{ arrived: true/false }`

**Frontend flow (employee):** EmployeeDashboardScreen → Start button initiates the code flow which sets `businessArrivalConfirmed = true` on verify. No-show button → POST /employee/appointments/:id/no-show → sets `businessArrivalConfirmed = false`.

**Backend (resolveArrival utility):** After either side submits, checks if both sides have responded. Both true → COMPLETED. Either false → NO_SHOW. One true + one false → DISPUTED.

**Database:** Updates `customer_arrival_confirmed`, `business_arrival_confirmed`, `arrival_confirmed_at` on reservation.

---

#### Feature 15: Early Completion and Slot Release
**Roles affected:** EMPLOYEE, USER
**Status:** Working

**User story:** Employee completes a service earlier than scheduled. The remaining time slot becomes immediately available for new bookings.

**How it works:** POST /employee/appointments/:id/complete sets `actualEndTime = now`. The availability engine uses `COALESCE(actualEndTime, endTime)` as `busyEnd`. Since `actualEndTime < endTime`, the slot from `actualEndTime` to `endTime` is now free. Controlled per-business by `releaseOnEarlyCompletion` flag (but current availability engine always uses actualEndTime if set — the flag is stored but the COALESCE is always applied).

---

#### Feature 16: Customer Booking Cancellation
**Roles affected:** USER
**Status:** Working

**User story:** Customer cancels a PENDING or APPROVED appointment before it starts.

**API call:** `POST /appointments/:id/cancel`
**Backend:** Sets status = CANCELLED, cancellationReason = 'customer_cancelled'. Ownership check: reservation.userId === req.user.userId.
**Database:** UPDATE reservations SET status='CANCELLED'
**Invalidates:** `queryKeys.bookings.customerAll`, `queryKeys.bookings.ownerAll`

---

#### Feature 17: Business/Employee Cancelling a Booking
**Roles affected:** EMPLOYEE
**Status:** Working

**User story:** Employee declines a PENDING appointment. Customer receives an in-app notification.

**API call:** `POST /employee/appointments/:id/decline`
**Backend:** Sets status = REJECTED. Creates `Notification(userId: customerId, type: 'booking_cancelled_by_business', message: '...')`.

---

#### Feature 18: Review Submission
**Roles affected:** USER
**Status:** Working

**User story:** After a COMPLETED appointment, customer submits a 1–5 star rating and optional comment.

**Frontend flow:** AppointmentsScreen → "Leave Review" button on COMPLETED appointment → ReviewScreen with `appointmentId`, `businessId` params → star tap sets rating → text input for comment → POST /appointments/:id/review

**API call:** `POST /appointments/:id/review { rating: 1–5, comment: "..." }`
**Backend:** Profanity check on comment. Creates Review(status: PENDING, rating, comment, userId, businessId, appointmentId). Owner must approve before it shows publicly.
**Invalidates:** `queryKeys.businesses.reviews`, `queryKeys.bookings.customerAll`

---

#### Feature 19: Review Moderation
**Roles affected:** OWNER
**Status:** Working

**User story:** Owner sees pending reviews and approves or rejects each one. Approved reviews appear on the business detail page.

**Frontend flow:** OwnerReviewsScreen (accessible from OwnerProfile or OwnerTabs) → GET /owner/reviews → approve/reject buttons per PENDING review

**API calls:**
- `GET /owner/reviews` → all reviews for owner's business
- `POST /owner/reviews/:id/approve` → Review.status = APPROVED
- `POST /owner/reviews/:id/reject` → Review.status = REJECTED

---

#### Feature 20: Review Display and Average Rating
**Roles affected:** USER
**Status:** Working

**User story:** Customer sees the business's rating and approved reviews on the business detail and reviews pages.

**GET /businesses/:id/reviews:** Returns only APPROVED reviews. Average rating and count computed fresh each request from the review aggregate query. `averageRating` included in business detail response.

**BusinessReviewsScreen:** Shows distribution bars (count per star level), then `ReviewCard` list. `AverageRating` shared component shows large number + `RatingStars`.

---

#### Feature 21: Profanity Filter
**Roles affected:** USER (reviews), EMPLOYEE (service notes)
**Status:** Working

**How it works:** `src/lib/filterProfanity.ts` (frontend) and `src/lib/filterProfanity.ts` (backend) each contain a hardcoded list of disallowed words. Backend checks: review comment on POST /appointments/:id/review, employee service notes on POST /employee/services/:serviceId. Returns 400 with specific error message.

---

#### Feature 22: Business Photo Upload, Display, and Delete
**Roles affected:** OWNER (upload/delete), USER (display)
**Status:** Working

**Upload flow:** OwnerProfileScreen → Add Photo tap → `expo-image-picker` MediaTypeOptions.Images → 1:1 aspect crop → base64 encoded → POST /owner/business/media `{ imageData: "data:image/jpeg;base64,..." }` → saved to `business_media` table → response includes new media record → `addPhoto()` updates local state + cache invalidated

**Display flow:** GET /businesses/:id returns `media: [{ id, url, createdAt }]`. BusinessDetailScreen uses horizontal FlatList with paginated dots. HomeScreen and SearchScreen use `absoluteFill` Image over icon fallback on business cards.

**Delete flow:** Tap delete icon → Alert confirm → DELETE /owner/business/media/:id → removes from DB → cache invalidated

**Technical debt:** Photos are stored as full base64 strings in PostgreSQL — intended to migrate to Supabase Storage URLs.

---

#### Feature 23: Employee Service Management
**Roles affected:** EMPLOYEE
**Status:** Working

**User story:** Employee toggles which of the business's services they can perform. Optional duration and price overrides per service.

**EmployeeServicesScreen:** Shows all business services. Toggle adds or removes from `employee_services` table. Duration override and price override fields let employee set different values from the business default (stored in `EmployeeService.durationOverride` and `EmployeeService.priceOverride`).

**Cache invalidation:** Adding/removing a service invalidates `queryKeys.employees.services`, `queryKeys.businesses.services`, AND `queryKeys.businesses.timeSlots` — so customer availability updates immediately.

---

#### Feature 24: Employee Schedule / Working Hours
**Roles affected:** EMPLOYEE
**Status:** Working

**User story:** Employee sets which days they work and their start/end times. The availability engine uses this schedule to generate bookable slots.

**EmployeeScheduleScreen:** 7 day rows. Each day has a "Day Off" toggle. When working, shows start time + end time pickers. Save → `PUT /employee/schedule [{ dayOfWeek: 0-6, startTime: "09:00", endTime: "18:00" }]` → upserts `EmployeeSchedule` records.

---

#### Feature 25: Employee Join-Business from Profile
**Roles affected:** EMPLOYEE
**Status:** Working

**User story:** An existing EMPLOYEE user without a business assignment can join a business by entering its join code from their profile screen.

**EmployeeProfileScreen → Workplace card (unassigned state):** Enter join code → POST /employee/join-business `{ joinCode }` → creates new Employee(userId, businessId, status: PENDING). Profile updates to show pending state.

---

#### Feature 26: Employee Leave Business
**Roles affected:** EMPLOYEE
**Status:** Working

**User story:** Employee terminates their association with a business.

**EmployeeProfileScreen → Workplace card → Leave Business → Alert confirm → DELETE /employee/leave-business → Employee.userId = null (soft dissociation). Employee record stays, but user can join a different business.**

---

#### Feature 27: Owner Approve/Reject Employee Join Requests
**Roles affected:** OWNER
**Status:** Working

**User story:** Owner sees new employee applications in the dashboard and approves or rejects them.

**DashboardScreen pending-employees section:** GET /owner/pending-employees fetches employees where businessId matches and status = PENDING. Approve button → PUT /owner/employees/:id/approve. Reject button → PUT /owner/employees/:id/reject. List auto-refreshes via query invalidation.

---

#### Feature 28: Owner Service CRUD
**Roles affected:** OWNER
**Status:** Working

**User story:** Owner creates, edits, and deletes the services their business offers.

**ServicesScreen:** Add Service opens a bottom sheet form (name, description, price, duration in minutes). Edit re-opens form pre-filled. Delete shows confirmation alert. All operations hit `/owner/services` endpoints. `requireBusinessOwnership` middleware ensures owner cannot affect another business's services.

---

#### Feature 29: Owner Business Profile Editing
**Roles affected:** OWNER
**Status:** Working

**User story:** Owner updates business name, description, address, city, and phone number.

**OwnerProfileScreen:** Business info section form. Save calls PUT /owner/business. Only fields provided in request body are updated (Prisma partial update via spread). Invalidates `queryKeys.owner.business` and `queryKeys.businesses.detail(bizId)`.

---

#### Feature 30: Owner Dashboard Metrics and Chart
**Roles affected:** OWNER
**Status:** Working

**User story:** Owner selects Day/Month/Year range and sees appointment counts per status, revenue, and staff performance visualized.

**Chart:** `react-native-gifted-charts` BarChart. 4 series (Completed=green, Confirmed=blue, No Show=red, Cancelled=grey). Grouping: Day=2hr buckets (8am–6pm), Month=W1–W4 ISO weeks, Year=months with data only.

**Stats:** Completed/Confirmed/No Show/Cancelled counts derived from same appointment array. All computation in `useMemo` hooks — no server-side aggregation.

---

#### Feature 31: Revenue Calculation
**Roles affected:** OWNER
**Status:** Working

**Formula:** Sum of `service.price` for all COMPLETED reservations in the selected date range. Previous period calculated by shifting start/end by the same duration back. Trend badge: `((current - prev) / prev * 100).toFixed(1)%`. Revenue displayed via `formatCurrency(amount, 'TRY')`.

---

#### Feature 32: Staff Performance Tracking
**Roles affected:** OWNER
**Status:** Working

**User story:** Owner sees which employees completed the most work and generated the most revenue.

**DashboardScreen:** After computing all appointment data, groups by `employeeId`. Per employee: completedCount + revenue sum. Sorted by revenue desc. Displayed as list rows with initials avatar, name, completed count, and revenue.

---

#### Feature 33: In-App Notification System
**Roles affected:** All
**Status:** Working

**Architecture:** Notifications live in two places simultaneously:
1. `notificationStore` (Zustand + AsyncStorage): persisted across sessions, device-local
2. `notifications` table (PostgreSQL): written by backend, readable via API

**Store operations:** `addNotification()` (generates local ID), `addNotificationFromBackend()` (uses backend UUID, deduplicates by ID), `markAsRead()`, `markAllAsRead()`, `clearAll()`, `hydrate()` (loads from AsyncStorage on app start).

**Notification types:** booking_confirmed, booking_cancelled, booking_rejected, booking_pending, review_submitted, employee_approved, employee_rejected, new_review, service_start_code.

---

#### Feature 34: Cross-Device Notification Delivery
**Roles affected:** USER
**Status:** Working

**User story:** Employee on Device A starts an appointment. Customer on Device B (different simulator or physical device) receives the start code automatically without any manual action.

**How it works:** Backend creates Notification row on POST /employee/appointments/:id/start. Customer HomeScreen polls GET /notifications every 3 seconds. `processedBackendIds` ref prevents re-processing. On finding unread `service_start_code`: marks read on backend immediately, adds to Zustand inbox, opens bottom sheet.

**Polling control:** `enabled: !!user && user.role === 'USER' && isFocused` — poll only when screen is focused, stops on navigation away. `refetchIntervalInBackground: false` — stops when app is backgrounded.

---

#### Feature 35: Notification Inbox Screen
**Roles affected:** All
**Status:** Working

**User story:** User opens Notifications screen and sees all their notifications, with unread ones highlighted.

**NotificationsScreen:** Reads `notificationStore.notifications` filtered to `userId === user.id`. Unread rows have tinted background (`colors.muted + '4D'`). `service_start_code` gets special render with large code text. Tap → `markAsRead()`. "Mark All as Read" → `markAllAsRead()`.

---

#### Feature 36: Language Switching TR/EN
**Roles affected:** All
**Status:** Working

**User story:** User taps language toggle in profile settings or on the login screen. The entire app switches language instantly.

**Implementation:** `appStore.setLanguage()` calls `i18n.changeLanguage()` and saves to `AsyncStorage('@app_language')`. On app start, `i18n.ts` reads `AsyncStorage('@app_language')` and initializes with the saved language or falls back to device locale. All UI strings use `useTranslation()` hook → `t('key.path')`.

---

#### Feature 37: Dark/Light Theme Toggle
**Roles affected:** All
**Status:** Working

**User story:** User taps dark mode toggle in profile settings. The entire app switches color theme instantly.

**Implementation:** `appStore.toggleDarkMode()` flips `isDarkMode` boolean, persists to `AsyncStorage('@app_dark_mode')`. On app start, `appStore` hydrates from AsyncStorage. `useTheme()` hook returns `theme.light` or `theme.dark` colors based on `isDarkMode`. All screen and component styles use `colors.*` tokens from `useTheme()` — no hardcoded colors.

---

#### Feature 38: Demo Account Autofill
**Roles affected:** All (login flow)
**Status:** Working

**User story:** Demo presenter taps a button to autofill login credentials for a specific demo account.

**Implementation:** AuthScreen has a row of three Chip buttons: "Customer Demo", "Owner Demo", "Employee Demo". Each calls `setLoginValue('email', demoEmail)` and `setLoginValue('password', 'demo123')` via react-hook-form's `setValue`. Layout uses `flexDirection: 'row', flexWrap: 'wrap'` to handle overflow in English locale. Buttons are only visible in login mode.


---

## 11. Known Issues and Limitations

### 11.1 Non-functional UI Elements

| Screen | Element | What it should do | Status |
|---|---|---|---|
| BusinessDetailScreen | Booking confirm with "Any available" staff | Should auto-assign available staff | Works — backend assigns first available employee |
| DashboardScreen | BarChart tooltip on bar tap | Show exact value | Not implemented — gifted-charts tooltip not wired |
| OwnerReviewsScreen | Paginate reviews | Load more reviews | No pagination — loads all at once |
| AppointmentsScreen | Reschedule button | Allow rescheduling appointment | Not implemented (V2) |
| ProfileScreen | Notifications toggle | Enable/disable notification preferences | Toggle is present but does not hit an API — preference stored locally only |
| EmployeeProfileScreen | Notifications toggle | Same as above | Toggle present, no API call |

### 11.2 Known Bugs

| Description | Screen | Steps to Reproduce | Likely Cause |
|---|---|---|---|
| base64 photos very large in DB | OwnerProfileScreen → upload | Upload any photo; check DB `business_media.url` length | Images stored as full base64 data URIs instead of Supabase Storage URLs |
| Date handling edge case | BusinessDetailScreen time slots | Pick today's date near midnight | `endOfDay` comparison may miss edge cases in UTC vs local time |
| Employee `any` type in service | EmployeeServicesScreen | TypeScript `any` used for service item | Prisma types not fully propagated through TanStack Query |
| No notification for owner when customer cancels | AppointmentsScreen | Customer cancels booking | POST /appointments/:id/cancel does not create a Notification for the owner |
| BackendHealthCheck component rendered in prod | Root app | Start app | BackendHealthCheck is imported and may render connectivity warnings in production builds |

### 11.3 Technical Debt

| Item | Priority | Description |
|---|---|---|
| base64 photo storage | High | Photos stored as base64 strings in PostgreSQL. Should migrate to Supabase Storage with URL references. Performance and storage cost issue at scale. |
| No request body validation | Medium | Backend route handlers do not use Zod/Joi for input validation. Invalid field types cause unhandled Prisma errors. |
| No pagination | Medium | GET /appointments, GET /businesses, GET /owner/appointments return all records. Will degrade at scale. |
| No Axios retry | Low | Network timeouts result in immediate error. No retry with exponential backoff. |
| `any` types in services | Low | Some service functions use `any` return type instead of typed Prisma results. |
| Push notification integration | Low | `expo-notifications` package is installed and the infrastructure for push tokens exists conceptually, but no push token registration or remote push sending is implemented. All notifications are in-app only. |
| `owner.ts.backup` file | Low | Stale backup file at `/Users/taylandeveci/BookIT-backend/src/routes/owner.ts.backup` should be deleted. |
| DashboardScreen complexity | Low | DashboardScreen.tsx is 800+ lines. Revenue, chart, and staff performance logic could be extracted to custom hooks. |

### 11.4 Out of Scope (V2)

Based on CLAUDE.md and code comments, the following features are intentionally deferred:

| Feature | Reason deferred |
|---|---|
| Deposits and cancellation fees | Payment integration complexity |
| Receptionist role | Requires all-calendar access — intentionally disabled in V1 |
| Resource booking (rooms, equipment) | Requires resource allocation tables and constraint layer |
| Service bundles | Multiple services per booking |
| Multi-location staff | One employee can only be at one location per time slot |
| Waitlist | Requires queue management and notification triggering |
| Advanced analytics and reporting | Export, custom date ranges, CSV |
| Marketing automations | Campaign, reminder emails |
| Loyalty and memberships | Points, subscription plans |
| Multi-staff appointments | One booking = one staff in V1 |
| Parallel client capacity > 1 | One client per slot per staff |
| Multi-role accounts | Same user as both customer and employee |
| Reschedule requests | Customer-initiated rescheduling workflow |

---

## 12. Contribution Map

Six technical areas with file ownership, complexity, and dependencies.

---

### Area 1 — Authentication and User Management

**Description:** Everything related to creating accounts, logging in, managing profiles, and securing routes.

**Files:**
- `/Users/taylandeveci/BookIT-backend/src/routes/auth.ts` — all auth endpoints
- `/Users/taylandeveci/BookIT-backend/src/middleware/auth.ts` — JWT verification, role guard
- `/Users/taylandeveci/BookIt/olddemo/src/store/authStore.ts` — login/logout state
- `/Users/taylandeveci/BookIt/olddemo/src/services/authService.ts` — API calls wrapper
- `/Users/taylandeveci/BookIt/olddemo/src/screens/auth/AuthScreen.tsx` — login + registration UI
- `/Users/taylandeveci/BookIt/olddemo/src/screens/auth/EmployeePendingScreen.tsx` — pending state
- `/Users/taylandeveci/BookIt/olddemo/src/screens/user/ProfileScreen.tsx` — profile display
- `/Users/taylandeveci/BookIt/olddemo/src/screens/user/EditProfileScreen.tsx` — profile editing
- `/Users/taylandeveci/BookIt/olddemo/src/screens/user/ChangePasswordScreen.tsx` — password change
- `/Users/taylandeveci/BookIt/olddemo/src/screens/employee/EmployeeProfileScreen.tsx` — employee profile
- `/Users/taylandeveci/BookIt/olddemo/src/screens/employee/EmployeeEditProfileScreen.tsx` — employee profile editing

**Complexity:** Intermediate

**Required knowledge:** JWT concepts (access token, refresh token, payload), bcrypt, React Hook Form + Zod validation, Zustand store patterns, SecureStore

**Connects to:** Navigation (RootNavigator reads authStore), all protected routes (middleware), Employee Features (join code flow)

---

### Area 2 — Booking and Availability Engine

**Description:** The core booking flow from slot calculation to appointment lifecycle management.

**Files:**
- `/Users/taylandeveci/BookIT-backend/src/routes/appointments.ts` — customer booking endpoints
- `/Users/taylandeveci/BookIT-backend/src/routes/businesses.ts` — time-slots endpoint (availability engine)
- `/Users/taylandeveci/BookIT-backend/src/utils/arrivalResolution.ts` — two-sided arrival logic
- `/Users/taylandeveci/BookIt/olddemo/src/screens/user/BusinessDetailScreen.tsx` — booking form UI
- `/Users/taylandeveci/BookIt/olddemo/src/screens/user/AppointmentsScreen.tsx` — booking management
- `/Users/taylandeveci/BookIt/olddemo/src/services/appointmentService.ts` — API wrappers
- `/Users/taylandeveci/BookIt/olddemo/src/services/businessService.ts` — time-slots fetch

**Complexity:** Advanced

**Required knowledge:** Date/time arithmetic, interval overlap detection, Prisma queries with relations, booking state machines, COALESCE logic for early completion

**Connects to:** Employee Features (start code, complete), Owner Dashboard (appointment data), Notifications (cancellation events)

---

### Area 3 — Owner Dashboard and Analytics

**Description:** The full owner experience: business management, appointment oversight, analytics visualization.

**Files:**
- `/Users/taylandeveci/BookIT-backend/src/routes/owner.ts` — all owner endpoints
- `/Users/taylandeveci/BookIT-backend/src/middleware/ownership.ts` — cross-business protection
- `/Users/taylandeveci/BookIt/olddemo/src/screens/owner/DashboardScreen.tsx` — metrics + chart
- `/Users/taylandeveci/BookIt/olddemo/src/screens/owner/RequestsScreen.tsx` — appointment actions
- `/Users/taylandeveci/BookIt/olddemo/src/screens/owner/EmployeesScreen.tsx` — employee CRUD
- `/Users/taylandeveci/BookIt/olddemo/src/screens/owner/ServicesScreen.tsx` — service CRUD
- `/Users/taylandeveci/BookIt/olddemo/src/screens/owner/OwnerProfileScreen.tsx` — business settings + photos
- `/Users/taylandeveci/BookIt/olddemo/src/screens/owner/OwnerReviewsScreen.tsx` — review moderation
- `/Users/taylandeveci/BookIt/olddemo/src/services/ownerService.ts` — API wrappers

**Complexity:** Advanced

**Required knowledge:** react-native-gifted-charts, date grouping algorithms, Prisma aggregate queries, revenue calculation, useMemo optimization

**Connects to:** Booking Engine (appointments data), Authentication (ownership middleware), Employee Features (pending approvals in dashboard)

---

### Area 4 — Maps, Search, and Discovery

**Description:** Business discovery — home feed, text/filter search, GPS-based sorting, map view.

**Files:**
- `/Users/taylandeveci/BookIt/olddemo/src/screens/user/HomeScreen.tsx` — nearby/top-rated/visit-again
- `/Users/taylandeveci/BookIt/olddemo/src/screens/user/SearchScreen.tsx` — search + map modal
- `/Users/taylandeveci/BookIT-backend/src/routes/businesses.ts` — business list with media
- `/Users/taylandeveci/BookIt/olddemo/src/hooks/useBusinessLocation.ts` — GPS hook
- `/Users/taylandeveci/BookIt/olddemo/src/lib/calculateDistance.ts` — Haversine formula
- `/Users/taylandeveci/BookIt/olddemo/src/services/businessService.ts` — GET /businesses

**Complexity:** Intermediate

**Required knowledge:** react-native-maps, expo-location, Haversine distance formula, useMemo for client-side filtering, skeleton loading patterns

**Connects to:** Business Detail (navigation target), Notifications (cross-device polling on HomeScreen)

---

### Area 5 — Employee Features

**Description:** Everything an employee sees and does — calendar, schedule, service assignment, join/leave business.

**Files:**
- `/Users/taylandeveci/BookIT-backend/src/routes/employee.ts` — all employee endpoints
- `/Users/taylandeveci/BookIt/olddemo/src/screens/employee/EmployeeDashboardScreen.tsx`
- `/Users/taylandeveci/BookIt/olddemo/src/screens/employee/EmployeeHomeScreen.tsx`
- `/Users/taylandeveci/BookIt/olddemo/src/screens/employee/EmployeeCalendarScreen.tsx`
- `/Users/taylandeveci/BookIt/olddemo/src/screens/employee/EmployeeServicesScreen.tsx`
- `/Users/taylandeveci/BookIt/olddemo/src/screens/employee/EmployeeScheduleScreen.tsx`
- `/Users/taylandeveci/BookIt/olddemo/src/screens/employee/EmployeeProfileScreen.tsx`
- `/Users/taylandeveci/BookIt/olddemo/src/screens/employee/EmployeeEditProfileScreen.tsx`
- `/Users/taylandeveci/BookIt/olddemo/src/services/employeeService.ts`

**Complexity:** Intermediate

**Required knowledge:** react-native-calendars, Animated API (height animation), Modal patterns, KeyboardAvoidingView, Prisma upsert (schedule management)

**Connects to:** Booking Engine (start code verification), Notifications (code delivery), Authentication (join/leave business, pending approval)

---

### Area 6 — Notifications and Real-time

**Description:** In-app notification system including Zustand store, backend notification table, cross-device polling, and notification inbox.

**Files:**
- `/Users/taylandeveci/BookIt/olddemo/src/store/notificationStore.ts` — Zustand store + AsyncStorage
- `/Users/taylandeveci/BookIt/olddemo/src/services/notificationService.ts` — API wrappers
- `/Users/taylandeveci/BookIT-backend/src/routes/notifications.ts` — GET + mark-read endpoints
- `/Users/taylandeveci/BookIt/olddemo/src/screens/shared/NotificationsScreen.tsx` — inbox UI
- `/Users/taylandeveci/BookIt/olddemo/src/screens/user/HomeScreen.tsx` — polling logic (lines 93–190)
- `/Users/taylandeveci/BookIt/olddemo/src/components/shared/ToastNotification.tsx` — auto-show banner

**Complexity:** Intermediate

**Required knowledge:** Zustand store patterns, AsyncStorage persistence, TanStack Query refetchInterval, useRef for dedup, useIsFocused, Modal bottom sheet

**Connects to:** Employee Features (code generation), Booking Engine (cancellation notifications), All roles (inbox accessible from all profile tabs)

---

## 13. Architecture Decisions Log

---

### Decision: Express + Prisma (olddemo) over NestJS (apps/api)
**What was decided:** The working demo uses a plain Express + Prisma backend in `/Users/taylandeveci/BookIT-backend`, not the NestJS architecture in `/Users/taylandeveci/BookIt/apps/api/`.
**Alternatives considered:** NestJS modular monolith (exists in `apps/api/` directory as a skeleton)
**Rationale:** NestJS adds significant boilerplate for a prototype/demo. Express + Prisma was faster to iterate on. The `apps/api/` NestJS structure represents the intended production architecture per CLAUDE.md, but it was not built out.
**Trade-offs:**
- Pro: Faster development, less configuration
- Con: No dependency injection, less structured, harder to scale to team; the planned NestJS architecture with guards and modules remains unimplemented

---

### Decision: Zustand over Redux
**What was decided:** Global client state (auth, theme, language, notifications) stored in Zustand stores.
**Alternatives considered:** Redux Toolkit, React Context + useReducer
**Rationale:** Zustand has minimal boilerplate, supports TypeScript well, and integrates naturally with AsyncStorage for persistence. No Provider wrapping needed.
**Trade-offs:**
- Pro: Simple API, small bundle, easy persistence with AsyncStorage
- Con: Less tooling (no Redux DevTools equivalent), stores are module-level singletons

---

### Decision: TanStack Query for all server state
**What was decided:** Every API call that fetches data uses `useQuery`. Mutations use manual `async/await` calls followed by `queryClient.invalidateQueries`.
**Alternatives considered:** SWR, React Query v3, manual useEffect + useState
**Rationale:** TanStack Query provides stale-while-revalidate caching, loading states, error states, automatic background refresh on focus, and coordinated cache invalidation — all without manual implementation.
**Trade-offs:**
- Pro: Cache management, deduplication, loading/error states built-in
- Con: Mutations use manual calls (not `useMutation` hook) in several places, creating inconsistency

---

### Decision: Supabase for PostgreSQL hosting
**What was decided:** Database is hosted on Supabase (remote). No local database setup required.
**Alternatives considered:** Local PostgreSQL, Railway, Render
**Rationale:** Supabase provides free-tier PostgreSQL, works with Prisma, and requires no local database setup — ideal for team collaboration and demos on different machines.
**Trade-offs:**
- Pro: Zero setup, accessible from any network, free tier
- Con: Requires internet connection during development; cold start latency on free tier

---

### Decision: Separate tab navigators per role
**What was decided:** Each role (USER, EMPLOYEE, OWNER) gets its own Bottom Tab Navigator. RootNavigator branches immediately after authentication.
**Alternatives considered:** Single tab navigator with conditional screen registration
**Rationale:** Prevents permission leakage — a USER tab navigator never registers OWNER screens, so deep links and back-stack bugs cannot accidentally expose wrong-role screens.
**Trade-offs:**
- Pro: Clean permission isolation, each role's UX is independent
- Con: Some duplicate screens (ProfileScreen pattern repeated per role)

---

### Decision: `{success, data}` envelope response format
**What was decided:** All API responses are wrapped in `{ success: boolean, data: any, message?: string }`. The apiClient response interceptor automatically unwraps `data`.
**Alternatives considered:** Direct data return, HTTP status codes only
**Rationale:** Consistent envelope allows a single interceptor to extract data and handle errors uniformly across all endpoints.
**Trade-offs:**
- Pro: Consistent error handling, single unwrap point
- Con: Extra nesting in manual curl/debugging; `message` in error cases must be checked in `error.response.data.message`

---

### Decision: AsyncStorage for notification persistence
**What was decided:** Zustand notification store persists to AsyncStorage on every mutation.
**Alternatives considered:** In-memory only (lost on app restart), SQLite
**Rationale:** AsyncStorage provides simple key-value persistence without schema management. Notifications should survive app restarts.
**Trade-offs:**
- Pro: Simple, no migration concerns
- Con: Not queryable (can't filter by date), JSON serialization overhead for large notification lists, max 50 notifications enforced via `slice`

---

### Decision: 3-second polling for cross-device notifications
**What was decided:** HomeScreen polls `GET /notifications` every 3 seconds when focused.
**Alternatives considered:** WebSockets, Server-Sent Events, push notifications (Expo Notifications)
**Rationale:** Polling requires no persistent connection infrastructure. For a demo with 2–5 concurrent users, 3-second polling is acceptable load. Expo push notifications require device registration, APNS/FCM credentials, and server-side push logic — too much setup for a prototype.
**Trade-offs:**
- Pro: Simple, works on all networks, no server infrastructure beyond REST
- Con: Not real-time (up to 3s delay); polling stops when screen not focused; would not scale to thousands of users

---

### Decision: base64 in PostgreSQL for photos
**What was decided:** Business photos are stored as full base64 data URI strings in the `business_media.url` column.
**Alternatives considered:** Supabase Storage with URL references (intended production path)
**Rationale:** For a demo, base64 avoids setting up Supabase Storage buckets, signed URL logic, and CORS configuration. The entire image is stored and served directly.
**Trade-offs:**
- Pro: Zero infrastructure setup, images always available
- Con: Dramatically bloats database size; 1 photo ≈ 100–300KB in DB; PostgreSQL is not a CDN; React Native Image component must parse base64 strings; not scalable

---

### Decision: `@@unique([employeeId, startTime])` for double-booking prevention
**What was decided:** A unique constraint prevents two reservations for the same employee at the same exact start time.
**Alternatives considered:** PostgreSQL exclusion constraints with tsrange (as described in CLAUDE.md `apps/api` architecture)
**Rationale:** Prisma does not support exclusion constraints natively. The `@@unique` constraint on `(employeeId, startTime)` prevents exact duplicate start times. It does not prevent overlapping intervals (e.g., 10:00 + 30min and 10:15 + 30min would not conflict). Combined with the availability engine filtering, this provides practical protection for the demo.
**Trade-offs:**
- Pro: Works with Prisma, simple to declare
- Con: Only prevents exact start time collisions, not interval overlaps; relies on slot engine for overlap prevention

---

### Decision: Two Zustand stores (authStore + appStore)
**What was decided:** Auth/user state in `authStore`, UI preferences (theme, language) in `appStore`.
**Alternatives considered:** Single unified store
**Rationale:** Separation of concerns — auth state changes trigger navigation, UI preferences are orthogonal. Easier to reason about what causes a re-render.
**Trade-offs:**
- Pro: Clear separation, each store has a single responsibility
- Con: Two `useStore` calls per component instead of one


---

## 14. Project Statistics

### Counts

| Metric | Count |
|---|---|
| Total screen files | 25 |
| Total API endpoints | 61 |
| Total Prisma models | 10 |
| Prisma field lines (approx) | 154 |
| Frontend source lines (src/) | 16,353 |
| Backend source lines (src/) | 2,879 |
| Translation keys TR | 644 |
| Translation keys EN | 644 |
| Shared component files | 16 |
| Frontend npm packages (deps+devDeps) | 41 |
| Backend npm packages (deps+devDeps) | 19 |
| Features fully implemented | 38/38 |
| Features partially implemented (V2 items) | 14 deferred |
| Known non-functional UI elements | 6 |
| Demo seeded accounts | 8 |
| Demo businesses | 2 (Prestige Salon & Spa, The Craft Studio) |

### API Endpoints by Route File

| Route File | Endpoint Count |
|---|---|
| auth.ts | 10 |
| businesses.ts | 7 |
| appointments.ts | 5 |
| owner.ts | 17 |
| employee.ts | 14 |
| notifications.ts | 2 |
| health check (index.ts) | 1 |
| **Total** | **56+** |

### Database Models Summary

| Model | Table | Key Fields |
|---|---|---|
| User | users | id, email, passwordHash, fullName, role, avatarUrl |
| Business | businesses | id, ownerId, name, joinCode, joinCodeEnabled, releaseOnEarlyCompletion |
| Employee | employees | id, userId, businessId, fullName, status (PENDING/ACTIVE/REJECTED) |
| Service | services | id, businessId, name, price, durationMin |
| EmployeeService | employee_services | id, employeeId, serviceId, durationOverride, priceOverride, notes |
| EmployeeSchedule | employee_schedules | id, employeeId, dayOfWeek, startTime, endTime |
| Reservation | reservations | id, customerId, businessId, employeeId, serviceId, startTime, endTime, actualStartTime, actualEndTime, status, startCode, startCodeExpiresAt |
| BusinessMedia | business_media | id, businessId, url (base64 data URI) |
| Review | reviews | id, reservationId, userId, businessId, rating, commentText, status (PENDING/APPROVED/REJECTED) |
| Notification | notifications | id, userId, type, message, isRead, reservationId |

### Translation Coverage

Both `tr.json` and `en.json` contain exactly **644 leaf keys** — perfect parity. Keys are organized into 30 top-level sections:

`common`, `auth`, `navigation`, `dashboard`, `requests`, `employees`, `services`, `profile`, `editProfile`, `changePassword`, `home`, `search`, `businessDetail`, `booking`, `appointments`, `reviews`, `status`, `time`, `employeePending`, `employeeDashboard`, `employeeCalendar`, `employeeServices`, `employeeSchedule`, `employeeProfile`, `employeeHome`, `ownerProfile`, `businessReviews`, `bookings`, `notifications`, `startCode`

### Demo Accounts

| Email | Password | Role | Associated Data |
|---|---|---|---|
| `customer@demo.com` | `demo1234` | USER | Demo customer with seeded bookings |
| `owner@demo.com` | `demo1234` | OWNER | Owns "The Craft Studio" business |
| `ahmet@craftstudio.com` | `demo1234` | EMPLOYEE | Active employee at The Craft Studio |
| `mehmet@craftstudio.com` | `demo1234` | EMPLOYEE | Active employee at The Craft Studio |
| `ayse@craftstudio.com` | `demo1234` | EMPLOYEE | Active employee at The Craft Studio |
| `user@test.com` | `123456` | USER | Test customer |
| `owner@test.com` | `123456` | OWNER | Owns "Prestige Salon & Spa" |
| `employee@test.com` | `123456` | EMPLOYEE | Sarah Johnson at Prestige Salon & Spa |

> **Note:** The AuthScreen demo autofill buttons use `customer@demo.com`, `owner@demo.com` for Customer Demo and Owner Demo. For Employee Demo they fill `employee@test.com` / `123456`.

---

*Report generated: 2026-06-10*
*Frontend: /Users/taylandeveci/BookIt/olddemo*
*Backend: /Users/taylandeveci/BookIT-backend*

