# BookIT Local Demo Setup

## Status

Backend: CREATED at `/Users/taylandeveci/BookIT-backend`
Frontend: This repository

## Quick Start

### 1. Start Backend

```bash
cd /Users/taylandeveci/BookIT-backend

# Start PostgreSQL
docker-compose up -d

# Install dependencies (first time only)
npm install

# Run migrations (first time only)
npx prisma migrate dev

# Seed database (first time only)
npm run prisma:seed

# Start server
npm run dev
```

Backend runs on http://0.0.0.0:3000

### 2. Find Your Local IP

```bash
ipconfig getifaddr en0
```

Example output: `192.168.1.100`

### 3. Configure Frontend

Create or edit `.env` in this directory:

```bash
# For physical device testing
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000

# For iOS Simulator
# EXPO_PUBLIC_API_URL=http://localhost:3000
```

Replace `192.168.1.100` with YOUR local IP from step 2.

### 4. Start Frontend

```bash
npm start
```

Scan QR code with Expo Go app.

## Test Accounts

User:

- Email: user@test.com
- Password: 123456

Owner:

- Email: owner@test.com
- Password: 123456

## Smoke Test

1. Login as user@test.com
2. Browse businesses
3. View "Prestige Salon & Spa"
4. Book appointment
5. Logout and login as owner@test.com
6. Approve appointment in dashboard

## Troubleshooting

"Network request failed":

- Verify backend is running: `curl http://localhost:3000/health`
- Check .env has correct IP (not localhost for physical device)
- Ensure phone and computer on same WiFi

"Database connection failed":

- Run: `cd /Users/taylandeveci/BookIT-backend && docker-compose up -d`

Full guide: `/Users/taylandeveci/BookIT-backend/LOCAL_DEMO_GUIDE.md`

## Architecture

```
Frontend (Expo)         Backend (Express)       Database (Postgres)
http://192.168.1.x  <-> http://0.0.0.0:3000 <-> postgresql://localhost:5432
```
