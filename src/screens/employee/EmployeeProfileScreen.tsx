import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { queryKeys } from '../../lib/queryKeys';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { businessService } from '../../services/businessService';
import { employeeService } from '../../services/employeeService';
import { Button, Card, Input, Toast, ImageWithFallback } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, getCurrentLanguage } from '../../localization/i18n';
import { Business } from '../../types';
import { useNotificationStore } from '../../store/notificationStore';

export const EmployeeProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotifications = useAppStore((state) => state.setNotifications);
  const unreadCount = useNotificationStore((s) =>
    s.notifications.filter((n) => !n.read && n.userId === user?.id).length
  );

  const [currentLang, setCurrentLang] = useState<'en' | 'tr'>(getCurrentLanguage());
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Join business state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Leave business state
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const hasBusiness = !!user?.employee?.businessId;
  const isPending = user?.employee?.status === 'PENDING';

  const isRefetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (user?.employee?.businessId) {
        if (isRefetchingRef.current) return;
        isRefetchingRef.current = true;
        loadBusiness(user.employee.businessId).finally(() => {
          isRefetchingRef.current = false;
        });
      } else {
        setBusiness(null);
      }
    }, [user?.employee?.businessId])
  );

  const loadBusiness = async (id: string) => {
    try {
      setBusinessLoading(true);
      const b = await businessService.getBusiness(id);
      setBusiness(b);
    } catch {
      // silent — business may not be accessible
    } finally {
      setBusinessLoading(false);
    }
  };

  const handleJoinSubmit = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      await employeeService.joinBusiness(joinCode.trim().toUpperCase());
      setJoinSuccess(true);
    } catch (e: any) {
      setJoinError(e.message || t('auth.invalidCode'));
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveConfirm = () => {
    Alert.alert(
      t('employeeProfile.leaveBusiness'),
      t('employeeProfile.leaveBusinessConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('employeeProfile.leave'),
          style: 'destructive',
          onPress: handleLeave,
        },
      ]
    );
  };

  const handleLeave = async () => {
    setLeaveLoading(true);
    setLeaveError(null);
    try {
      const previousBusinessId = user?.employee?.businessId;
      await employeeService.leaveBusiness();
      // Update local user state — employee becomes unassigned, account stays intact
      if (user?.employee) {
        setUser({ ...user, employee: { ...user.employee, status: 'UNASSIGNED', businessId: null } });
      }
      setBusiness(null);
      if (previousBusinessId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.forBusiness(previousBusinessId) });
      }
    } catch (e: any) {
      setLeaveError(e.message || t('employeeProfile.leaveError'));
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleLanguageChange = async (lang: 'en' | 'tr') => {
    await setAppLanguage(lang);
    setCurrentLang(lang);
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          if (!isLoggingOut) await logout();
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            {user.avatar ? (
              <ImageWithFallback uri={user.avatar} style={styles.avatar} iconSize={40} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                <Ionicons name="person" size={40} color={colors.mutedForeground} />
              </View>
            )}
          </View>

          <Text style={[styles.name, typography.heading, { color: colors.foreground }]}>
            {user.name}
          </Text>

          <Text style={[typography.body, { color: colors.mutedForeground, marginBottom: spacing.md }]}>
            {user.email}
          </Text>

          <View style={[styles.roleBadge, { backgroundColor: colors.primary, marginBottom: spacing.lg }]}>
            <Text style={[typography.bodySemiBold, { color: colors.primaryForeground, fontSize: 13 }]}>
              {t('employeeProfile.role')}
            </Text>
          </View>

          <Button
            title={t('profile.editProfile')}
            onPress={() => navigation.navigate('EmployeeEditProfile')}
            fullWidth
          />
        </View>

        {/* Contact Card */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, typography.headingSemiBold, { color: colors.foreground }]}>
            {t('employeeProfile.contact')}
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoText, typography.body, { color: colors.foreground }]}>
              {user.email}
            </Text>
          </View>

          <View style={[styles.infoRow, styles.lastRow]}>
            <Ionicons name="call-outline" size={18} color={colors.mutedForeground} />
            <Text
              style={[
                styles.infoText,
                typography.body,
                { color: (user as any).phone ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {(user as any).phone || t('employeeProfile.addPhone')}
            </Text>
          </View>
        </Card>

        {/* Workplace Card */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, typography.bodySemiBold, { color: colors.mutedForeground, fontSize: typography.sizes.sm }]}>
            {t('employeeProfile.workplace')}
          </Text>

          {businessLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : hasBusiness && business ? (
            /* State B — assigned to a business */
            <View style={styles.workplaceAssigned}>
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={18} color={colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.md }]}>
                    {business.name}
                  </Text>
                  {business.address ? (
                    <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm, marginTop: 2 }]}>
                      {business.address}
                    </Text>
                  ) : null}
                </View>
              </View>

              {leaveError ? (
                <Text style={[typography.body, { color: colors.destructive, fontSize: typography.sizes.xs, marginBottom: spacing.xs }]}>
                  {leaveError}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.leaveBtn, { borderColor: colors.destructive }]}
                onPress={handleLeaveConfirm}
                disabled={leaveLoading}
                activeOpacity={0.7}
              >
                {leaveLoading ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={14} color={colors.destructive} />
                    <Text style={[typography.bodySemiBold, { color: colors.destructive, fontSize: typography.sizes.sm }]}>
                      {t('employeeProfile.leaveBusiness')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : hasBusiness && !business ? (
            /* Assigned but business not loaded — show pending indicator */
            <View style={styles.pendingRow}>
              <Ionicons name="time-outline" size={14} color={colors.secondary} />
              <Text style={[typography.body, { color: colors.secondary, fontSize: typography.sizes.sm }]}>
                {t('employeeProfile.pendingApproval')}
              </Text>
            </View>
          ) : joinSuccess || isPending ? (
            /* State A — pending after just submitting */
            <View style={styles.pendingRow}>
              <Ionicons name="time-outline" size={14} color={colors.secondary} />
              <Text style={[typography.body, { color: colors.secondary, fontSize: typography.sizes.sm }]}>
                {t('employeeProfile.pendingApproval')}
              </Text>
            </View>
          ) : (
            /* State A — no business */
            <View style={styles.workplaceEmpty}>
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.md, marginBottom: spacing.md }]}>
                {t('employeeProfile.notAssigned')}
              </Text>

              <Input
                placeholder={t('employeeProfile.joinCodePlaceholder')}
                value={joinCode}
                onChangeText={(v) => setJoinCode(v.toUpperCase())}
                autoCapitalize="characters"
                maxLength={8}
                error={joinError ?? undefined}
              />

              <Button
                title={t('employeeProfile.sendRequest')}
                onPress={handleJoinSubmit}
                loading={joinLoading}
                fullWidth
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}
        </Card>

        {/* Preferences Card */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, typography.headingSemiBold, { color: colors.foreground }]}>
            {t('employeeProfile.preferences')}
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>{t('employeeProfile.darkMode')}</Text>
              <Text style={[typography.body, { fontSize: 13, color: colors.mutedForeground, marginTop: 2 }]}>
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
              <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>{t('profile.language')}</Text>
              <View style={styles.langRow}>
                {(['en', 'tr'] as const).map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.langBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: currentLang === lang ? colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => handleLanguageChange(lang)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        typography.body,
                        {
                          color: currentLang === lang ? colors.primaryForeground : colors.mutedForeground,
                        },
                      ]}
                    >
                      {lang === 'en' ? t('profile.english') : t('profile.turkish')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.settingRow, styles.lastRow]}>
            <View style={styles.settingLabel}>
              <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>{t('employeeProfile.notifications')}</Text>
              <Text style={[typography.body, { fontSize: 13, color: colors.mutedForeground, marginTop: 2 }]}>
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

        <Button
          title={t('profile.logout')}
          variant="destructive"
          onPress={handleLogout}
          fullWidth
          disabled={isLoggingOut}
          style={{ marginBottom: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: spacing.xl },
  card: { marginBottom: spacing.lg },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: typography.sizes.xxl,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },

  // Section title
  sectionTitle: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.md,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  lastRow: { borderBottomWidth: 0 },
  infoText: { flex: 1, fontSize: typography.sizes.sm },

  // Workplace
  workplaceAssigned: { gap: spacing.sm },
  workplaceEmpty: { gap: 0 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },

  // Settings
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
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  langBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
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
    fontWeight: '700' as const,
    textAlign: 'center',
  },
});
