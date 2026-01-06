# BookIT - Backend Integration Migration

## Overview

This project has been successfully migrated from using mock API calls to real HTTP requests to a Node.js/Express backend. The migration preserves all existing UI, navigation, state management, and theming while replacing the data layer with production-ready API integration.

## What Changed

### New Dependencies

- **axios**: HTTP client for making API requests
- **expo-secure-store**: Secure storage for JWT tokens (replacing AsyncStorage for sensitive data)

### New Service Layer Files

All services are located in `src/services/`:

1. **apiClient.ts** - Core HTTP client with:

   - Request interceptor for automatic Bearer token attachment
   - Response interceptor for token refresh and error handling
   - Centralized error mapping with user-friendly messages
   - Support for all HTTP methods (GET, POST, PUT, PATCH, DELETE)

2. **authService.ts** - Authentication endpoints:

   - User/Owner registration
   - Login/Logout
   - Token refresh
   - Profile management (update profile, change password)
   - Secure token storage using expo-secure-store

3. **businessService.ts** - Business data:

   - Get recommended businesses
   - Search businesses with filters
   - Get business details, employees, services
   - Get available time slots

4. **appointmentService.ts** - User appointments:

   - Create appointments
   - Get user appointments
   - Cancel appointments

5. **reviewService.ts** - Review operations:

   - Get business reviews (paginated)
   - Create reviews
   - Get review by ID

6. **ownerService.ts** - Business owner operations:

   - Get owner appointments
   - Approve/reject/complete appointments
   - Calendar view
   - Employee management (CRUD)
   - Service management (CRUD)
   - Review moderation

7. **notificationService.ts** - Notifications:
   - Get user notifications
   - Mark as read
   - Delete notifications

### Updated Files

- **src/store/authStore.ts**: Now uses `authService` and `expo-secure-store` instead of AsyncStorage
- **All screen files**: Updated imports from `mockApi` to specific service imports
- **.env.example**: Added `EXPO_PUBLIC_API_URL` configuration

## Configuration

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# For iOS Simulator / localhost
EXPO_PUBLIC_API_URL=http://localhost:3000

# For Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# For physical device (replace with your computer's IP)
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

## Backend API Requirements

The backend must implement the following endpoints:

### Authentication (`/auth`)

- `POST /auth/register-user` - Register new user
- `POST /auth/register-owner` - Register business owner (multipart/form-data for license)
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh access token
- `PUT /auth/profile/:userId` - Update profile
- `POST /auth/change-password/:userId` - Change password

### Businesses (`/businesses`)

- `GET /businesses/recommended` - Get recommended businesses
- `GET /businesses` - Search businesses (supports filters: category, minRating, maxDistance, search)
- `GET /businesses/:id` - Get business details
- `GET /businesses/:id/employees` - Get business employees
- `GET /businesses/:id/services` - Get business services
- `GET /businesses/:id/reviews` - Get business reviews (paginated)
- `GET /businesses/:id/timeslots` - Get available time slots

### Appointments (`/appointments`)

- `POST /appointments` - Create appointment
- `GET /appointments` - Get user appointments
- `POST /appointments/:id/cancel` - Cancel appointment
- `GET /appointments/:id` - Get appointment details

### Owner Operations (`/owner`)

- `GET /owner/appointments` - Get business appointments
- `POST /owner/appointments/:id/approve` - Approve appointment
- `POST /owner/appointments/:id/reject` - Reject appointment (with reason)
- `POST /owner/appointments/:id/complete` - Complete appointment
- `GET /owner/calendar` - Get calendar view
- Employee CRUD: `POST /owner/employees`, `PUT /owner/employees/:id`, `DELETE /owner/employees/:id`
- Service CRUD: `POST /owner/services`, `PUT /owner/services/:id`, `DELETE /owner/services/:id`
- Review moderation: `GET /owner/reviews`, `POST /owner/reviews/:id/approve`, `POST /owner/reviews/:id/reject`

### Reviews (`/reviews`)

- `POST /reviews` - Create review
- `GET /reviews/:id` - Get review details

### Notifications (`/notifications`)

- `GET /notifications` - Get user notifications
- `POST /notifications/:id/read` - Mark notification as read
- `POST /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

## Response Format

All API responses should follow this envelope format:

```json
{
  "success": true,
  "data": {
    /* response data */
  }
}
```

Or for errors:

```json
{
  "success": false,
  "message": "Error message"
}
```

The apiClient automatically unwraps this envelope, so services receive the `data` directly.

## Authentication Flow

1. User logs in via `authService.login()`
2. Backend returns `accessToken` and `refreshToken`
3. Tokens are stored securely in expo-secure-store
4. Request interceptor attaches `Authorization: Bearer <accessToken>` to all requests
5. If API returns 401:
   - Response interceptor attempts token refresh
   - Queues failed requests during refresh
   - Retries all queued requests with new token
   - If refresh fails, clears tokens and redirects to login

## Error Handling

The apiClient maps HTTP status codes to user-friendly messages:

- **401**: "Authentication required. Please login again."
- **403**: "You don't have permission to perform this action."
- **409**: "This time slot is no longer available."
- **422**: "Please check your input and try again."
- **500**: "Server error. Please try again later."

## Testing

### Without Backend

The mock API is still available in `src/services/mockApi.ts` if you need to test without a backend. Simply revert the imports in screens from service files back to `mockApi`.

### With Backend

1. Start your backend server
2. Update `.env` with the correct `EXPO_PUBLIC_API_URL`
3. Run the app: `npm start`
4. Test key flows:
   - User registration and login
   - Business browsing
   - Appointment booking
   - Owner appointment approval
   - Profile updates
   - Logout (verify tokens are cleared)

## Verification Checklist

- [ ] User can register and login
- [ ] Tokens are stored securely in expo-secure-store
- [ ] Home screen loads recommended businesses
- [ ] Search works with filters
- [ ] Business detail page shows employees, services, reviews
- [ ] User can book appointments
- [ ] Appointments appear in user's appointments list
- [ ] User can cancel appointments
- [ ] Owner can see pending appointment requests
- [ ] Owner can approve/reject appointments
- [ ] Owner can manage employees and services
- [ ] User can submit reviews
- [ ] Owner can moderate reviews
- [ ] Profile updates work
- [ ] Password change works
- [ ] Logout clears tokens and redirects to auth screen
- [ ] Token refresh works automatically on 401
- [ ] Errors show user-friendly messages

## Migration Benefits

1. **Security**: JWT tokens stored in secure storage instead of AsyncStorage
2. **Production-Ready**: Real HTTP calls to backend instead of mock data
3. **Error Handling**: Centralized error mapping with user-friendly messages
4. **Auto-Refresh**: Automatic token refresh on expiration
5. **Maintainability**: Separated concerns - services handle data, screens handle UI
6. **Scalability**: Easy to add new endpoints or modify existing ones
7. **Type Safety**: All service methods are typed with TypeScript

## Troubleshooting

### "Network Error"

- Check that backend is running
- Verify `EXPO_PUBLIC_API_URL` in `.env` matches your backend URL
- For Android emulator, use `http://10.0.2.2:PORT` instead of `localhost`
- For physical device, ensure device and computer are on same network

### "Authentication required" after login

- Check that backend is returning `accessToken` and `refreshToken`
- Verify tokens are being stored (check console logs)
- Ensure request interceptor is attaching Bearer token

### "Cannot read property of undefined"

- Backend response might not match expected format
- Check that backend is wrapping responses in `{success, data}` envelope
- Verify type definitions match backend response shape

### Token refresh loop

- Check that `/auth/refresh` endpoint is working
- Ensure refresh token is valid and not expired
- Verify new tokens are being stored after refresh

## Future Enhancements

1. Add offline support with local caching
2. Implement push notifications
3. Add image upload for profiles and businesses
4. Implement real-time updates with WebSockets
5. Add analytics and crash reporting
6. Implement biometric authentication
7. Add deep linking for appointments

## Support

For questions or issues, please create an issue in the repository or contact the development team.
