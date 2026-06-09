# Bookit — Gap Analysis

**Date:** 2026-05-27  
**Scope:** `/Users/taylandeveci/BookIt/olddemo` (React Native frontend) vs. `/Users/taylandeveci/BookIt/apps/api` (NestJS backend)  
**Methodology:** Static analysis — no code was changed.

---

## 1. Non-Functional UI Elements

| Screen | Element | File:Line | Issue |
|---|---|---|---|
| AuthScreen | Tax Number input | `src/screens/auth/AuthScreen.tsx:532–542` | No `value` or `onChangeText` prop. Input accepts keystrokes visually but state is never captured. Field is not included in `registerOwner` payload. |
| AuthScreen | Document Upload button | `src/screens/auth/AuthScreen.tsx:544–562` | `TouchableOpacity` has no `onPress` handler. Tap does nothing. No image picker is invoked. |
| AuthScreen | Phone field (owner registration) | `src/screens/auth/AuthScreen.tsx:155` | Displayed as required by UI convention but Zod schema only validates `businessName`. Phone value is never sent as a required field. |
| ProfileScreen | Notifications toggle | `src/screens/user/ProfileScreen.tsx:509–515` | `Switch` calls `setNotifications` from `useAppStore` — local Zustand state only. Never persisted to backend. Toggle resets on app restart. |
| OwnerProfileScreen | joinCodeEnabled switch | `src/screens/owner/OwnerProfileScreen.tsx` | Switch updates local state. Only saved on "Save Settings" button press. If user navigates away before saving, setting is lost silently. |
| OwnerProfileScreen | releaseOnEarlyCompletion switch | `src/screens/owner/OwnerProfileScreen.tsx` | Same as above — no auto-persist, no dirty-state indicator. |
| OwnerProfileScreen | Business photo upload | `src/screens/owner/OwnerProfileScreen.tsx` | Uses `ImagePicker` with `base64: true` and posts as data URI string. Will silently fail or corrupt for any photo over ~300 KB. No Supabase Storage integration. |
| EmployeesScreen | Edit modal | `src/screens/owner/EmployeesScreen.tsx:298–335` | Edit form only allows changing `fullName`. No specialization field, no service assignment, no schedule management from owner side. |
| RequestsScreen | Rejection modal title/label | `src/screens/owner/RequestsScreen.tsx:492–497` | Both `modalTitle` and `modalLabel` use the same translation key `requests.rejectConfirm`. Label and title display identical text — one of them is wrong. |
| BusinessDetailScreen | Timeslot fallback generator | `src/screens/user/BusinessDetailScreen.tsx:123–129` | On API failure, catch block generates fake available slots (09:00–17:30 at 30-min intervals) with no indication to the user. User sees and can book "available" times that may not exist. **Critical UX/correctness bug.** |
| RootNavigator | REJECTED employee state | `src/navigation/RootNavigator.tsx` | An employee with `status === 'REJECTED'` is caught by the non-ACTIVE branch and sees `EmployeePendingScreen` indefinitely. No rejected state screen, no re-registration path. |

---

## 2. Missing Features

Compared to production booking platforms (Booksy, Fresha, Square Appointments):

| Feature | Status | Notes |
|---|---|---|
| Email verification on registration | Missing | Users register and are immediately authenticated. No verification step exists in any auth flow. |
| Phone number verification (OTP) | Missing | Phone collected on owner registration (though broken — see §1) but never verified. |
| Reschedule flow | Missing | No reschedule screen, no `reschedule-request` endpoint, no status handling for rescheduled bookings. Customers can only cancel. |
| Booking reminders (push) | Missing | `notificationService.ts` was deleted per git status. No device push token registration in the app. No reminder scheduling. |
| Favorites / saved businesses | Missing from UI | `favoritesService` endpoints exist in NestJS (`GET /me/favorites`, `POST /me/favorites/:id`) but there is no Favorites tab, no heart icon on BusinessDetailScreen, and no screen to manage them. |
| Customer reviews from completed bookings | Broken | `ReviewScreen` calls `POST /appointments/:appointmentId/review` but NestJS backend only has `POST /businesses/:businessId/reviews`. Different route, different payload. |
| Business media gallery | Missing | `ownerService.getMedia()`, `addMedia()`, `deleteMedia()` are defined but call non-existent backend endpoints. No gallery screen renders business photos. |
| Owner calendar view | Missing | `ownerService.getCalendar()` calls `GET /owner/calendar` — no such NestJS endpoint. The Calendar tab for owners is wired to a non-existent data source. |
| Cancellation policy | Missing | `business.cancellationWindowMinutes` referenced in frontend types but no cancellation policy UI exists for owners to configure it. |
| Waitlist | Not in V1 scope | Confirmed out of scope per CLAUDE.md, but no entry point or error state informs the user. |
| Payment / deposits | Not in V1 scope | No payment screen, no payment status on bookings. |
| Customer arrival confirmation | Broken | `AppointmentsScreen` references `item.customerArrivalConfirmed` (line 262, 291) and calls `appointmentService.confirmArrival()` (line 136) → `POST /appointments/:id/confirm-arrival`. No backend endpoint for this. |
| No-show marking by employee | Broken | `employeeService.noShowAppointment()` → `POST /employee/appointments/:id/no-show` has no NestJS backend handler. |
| Service variants | Missing | NestJS backend has full `service_variants` data model. Frontend only creates flat services with a single price/duration. No variant selection in booking flow. |
| Staff assignment to services | Not surfaced | NestJS has `PATCH /owner/staff/:id/service-assignments`. Owner cannot assign services to specific staff from any screen. |
| Business hours configuration | Missing | No screen to set business open/close hours. The availability engine depends on this data existing. |
| Staff working hours by owner | Missing | Owners cannot set employee working hours. Only employees can via `EmployeeScheduleScreen`. |
| Multi-location support | Not in V1 scope | Architecture supports it; frontend assumes single location. |
| Analytics / revenue dashboard | Client-side only | Revenue in `DashboardScreen` is computed by summing appointment prices in-memory — no server-side analytics endpoint used. |
| Review moderation by owner | Broken | `ownerReviewService.getAllReviews()`, `approveReview()`, `rejectReview()` call non-existent backend endpoints. |
| Search with category filter | Broken | Category chips on `SearchScreen` are hardcoded strings (line 40–56). Selecting a chip does client-side filter only — no category param ever sent to the backend. |
| Geo-location based search | Partial | Map center falls back to `ANKARA` hardcoded constant (SearchScreen line 58) if geolocation is unavailable. No indication to user that results are not location-aware. |

---

## 3. Missing or Incomplete Backend Endpoints

**Root cause:** The frontend was built against a custom Express backend described in `olddemo/CLAUDE.md`. The NestJS backend at `apps/api` follows the main Bookit architecture spec. The two have fundamentally incompatible API surfaces.

---

### Auth

**`POST /auth/register-user`** (authService.ts)  
NestJS only exposes `POST /auth/register`. Path mismatch — all user registrations fail.

**`POST /auth/register-owner`** (authService.ts)  
No NestJS endpoint. Owner registration is completely broken.

**`POST /auth/register-employee`** (authService.ts)  
No NestJS endpoint. Employee registration is completely broken.

**`POST /auth/verify-join-code`** (authService.ts)  
No NestJS endpoint. Join code verification step always fails.

**`PUT /auth/profile/me`** (authService.ts → updateProfile)  
NestJS has `PATCH /me/profile` (profiles module). Wrong path and method.

**`POST /auth/change-password/me`** (authService.ts → changePassword)  
No NestJS endpoint. ChangePasswordScreen always returns an error.

---

### Businesses

**`GET /businesses`** (businessService.ts → getBusinesses)  
NestJS has `GET /businesses/search` (with query params) and `GET /home/feed`. No plain `GET /businesses`. HomeScreen and SearchScreen both fail to load business lists.

**`GET /businesses/:id/employees`** (businessService.ts → getEmployees)  
NestJS has `GET /businesses/:id/staff`. Path segment mismatch (`employees` vs `staff`). BusinessDetailScreen cannot load staff for a business.

**`GET /businesses/:id/time-slots`** (businessService.ts → getAvailableTimeSlots)  
NestJS has `POST /availability/query`. Both path and HTTP method differ. Timeslot loading in BusinessDetailScreen fails, triggering the fake-slot fallback bug.

---

### Appointments

**`POST /owner/appointments/:id/approve`** (ownerService.ts → approveAppointment)  
No NestJS endpoint. NestJS only has `POST /owner/bookings/:id/override`. Owner cannot approve bookings.

**`POST /owner/appointments/:id/reject`** (ownerService.ts → rejectAppointment)  
No NestJS endpoint. Owner cannot reject bookings.

**`POST /owner/appointments/:id/complete`** (ownerService.ts → completeAppointment)  
No NestJS endpoint. Owner cannot mark bookings complete.

**`GET /owner/appointments`** (ownerService.ts → getOwnerAppointments)  
No NestJS endpoint. RequestsScreen always shows empty.

**`POST /appointments/:id/confirm-arrival`** (appointmentService.ts → confirmArrival)  
No NestJS endpoint. Arrival confirmation button in AppointmentsScreen always fails.

**`POST /appointments/:id/cancel`** (appointmentService.ts → cancelAppointment)  
NestJS has `POST /me/bookings/:id/cancel`. Path prefix differs (`/me/bookings` vs `/appointments`). Customer cancel always fails.

---

### Employee Endpoints (all missing)

All `/employee/*` routes called by the frontend have no NestJS backend handlers:

- `GET /employee/appointments` → employeeService.getAppointments  
- `POST /employee/appointments/:id/start` → employeeService.startAppointment  
- `POST /employee/appointments/:id/no-show` → employeeService.noShowAppointment  
- `POST /employee/appointments/:id/complete` → employeeService.completeAppointment  
- `POST /employee/appointments/:id/approve` → employeeService.approveAppointment  
- `POST /employee/appointments/:id/decline` → employeeService.declineAppointment  
- `GET /employee/services` → employeeService.getServices  
- `POST /employee/services/:serviceId` → employeeService.addService  
- `DELETE /employee/services/:serviceId` → employeeService.removeService  
- `GET /employee/schedule` → employeeService.getSchedule  
- `PUT /employee/schedule` → employeeService.updateSchedule  
- `POST /employee/join-business` → employeeService.joinBusiness (EmployeeProfileScreen)  
- `DELETE /employee/leave-business` → employeeService.leaveBusiness (EmployeeProfileScreen)  

NestJS staff module has `GET /employee/me/profile`, `PATCH /employee/me/profile`, `POST /employee/me/blocks`, `POST /employee/me/time-off`, `POST /employee/me/breaks` — none of which the frontend calls.

---

### Owner: Pending Employees

**`GET /owner/pending-employees`** (ownerService.ts → getPendingEmployees)  
No NestJS endpoint. Staff tab in RequestsScreen always shows empty.

**`PUT /owner/employees/:id/approve`** (ownerService.ts → approveEmployee)  
No NestJS endpoint. Staff approval always fails.

**`PUT /owner/employees/:id/reject`** (ownerService.ts → rejectEmployee)  
No NestJS endpoint. Staff rejection always fails.

---

### Owner: Reviews, Calendar, Media

**`GET /owner/reviews`** (ownerService.ts → getReviewsToModerate)  
No NestJS endpoint.

**`POST /owner/reviews/:id/approve`** (ownerService.ts → approveReview)  
No NestJS endpoint.

**`POST /owner/reviews/:id/reject`** (ownerService.ts → rejectReview)  
No NestJS endpoint.

**`GET /owner/calendar`** (ownerService.ts → getCalendar)  
No NestJS endpoint. Owner calendar tab renders no data.

**`GET /owner/business/media`** (ownerService.ts → getMedia)  
No NestJS endpoint.

**`POST /owner/business/media`** (ownerService.ts → addMedia)  
No NestJS endpoint.

**`DELETE /owner/business/media/:id`** (ownerService.ts → deleteMedia)  
No NestJS endpoint.

---

### Reviews

**`POST /appointments/:appointmentId/review`** (reviewService.ts → createReview)  
NestJS has `POST /businesses/:businessId/reviews`. Frontend sends appointment ID in path; backend expects business ID in path. ReviewScreen always fails.

**`GET /businesses/:id/reviews`**  
This one matches — NestJS businesses controller exposes it. Review list loading works.

---

## 4. Hardcoded or Static Data

**Service/Category chips — SearchScreen**  
`src/screens/user/SearchScreen.tsx:40–56`  
`SERVICE_CHIP_DEFS` and `CATEGORY_CHIP_DEFS` are static arrays with literal Turkish strings ("Berber", "Saç Boyama", "Spa", "Erkek Bakımı", "Kadın Bakımı"). No API call is made to populate these. Adding a new category in the backend has zero effect on what the search screen shows.

**Map center — SearchScreen**  
`src/screens/user/SearchScreen.tsx:58`  
`const ANKARA = { latitude: 39.9334, longitude: 32.8597 }` is the hardcoded fallback when geolocation is unavailable. Users in Istanbul, Izmir, or anywhere else see Ankara-centered results.

**Pending booking TTL — RequestsScreen**  
`src/screens/owner/RequestsScreen.tsx:227`  
`const ttlHours = business?.pendingBookingTTLHours ?? 24` — falls back to 24 hours if field is missing. The `pendingBookingTTLHours` field does not exist in the NestJS Prisma schema, so the fallback is always used and the value cannot be configured per business.

**Notification body parsing — HomeScreen**  
`src/screens/user/HomeScreen.tsx` — `service_start_code` notification type parses `notification.body` by splitting on `|` to extract a service code. This pipe-delimited format is a hardcoded convention with no schema enforcement. Any change to notification body format breaks the parsing silently.

**API base URL**  
`src/services/apiClient.ts` — `process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'`. In production builds without the env var set, every API call goes to localhost (which is unreachable on a physical device).

**Revenue computation — DashboardScreen**  
`src/screens/owner/DashboardScreen.tsx` — total revenue is computed client-side by summing `service.price` from the appointments array already in memory. This is a best-effort estimate, not a real financial figure. Completed appointments with `actualEndTime` set have no different weighting. Refunded or disputed amounts are not accounted for.

**Status enum values — AppointmentsScreen**  
`src/screens/user/AppointmentsScreen.tsx:152, 298, 344` — references `'DISPUTED'` status, which does not exist in the NestJS `BookingStatus` enum. The frontend handles a state the backend will never emit.

**Status enum values — AppointmentsScreen**  
`src/screens/user/AppointmentsScreen.tsx:262, 291, 308` — references `item.customerArrivalConfirmed` and `item.rejectionReason`. Neither field exists on the NestJS `Booking` model. These will always be `undefined`.

---

## 5. Unhandled Error States

**BusinessDetailScreen — timeslot query failure**  
`src/screens/user/BusinessDetailScreen.tsx:123–129`  
The `queryFn` catch block silently swallows the error and returns fake available slots. The user sees no error. This is the most dangerous unhandled error in the codebase — it actively misleads the user into believing slots are bookable when they are not.

**EmployeeServicesScreen — load failure**  
`src/screens/employee/EmployeeServicesScreen.tsx:88`  
`load()` has a bare catch that sets no error state and shows no feedback. If the services API fails, the screen renders empty with no explanation.

**EmployeeScheduleScreen — load failure**  
`src/screens/employee/EmployeeScheduleScreen.tsx:157`  
Same pattern — `load()` silently catches errors. The schedule screen appears empty with no error message.

**HomeScreen — query errors**  
`src/screens/user/HomeScreen.tsx`  
Neither the `businessService.getBusinesses()` query nor the `appointmentService.getAppointments()` query has an `isError` branch. On API failure, the screen shows no content and no error — looks like an empty state.

**ChangePasswordScreen — API failure**  
`src/screens/user/ChangePasswordScreen.tsx`  
Calls `authService.changePassword()` → `POST /auth/change-password/me` (no backend endpoint). The error will surface only if the `catch` in the form submit handler has a toast/message — if it does not, the user gets no feedback and believes the password was changed.

**RootNavigator — REJECTED employee**  
`src/navigation/RootNavigator.tsx`  
An employee whose application was rejected lands on `EmployeePendingScreen` indefinitely. There is no screen, message, or path out for rejected status. The user is stuck.

**ReviewScreen — review submission failure**  
`src/screens/user/ReviewScreen.tsx`  
Calls the wrong endpoint (`POST /appointments/:appointmentId/review` vs `POST /businesses/:businessId/reviews`). The backend returns 404. Whether the catch handles this gracefully depends on the error handler implementation — but even a graceful error gives the user no actionable path.

**AppointmentsScreen — confirmArrival failure**  
`src/screens/user/AppointmentsScreen.tsx:136`  
`appointmentService.confirmArrival()` calls a non-existent endpoint. The catch handler may or may not surface a user-facing error. Regardless, the action never succeeds.

**OwnerProfileScreen — photo upload**  
`src/screens/owner/OwnerProfileScreen.tsx`  
Photo encoded as base64 data URI. For images over ~300 KB, the request payload will be extremely large and likely fail with a 413 or timeout. The catch likely shows a generic error with no guidance ("photo too large", "use a smaller image", etc.).

**Auth registration — all three flows**  
`src/screens/auth/AuthScreen.tsx`  
`POST /auth/register-user`, `POST /auth/register-owner`, `POST /auth/register-employee` all hit wrong/missing endpoints. The catch handlers show error toasts, which is correct, but the error messages will be generic network/404 errors — not actionable by the user or developer in production.

---

## Summary — Top 10 Priorities Before Public Release

| Priority | Issue | Impact |
|---|---|---|
| **1** | All auth registration endpoints are wrong or missing. `POST /auth/register-user`, `/register-owner`, `/register-employee` do not exist on NestJS. Zero users can create accounts. | Showstopper |
| **2** | `GET /businesses` and `GET /businesses/:id/time-slots` (GET) have no NestJS handlers. Home feed, search results, and timeslot loading all fail. Core booking flow is broken. | Showstopper |
| **3** | BusinessDetailScreen fake timeslot fallback (`src/screens/user/BusinessDetailScreen.tsx:123–129`). On API failure, fake slots are shown. Users can attempt to book non-existent slots. Remove the fallback immediately and show a proper error state. | Critical — data integrity |
| **4** | All `/employee/*` endpoints have no NestJS backend. The entire employee role — appointment start/complete, schedule management, service management — is non-functional. | Showstopper for employee role |
| **5** | All owner appointment action endpoints (`approve`, `reject`, `complete`) are missing. RequestsScreen is fully non-functional for appointment management. | Showstopper for owner role |
| **6** | ReviewScreen calls `POST /appointments/:appointmentId/review` but NestJS expects `POST /businesses/:businessId/reviews`. Reviews cannot be submitted. | High |
| **7** | RootNavigator has no REJECTED employee state. Rejected employees see the "pending" screen forever with no path out. | High — UX deadlock |
| **8** | `POST /auth/change-password/me` has no NestJS endpoint. ChangePasswordScreen always fails silently or with a confusing error. | High |
| **9** | SearchScreen category chips are hardcoded Turkish strings — not localized, not dynamic. No category filter is ever sent to the backend. Search results are not category-aware. | Medium — product correctness |
| **10** | Business photo upload encodes images as base64 data URIs. Any real photo will exceed request size limits. No Supabase Storage integration exists. Business profile photos cannot be set in practice. | Medium — owner workflow |
