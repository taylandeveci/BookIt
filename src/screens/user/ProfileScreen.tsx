import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { UserTabParamList, RootStackParamList } from '../../navigation/RootNavigator';
import { authService } from '../../services/authService';
import { appointmentService } from '../../services/appointmentService';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { Button, Card, EmptyState, LoadingSpinner, Toast } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { Appointment, Business, Service } from '../../types';
import { setAppLanguage, getCurrentLanguage } from '../../localization/i18n';
import { useNotificationStore } from '../../store/notificationStore';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<UserTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type AppointmentWithDetails = Appointment & {
  business?: Business;
  service?: Service;
};

export const ProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const unreadCount = useNotificationStore((s) =>
    s.notifications.filter((n) => !n.read && n.userId === user?.id).length
  );
  const logout = useAuthStore((state) => state.logout);
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotifications = useAppStore((state) => state.setNotifications);
  const [currentLang, setCurrentLang] = useState<'en' | 'tr'>(getCurrentLanguage());
  
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleLanguageChange = async (lang: 'en' | 'tr') => {
    await setAppLanguage(lang);
    setCurrentLang(lang);
  };

  const isRefetchingRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;
      if (isRefetchingRef.current) return;
      isRefetchingRef.current = true;
      loadAppointments().finally(() => {
        isRefetchingRef.current = false;
      });
    }, [user])
  );

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setAppointmentsLoading(true);
      const data = await appointmentService.getAppointments(user.id);
      setAppointments(Array.isArray(data) ? (data as AppointmentWithDetails[]) : []);
    } catch (error: any) {
      
      // Handle auth errors gracefully
      const errorMessage = error.message || t('profile.loadError');
      if (errorMessage.includes('permission') || errorMessage.includes('Authentication') || errorMessage.includes('log in')) {
        setToast({ message: t('profile.loginAgain'), type: 'error' });
        // Clear appointments but don't crash
        setAppointments([]);
      } else {
        setToast({ message: errorMessage, type: 'error' });
      }
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'time-outline';
      case 'APPROVED':
        return 'checkmark-circle';
      case 'COMPLETED':
        return 'checkmark-done-circle';
      case 'CANCELLED':
        return 'close-circle';
      default:
        return 'ellipse';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return colors.mutedForeground;
      case 'APPROVED':
        return colors.primary;
      case 'COMPLETED':
        return colors.secondary;
      case 'CANCELLED':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const handleLogout = () => {
    // Prevent triggering if already logging out
    if (isLoggingOut) {
      return;
    }
    
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            // Double-check to prevent race conditions
            if (isLoggingOut) return;
            await logout();
          },
        },
      ]
    );
  };

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
      
      {/* Top bar with bell */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.bellWrap} onPress={() => navigation.navigate('Notifications')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Profile Header */}
      <Card style={styles.card}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.muted }]}>
            <Ionicons name="person" size={48} color={colors.mutedForeground} />
          </View>
          
          <Text
            style={[
              styles.profileName,
              typography.heading,
              { color: colors.foreground },
            ]}
          >
            {user.name || t('profile.guestUser')}
          </Text>
          
          <Text
            style={[
              styles.profileEmail,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            {user.email}
          </Text>

          <View style={styles.editButtonContainer}>
            <Button
              title={t('profile.editProfile')}
              onPress={() => navigation.navigate('EditProfile')}
              fullWidth
            />
          </View>
        </View>
      </Card>

      {/* My Appointments Section */}
      <Card style={styles.card}>
        <View style={styles.appointmentHeader}>
          <Text
            style={[
              styles.sectionTitle,
              typography.headingSemiBold,
              { color: colors.foreground },
            ]}
          >
            {t('appointments.title')}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Appointments')}
          >
            <Text style={[typography.bodySemiBold, { color: colors.primary }]}>
              {t('dashboard.viewAll')}
            </Text>
          </TouchableOpacity>
        </View>

        {appointmentsLoading ? (
          <View style={styles.appointmentLoading}>
            <LoadingSpinner />
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyAppointments}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text
              style={[
                typography.body,
                { color: colors.mutedForeground, marginTop: spacing.md, textAlign: 'center' },
              ]}
            >
              {t('profile.noAppointments')}
            </Text>
          </View>
        ) : (
          <View>
            {/* Active Appointments */}
            {appointments.filter((apt) => apt.status === 'PENDING' || apt.status === 'APPROVED').slice(0, 2).length > 0 && (
              <View style={styles.appointmentGroup}>
                <Text
                  style={[
                    typography.bodySemiBold,
                    { color: colors.mutedForeground, marginBottom: spacing.sm },
                  ]}
                >
                  {t('profile.active')}
                </Text>
                {appointments
                  .filter((apt) => apt.status === 'PENDING' || apt.status === 'APPROVED')
                  .slice(0, 2)
                  .map((apt) => (
                    <TouchableOpacity
                      key={apt.id}
                      style={[
                        styles.appointmentItem,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={() => navigation.navigate('Appointments')}
                    >
                      <View style={styles.appointmentInfo}>
                        <Text
                          style={[
                            typography.bodySemiBold,
                            { color: colors.foreground },
                          ]}
                        >
                          {apt.business?.name}
                        </Text>
                        <Text
                          style={[
                            typography.body,
                            { color: colors.mutedForeground, fontSize: typography.sizes.sm },
                          ]}
                        >
                          {apt.service?.name}
                        </Text>
                        <Text
                          style={[
                            typography.body,
                            { color: colors.mutedForeground, fontSize: typography.sizes.xs, marginTop: spacing.xs },
                          ]}
                        >
                          {new Date(apt.date || apt.startTime || '').toLocaleDateString()} {t('time.at')} {apt.timeSlot || (apt.startTime ? new Date(apt.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'TBD')}
                        </Text>
                      </View>
                      <View style={styles.appointmentStatus}>
                        <Ionicons
                          name={getStatusIcon(apt.status)}
                          size={20}
                          color={getStatusColor(apt.status)}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}

            {/* Past Appointments */}
            {appointments.filter((apt) => apt.status === 'COMPLETED' || apt.status === 'CANCELLED').slice(0, 2).length > 0 && (
              <View style={styles.appointmentGroup}>
                <Text
                  style={[
                    typography.bodySemiBold,
                    { color: colors.mutedForeground, marginBottom: spacing.sm },
                  ]}
                >
                  {t('profile.past')}
                </Text>
                {appointments
                  .filter((apt) => apt.status === 'COMPLETED' || apt.status === 'CANCELLED')
                  .slice(0, 2)
                  .map((apt) => (
                    <TouchableOpacity
                      key={apt.id}
                      style={[
                        styles.appointmentItem,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={() => navigation.navigate('Appointments')}
                    >
                      <View style={styles.appointmentInfo}>
                        <Text
                          style={[
                            typography.bodySemiBold,
                            { color: colors.foreground },
                          ]}
                        >
                          {apt.business?.name}
                        </Text>
                        <Text
                          style={[
                            typography.body,
                            { color: colors.mutedForeground, fontSize: typography.sizes.sm },
                          ]}
                        >
                          {apt.service?.name}
                        </Text>
                        <Text
                          style={[
                            typography.body,
                            { color: colors.mutedForeground, fontSize: typography.sizes.xs, marginTop: spacing.xs },
                          ]}
                        >
                          {new Date(apt.date || apt.startTime || '').toLocaleDateString()} {t('time.at')} {apt.timeSlot || (apt.startTime ? new Date(apt.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'TBD')}
                        </Text>
                      </View>
                      <View style={styles.appointmentStatus}>
                        <Ionicons
                          name={getStatusIcon(apt.status)}
                          size={20}
                          color={getStatusColor(apt.status)}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <Text
          style={[
            styles.sectionTitle,
            typography.headingSemiBold,
            { color: colors.foreground },
          ]}
        >
          {t('profile.security')}
        </Text>

        <Button
          title={t('profile.changePassword')}
          onPress={() => navigation.navigate('ChangePassword')}
          fullWidth
          variant="outline"
        />
      </Card>

      <Card style={styles.card}>
        <Text
          style={[
            styles.sectionTitle,
            typography.headingSemiBold,
            { color: colors.foreground },
          ]}
        >
          {t('profile.title')}
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text
              style={[
                typography.bodySemiBold,
                { color: colors.foreground },
              ]}
            >
              {t('profile.theme')}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                typography.body,
                { color: colors.mutedForeground },
              ]}
            >
              {t('profile.themeSubtitle')}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.card}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text
              style={[
                typography.bodySemiBold,
                { color: colors.foreground },
              ]}
            >
              {t('profile.language')}
            </Text>
            <View style={styles.languageOptions}>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  currentLang === 'en' && { backgroundColor: colors.primary },
                ]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text
                  style={[
                    typography.body,
                    currentLang === 'en'
                      ? { color: colors.primaryForeground }
                      : { color: colors.mutedForeground },
                  ]}
                >
                  {t('profile.english')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  currentLang === 'tr' && { backgroundColor: colors.primary },
                ]}
                onPress={() => handleLanguageChange('tr')}
              >
                <Text
                  style={[
                    typography.body,
                    currentLang === 'tr'
                      ? { color: colors.primaryForeground }
                      : { color: colors.mutedForeground },
                  ]}
                >
                  {t('profile.turkish')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text
              style={[
                typography.bodySemiBold,
                { color: colors.foreground },
              ]}
            >
              {t('profile.notifications')}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                typography.body,
                { color: colors.mutedForeground },
              ]}
            >
              {t('profile.receiveUpdates')}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotifications}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.card}
          />
        </View>
      </Card>

      <View style={styles.logoutSection}>
        <Button
          title={isLoggingOut ? t('common.loading') : t('profile.logout')}
          variant="destructive"
          onPress={handleLogout}
          fullWidth
          disabled={isLoggingOut}
        />
        
        {__DEV__ && (
          <Button
            title="Reset Demo State (Dev Only)"
            variant="outline"
            onPress={async () => {
              Alert.alert(
                'Reset Demo State',
                'Clear all tokens and return to login?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                      await SecureStore.deleteItemAsync('accessToken').catch(() => {});
                      await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
                      setUser(null);
                      setToast({ message: 'Demo state reset', type: 'success' });
                    },
                  },
                ]
              );
            }}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
  },
  bellWrap: {
    position: 'relative',
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#5D7052',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  profileName: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  editButtonContainer: {
    width: '100%',
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  settingLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingDescription: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  languageOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logoutSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  appointmentLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyAppointments: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  appointmentGroup: {
    marginBottom: spacing.lg,
  },
  appointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentStatus: {
    marginLeft: spacing.md,
  },
});
