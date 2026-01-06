import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { ownerService } from '../../services/ownerService';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { Button, Card, Input } from '../../components';
import { spacing, typography } from '../../theme/theme';
import { Business } from '../../types';

interface BusinessFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  phone: string;
}

export const OwnerProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BusinessFormData>();

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    try {
      setLoading(true);
      const data = await ownerService.getBusiness();
      setBusiness(data);
      reset({
        name: data.name || '',
        description: data.description || '',
        address: data.address || '',
        city: data.city || '',
        phone: data.phone || '',
      });
    } catch (error: any) {
      console.error('Load business error:', error);
      Alert.alert('Error', 'Failed to load business information');
    } finally {
      setLoading(false);
    }
  };

  const onSaveBusiness = async (data: BusinessFormData) => {
    try {
      setSaving(true);
      const updated = await ownerService.updateBusiness({
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        phone: data.phone,
      });
      setBusiness(updated);
      setIsEditing(false);
      Alert.alert('Success', 'Business information updated successfully');
    } catch (error: any) {
      console.error('Update business error:', error);
      Alert.alert('Error', error.message || 'Failed to update business information');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    // Prevent triggering if already logging out
    if (isLoggingOut) {
      console.log('[UI] Logout button pressed but already logging out');
      return;
    }
    
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, typography.body, { color: colors.mutedForeground }]}>
          Loading business information...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.card}>
        <Text
          style={[
            styles.sectionTitle,
            typography.headingSemiBold,
            { color: colors.foreground },
          ]}
        >
          Business Owner Profile
        </Text>

        <View style={styles.infoRow}>
          <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
            Name
          </Text>
          <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
            {user.name}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
            Email
          </Text>
          <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
            {user.email}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
            Role
          </Text>
          <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
            Business Owner
          </Text>
        </View>
      </Card>

      {business && (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.sectionTitle,
                typography.headingSemiBold,
                { color: colors.foreground },
              ]}
            >
              Business Information
            </Text>
            {!isEditing && (
              <Button
                title="Edit"
                variant="outline"
                size="sm"
                onPress={() => setIsEditing(true)}
              />
            )}
          </View>

          {isEditing ? (
            <View style={styles.form}>
              <Controller
                control={control}
                name="name"
                rules={{ required: 'Business name is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Business Name *"
                    placeholder="My Business"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Description"
                    placeholder="Brief description of your business"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.description?.message}
                    multiline
                    numberOfLines={3}
                  />
                )}
              />

              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Address"
                    placeholder="123 Main St"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.address?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="city"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="City"
                    placeholder="San Francisco"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.city?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Phone"
                    placeholder="+1 (555) 123-4567"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.phone?.message}
                    keyboardType="phone-pad"
                  />
                )}
              />

              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setIsEditing(false);
                    reset();
                  }}
                  style={styles.halfButton}
                />
                <Button
                  title="Save"
                  onPress={handleSubmit(onSaveBusiness)}
                  loading={saving}
                  style={styles.halfButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.businessInfo}>
              <View style={styles.infoRow}>
                <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                  Name
                </Text>
                <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
                  {business.name}
                </Text>
              </View>

              {business.description && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                    Description
                  </Text>
                  <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
                    {business.description}
                  </Text>
                </View>
              )}

              {business.address && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                    Address
                  </Text>
                  <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
                    {business.address}
                  </Text>
                </View>
              )}

              {business.city && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                    City
                  </Text>
                  <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
                    {business.city}
                  </Text>
                </View>
              )}

              {business.phone && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                    Phone
                  </Text>
                  <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
                    {business.phone}
                  </Text>
                </View>
              )}

              {business.status && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                    Status
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        business.status === 'APPROVED' || business.status === 'ACTIVE'
                          ? colors.success
                          : business.status === 'PENDING'
                          ? colors.warning
                          : colors.destructive
                    }
                  ]}>
                    <Text style={[styles.statusText, typography.bodySemiBold]}>
                      {business.status}
                    </Text>
                  </View>
                </View>
              )}

              {business.averageRating !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                    Rating
                  </Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color={colors.warning} />
                    <Text style={[styles.value, typography.body, { color: colors.foreground, marginLeft: spacing.xs }]}>
                      {business.averageRating.toFixed(1)} ({business.reviewCount || 0} reviews)
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </Card>
      )}

      <Card style={styles.card}>
        <Text
          style={[
            styles.sectionTitle,
            typography.headingSemiBold,
            { color: colors.foreground },
          ]}
        >
          Preferences
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>
              Dark Mode
            </Text>
            <Text
              style={[
                styles.settingDescription,
                typography.body,
                { color: colors.mutedForeground },
              ]}
            >
              Switch between light and dark theme
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.card}
          />
        </View>
      </Card>

      <View style={styles.logoutSection}>
        <Button
          title={isLoggingOut ? "Logging out..." : "Logout"}
          variant="destructive"
          onPress={handleLogout}
          fullWidth
          disabled={isLoggingOut}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  label: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  value: {
    fontSize: typography.sizes.sm,
    flex: 2,
    textAlign: 'right',
  },
  businessInfo: {
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  settingLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingDescription: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  logoutSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
  },
});
