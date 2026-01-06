# BookIT - Appointment Booking App

A complete iOS/Android mobile application built with React Native (Expo) for booking appointments with barbers, hairdressers, beauty salons, and restaurants.

## ✨ Features

### For Customers

- 🏠 Browse and discover businesses
- 🔍 Search with filters (category, rating, distance)
- 📅 Book appointments with step-by-step flow
- 📱 Manage appointments (active & past)
- ⭐ Write reviews after completed appointments
- 👤 Profile management with dark mode
- 🔔 Notification preferences

### For Business Owners

- 📊 Dashboard with today's statistics
- ✅ Approve/reject appointment requests
- 👥 Manage employees (CRUD operations)
- ✂️ Manage services (CRUD operations)
- 🏢 Business profile & license verification
- 📝 Review moderation (approval required)
- 🎨 Theme customization

### Professional Features

- 🌙 Light & Dark mode with persistence
- 🎨 Organic/natural design system
- ⚡ Loading states & error handling
- 🔒 Role-based access control
- 📲 Guest user protection
- 🎯 Empty states & confirmations
- 🔄 Real-time state management
- 📝 Form validation with Zod

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the development server**

   ```bash
   npm start
   ```

3. **Run on iOS**

   ```bash
   npm run ios
   ```

4. **Run on Android**
   ```bash
   npm run android
   ```

## 🔑 Demo Accounts

### Customer Account

- **Email:** `user@test.com`
- **Password:** `123456`

### Business Owner Account

- **Email:** `owner@test.com`
- **Password:** `123456`

## 🏗️ Architecture

### Tech Stack

- **Framework:** React Native + Expo SDK 52
- **Language:** TypeScript
- **Navigation:** React Navigation (Stack + Tabs)
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **Storage:** AsyncStorage
- **Fonts:** Fraunces (headings) + Nunito (body)

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Chip.tsx
│   ├── RatingStars.tsx
│   ├── EmptyState.tsx
│   ├── Toast.tsx
│   └── LoadingSpinner.tsx
├── navigation/          # Navigation configuration
│   └── RootNavigator.tsx
├── screens/            # Screen components
│   ├── auth/
│   │   └── AuthScreen.tsx
│   ├── user/
│   │   ├── HomeScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── BusinessDetailScreen.tsx
│   │   ├── AppointmentsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── ReviewScreen.tsx
│   └── owner/
│       ├── DashboardScreen.tsx
│       ├── RequestsScreen.tsx
│       ├── EmployeesScreen.tsx
│       ├── ServicesScreen.tsx
│       └── OwnerProfileScreen.tsx
├── services/           # API & business logic
│   └── mockApi.ts
├── store/              # Zustand stores
│   ├── authStore.ts
│   ├── appStore.ts
│   └── dataStore.ts
├── theme/              # Design system
│   ├── theme.ts
│   └── useTheme.ts
└── types/              # TypeScript definitions
    └── index.ts
```

## 🎨 Design System

### Colors

The app uses an organic/natural color palette:

**Light Mode:**

- Primary: `#5D7052` (Moss green)
- Secondary: `#C18C5D` (Clay)
- Background: `#FDFCF8` (Warm white)
- Accent: `#E6DCCD` (Sand)

**Dark Mode:**

- Automatically adjusted for optimal contrast

### Typography

- **Headings:** Fraunces (elegant serif)
- **Body:** Nunito (clean sans-serif)

### Shadows

- Moss-tinted shadows in light mode
- Proper elevation on Android
- Soft, organic feel throughout

## 📱 User Flows

### Booking Flow

1. Browse businesses on Home screen
2. Select a business
3. Choose staff member
4. Select service
5. Pick date from calendar
6. Choose available time slot
7. Confirm booking
8. Appointment enters PENDING state
9. Owner approves/rejects
10. Customer receives update

### Review Flow

1. Complete an appointment
2. Navigate to Appointments > Past
3. Click "Write Review"
4. Rate 1-5 stars
5. Write comment
6. Submit (enters PENDING state)
7. Owner approves review
8. Review becomes public

## 🔐 Authentication & Authorization

- Email/password authentication
- Persistent sessions with AsyncStorage
- Role-based routing (User vs Owner)
- Protected actions for guests
- Business license verification for owners

## 🌐 Mock API

All data is mocked with `setTimeout` delays to simulate network requests:

- Businesses with ratings & reviews
- Employees & services
- Appointments with status tracking
- User management
- Review system with approval

**Easy to replace:** The mock API follows standard async/await patterns and can be swapped with a real backend by updating the `mockApi.ts` file.

## 🎯 State Management

### Zustand Stores

**authStore:**

- User authentication
- Session persistence
- Login/logout

**appStore:**

- Theme (light/dark)
- Notifications toggle
- Persistent preferences

**dataStore:**

- Businesses, employees, services
- Appointments & reviews
- CRUD operations

## 🔄 Navigation

- **RootNavigator:** Handles auth state
- **AuthStack:** Login/register screens
- **UserTabs:** Home, Search, Appointments, Profile
- **OwnerTabs:** Dashboard, Requests, Employees, Services, Profile
- **Modal Screens:** Business detail, Review submission

## ⚡ Performance

- Lazy loading with FlatList
- Memoized components where needed
- Optimized re-renders with Zustand
- Efficient navigation structure

## 🐛 Error Handling

- Form validation with Zod
- API error messages
- Alert dialogs for critical actions
- Toast notifications for feedback
- Empty states for no data
- Loading spinners during async operations

## 🌙 Theme System

The app supports light and dark modes:

- Toggle in profile settings
- Persists across sessions
- All components adapt automatically
- Proper contrast ratios
- Organic color transitions

## 📝 Forms

All forms use React Hook Form + Zod:

- Email validation
- Password strength
- Required fields
- Custom error messages
- Real-time validation
- Accessible error display

## 🎭 Professional Touch

- Confirmations for destructive actions
- Loading states everywhere
- Empty states with helpful messages
- Consistent microcopy
- Proper back navigation
- Permission handling (calendar, documents)
- Edge case coverage

## 🚧 Future Enhancements

To make this production-ready:

- [ ] Connect to real backend API
- [ ] Add image upload for businesses
- [ ] Implement push notifications
- [ ] Add payment integration
- [ ] Real-time chat support
- [ ] Advanced search filters
- [ ] Calendar integration (complete)
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Accessibility improvements

## 📄 License

This is a demo project for educational purposes.

## 👨‍💻 Development

Built with best practices:

- TypeScript for type safety
- Modular component architecture
- Clean separation of concerns
- Reusable UI components
- Scalable folder structure
- Professional code quality

## 🤝 Contributing

This is a demo project, but feel free to fork and customize!

## 📧 Support

For questions or issues, please refer to the Expo documentation:

- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

**BookIT** - Book appointments with ease 🎯
