import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/useTheme';
import { LoadingSpinner } from '../components';

// Auth Screens
import { AuthScreen } from '../screens/auth/AuthScreen';

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

// Owner Screens
import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { RequestsScreen } from '../screens/owner/RequestsScreen';
import { EmployeesScreen } from '../screens/owner/EmployeesScreen';
import { ServicesScreen } from '../screens/owner/ServicesScreen';
import { OwnerProfileScreen } from '../screens/owner/OwnerProfileScreen';

export type RootStackParamList = {
  Auth: undefined;
  UserTabs: undefined;
  OwnerTabs: undefined;
  BusinessDetail: { businessId: string };
  Review: { appointmentId: string; businessId: string };
  ChangePassword: undefined;
  EditProfile: undefined;
  BusinessReviews: {
    businessId: string;
    businessName: string;
    ratingAvg: number;
    ratingCount: number;
  };
};

export type UserTabParamList = {
  Home: undefined;
  Search: undefined;
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

const Stack = createNativeStackNavigator<RootStackParamList>();
const UserTab = createBottomTabNavigator<UserTabParamList>();
const OwnerTab = createBottomTabNavigator<OwnerTabParamList>();

const UserTabs = () => {
  const { colors } = useTheme();

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
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <UserTab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <UserTab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: 'Appointments',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <UserTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </UserTab.Navigator>
  );
};

const OwnerTabs = () => {
  const { colors } = useTheme();

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
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <OwnerTab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: ({ color, size }) => <Ionicons name="mail" size={size} color={color} />,
        }}
      />
      <OwnerTab.Screen
        name="Employees"
        component={EmployeesScreen}
        options={{
          tabBarLabel: 'Employees',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <OwnerTab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cut" size={size} color={color} />
          ),
        }}
      />
      <OwnerTab.Screen
        name="OwnerProfile"
        component={OwnerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          title: 'Profile',
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
            name="BusinessDetail"
            component={BusinessDetailScreen}
            options={{ title: 'Business Details' }}
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
            options={{ title: 'Business Details' }}
          />
          <Stack.Screen
            name="Review"
            component={ReviewScreen}
            options={{ title: 'Write Review' }}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{ title: 'Change Password' }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ title: 'Edit Profile' }}
          />
          <Stack.Screen
            name="BusinessReviews"
            component={BusinessReviewsScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
