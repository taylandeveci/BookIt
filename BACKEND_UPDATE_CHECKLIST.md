# Backend API Update Checklist

## ✅ Completed

- [x] Updated Prisma schema to match ERD
- [x] Created and applied migration `refactor_to_erd_schema`
- [x] Database seeded with new schema (1 user, 1 owner, 1 business, 2 employees, 5 services)
- [x] Created MIGRATION_NOTES.md documentation

## 🔄 Critical Updates Required

**⚠️ IMPORTANT:** Backend cannot start until these route updates are complete. All routes currently reference old field names that no longer exist in the database.

### 1. Update Auth Routes (`BookIT-backend/src/routes/auth.ts`)

**Priority:** CRITICAL (blocks all login/register)

```typescript
// OLD field names → NEW field names
user.name → user.fullName
user.password → user.passwordHash

// Update POST /auth/register-user
const user = await prisma.user.create({
  data: {
    email: body.email,
    passwordHash: hashedPassword,  // Changed from 'password'
    fullName: body.fullName,        // Changed from 'name'
    phone: body.phone,              // New field
    role: 'USER'
  }
});

// Update POST /auth/register-owner
const owner = await prisma.user.create({
  data: {
    email: body.email,
    passwordHash: hashedPassword,
    fullName: body.fullName,
    phone: body.phone,
    role: 'OWNER'
  }
});

// NEW: Create business for owner
const business = await prisma.business.create({
  data: {
    name: body.businessName,  // MUST accept businessName
    ownerId: owner.id,
    status: 'PENDING'         // Use BusinessStatus enum
  }
});

// Return both owner and business
return res.json({
  success: true,
  data: {
    user: owner,
    business,
    accessToken,
    refreshToken
  }
});

// Update POST /auth/login response
return res.json({
  success: true,
  data: {
    user: { ...user, fullName: user.fullName },  // Use fullName
    accessToken,
    refreshToken
  }
});

// Update GET /auth/me
return res.json({
  success: true,
  data: {
    user: { ...user, fullName: user.fullName }
  }
});
```

### 2. Rename & Update Reservation Routes

**Priority:** CRITICAL (blocks all booking)

**File:** Rename `BookIT-backend/src/routes/appointments.ts` → `reservations.ts` (optional, can keep path as `/appointments`)

```typescript
// At top of file
import { Reservation, ReservationStatus } from "@prisma/client";

// Update POST /appointments
const service = await prisma.service.findUnique({
  where: { id: body.serviceId },
});

const startTime = new Date(body.startTime); // Changed from 'date'
const endTime = new Date(startTime.getTime() + service.durationMin * 60000);

// Use transaction to prevent double booking
const reservation = await prisma.$transaction(async (tx) => {
  // Check for existing reservation at this time
  const existing = await tx.reservation.findFirst({
    where: {
      employeeId: body.employeeId,
      startTime: startTime,
    },
  });

  if (existing) {
    throw new Error("This time slot is already booked");
  }

  // Create reservation
  return tx.reservation.create({
    // Changed from 'appointment'
    data: {
      customerId: userId, // Changed from 'userId'
      employeeId: body.employeeId,
      serviceId: body.serviceId,
      startTime, // Changed from 'date'
      endTime, // New field
      status: ReservationStatus.PENDING,
    },
    include: {
      service: true,
      employee: {
        select: {
          id: true,
          fullName: true, // Changed from 'name'
          photoUrl: true,
        },
      },
    },
  });
});

// Update GET /appointments (user's reservations)
const reservations = await prisma.reservation.findMany({
  where: { customerId: userId }, // Changed from 'userId'
  include: {
    service: true,
    employee: {
      select: {
        id: true,
        fullName: true,
        photoUrl: true,
      },
    },
  },
  orderBy: { startTime: "desc" },
});

// Update POST /appointments/:id/cancel
const reservation = await prisma.reservation.update({
  where: { id: params.id },
  data: {
    status: ReservationStatus.CANCELLED,
    cancelledAt: new Date(), // New field
  },
});
```

### 3. Update Business Routes (`BookIT-backend/src/routes/businesses.ts`)

**Priority:** HIGH (blocks business display/search)

```typescript
// Update GET /businesses
const businesses = await prisma.business.findMany({
  where: {
    status: { in: ["APPROVED", "ACTIVE"] }, // Only show active businesses
  },
  select: {
    id: true,
    name: true,
    description: true,
    address: true,
    city: true, // New field
    locationLat: true, // New field
    locationLng: true, // New field
    phone: true,
    averageRating: true, // Changed from 'rating'
    reviewCount: true,
    status: true, // New field
  },
});

// Update GET /businesses/:id/employees
const employees = await prisma.employee.findMany({
  where: {
    businessId: params.id,
    isActive: true, // Filter only active employees
  },
  select: {
    id: true,
    fullName: true, // Changed from 'name'
    photoUrl: true, // New field
    isActive: true,
    services: {
      // Use employee-service junction
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMin: true, // Changed from 'duration'
            price: true,
            isActive: true,
          },
        },
      },
    },
  },
});

// Update GET /businesses/:id/services
const services = await prisma.service.findMany({
  where: {
    businessId: params.id,
    isActive: true, // Filter only active services
  },
  select: {
    id: true,
    name: true,
    description: true,
    durationMin: true, // Changed from 'duration'
    price: true,
    isActive: true,
  },
});

// Ensure response returns array, never undefined
return res.json({
  success: true,
  data: services || [],
});
```

### 4. Update Owner Routes (`BookIT-backend/src/routes/owner.ts`)

**Priority:** HIGH (blocks owner dashboard)

```typescript
// Update GET /owner/appointments
const reservations = await prisma.reservation.findMany({
  // Changed from 'appointment'
  where: {
    employee: {
      business: {
        ownerId: userId,
      },
    },
  },
  include: {
    customer: {
      // Changed from 'user'
      select: {
        id: true,
        fullName: true, // Changed from 'name'
        email: true,
        phone: true,
      },
    },
    service: true,
    employee: {
      select: {
        id: true,
        fullName: true,
        photoUrl: true,
      },
    },
  },
  orderBy: { startTime: "desc" },
});

// Update POST /owner/appointments/:id/approve
const reservation = await prisma.reservation.update({
  where: { id: params.id },
  data: { status: ReservationStatus.APPROVED },
});

// Update POST /owner/appointments/:id/reject
const reservation = await prisma.reservation.update({
  where: { id: params.id },
  data: { status: ReservationStatus.REJECTED },
});

// Update POST /owner/appointments/:id/complete
const reservation = await prisma.reservation.update({
  where: { id: params.id },
  data: { status: ReservationStatus.COMPLETED },
});

// NEW: Add PUT /owner/business (update business profile)
router.put("/business", authMiddleware, ownerMiddleware, async (req, res) => {
  const business = await prisma.business.update({
    where: { ownerId: req.user.id },
    data: {
      name: req.body.name,
      description: req.body.description,
      address: req.body.address,
      city: req.body.city,
      locationLat: req.body.locationLat,
      locationLng: req.body.locationLng,
      phone: req.body.phone,
    },
  });

  res.json({ success: true, data: business });
});
```

### 5. Update Review Validation

**Priority:** MEDIUM (blocks review creation)

```typescript
// Update POST /reviews (add strict validation)
const reservation = await prisma.reservation.findUnique({
  where: { id: body.reservationId },
  include: { review: true },
});

// Validation checks
if (!reservation) {
  return res.status(404).json({
    success: false,
    error: "Reservation not found",
  });
}

if (reservation.customerId !== userId) {
  return res.status(403).json({
    success: false,
    error: "You can only review your own reservations",
  });
}

if (reservation.status !== "COMPLETED") {
  return res.status(400).json({
    success: false,
    error: "Can only review completed reservations",
  });
}

if (reservation.review) {
  return res.status(400).json({
    success: false,
    error: "Review already exists for this reservation",
  });
}

// Create review
const review = await prisma.review.create({
  data: {
    reservationId: body.reservationId, // Required field
    businessId: reservation.employee.businessId,
    userId: userId,
    rating: body.rating,
    commentText: body.comment, // Changed from 'comment'
    status: "PENDING",
  },
});

// When owner approves review, update business averageRating
// In owner routes, POST /owner/reviews/:id/approve
const review = await prisma.review.update({
  where: { id: params.id },
  data: { status: "APPROVED" },
});

// Calculate new average rating
const stats = await prisma.review.aggregate({
  where: {
    businessId: review.businessId,
    status: "APPROVED",
  },
  _avg: { rating: true },
  _count: true,
});

await prisma.business.update({
  where: { id: review.businessId },
  data: {
    averageRating: stats._avg.rating || 0,
    reviewCount: stats._count,
  },
});
```

### 6. Response Envelope Consistency

**Priority:** LOW (code quality)

Ensure ALL endpoints return:

```typescript
// Success
res.json({
  success: true,
  data: result, // Always include data property, use [] for empty arrays
});

// Error
res.status(statusCode).json({
  success: false,
  error: "Error message",
});
```

## 🔨 Build & Test Steps

After updating all routes:

```bash
# 1. Navigate to backend
cd /Users/taylandeveci/BookIT-backend

# 2. Rebuild
npm run build

# 3. Start backend
npm start

# 4. Test health check
curl http://localhost:3000/health

# 5. Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"123456"}'

# 6. Test businesses
curl http://localhost:3000/businesses/recommended

# 7. Test owner registration (new businessName field)
curl -X POST http://localhost:3000/auth/register-owner \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newowner@test.com",
    "password":"123456",
    "fullName":"New Owner",
    "phone":"+1234567890",
    "businessName":"New Business"
  }'
```

## 📱 Frontend Updates Needed

After backend routes are updated, frontend may need changes:

1. **Auth Forms**: Update to send `fullName` instead of `name`
2. **Owner Registration**: Add `businessName` field to form
3. **Booking Flow**: Send `startTime` instead of `date`
4. **Display**: Use `fullName` instead of `name` for users/employees
5. **Service Display**: Use `durationMin` instead of `duration`
6. **Business Display**: Show new fields like `city`, `averageRating`

## ⏭️ Next Steps

1. **Update backend routes** (60 minutes total):

   - [ ] auth.ts (15 min)
   - [ ] appointments.ts → reservations.ts (20 min)
   - [ ] businesses.ts (10 min)
   - [ ] owner.ts (15 min)

2. **Rebuild & test backend** (15 minutes):

   - [ ] npm run build
   - [ ] npm start
   - [ ] Test all endpoints with curl

3. **Update frontend** (30 minutes):

   - [ ] Update auth forms
   - [ ] Update booking flow
   - [ ] Update display components

4. **End-to-end testing** (20 minutes):
   - [ ] Follow DEMO_RUNBOOK.md 7-step flow
   - [ ] Verify reservations work
   - [ ] Verify owner approval works
   - [ ] Test review creation

**Total Estimated Time:** ~2 hours

---

## 📚 Reference Documents

- **MIGRATION_NOTES.md** - Complete schema changes and breaking changes
- **DEMO_RUNBOOK.md** - 7-step demo flow for jury presentation
- **BookIT-backend/prisma/schema.prisma** - New schema definition
- **BookIT-backend/prisma/seed.ts** - Example of correct field usage
