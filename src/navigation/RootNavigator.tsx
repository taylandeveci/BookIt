import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/useTheme';
import { LoadingSpinner } from '../components';

// Auth Screens
import { AuthScreen } from '../screens/auth/AuthScreen';
import { EmployeePendingScreen } from '../screens/auth/EmployeePendingScreen';
import { EmployeeRejectedScreen } from '../screens/auth/EmployeeRejectedScreen';
import { EmployeeJoinScreen } from '../screens/auth/EmployeeJoinScreen';

// User Screens
import { HomeScreen } from '../screens/user/HomeScreen';
import { SearchScreen } from '../screens/user/SearchScreen';
import { BusinessDetailScreen } from '../screens/user/BusinessDetailScreen';
import { AppointmentsScreen } from '../screens/user/AppointmentsScreen';
import { ProfileScreen } from '../screens/user/ProfileScreen';
import { ReviewScreen } from '../screens/user/ReviewScreen';
import { ChangePasswordScreen } from '../screens/user/ChangePasswordScreen';
import { EditProfileScreen } from '../screens/user/EditProfileScreen';
import { BusinessReviewsScreen } from '../screens/user/BusinessReviewsScreen';

// Employee Screens
import { EmployeeDashboardScreen } from '../screens/employee/EmployeeDashboardScreen';
import { EmployeeCalendarScreen } from '../screens/employee/EmployeeCalendarScreen';
import { EmployeeServicesScreen } from '../screens/employee/EmployeeServicesScreen';
import { EmployeeScheduleScreen } from '../screens/employee/EmployeeScheduleScreen';
import { EmployeeProfileScreen } from '../screens/employee/EmployeeProfileScreen';
import { EmployeeEditProfileScreen } from '../screens/employee/EmployeeEditProfileScreen';

// Owner Screens
import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { RequestsScreen } from '../screens/owner/RequestsScreen';
import { EmployeesScreen } from '../screens/owner/EmployeesScreen';
import { ServicesScreen } from '../screens/owner/ServicesScreen';
import { OwnerProfileScreen } from '../screens/owner/OwnerProfileScreen';
import { OwnerReviewsScreen } from '../screens/owner/OwnerReviewsScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';

export type RootStackParamList = {
  Auth: undefined;
  UserTabs: undefined;
  OwnerTabs: undefined;
  EmployeeTabs: undefined;
  EmployeePending: undefined;
  EmployeeRejected: undefined;
  EmployeeJoin: undefined;
  Notifications: undefined;
  OwnerReviews: { businessId: string };
  BusinessDetail: { businessId: string };
  Review: { appointmentId: string; businessId: string; businessName?: string; serviceName?: string; businessOwnerId?: string };
  ChangePassword: undefined;
  EditProfile: undefined;
  EmployeeEditProfile: undefined;
  BusinessReviews: {
    businessId: string;
    businessName: string;
    ratingAvg: number;
    ratingCount: number;
  };
};

export type UserTabParamList = {
  Home: undefined;
  Search: { focusAt?: number };
  Appointments: undefined;
  Profile: undefined;
};

export type OwnerTabParamList = {
  Dashboard: undefined;
  Requests: undefined;
  Employees: undefined;
  Services: undefined;
  OwnerProfile: undefined;
};

export type EmployeeTabParamList = {
  EmployeeDashboard: undefined;
  EmployeeCalendar: undefined;
  EmployeeServices: undefined;
  EmployeeSchedule: undefined;
  EmployeeProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const UserTab = createBottomTabNavigator<UserTabParamList>();
const OwnerTab = createBottomTabNavigator<OwnerTabParamList>();
const EmployeeTab = createBottomTabNavigator<EmployeeTabParamList>();

const UserTabs = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <UserTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
      }}
    >
      <UserTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('navigation.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <UserTab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: t('navigation.search'),
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <UserTab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: t('navigation.appointments'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <UserTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </UserTab.Navigator>
  );
};

const EmployeeTabs = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <EmployeeTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
      }}
    >
      <EmployeeTab.Screen
        name="EmployeeDashboard"
        component={EmployeeDashboardScreen}
        options={{
          title: t('navigation.dashboard'),
          tabBarLabel: t('navigation.dashboard'),
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <EmployeeTab.Screen
        name="EmployeeCalendar"
        component={EmployeeCalendarScreen}
        options={{
          title: t('navigation.calendar'),
          tabBarLabel: t('navigation.calendar'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <EmployeeTab.Screen
        name="EmployeeServices"
        component={EmployeeServicesScreen}
        options={{
          title: t('navigation.myServices'),
          tabBarLabel: t('navigation.services'),
          tabBarIcon: ({ color, size }) => <Ionicons name="cut" size={size} color={color} />,
        }}
      />
      <EmployeeTab.Screen
        name="EmployeeSchedule"
        component={EmployeeScheduleScreen}
        options={{
          title: t('navigation.workingHours'),
          tabBarLabel: t('navigation.schedule'),
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <EmployeeTab.Screen
        name="EmployeeProfile"
        component={EmployeeProfileScreen}
        options={{
          title: t('navigation.profile'),
          tabBarLabel: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </EmployeeTab.Navigator>
  );
};

const OwnerTabs = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <OwnerTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
      }}
    >
      <OwnerTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('navigation.dashboard'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <OwnerTab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          tabBarLabel: t('navigation.requests'),
          tabBarIcon: ({ color, size }) => <Ionicons name="mail" size={size} color={color} />,
        }}
      />
      <OwnerTab.Screen
        name="Employees"
        component={EmployeesScreen}
        options={{
          tabBarLabel: t('navigation.employees'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <OwnerTab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          tabBarLabel: t('navigation.services'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cut" size={size} color={color} />
          ),
        }}
      />
      <OwnerTab.Screen
        name="OwnerProfile"
        component={OwnerProfileScreen}
        options={{
          tabBarLabel: t('navigation.profile'),
          title: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
    </OwnerTab.Navigator>
  );
};

export const RootNavigator = () => {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Wait for hydration before rendering navigation
  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      {!user ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : user.role === 'OWNER' ? (
        <>
          <Stack.Screen
            name="OwnerTabs"
            component={OwnerTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OwnerReviews"
            component={OwnerReviewsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BusinessDetail"
            component={BusinessDetailScreen}
            options={{ title: t('navigation.businessDetails') }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ title: t('navigation.editProfile') }}
          />
        </>
      ) : user.role === 'EMPLOYEE' ? (
        <>
          {user.employee?.status === 'ACTIVE' ? (
            <Stack.Screen
              name="EmployeeTabs"
              component={EmployeeTabs}
              options={{ headerShown: false }}
            />
          ) : user.employee?.status === 'PENDING' ? (
            <Stack.Screen
              name="EmployeePending"
              component={EmployeePendingScreen}
              options={{ headerShown: false }}
            />
          ) : user.employee?.status === 'REJECTED' ? (
            <Stack.Screen
              name="EmployeeRejected"
              component={EmployeeRejectedScreen}
              options={{ headerShown: false }}
            />
          ) : (
            <Stack.Screen
              name="EmployeeJoin"
              component={EmployeeJoinScreen}
              options={{ headerShown: false }}
            />
          )}
          <Stack.Screen
            name="EmployeeEditProfile"
            component={EmployeeEditProfileScreen}
            options={{ title: t('navigation.editProfile') }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="UserTabs"
            component={UserTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BusinessDetail"
            component={BusinessDetailScreen}
            options={{ title: t('navigation.businessDetails') }}
          />
          <Stack.Screen
            name="Review"
            component={ReviewScreen}
            options={{ title: t('navigation.writeReview') }}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{ title: t('navigation.changePassword') }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ title: t('navigation.editProfile') }}
          />
          <Stack.Screen
            name="BusinessReviews"
            component={BusinessReviewsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
