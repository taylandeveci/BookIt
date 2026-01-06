# BookIT - Demo Guide for Jury Presentation

## 🚀 Quick Start (One Command)

From the project root (`/Users/taylandeveci/Demodeneme`):

```bash
npm run demo:full
```

This command will:

1. ✅ Kill any processes on ports 3000, 8081, 8082
2. ✅ Start the backend server on http://localhost:3000
3. ✅ Start Expo in **Expo Go mode** (no dev-client build required)
4. ✅ Auto-open iOS Simulator
5. ✅ Load the app in Expo Go

**Alternative commands:**

- `npm run demo:sim` - Opens Simulator first, then runs demo:full
- `npm run demo` - Frontend only (requires backend running separately)
- `npm run dev:backend` - Backend only

---

## 📱 Demo Accounts

### Customer Account

- **Email:** `user@test.com`
- **Password:** `123456`

### Business Owner Account

- **Email:** `owner@test.com`
- **Password:** `123456`

---

## 🎯 Demo Flow for Jury

### Part 1: Customer Flow (5 minutes)

1. **Login as Customer**

   - Email: `user@test.com`
   - Password: `123456`

2. **Browse Businesses**

   - View list of available salons/spas
   - See ratings and categories
   - Search by name or category

3. **View Business Details**

   - Tap on a business
   - See services offered (price, duration)
   - View available time slots
   - Check reviews and ratings

4. **Make a Reservation**

   - Select a service
   - Choose employee
   - Pick date and time slot
   - Add optional notes
   - Confirm booking

5. **View Appointments**

   - Go to "Appointments" tab
   - See upcoming and past reservations
   - Check status (Pending, Approved, etc.)

6. **Leave a Review** (after appointment)
   - Navigate to completed appointment
   - Rate business (1-5 stars)
   - Write review text
   - Submit

### Part 2: Business Owner Flow (5 minutes)

1. **Login as Owner**

   - Logout from customer account
   - Email: `owner@test.com`
   - Password: `123456`

2. **View Dashboard**

   - **Today's Appointments:** Count of today's reservations
   - **Pending Requests:** Reservations awaiting approval
   - **Approved Today:** Count of approved appointments for today
   - **Average Rating:** Business rating from reviews
   - **Your Appointments:** List of ALL appointments (upcoming + past)

3. **Manage Requests**

   - Go to "Requests" tab
   - See pending reservations
   - **Approve** or **Reject** with reason
   - Status updates in real-time

4. **Manage Services**

   - Go to "Services" tab
   - View existing services
   - **Add New Service:**
     - Name: "Haircut"
     - Description: "Professional haircut"
     - Price: 250
     - Duration: 30 minutes
   - Press "Add" → Service appears in list

5. **Manage Employees**
   - Go to "Employees" tab
   - View staff members
   - Add/Edit/Delete employees
   - Assign services to employees

---

## 🛠️ Troubleshooting

### Issue: "No development build installed"

**Solution:** The app is configured to use **Expo Go** by default. Make sure:

- You ran `npm run demo:full` (not `npx expo run:ios`)
- Expo Go is installed in the iOS Simulator
- The simulator is iPhone 15 or later

### Issue: Simulator already running

**Solution:** The script handles this automatically. If it doesn't work:

```bash
# Close all simulators
killall Simulator
# Then run demo again
npm run demo:full
```

### Issue: Port 3000 already in use

**Solution:** The script kills ports automatically. If manual cleanup needed:

```bash
npm run clean:ports
```

### Issue: Metro bundler not starting

**Solution:** Clear cache and restart:

```bash
npm run demo -- --clear
```

### Issue: Backend not responding

**Solution:**

1. Check if backend is running: `curl http://localhost:3000/health`
2. If not, run backend separately:
   ```bash
   cd ../BookIT-backend
   npm run dev
   ```

### Issue: "Cannot connect to Metro"

**Solution:**

- Ensure no VPN or firewall blocking localhost
- Restart the demo: `npm run demo:full`
- Check Metro logs in terminal

---

## 🔍 Technical Details

### Tech Stack

- **Frontend:** React Native + Expo SDK 52
- **Backend:** Node.js + Express + Prisma + PostgreSQL
- **Auth:** JWT tokens with refresh mechanism
- **State:** Zustand for global state
- **Navigation:** React Navigation v6
- **Forms:** React Hook Form + Zod validation

### Architecture

- **API Base URL:** `http://localhost:3000` (configured in `.env`)
- **Auth Flow:** Login → Store tokens → Auto-refresh on 401
- **Logout Protection:** Prevents "Too many requests" with debounce
- **iOS Fixes:** Password autofill disabled, text input stability fixed

### Key Features Implemented

✅ Customer registration and login  
✅ Business browsing with search  
✅ Real-time available time slots  
✅ Appointment booking  
✅ Owner dashboard with real data  
✅ Approve/reject reservations  
✅ Service and employee management  
✅ Reviews and ratings system  
✅ Profile management

---

## 📊 Backend Endpoints

### Auth

- `POST /auth/register-user` - Customer registration
- `POST /auth/register-owner` - Owner registration
- `POST /auth/login` - Login (both roles)
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh access token

### Customer

- `GET /businesses` - List all businesses
- `GET /businesses/:id` - Business details
- `GET /businesses/:id/reviews` - Business reviews
- `POST /appointments` - Create appointment
- `GET /appointments` - User's appointments

### Owner

- `GET /owner/business` - Owner's business
- `GET /owner/appointments` - All appointments
- `POST /owner/appointments/:id/approve` - Approve request
- `POST /owner/appointments/:id/reject` - Reject request
- `POST /owner/services` - Create service
- `POST /owner/employees` - Create employee

---

## 📝 Demo Checklist

Before presenting to jury, verify:

- [ ] Backend running on port 3000
- [ ] Frontend Metro bundler running on port 8081
- [ ] iOS Simulator open with Expo Go
- [ ] Can login as customer (user@test.com)
- [ ] Can browse businesses and see details
- [ ] Can make a reservation
- [ ] Can login as owner (owner@test.com)
- [ ] Dashboard shows real numbers
- [ ] Can approve/reject requests
- [ ] Can add a new service
- [ ] No red error screens
- [ ] Console has minimal warnings

---

## 🎬 Opening Statement for Jury

> "BookIT is a full-stack appointment booking platform built with React Native and Node.js.
>
> **For customers:** Browse local businesses, view real-time availability, book appointments, and leave reviews.
>
> **For business owners:** Manage appointments, services, employees, and respond to customer requests with a complete dashboard.
>
> The entire system runs locally and demonstrates end-to-end functionality with a production-ready architecture including JWT authentication, database persistence, and real-time updates."

---

## 🐛 Known Limitations

- ⚠️ iOS only (Android not configured)
- ⚠️ Local development environment (not deployed)
- ⚠️ Test data from seed scripts
- ⚠️ Some Expo package version mismatches (non-critical)

---

## 📞 Support

If you encounter issues during demo:

1. Check terminal output for errors
2. Restart with `npm run demo:full`
3. Clear cache: `npm run clean:ports && npm run demo:full`
4. Check backend health: `curl http://localhost:3000/health`

**Last Updated:** January 7, 2026
