# 🚀 BookIT Local Demo Setup Guide

## Quick Start (5 Minutes)

### Prerequisites Check

```bash
# 1. Check Node.js version (requires v16+)
node --version

# 2. Check if iOS Simulator is installed (macOS only)
xcode-select --version

# 3. Verify Expo CLI
npx expo --version
```

## Start Everything (One Command)

### From Frontend Directory

```bash
cd /Users/taylandeveci/Demodeneme
npm run dev:all
```

This single command:

- ✅ Starts backend on http://localhost:3000
- ✅ Starts Expo dev server
- ✅ Shows both logs in split terminal view

### What You'll See

```
[backend] 🚀 Server running on:
[backend]    Local:   http://localhost:3000
[backend]    Network: http://0.0.0.0:3000
[backend]
[backend] Environment: development
[backend] Health check: http://localhost:3000/health

[expo]
[expo] › Metro waiting on exp://192.168.x.x:8081
[expo] › Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
[expo]
[expo] › Press i │ open iOS simulator
[expo] › Press a │ open Android emulator
[expo] › Press w │ open web
```

### Open iOS Simulator

Once Expo starts, press **`i`** in the Expo terminal to launch iOS Simulator.

---

## Manual Start (If Needed)

### 1. Start Backend (Terminal 1)

```bash
cd /Users/taylandeveci/BookIT-backend
npm run dev
```

**Expected Output:**

```
🚀 Server running on:
   Local:   http://localhost:3000
   Network: http://0.0.0.0:3000

Environment: development
Health check: http://localhost:3000/health
```

### 2. Start Frontend (Terminal 2)

```bash
cd /Users/taylandeveci/Demodeneme
npm start
```

**Expected Output:**

```
› Metro waiting on exp://192.168.x.x:8081
› Press i │ open iOS simulator
```

### 3. Open iOS Simulator

Press **`i`** when prompted, or run:

```bash
npm run ios
```

---

## Environment Configuration

### Backend (.env)

```bash
# /Users/taylandeveci/BookIT-backend/.env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
CORS_ORIGIN="*"
```

### Frontend (.env)

```bash
# /Users/taylandeveci/Demodeneme/.env
EXPO_PUBLIC_API_URL=http://localhost:3000
USE_MOCK_API=false
```

**✅ Already configured correctly!**

---

## Verification Checklist

### Backend Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-06T...",
  "uptime": 12.345
}
```

### Test Login Endpoint

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"123456"}'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@test.com",
      "role": "USER"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Check iOS Simulator

1. **App Launches** - No crash on startup
2. **Auth Screen Visible** - Login/Register tabs work
3. **Backend Connection** - Green checkmark on backend status
4. **Login Works** - Can login with test credentials
5. **Navigation Works** - Can browse businesses

---

## Test Accounts

### Regular User

- **Email:** user@test.com
- **Password:** 123456
- **Role:** USER
- **Access:** Browse businesses, create appointments

### Business Owner

- **Email:** owner@test.com
- **Password:** 123456
- **Role:** OWNER
- **Access:** Owner Dashboard, manage employees, approve appointments

---

## Demo Flow for Jury

### 1. User Registration & Booking

```
✅ Register new user → fullName, email, password
✅ Browse businesses → see ratings, services, city
✅ Select business → view employees, services, availability
✅ Create appointment → pick date, time, service, employee
✅ View appointments → see pending reservation
```

### 2. Owner Management

```
✅ Login as owner → redirects to Owner Dashboard
✅ View pending appointments → see user requests
✅ Approve appointment → changes status to APPROVED
✅ Manage employees → add/edit staff (fullName only)
✅ Manage services → add/edit offerings (name, price, duration)
✅ Edit business info → update name, description, address
```

### 3. Show Backend API

```
✅ Open http://localhost:3000/health in browser
✅ Show businesses: http://localhost:3000/businesses
✅ Demonstrate ERD-aligned schema (averageRating, fullName, durationMin)
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check if port 3000 is in use
lsof -ti:3000 | xargs kill -9

# Rebuild backend
cd /Users/taylandeveci/BookIT-backend
npm run build
npm start
```

### Frontend Can't Connect

```bash
# Verify .env file exists
cat /Users/taylandeveci/Demodeneme/.env

# Should show: EXPO_PUBLIC_API_URL=http://localhost:3000

# Clear Expo cache
cd /Users/taylandeveci/Demodeneme
npx expo start -c
```

### iOS Simulator Issues

```bash
# Reset simulator
xcrun simctl erase all

# Or restart Xcode Command Line Tools
sudo xcode-select --switch /Applications/Xcode.app
```

### Database Issues

```bash
# Reset and reseed database
cd /Users/taylandeveci/BookIT-backend
npx prisma migrate reset
npx prisma db seed
```

---

## NPM Scripts Reference

### Backend (BookIT-backend)

```json
{
  "dev": "nodemon src/index.ts", // Development with hot reload
  "build": "tsc", // Compile TypeScript
  "start": "node dist/index.js", // Run compiled code
  "prisma:migrate": "prisma migrate dev",
  "prisma:seed": "prisma db seed",
  "prisma:studio": "prisma studio"
}
```

### Frontend (Demodeneme)

```json
{
  "start": "expo start", // Start Expo dev server
  "ios": "expo start --ios", // Open iOS simulator directly
  "dev:backend": "cd ../BookIT-backend && npm run dev",
  "dev:all": "concurrently ..." // Start both backend + frontend
}
```

---

## Network Configuration

### Backend Server

- **Port:** 3000
- **Host:** 0.0.0.0 (binds to all interfaces)
- **CORS:** Enabled for all origins (`*`)
- **Rate Limit:** 100 requests / 15 minutes
- **Body Limit:** 10MB

### API Client (Frontend)

- **Base URL:** `process.env.EXPO_PUBLIC_API_URL`
- **Default:** http://localhost:3000
- **Timeout:** 30 seconds
- **Retry Logic:** Automatic token refresh on 401
- **Response Unwrapping:** Extracts `data` from `{success, data}` envelope

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│      iOS Simulator (Expo Go)            │
│                                          │
│  ┌────────────────────────────────┐    │
│  │   BookIT App (React Native)    │    │
│  │                                 │    │
│  │  • Auth Screen                  │    │
│  │  • User: Browse & Book         │    │
│  │  • Owner: Dashboard & Manage   │    │
│  └─────────────┬──────────────────┘    │
└────────────────┼───────────────────────┘
                 │ HTTP Requests
                 │ localhost:3000
                 ▼
┌─────────────────────────────────────────┐
│     Backend Server (Node.js/Express)    │
│                                          │
│  • REST API (ERD-aligned)               │
│  • JWT Authentication                   │
│  • Role-based routing                   │
│                                          │
│  └─────────────┬──────────────────┘    │
└────────────────┼───────────────────────┘
                 │ Prisma ORM
                 ▼
┌─────────────────────────────────────────┐
│      PostgreSQL Database (Local)        │
│                                          │
│  • Users (passwordHash, fullName)       │
│  • Businesses (averageRating, city)     │
│  • Employees (fullName, isActive)       │
│  • Services (durationMin, price)        │
│  • Reservations (startTime, endTime)    │
└─────────────────────────────────────────┘
```

---

## Pre-Demo Checklist

### Before Starting (5 minutes before jury)

- [ ] Backend: `cd BookIT-backend && npm run build`
- [ ] Database: `npx prisma db seed` (reset test data)
- [ ] Frontend: Clear Expo cache `npx expo start -c`
- [ ] Test: Login with test accounts
- [ ] Verify: Both user and owner flows work

### During Demo

- [ ] Run: `npm run dev:all` from frontend directory
- [ ] Wait: Both services show "ready" messages
- [ ] Press: `i` to open iOS Simulator
- [ ] Demo: User registration → booking flow
- [ ] Demo: Owner login → approval flow
- [ ] Show: Backend API responses in browser

### Backup Plan

If anything breaks:

1. **Terminal 1:** `cd BookIT-backend && npm run dev`
2. **Terminal 2:** `cd Demodeneme && npm start`
3. Press `i` in Terminal 2 when Expo loads

---

## Success Indicators

### ✅ Backend Ready

```
🚀 Server running on:
   Local:   http://localhost:3000
```

### ✅ Frontend Ready

```
› Metro waiting on exp://...
› Press i │ open iOS simulator
```

### ✅ Database Connected

```
Seeding database...
Created user: user@test.com
Created owner: owner@test.com
Created business: Prestige Salon & Spa
Seeding completed successfully!
```

### ✅ App Working

- Green checkmark on "Backend Status" in app
- Can login with test credentials
- Navigation between screens smooth
- No console errors in Metro bundler

---

## Contact Info for Issues

If something breaks during demo:

1. **Check logs** in both terminals
2. **Restart services**: Ctrl+C then `npm run dev:all`
3. **Reset database**: `npx prisma migrate reset && npx prisma db seed`
4. **Clear cache**: `npx expo start -c`

---

## Final Notes

- **iOS Simulator Only** - This setup is optimized for iOS Simulator, not physical devices
- **Local Network** - Backend binds to 0.0.0.0 but frontend uses localhost (iOS Simulator behavior)
- **Test Data** - Database is seeded with test accounts and sample business
- **No Mock API** - All API calls go to real backend (USE_MOCK_API=false)
- **TypeScript** - Zero compilation errors in both projects
- **ERD Aligned** - All field names match Prisma schema (fullName, averageRating, durationMin)

**You're ready for the demo! 🎉**
