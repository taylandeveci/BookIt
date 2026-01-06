# BookIT Local Demo - System Status

## ✅ Setup Complete!

Your local demo environment is now fully operational.

## System Status

### Backend Server

- **Status:** ✅ Running
- **URL:** http://172.16.1.7:3000
- **Location:** /Users/taylandeveci/BookIT-backend
- **Database:** PostgreSQL 16 (running via Homebrew)
- **Health Check:** http://172.16.1.7:3000/health

### Frontend App

- **Status:** ✅ Running
- **Expo URL:** exp://172.16.1.7:8081
- **Location:** /Users/taylandeveci/Demodeneme
- **API URL:** http://172.16.1.7:3000

## Test Accounts

### Regular User

- **Email:** user@test.com
- **Password:** 123456
- **Role:** USER

### Business Owner

- **Email:** owner@test.com
- **Password:** 123456
- **Role:** OWNER
- **Business:** Prestige Salon & Spa (ID in database)

## Sample Data

The database has been seeded with:

- ✅ 1 test user account
- ✅ 1 business owner account
- ✅ 1 business (Prestige Salon & Spa)
- ✅ 2 employees (Sarah Johnson, Michael Chen)
- ✅ 5 services (Haircut, Color, Conditioning, Facial, Manicure)
- ✅ 1 sample appointment
- ✅ 1 approved review

## Quick Test

### Test Backend Health

```bash
curl http://172.16.1.7:3000/health
```

Expected response:

```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Test Login

```bash
curl -X POST http://172.16.1.7:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"123456"}'
```

### Test Businesses

```bash
curl http://172.16.1.7:3000/businesses/recommended
```

## Using the App

1. **Open Expo Go** on your physical device
2. **Scan the QR code** displayed in the terminal
3. **Try logging in** with the test accounts above
4. **Browse businesses** and make appointments
5. **Test owner features** by logging in as owner@test.com

## Stopping the Services

### Stop Backend

```bash
# Find the process
lsof -ti:3000

# Kill it
kill $(lsof -ti:3000)
```

### Stop Frontend

```bash
# In the terminal running Expo, press Ctrl+C
# Or kill the process
kill $(lsof -ti:8081)
```

### Stop PostgreSQL

```bash
brew services stop postgresql@16
```

## Restarting Everything

### Start Backend

```bash
cd /Users/taylandeveci/BookIT-backend
node dist/index.js &
```

### Start Frontend

```bash
cd /Users/taylandeveci/Demodeneme
npm start
```

### Start PostgreSQL (if stopped)

```bash
brew services start postgresql@16
```

## Troubleshooting

### Backend Not Responding

```bash
# Check if backend is running
lsof -ti:3000

# Check backend logs
cd /Users/taylandeveci/BookIT-backend
node dist/index.js
```

### Frontend Can't Connect

1. Verify EXPO_PUBLIC_API_URL in `/Users/taylandeveci/Demodeneme/.env`
2. Should be: `http://172.16.1.7:3000`
3. Restart Expo after changing .env

### Database Connection Issues

```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Restart PostgreSQL
brew services restart postgresql@16
```

### Wrong IP Address

If your computer's IP changes:

```bash
# Get new IP
ipconfig getifaddr en0

# Update .env file
echo "EXPO_PUBLIC_API_URL=http://NEW_IP:3000" > /Users/taylandeveci/Demodeneme/.env

# Restart frontend
cd /Users/taylandeveci/Demodeneme
npm start
```

## API Endpoints Available

### Authentication

- POST /auth/register-user
- POST /auth/register-owner
- POST /auth/login
- POST /auth/refresh
- GET /auth/me (requires auth)
- POST /auth/logout (requires auth)

### Businesses

- GET /businesses/recommended
- GET /businesses (with search, category, rating filters)
- GET /businesses/:id
- GET /businesses/:id/employees
- GET /businesses/:id/services
- GET /businesses/:id/reviews
- GET /businesses/:id/timeslots

### Appointments (requires auth)

- POST /appointments
- GET /appointments
- GET /appointments/:id
- POST /appointments/:id/cancel

### Owner (requires OWNER role)

- GET /owner/appointments
- POST /owner/appointments/:id/approve
- POST /owner/appointments/:id/reject
- POST /owner/appointments/:id/complete
- GET /owner/employees
- POST /owner/employees
- GET /owner/services
- POST /owner/services

## Files Created

### Backend Files

- /Users/taylandeveci/BookIT-backend/
  - package.json
  - tsconfig.json
  - .env
  - docker-compose.yml (not used - using Homebrew PostgreSQL instead)
  - prisma/schema.prisma
  - prisma/seed.ts
  - src/index.ts
  - src/middleware/auth.ts
  - src/routes/auth.ts
  - src/routes/businesses.ts
  - src/routes/appointments.ts
  - src/routes/owner.ts
  - LOCAL_DEMO_GUIDE.md
  - README.md
  - dist/ (compiled JavaScript)

### Frontend Files

- /Users/taylandeveci/Demodeneme/.env (API configuration)

## Next Steps

1. Test all features on your physical device
2. Try creating appointments
3. Test owner approval workflow
4. Add more businesses/services as needed
5. Customize the app for your demo

## Need Help?

- Check LOCAL_DEMO_GUIDE.md in backend folder for detailed instructions
- Verify both services are running: `lsof -ti:3000 && lsof -ti:8081`
- Test backend health: `curl http://172.16.1.7:3000/health`

---

**Your local demo is ready! 🎉**

Scan the QR code in your Expo terminal with Expo Go to start testing!
