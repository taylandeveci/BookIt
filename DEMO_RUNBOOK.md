# BookIT - Demo Runbook

**Last Updated:** January 6, 2026  
**Demo Environment:** iOS Simulator (macOS)  
**Backend:** Node.js/Express/TypeScript/Prisma/PostgreSQL  
**Frontend:** React Native/Expo SDK 52

---

## Quick Start

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 16 running (via Homebrew)
- iOS Simulator available
- Both backend and frontend dependencies installed

### Starting the Demo

**Terminal 1 - Backend:**

```bash
cd /Users/taylandeveci/BookIT-backend
npm start
```

Backend will start on `http://localhost:3000`  
Look for: "Server running on... Local: http://localhost:3000"

**Terminal 2 - Frontend:**

```bash
cd /Users/taylandeveci/Demodeneme
npx expo start
```

Press `i` to open iOS Simulator.

---

## Complete Demo Flow (7 Steps)

### STEP 1: Register New User

1. Open app in iOS Simulator
2. Check top of screen - should see green "Backend connected" banner (auto-hides after 2s)
3. Select **"Customer"** role tab
4. Select **"Register"** tab
5. Fill in:
   - **Full Name:** John Demo
   - **Email:** john.demo@test.com
   - **Password:** 123456
   - **Confirm Password:** 123456
6. Tap **"Register"** button
7. **Expected:** Auto-login after registration, lands on Home screen (UserTabs)

### STEP 2: Login as User

1. If already logged in from Step 1, skip this step
2. Otherwise on Auth screen:
   - For quick demo: tap **"Fill User"** button (DEV only - auto-fills user@test.com/123456)
   - Or manually enter: user@test.com / 123456
3. Tap **"Login"**
4. **Expected:** Lands on Home screen showing recommended businesses

### STEP 3: Browse & Book Appointment

1. On **Home** tab, scroll to see businesses
2. Tap any business card (e.g., "Prestige Salon & Spa")
3. **Business Detail Screen** opens
4. Scroll down to **"Book Appointment"** section
5. **Step 1 - Select Employee:**
   - Tap an employee card
6. **Step 2 - Select Service:**
   - Tap a service card
7. **Step 3 - Select Date:**
   - Tap **"Pick a Date"** button
   - Calendar modal opens
   - Tap a future date (green circle)
   - Modal closes, date shown below
8. **Step 4 - Select Time:**
   - Time slots appear (e.g., "10:00 AM", "11:00 AM", etc.)
   - Tap a time slot
9. Tap **"Confirm Booking"** button
10. **Expected:**
    - Green toast: "Appointment requested successfully!"
    - Auto-navigate to **Appointments** tab after 1.5s
    - See new appointment with status **"PENDING"** (orange icon)

### STEP 4: Logout User

1. Tap **Profile** tab (bottom right)
2. Scroll to bottom
3. Tap red **"Logout"** button
4. **Expected:** Return to Auth screen

### STEP 5: Register/Login as Owner

**Option A - Register New Owner:**

1. Select **"Business Owner"** role tab
2. Select **"Register"** tab
3. Fill in:
   - **Full Name:** Jane Owner
   - **Email:** jane.owner@test.com
   - **Password:** 123456
   - **Confirm Password:** 123456
4. Tap **"Upload License"** (required for owners)
   - Pick any file from device
5. Tap **"Register"**
6. **Expected:** Lands on Owner Dashboard

**Option B - Use Existing Owner:**

1. Select **"Business Owner"** role tab
2. Select **"Login"** tab
3. For quick demo: tap **"Fill Owner"** button (auto-fills owner@test.com/123456)
4. Tap **"Login"**
5. **Expected:** Lands on Owner Dashboard (OwnerTabs)

### STEP 6: Owner Approves Appointment

1. Owner Dashboard shows stats
2. Tap **"Requests"** tab (second icon, mail icon)
3. **Requests Screen** shows pending appointments
4. Find the appointment created in Step 3
5. Tap **"Approve"** button (green, with checkmark icon)
6. Confirm approval if prompted
7. **Expected:**
   - Green toast: "Appointment approved"
   - Appointment disappears from pending list (moves to approved)
   - Stats on Dashboard update

### STEP 7: Verify as User

1. Tap **OwnerProfile** tab
2. Scroll down, tap red **"Logout"** button
3. Login again as USER:
   - Email: john.demo@test.com (or user@test.com)
   - Password: 123456
4. Tap **Appointments** tab
5. **Expected:**
   - Appointment now shows status **"APPROVED"** (green checkmark icon)
   - Displays business name, service, date, time

---

## Demo Shortcuts (DEV Mode Only)

### Quick Login Buttons

On Auth screen (Login mode):

- **"Fill User"** - auto-fills user@test.com/123456
- **"Fill Owner"** - auto-fills owner@test.com/123456

### Reset Demo State

On Profile screen:

- **"Reset Demo State (Dev Only)"** button clears all tokens and returns to Auth screen

---

## Test Accounts

### Pre-seeded Accounts

**User Account:**

- Email: `user@test.com`
- Password: `123456`
- Role: USER

**Owner Account:**

- Email: `owner@test.com`
- Password: `123456`
- Role: OWNER
- Business: "Prestige Salon & Spa"

**New Demo Accounts (from Step 1 & 5):**

- User: `john.demo@test.com` / `123456`
- Owner: `jane.owner@test.com` / `123456`

---

## API Endpoints Reference

### Auth

- `POST /auth/register-user` - Register user account
- `POST /auth/register-owner` - Register business owner
- `POST /auth/login` - Login (returns user, accessToken, refreshToken)
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### User Endpoints

- `GET /businesses/recommended` - Get recommended businesses
- `GET /businesses/:id` - Get business details
- `GET /businesses/:id/employees` - Get business employees
- `GET /businesses/:id/services` - Get business services
- `GET /businesses/:id/reviews` - Get business reviews
- `GET /businesses/:id/timeslots` - Get available time slots
- `POST /appointments` - Create appointment request
- `GET /appointments?userId={id}` - Get user appointments

### Owner Endpoints

- `GET /owner/appointments?businessId={id}` - Get business appointments
- `POST /owner/appointments/:id/approve` - Approve appointment
- `POST /owner/appointments/:id/reject` - Reject appointment
- `POST /owner/appointments/:id/complete` - Mark appointment complete

---

## Troubleshooting

### Backend Not Reachable

**Symptom:** Red banner shows "Backend not reachable at http://localhost:3000"

**Solutions:**

1. Check backend is running:

   ```bash
   curl http://localhost:3000/health
   ```

   Should return: `{"status":"ok","timestamp":"...","uptime":...}`

2. If not running, start backend:

   ```bash
   cd /Users/taylandeveci/BookIT-backend
   npm start
   ```

3. If PostgreSQL is not running:
   ```bash
   brew services start postgresql@16
   ```

### Login Returns 401/403

**Symptom:** "Failed to login: Error: You do not have permission"

**Solutions:**

1. Tokens expired or invalid - tap "Reset Demo State" button
2. Or manually clear:
   ```bash
   # Stop Expo, then:
   npx expo start --clear
   ```
3. Check backend logs for errors

### "Network error" on Login

**Symptom:** "Failed to login: Error: Network error. Please check your connection."

**Solutions:**

1. Verify `.env` file has correct API URL:

   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```

   (NOT `192.168.x.x` - iOS Simulator needs `localhost`)

2. Restart Expo to reload .env:
   ```bash
   # Kill expo process
   pkill -f "expo start"
   # Restart
   npx expo start
   ```

### Calendar Doesn't Open

**Symptom:** Tap "Pick a Date" but nothing happens

**Solutions:**

1. Ensure employee and service are selected first
2. Check console for errors
3. react-native-calendars should be installed:
   ```bash
   npm list react-native-calendars
   ```

### Appointment Not Showing After Creation

**Symptom:** Created appointment but don't see it in Appointments tab

**Solutions:**

1. Pull down to refresh appointments list
2. Check appointment was created:
   ```bash
   curl http://localhost:3000/appointments?userId={userId}
   ```
3. Verify backend logs show POST /appointments succeeded
4. Status might be PENDING - check under "Active" section

### Owner Can't See Pending Requests

**Symptom:** Requests tab is empty but user created appointment

**Solutions:**

1. Verify owner account is linked to the business:
   ```bash
   curl http://localhost:3000/owner/appointments?businessId={businessId}
   ```
2. Check appointment.businessId matches owner's business
3. Pull down to refresh requests list

### Role Routing Wrong (Owner Sees User UI)

**Symptom:** Owner logs in but lands on Home screen instead of Dashboard

**Solutions:**

1. Check backend returns role as "OWNER" (uppercase):
   ```bash
   curl -H "Authorization: Bearer {token}" http://localhost:3000/auth/me
   ```
2. Should see: `"role": "OWNER"` (not "owner")
3. If lowercase, backend needs to be updated
4. Frontend normalizes to uppercase automatically

### App Crashes on Business Detail

**Symptom:** Tap business card, app crashes

**Solutions:**

1. Check backend returns valid business data
2. Employees/services/reviews must be arrays or null
3. Check console for "TypeError: data.filter is not a function"
4. If so, backend response envelope may be malformed

---

## Known Limitations (Demo Only)

### Not Implemented for Demo:

- Real payment processing
- Push notifications
- Photo uploads (reviews, profile)
- Google Maps integration
- Email verification
- Password reset
- Owner business verification
- Multi-business support (owner can only manage one business)
- Advanced search filters
- Appointment reminders

### Mock/Simplified Data:

- Time slots are mock data (not from actual availability)
- Reviews are pre-seeded
- Business images use placeholder URLs
- No real-time updates (requires manual refresh)

---

## Production Readiness Checklist

Before deploying to production, these items MUST be addressed:

### Security

- [ ] Change JWT secrets in .env (currently demo values)
- [ ] Enable password strength requirements (currently 6 chars min)
- [ ] Add rate limiting to auth endpoints
- [ ] Implement CSRF protection
- [ ] Add input sanitization for all user input
- [ ] Enable HTTPS only
- [ ] Secure file upload with virus scanning

### Database

- [ ] Set up database backups
- [ ] Add database connection pooling
- [ ] Implement database migrations strategy
- [ ] Add indexes for performance
- [ ] Set up monitoring and alerts

### API

- [ ] Remove CORS_ORIGIN=\* (whitelist specific domains)
- [ ] Add API versioning (/api/v1/...)
- [ ] Implement proper error logging (e.g., Sentry)
- [ ] Add request validation with detailed error messages
- [ ] Set up API documentation (Swagger/OpenAPI)

### Frontend

- [ ] Remove **DEV** shortcuts (quick login, reset buttons)
- [ ] Add analytics (mixpanel, amplitude)
- [ ] Implement crash reporting (Bugsnag, Sentry)
- [ ] Add app version checking
- [ ] Set up EAS Build for production
- [ ] Configure app icons and splash screens
- [ ] Test on real devices (iPhone/Android)

### Business Logic

- [ ] Implement real timeslot availability checking
- [ ] Add appointment reminder notifications
- [ ] Build email verification flow
- [ ] Add password reset functionality
- [ ] Implement business license verification workflow
- [ ] Add multi-business support for owners
- [ ] Build review moderation system

---

## Emergency Contacts

**Backend Issues:**

- Check `/tmp/backend.log` for errors
- Restart: `cd /Users/taylandeveci/BookIT-backend && npm start`

**Frontend Issues:**

- Clear cache: `npx expo start --clear`
- Reset demo state: Use "Reset Demo State" button in Profile

**Database Issues:**

- Check PostgreSQL status: `brew services list | grep postgresql`
- Restart: `brew services restart postgresql@16`
- Re-seed: `cd /Users/taylandeveci/BookIT-backend && npm run prisma:seed`

---

## Demo Success Checklist

Before presenting to jury, verify:

- [ ] Backend running on localhost:3000 (curl /health returns ok)
- [ ] Frontend opens in iOS Simulator
- [ ] Green "Backend connected" banner shows on Auth screen
- [ ] Can register new user successfully
- [ ] Can login with test accounts (user@test.com, owner@test.com)
- [ ] Can browse businesses on Home screen
- [ ] Can open business detail and see employees/services
- [ ] Can select employee, service, date (calendar opens), time
- [ ] Can create appointment (toast shows success)
- [ ] Appointment appears in Appointments tab with PENDING status
- [ ] Can logout
- [ ] Can login as owner
- [ ] Owner sees Dashboard with stats
- [ ] Owner sees pending request in Requests tab
- [ ] Can approve appointment (toast shows success)
- [ ] Can logout owner and login back as user
- [ ] Appointment now shows APPROVED status

**All checks passed?** Demo ready!

---

## Quick Commands Cheat Sheet

```bash
# Start backend
cd /Users/taylandeveci/BookIT-backend && npm start

# Start frontend
cd /Users/taylandeveci/Demodeneme && npx expo start

# Check backend health
curl http://localhost:3000/health

# Test user login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"123456"}'

# Re-seed database
cd /Users/taylandeveci/BookIT-backend && npm run prisma:seed

# Clear Expo cache
cd /Users/taylandeveci/Demodeneme && npx expo start --clear

# Check PostgreSQL
brew services list | grep postgresql

# Rebuild backend
cd /Users/taylandeveci/BookIT-backend && npm run build
```

---

**End of Demo Runbook**
