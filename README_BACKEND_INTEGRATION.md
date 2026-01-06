# BookIT Backend Integration - Quick Start

## What Was Done

Successfully migrated from mock API to real backend integration:

- ✅ Installed axios and expo-secure-store
- ✅ Created 7 service files covering all API endpoints
- ✅ Updated 15 screen files to use new services
- ✅ Migrated auth to use JWT with secure token storage
- ✅ Fixed all TypeScript errors
- ✅ No breaking changes to UI/UX

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

Dependencies already in package.json:

- axios
- expo-secure-store

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set your backend URL:

```env
# For iOS Simulator / localhost
EXPO_PUBLIC_API_URL=http://localhost:3000

# For Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# For physical device (use your computer's IP)
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

### 3. Start Backend Server

Ensure your Node.js/Express backend is running and implements all required endpoints (see MIGRATION_GUIDE.md for full list).

### 4. Run App

```bash
npm start
```

## Quick Test Flow

1. **Register a new user**

   - Open app → Register tab
   - Fill in name, email, password
   - Submit

2. **Login**

   - Switch to Login tab
   - Enter credentials
   - Should navigate to home screen

3. **Browse businesses**

   - Home screen should show recommended businesses
   - Try search functionality
   - View business details

4. **Book appointment** (if logged in as user)

   - Select business → employee → service → date → time
   - Submit booking
   - Check appointments screen

5. **Logout**
   - Go to Profile → Logout
   - Should return to auth screen
   - Tokens should be cleared

## Service Files Overview

```
src/services/
├── apiClient.ts          # Core HTTP client with interceptors
├── authService.ts        # Login, register, profile, password
├── businessService.ts    # Business search, details, employees, services
├── appointmentService.ts # User appointments (create, get, cancel)
├── reviewService.ts      # Reviews (get, create)
├── ownerService.ts       # Owner operations (approve, employees, services)
└── notificationService.ts # User notifications
```

## Key Features

### JWT Authentication

- Access token + refresh token
- Stored in expo-secure-store (encrypted)
- Auto-refresh on 401 response
- Request queueing during refresh

### Error Handling

- User-friendly error messages
- Status-specific handling (401, 403, 409, 422, 500)
- Automatic logout on auth failure

### Type Safety

- All service methods typed
- Request/response types defined
- Compile-time error checking

## Backend Requirements

Your backend must:

1. **Return responses in this format:**

```json
{
  "success": true,
  "data": {
    /* your response data */
  }
}
```

2. **Accept Bearer token in headers:**

```
Authorization: Bearer <accessToken>
```

3. **Return auth responses with tokens:**

```json
{
  "success": true,
  "data": {
    "user": {
      /* user object */
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

4. **Handle token refresh:**

```
POST /auth/refresh
Body: { "refreshToken": "..." }
Response: { "accessToken": "...", "refreshToken": "..." }
```

## Troubleshooting

### "Network Error"

- Check backend is running
- Verify EXPO_PUBLIC_API_URL is correct
- For Android emulator, use `10.0.2.2` not `localhost`

### "Authentication required" after login

- Check backend returns `accessToken` and `refreshToken`
- Verify tokens are being stored (check console logs)
- Ensure Authorization header is being attached

### TypeScript errors

- Run `npm run typecheck` (if configured)
- All types are in `src/types/index.ts`
- Service functions are fully typed

### Token refresh not working

- Check `/auth/refresh` endpoint exists
- Verify refresh token is valid
- Ensure new tokens are returned and stored

## Files Modified

**Created (9):**

- src/services/apiClient.ts
- src/services/authService.ts
- src/services/businessService.ts
- src/services/appointmentService.ts
- src/services/reviewService.ts
- src/services/ownerService.ts
- src/services/notificationService.ts
- MIGRATION_GUIDE.md
- MIGRATION_SUMMARY.md

**Updated (17):**

- src/store/authStore.ts
- src/types/index.ts (added search to FilterOptions, businessId to BookingFormData)
- 15 screen files (imports changed from mockApi to services)

## Next Steps

1. ✅ Complete - Service layer created
2. ✅ Complete - Screens updated
3. ✅ Complete - Types fixed
4. 🚀 Ready - Test with real backend
5. ⏭️ Next - Deploy to production

## Documentation

- **MIGRATION_GUIDE.md** - Comprehensive migration documentation
- **MIGRATION_SUMMARY.md** - Detailed summary of changes
- **README.md** - This quick start guide

## Support

If you encounter issues:

1. Check console logs for errors
2. Verify backend is responding correctly
3. Review MIGRATION_GUIDE.md for detailed info
4. Check that environment variables are set

## Summary

The app is now fully integrated with a real backend. All mock API calls have been replaced with HTTP requests. The authentication flow uses secure JWT tokens, and all errors are handled gracefully. The UI, navigation, and user experience remain unchanged.

**Ready to test with your backend!** 🎉
