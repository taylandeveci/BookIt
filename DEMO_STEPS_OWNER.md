# Owner Registration and Business Management Demo Steps

## Overview

This guide demonstrates how to register as a business owner with the new ERD-based backend and manage business information.

## Prerequisites

- Backend running on http://localhost:3000
- Frontend Expo app running on iOS Simulator or physical device
- Database seeded with demo data

---

## Part 1: Register as Owner with Business Name

### Step 1: Open Auth Screen

1. Launch the BookIT app
2. Tap on the **"Business Owner"** chip to switch to owner mode
3. Tap on the **"Register"** chip to switch to registration

### Step 2: Fill Registration Form

The registration form now includes:

- **Full Name** (required) - Enter "Test Owner 2"
- **Email** (required) - Enter unique email like "owner2@test.com"
- **Password** (required) - Enter "123456"
- **Confirm Password** (required) - Enter "123456"
- **Phone** (optional) - Enter "+1 (555) 200-0002"
- **Business Name** \* (required for owners) - Enter "My New Salon"

> **Note:** The "Business Name" field only appears when registering as an owner.

### Step 3: Submit Registration

1. Tap the **"Register"** button
2. Wait for the registration to complete
3. If successful, you'll be automatically logged in
4. You'll be redirected to the Owner Dashboard

### Step 4: Verify Business Created

- Navigate to the **Profile** tab (last tab in owner navigation)
- You should see your owner profile information
- Below that, the **"Business Information"** card should display your newly created business

---

## Part 2: Edit Business Information After Login

### Step 1: Navigate to Profile

1. Log in as an owner (use owner@test.com / 123456 or your newly registered account)
2. Tap on the **Profile** tab in the bottom navigation

### Step 2: View Business Information

The Business Information card shows:

- **Name** - Your business name
- **Description** - Business description (if set)
- **Address** - Physical address (if set)
- **City** - City location (if set)
- **Phone** - Business contact number (if set)
- **Status** - Business status badge (APPROVED/PENDING/etc.)
- **Rating** - Average rating and review count

### Step 3: Edit Business Details

1. Tap the **"Edit"** button in the Business Information card header
2. The form fields become editable:
   - **Business Name\*** (required) - Update your business name
   - **Description** (optional) - Add a brief description
   - **Address** (optional) - Enter your physical address
   - **City** (optional) - Enter your city
   - **Phone** (optional) - Update contact number

### Step 4: Save Changes

1. Fill in or update the fields as needed
2. Tap the **"Save"** button
3. Wait for the save operation to complete
4. On success, you'll see a success alert
5. The form switches back to view mode with updated information

### Step 5: Cancel Editing (Optional)

- If you want to discard changes, tap the **"Cancel"** button
- The form reverts to view mode without saving

---

## Backend API Endpoints Used

### Registration

```
POST /auth/register-owner
Body: {
  fullName: string,
  email: string,
  password: string,
  phone?: string,
  businessName: string  // Required for owners
}
Response: {
  success: true,
  data: {
    user: { id, email, name, role },
    business: { id, name, ownerId, status },
    accessToken: string,
    refreshToken: string
  }
}
```

### Get Business

```
GET /owner/business
Response: {
  id: string,
  name: string,
  description?: string,
  address?: string,
  city?: string,
  phone?: string,
  status: string,
  averageRating?: number,
  reviewCount?: number,
  ...
}
```

### Update Business

```
PUT /owner/business
Body: {
  name?: string,
  description?: string,
  address?: string,
  city?: string,
  phone?: string
}
Response: Updated Business object
```

---

## Validation Rules

### Owner Registration

- **Full Name**: Minimum 2 characters (required)
- **Email**: Valid email format (required)
- **Password**: Minimum 6 characters (required)
- **Confirm Password**: Must match password (required)
- **Phone**: Optional, phone format
- **Business Name**: Required for owners (inline validation + toast on submit)

### Business Editing

- **Business Name**: Required field, cannot be empty
- All other fields are optional
- Changes are validated before submission
- Success/error feedback via toast alerts

---

## Error Handling

### Registration Errors

- **Missing Business Name**: "Business name is required for business owners"
- **Email Already Exists**: "Email already registered"
- **Validation Errors**: Inline error messages below each field
- **Network Errors**: "Registration failed. Please try again."

### Business Update Errors

- **Load Failed**: "Failed to load business information"
- **Save Failed**: "Failed to update business information"
- **Empty Name**: "Business name is required" (inline validation)

---

## Data Safety

### Array Responses

All list endpoints (employees, services, etc.) now return arrays with fallback:

```typescript
const services = response?.data || [];
```

### Null Checks

Business information fields are checked before display:

```typescript
{
  business.description && (
    <View>
      <Text>{business.description}</Text>
    </View>
  );
}
```

---

## Testing Checklist

- [ ] Register new owner with business name
- [ ] Verify business is created with PENDING status
- [ ] Login as registered owner
- [ ] Navigate to Profile tab
- [ ] View business information
- [ ] Click Edit button
- [ ] Update business name
- [ ] Update description, address, city, phone
- [ ] Click Save
- [ ] Verify success alert appears
- [ ] Verify updated info is displayed
- [ ] Click Edit again
- [ ] Click Cancel without saving
- [ ] Verify changes are discarded
- [ ] Logout and login again
- [ ] Verify business info persists

---

## Troubleshooting

### Business Not Loading

**Problem**: Profile screen shows loading spinner forever
**Solution**:

1. Check backend is running on port 3000
2. Check GET /owner/business endpoint returns data
3. Check console for error messages

### Save Button Not Working

**Problem**: Clicking Save doesn't update business
**Solution**:

1. Check PUT /owner/business endpoint exists
2. Check request body contains valid data
3. Check for inline validation errors
4. Check network tab for failed requests

### Business Name Field Not Showing

**Problem**: Business Name field missing in registration
**Solution**:

1. Ensure you selected "Business Owner" chip before registering
2. Refresh the app
3. Check roleTab state is set to 'owner'

---

## Notes

- Business status is set to **PENDING** on registration
- Owners can update their business anytime after registration
- Business name is required and cannot be left empty
- Other fields (description, address, city, phone) are optional
- Changes are saved immediately to the database
- No license upload required (simplified flow)
- Frontend uses **fullName** internally but backend expects **fullName**
- Phone field is optional but recommended for contact purposes
