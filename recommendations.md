# Bookit — Professional Audit & Recommendations

## Summary

The codebase is a well-structured React Native / Expo application with a clear role-based architecture and a thoughtful design system. The core booking, auth, and data-layer foundations are sound — JWT refresh logic, role-based navigation isolation, and the recently-added TanStack Query integration are all implemented with care. However, the app is not production-ready in its current state. Push notifications are completely unimplemented (the toggle is a UI placeholder with no real effect), approximately 30% of UI strings bypass the i18n system entirely (mostly Turkish-only hardcoded text), several screens are not connected to the TanStack Query cache at all and will not reflect cross-role mutations, several unused installed packages bloat the bundle, and there are scattered `any` casts, hardcoded colors, and dead form fields that indicate the codebase is mid-development. The architecture is heading in the right direction, but needs a focused cleanup pass before any public release.

---

## Critical Issues

### 1. Push notifications are entirely non-functional
**Problem:** The "Notifications" toggle in all three profile screens (ProfileScreen, EmployeeProfileScreen, OwnerProfileScreen) writes a flag to AsyncStorage but does absolutely nothing. There is no `expo-notifications` import anywhere in the codebase, no push token registration, no token storage to the backend, and no notification delivery. `ENABLE_PUSH_NOTIFICATIONS=false` is set in `.env`. The feature does not exist — users who toggle this on are misled.  
**Recommendation:** Either remove the toggle and label it "Coming soon" until the feature is built, or implement it properly: request permission on login, register the push token with the backend (`POST /devices`), and trigger delivery on booking events.

### 2. `EmployeeHomeScreen` is completely outside the TanStack Query cache
**Problem:** `EmployeeHomeScreen` (`src/screens/employee/EmployeeHomeScreen.tsx`) uses raw `useState + useFocusEffect + employeeService.getAppointments()` with no connection to the query cache. Its mutations (`handleStart`, `handleComplete`, `handleNoShow`) call `await load()` locally instead of invalidating shared keys. This means:
- When a customer creates a booking, EmployeeHomeScreen does not update until manual focus.
- When EmployeeHomeScreen completes an appointment, the calendar screen (`EmployeeCalendarScreen`) and dashboard are not automatically updated.  
**Recommendation:** Convert to `useQuery({ queryKey: queryKeys.bookings.employeeAll, ... })` and replace `await load()` with `queryClient.invalidateQueries` using the full cross-role chain defined in the other employee screens.

### 3. `EmployeesScreen` and `ProfileScreen` are outside the query cache — mutations do not propagate
**Problem:** `src/screens/owner/EmployeesScreen.tsx` uses `useFocusEffect + loadData()` with no TanStack Query. Mutations (edit employee, delete employee) call `loadData()` locally. Changes made here do not invalidate `queryKeys.employees.forBusiness(businessId)` or `queryKeys.employees.pending`, so `DashboardScreen` and `RequestsScreen` will display stale employee lists until manually refreshed. Similarly, `src/screens/user/ProfileScreen.tsx` loads appointments outside the cache, duplicating the logic already in `AppointmentsScreen.tsx` — two separate caches that can diverge.  
**Recommendation:** Convert both screens to `useQuery`. ProfileScreen should query `queryKeys.bookings.customerAll` (the same key used by AppointmentsScreen) rather than issuing a parallel independent fetch.

### 4. `BusinessReviewsScreen` rating header is permanently stale
**Problem:** The rating average and review count displayed in the header of `src/screens/user/BusinessReviewsScreen.tsx` come from `route.params.ratingAvg` and `route.params.ratingCount` — values passed from `BusinessDetailScreen` at navigation time. They are not re-fetched or derived from a live query. If the owner approves a review while the user is viewing the screen, the header continues to show the old rating indefinitely. The same stale data is shown in `BusinessDetailScreen` line 227–228 when re-navigating to the reviews screen from a detail page with cached data.  
**Recommendation:** Replace the route-params-based rating header with a live `useQuery({ queryKey: queryKeys.businesses.averageRating(businessId) })` that fetches the current rating directly, removing the dependency on navigation params.

### 5. Token double-store: auth registration writes tokens twice
**Problem:** `authService.registerUser`, `registerOwner`, and `registerEmployee` all write `accessToken` and `refreshToken` to SecureStore (lines 46–47, 70–71, 90–91 in `authService.ts`). Then `AuthScreen.onRegister` calls `await login(...)`, which calls `authStore.login`, which writes the tokens a second time (lines 56–57 in `authStore.ts`). This is redundant and means two round-trips for token persistence on registration.  
**Recommendation:** Have registration endpoints return tokens but not store them. Token storage belongs exclusively in `authStore.login`. The intermediate `SecureStore.setItemAsync` calls in `authService.ts` registration methods should be removed.

### 6. `authService.logout` deletes tokens, then `clearAuthTokens` deletes them again
**Problem:** `authService.logout` (lines 117–118) deletes `accessToken` and `refreshToken` from SecureStore in its `finally` block. The caller, `authStore.logout`, then calls `clearAuthTokens()` (line 88), which deletes the same keys again. This double-delete is harmless in practice today, but creates confusion about which layer owns token lifecycle. The `authService.logout` should not perform local cleanup — that is `authStore`'s responsibility.  
**Recommendation:** Remove `SecureStore.deleteItemAsync` from `authService.logout`. Token deletion should only happen in `authStore.clearAuthTokens`.

### 7. `auth/change-password` and `auth/profile` endpoints take `userId` from the client — BOLA risk
**Problem:** `authService.updateProfile(userId, data)` calls `PUT /auth/profile/${userId}` and `authService.changePassword(userId, ...)` calls `POST /auth/change-password/${userId}`. The `userId` comes from the client-side auth store. If the backend does not re-validate that this `userId` matches the JWT subject, any authenticated user could update any other user's profile or password by supplying a different ID.  
**Recommendation:** The backend endpoints should derive `userId` from the JWT (`req.user.id`), not from the URL parameter. On the frontend, the `userId` parameter in these functions should be removed. This is an OWASP API1:2023 (BOLA) issue.

---

## High Priority

### 8. Employee role mismatch error shows wrong message
**Problem:** In `AuthScreen.onLogin` (line 96–98), when an EMPLOYEE account logs in via the wrong tab, the error key selection only handles `USER` and `OWNER` expected roles. If `error.expectedRole` is `'EMPLOYEE'` and the user logged in via the customer tab, the code falls through to `'auth.roleMismatchOwner'`, which says "This account is a Customer account." This is the wrong message.  
**Recommendation:** Add a third branch: `error.expectedRole === 'EMPLOYEE' ? 'auth.roleMismatchEmployee' : ...` and add the corresponding i18n key.

### 9. Dashboard's "No Show" metric is actually counting REJECTED appointments
**Problem:** In `DashboardScreen.tsx` (line 221 and 524), the "No Show" bar in the chart and the "No Show" stat card both count `a.status === 'REJECTED'` — not `'NO_SHOW'`. The `NO_SHOW` status exists in the codebase (`AppointmentStatus` type, line 72 of `types/index.ts`) but is not counted anywhere in the dashboard. Owner dashboards will show inflated "no-shows" from rejected bookings, and real no-shows will not appear.  
**Recommendation:** Change both `g.filter(a => a.status === 'REJECTED')` instances to `a.status === 'NO_SHOW'` and handle the `REJECTED` status separately if it needs its own metric.

### 10. `BusinessDetailScreen` bundles four data types into one query key — over-invalidation on every mutation
**Problem:** `src/screens/user/BusinessDetailScreen.tsx` line 67 queries `queryKeys.businesses.detail(businessId)` and the `queryFn` fetches business info, employees, services, and reviews together in a single `Promise.all`. Every mutation that invalidates any one of these — a review submission, a service change, an employee update — causes all four to refetch simultaneously, even when only one changed. For a business with many reviews and employees, this is N+1-equivalent on the frontend.  
**Recommendation:** Split into four separate queries: `queryKeys.businesses.detail(id)`, `queryKeys.businesses.employees(id)`, `queryKeys.businesses.services(id)`, `queryKeys.reviews.forBusiness(id)`. Each can then be invalidated independently.

### 11. N+1 fetch pattern in `AppointmentsScreen` and `ProfileScreen`
**Problem:** Both `AppointmentsScreen` (line 57–71) and `ProfileScreen` (line 81–99) issue 2–3 separate API calls per appointment to fetch business, service, and employee details. For a customer with 10 appointments, this is 20–30 API calls on every load. The `ProfileScreen` version also fetches all services for a business just to find one by ID, then discards the rest.  
**Recommendation:** The backend appointment endpoint (`GET /appointments`) should include the related business name, service name, and employee name in the response payload. The frontend parallel-fetch pattern should be removed entirely. This is a backend change, but it is the correct fix.

### 12. `appStore` theme hydration is not awaited before first render — dark mode flash
**Problem:** `appStore.getState().hydrate()` is called at the bottom of `appStore.ts` (module load time), but `App.tsx` only waits on `authStore.hydrated`. The `isDarkMode` value starts as `false` (light), then flips to `true` if the user had dark mode enabled — causing a visible flash on startup.  
**Recommendation:** Add a `hydrated` flag to `appStore` and wait for both `authStore.hydrated && appStore.hydrated` in `App.tsx` before rendering `RootNavigator`.

### 13. `EmployeeServicesScreen` duration/price override form fields are dead
**Problem:** `src/screens/employee/EmployeeServicesScreen.tsx` has `formDuration`, `formPrice`, and `formNotes` state and renders input fields for them (lines 440, 462, 485), but the save handler (line 139) calls `await employeeService.addService(selectedService.id)` — passing only the service ID, not the override values. The overrides are collected, displayed, and silently discarded.  
**Recommendation:** Either wire the overrides into the API call (if the backend supports per-employee pricing/duration), or remove the form fields entirely. Dead UI that collects input and ignores it erodes trust.

### 14. `BusinessReviewsScreen` "Photos" filter uses a mock implementation in production code
**Problem:** `src/screens/user/BusinessReviewsScreen.tsx` lines 99–100 filter reviews based on whether the review `id` contains the character `'2'` or `'4'`. A comment reads "Mock: assume some reviews have photos." This mock logic ships in the production render path.  
**Recommendation:** Remove the `photos` filter chip entirely until the `Review` type and backend actually support photo attachments. A filter that returns arbitrary results based on ID string matching is worse than no filter.

---

## Medium Priority

### 15. Hardcoded colors scattered across the codebase
**Problem:** Hardcoded hex values appear throughout screens and are not responsive to dark/light mode:
- `RequestsScreen.tsx` line 258: `color: '#22c55e'` (price text)
- `RequestsScreen.tsx` line 366: `backgroundColor: '#22c55e'` (approve button)
- `EmployeesScreen.tsx` lines 161–174: six hardcoded ACTIVE/PENDING/REJECTED status badge colors
- `EmployeeCalendarScreen.tsx` lines 167, 181: `#3b82f6` (start button), `#22c55e` (complete button)
- `OwnerProfileScreen.tsx` lines 377, 797, 813: `#ef4444`, `#fff`  
These do not adapt to the dark theme, break the design system, and will be invisible or illegible in dark mode.  
**Recommendation:** Replace all hardcoded colors with `colors.success`, `colors.primary`, `colors.destructive` from the theme, or define explicit semantic tokens for action button colors.

### 16. Extensive hardcoded Turkish strings bypass i18n
**Problem:** Multiple screens have user-facing strings in Turkish that are not localized:
- `EmployeeHomeScreen.tsx` lines 58, 70, 82, 116, 134, 168, 207: "Hata", "Başlat", "Tamamla", "Müşteri", "Bugün randevunuz yok."
- `AuthScreen.tsx` lines 94, 111, 160, 571, 586, 598, 604: "Hesabınız reddedildi...", "Kod 6 haneli olmalıdır.", "Katılım Kodu *", "Doğrula", "Uzmanlık (opsiyonel)"
- `ProfileScreen.tsx` line 109: "Lütfen tekrar giriş yapın"
- `EmployeeProfileScreen.tsx` lines 99, 257, 268, 276, 283: "Leave Business", "Join request pending approval", etc. (mixed languages)  
**Recommendation:** Extract all user-facing strings to i18n keys. The Turkish app strings should live exclusively in `tr.json`.

### 17. `DashboardScreen` chart month labels are hardcoded English
**Problem:** `DashboardScreen.tsx` line 171 hardcodes `['Jan', 'Feb', 'Mar', 'Apr', ...]` regardless of the app's language setting. If the user selects Turkish, the chart still shows English month abbreviations.  
**Recommendation:** Derive month labels from i18n or use `Intl.DateTimeFormat` with the current locale.

### 18. `EmployeesScreen` mutations bypass the query cache entirely
**Problem:** `EmployeesScreen.tsx` calls `loadData()` after `onSaveEdit` (line 111) and `handleDelete` (line 132) instead of using `queryClient.invalidateQueries`. This screen does not import `useQueryClient` at all. Mutations here will not propagate to `DashboardScreen`, `RequestsScreen`, or anywhere else that displays employee data.  
**Recommendation:** Import `useQueryClient`, convert the data loading to `useQuery({ queryKey: queryKeys.employees.forBusiness(businessId) })`, and replace `loadData()` calls in mutations with proper invalidations.

### 19. `ServiceCard` and `BookingCard` shared components are created but never used
**Problem:** `src/components/shared/ServiceCard.tsx` and `src/components/shared/index.ts` export `ServiceCard`, but `grep -rn "ServiceCard"` finds zero usages outside the shared directory. The `BookingCard` component mentioned in the synchronization task specification was never created. These are dead abstractions.  
**Recommendation:** Either use `ServiceCard` in `ServicesScreen`, `BusinessDetailScreen`, and `EmployeeServicesScreen`, or delete it. Do not leave exported components with zero usages.

### 20. `isError` states are never handled on any `useQuery` call
**Problem:** None of the screens that use `useQuery` check `isError` or the `error` return value. TanStack Query's `retry: 1` will attempt once, and if the request fails, the screen silently shows the loading skeleton or empty state forever. No user-facing error message is shown.  
**Recommendation:** Destructure `isError` and `error` from each `useQuery`, and render a fallback error state (or add a toast) when `isError` is true.

### 21. `EmployeeCalendarScreen` height animation uses `useNativeDriver: false`
**Problem:** `src/screens/employee/EmployeeCalendarScreen.tsx` line 66 sets `useNativeDriver: false` because it animates `height`. This means the animation runs on the JS thread and blocks the main thread during the collapse/expand of the calendar header. On slower devices or with heavy JS activity, this will jank.  
**Recommendation:** Replace the height animation with a `react-native-reanimated` `useSharedValue` + `useAnimatedStyle` approach, which runs on the UI thread. Alternatively, use `LayoutAnimation` from React Native for a simpler cross-thread layout change.

### 22. `BackendHealthCheck` component is rendered in production login screen
**Problem:** `src/components/BackendHealthCheck.tsx` includes the condition `if (__DEV__ === false) return null` (line 47), which correctly hides it in production. However, it is rendered unconditionally inside `AuthScreen.tsx` (line 230), issuing a `fetch` request to the health endpoint on every app open. In production, this component silently returns null, but the `fetch` has already been issued and a `console.log` fires — this is a noise source and a minor wasted request.  
**Recommendation:** Wrap the `<BackendHealthCheck />` in `AuthScreen` with `{__DEV__ && <BackendHealthCheck />}` so the component is not rendered at all in production builds.

### 23. `appStore` `toggleTheme` fire-and-forget AsyncStorage write
**Problem:** `appStore.ts` line 17: `toggleTheme` calls `AsyncStorage.setItem` inside `set()` without `await`, as a fire-and-forget. If the app is killed immediately after the toggle, the new preference may not be persisted.  
**Recommendation:** Either move the `AsyncStorage.setItem` call outside of `set()` with proper `await`, or use zustand-persist middleware, which handles this pattern correctly.

---

## Low Priority

### 24. Five unused installed packages inflate the bundle
**Problem:** The following packages appear in `package.json` but are not imported anywhere in `src/`:
- `expo-calendar` — imported nowhere despite the permissions plugin entry in `app.json`
- `expo-blur` — imported nowhere
- `expo-linear-gradient` / `react-native-linear-gradient` — imported nowhere
- `expo-document-picker` — imported nowhere
- `expo-constants` — imported nowhere  
**Recommendation:** `npm uninstall expo-calendar expo-blur expo-linear-gradient react-native-linear-gradient expo-document-picker expo-constants`. Remove the `expo-calendar` entry from `app.json` plugins to avoid requesting calendar permission unnecessarily.

### 25. `appStore` hydration calls `console.error` but swallows the error silently
**Problem:** `appStore.ts` line 39: `console.error('Failed to hydrate app state:', error)` logs but takes no recovery action. If AsyncStorage is unavailable (rare but possible), the app silently starts with default preferences without informing the user.  
**Recommendation:** This is minor, but the `console.error` should be replaced with a more specific message, and the defaults should be applied explicitly in the catch block to make intent clear.

### 26. FlatList components lack performance props
**Problem:** No `FlatList` in the codebase uses `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`, or `getItemLayout`. For screens with many appointments or services, this means React Native renders and maintains all list items in memory simultaneously.  
**Recommendation:** Add `removeClippedSubviews={true}` and `maxToRenderPerBatch={10}` to all `FlatList` instances. Where item height is fixed, add `getItemLayout` for significant scroll performance improvement.

### 27. `authStore.ts` logs `AUTH_SET_USER_ROLE` in production
**Problem:** `authStore.ts` lines 38 and 102 call `console.log('AUTH_SET_USER_ROLE', response.user.role)` on every login and hydration. These are debug logs left in the production path.  
**Recommendation:** Remove both `console.log` calls, along with `console.log('[AUTH] logout start')`, `'[AUTH] logout end'`, and `'[AUTH] logout already in progress'` (lines 67–91). Replace with no-ops or a conditional `if (__DEV__)` guard.

### 28. `BusinessReviewsScreen` imports `SafeAreaView` from `react-native` core, not `react-native-safe-area-context`
**Problem:** `src/screens/user/BusinessReviewsScreen.tsx` line 8 imports `SafeAreaView` from `'react-native'`. The rest of the app consistently uses `SafeAreaView` from `'react-native-safe-area-context'`, which supports the `edges` prop and correct inset handling across platforms. The core `SafeAreaView` from `react-native` does not support `edges`.  
**Recommendation:** Replace the import with `import { SafeAreaView } from 'react-native-safe-area-context'` and add `edges={['bottom']}` consistent with other screens.

### 29. Registration form uses mixed validation approaches
**Problem:** `AuthScreen.tsx` uses `react-hook-form + zod` for the login form, but the registration form uses manual `useState` + custom validation logic (`setRegisterErrors`, lines 77–85). Two validation patterns coexist in the same component. This is inconsistent and means the registration form lacks automatic validation timing (on blur, on change) that RHF provides.  
**Recommendation:** Migrate the registration form to `react-hook-form + zod` with a union schema per role, consistent with the login form.

### 30. Owner profile screen has dead `licenseSection` and `licenseLabel` styles
**Problem:** `src/screens/owner/OwnerProfileScreen.tsx` has `licenseSection` and `licenseLabel` defined in `StyleSheet.create` (lines 708–714) but these keys are not referenced anywhere in the render output.  
**Recommendation:** Remove the unused style definitions.

---

## Missing Features (Production Gap)

| Feature | Why it matters |
|---|---|
| Push notifications | Booking reminders (24h, 2h) are the core retention mechanism for an appointment app. Without them, customers forget appointments and no-show rates increase. |
| Payment / deposit collection | A booking platform with no payment handling cannot hold customers accountable for cancellations or no-shows. |
| Email confirmation | No email is sent on booking creation or confirmation. Customers have no paper trail outside the app. |
| Search geo-filtering | The map screen locates the user but `SearchScreen` does not pass coordinates to the search API. Distance-based results are never used. |
| Favorites | The `Review` type references favorites but there is no favorites screen, button, or service layer to save or retrieve them. |
| Cancellation policy enforcement UI | `cancellationWindowMinutes` is in the business model and used in the cancel-deadline calculation, but cancellation fees and policy text are never shown to the customer before booking. |
| Rebooking / reschedule flow | The `reschedule_requests` concept exists in the CLAUDE.md but there is no frontend flow to request or approve a reschedule. |
| Business onboarding verification | The tax number and business document upload in the registration form are UI-only. The inputs are not connected to any service call. The verification workflow is entirely absent. |
| In-app notification inbox | There is no notification list screen. Users have no way to see past booking confirmations or status changes within the app. |
| Waitlist | When a slot is unavailable, there is no way for a customer to join a waitlist. |
| Customer booking history pagination | `GET /appointments` returns all appointments with no pagination. A customer with 200 past bookings loads them all at once. |
| Staff photo/avatar | The `Employee.photoUrl` field exists in the type but is never displayed in the booking flow employee selection step. |
| Map search integration | The map modal is decorative — business markers are visible but there is no way to search or filter from the map view. |

---

## What Is Working Well

1. **JWT refresh and token management** — The `apiClient.ts` interceptor correctly implements queued request retry during token refresh, prevents duplicate logout calls, and blocks requests during logout via the cancel mechanism. This is non-trivial to implement correctly and is done well.

2. **Role-based navigation isolation** — `RootNavigator` correctly branches into completely separate navigator trees per role. There is no route leakage: a customer cannot navigate to an owner or employee screen because those routes are never registered in the customer navigator.

3. **Design system** — The theme system (`theme.ts`) is well-structured with semantic color tokens, consistent spacing scale, and typography tokens. The dark/light mode implementation is clean and most screens correctly use theme colors rather than hardcoded values.

4. **Query key architecture** — The introduction of `src/lib/queryKeys.ts` as a centralized key registry is correct. The key shape and naming conventions are consistent and follow TanStack Query best practices (hierarchical arrays, no inline strings in most screens).

5. **Arrival confirmation flow** — The two-sided arrival confirmation system (customer confirms presence, employee marks start) with a 15-minute window and the DISPUTED/NO_SHOW resolution logic is a well-considered product feature implemented with backend and frontend coordination.

6. **Auth error handling** — The `handleError` method in `apiClient.ts` returns meaningful, status-specific error messages instead of generic failures. The 409 conflict message correctly passes through the backend's message rather than overriding it.

7. **Review moderation pipeline** — The full review lifecycle (PENDING → APPROVED/REJECTED), including owner moderation in the profile screen and the constraint that only approved reviews appear publicly, is correctly implemented end-to-end across backend invalidations and frontend display.

8. **`appStore` persistence** — Dark mode and notification preferences are correctly persisted to AsyncStorage and restored on hydration, using a clean Zustand store pattern.

---

## Recommended Next Steps

1. **Wire up push notifications** — Implement `expo-notifications` push token registration on login, store tokens backend-side, and deliver notifications for `booking_created`, `booking_confirmed`, and `booking_reminder_24h`. This is the most impactful missing feature.

2. **Fix the dashboard "No Show" metric** — Change `status === 'REJECTED'` to `status === 'NO_SHOW'` in DashboardScreen (lines 221, 524). This is a one-line correctness fix that affects business decision-making.

3. **Convert `EmployeeHomeScreen` and `EmployeesScreen` to TanStack Query** — These are the two largest remaining gaps in the cross-role sync architecture. Without them, employee actions and owner employee management do not propagate across the app.

4. **Remove the hardcoded Turkish strings** — Extract all untranslated strings in `EmployeeHomeScreen`, `AuthScreen`, `EmployeeProfileScreen`, and `ProfileScreen` to `tr.json`/`en.json`. The app cannot go to market in English-speaking regions while displaying Turkish alert messages.

5. **Split the `BusinessDetailScreen` monolithic query** — Separate the single four-resource query into four independent queries (`business`, `employees`, `services`, `reviews`). This eliminates unnecessary network calls on partial invalidations and reduces load on first render.

6. **Fix the BOLA vulnerability in profile/password endpoints** — Ensure the backend derives `userId` from the JWT, not the URL parameter. On the frontend, remove the `userId` argument from `authService.updateProfile` and `authService.changePassword`.

7. **Remove unused packages** — Uninstall `expo-calendar`, `expo-blur`, `expo-linear-gradient`, `react-native-linear-gradient`, `expo-document-picker`, `expo-constants`. Remove the `expo-calendar` plugin from `app.json`. This reduces bundle size and eliminates a permission request for calendar access that the app does not use.

8. **Fix hardcoded colors in employee action buttons** — Replace `#22c55e`, `#3b82f6`, and `#ef4444` in `EmployeeCalendarScreen`, `EmployeeHomeScreen`, and `RequestsScreen` with semantic theme tokens. The calendar screen's start/complete buttons are completely invisible in dark mode.

9. **Handle `useQuery` error states** — Add `isError` checks to all `useQuery` usages and render meaningful feedback. Users currently see an infinite loading state or empty list when a query fails, with no way to retry.

10. **Remove dead UI** — Delete the `photos` filter from `BusinessReviewsScreen`, the `ServiceCard` component if it will not be used, and the dead `licenseSection` styles from `OwnerProfileScreen`. Remove the `BackendHealthCheck` from the production render path by wrapping it in `__DEV__`.
