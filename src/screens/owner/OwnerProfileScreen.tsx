import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ownerService } from '../../services/ownerService';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { Button, Card, Input, ImageWithFallback } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { Business, BusinessMedia } from '../../types';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { setAppLanguage, getCurrentLanguage } from '../../localization/i18n';
import { useNotificationStore } from '../../store/notificationStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BusinessFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  coordinates: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// Accepts "lat, lng" in Google Maps format, e.g. "39.871889049180794, 32.65951670446915"
const COORDINATES_REGEX = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

function parseCoordinates(value: string): { latitude: number; longitude: number } | null {
  const match = value.match(COORDINATES_REGEX);
  if (!match) return null;
  const latitude = parseFloat(match[1]);
  const longitude = parseFloat(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function formatCoordinates(lat?: number | null, lng?: number | null): string {
  if (lat === undefined || lat === null || lng === undefined || lng === null) return '';
  return `${lat}, ${lng}`;
}

export const OwnerProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);
  const unreadCount = useNotificationStore((s) =>
    s.notifications.filter((n) => !n.read && n.userId === user?.id).length
  );
  const logout = useAuthStore((state) => state.logout);
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotifications = useAppStore((state) => state.setNotifications);
  const [currentLang, setCurrentLang] = React.useState(getCurrentLanguage());

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [joinCodeEnabled, setJoinCodeEnabled] = useState(false);
  const [releaseOnEarlyCompletion, setReleaseOnEarlyCompletion] = useState(false);
  const [cancellationWindowMinutes, setCancellationWindowMinutes] = useState(60);
  const [savingSettings, setSavingSettings] = useState(false);

  const queryClient = useQueryClient();

  const CANCEL_WINDOW_OPTIONS = [
    { label: `30 ${t('common.min')}`, value: 30 },
    { label: `1 ${t('time.hour')}`, value: 60 },
    { label: `2 ${t('time.hours')}`, value: 120 },
    { label: `24 ${t('time.hours')}`, value: 1440 },
  ];

  // Photo gallery state
  const [mediaItems, setMediaItems] = useState<BusinessMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<BusinessMedia | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BusinessFormData>();

  const coordinatesValue = watch('coordinates');
  const previewCoordinates = coordinatesValue ? parseCoordinates(coordinatesValue) : null;

  useEffect(() => {
    loadBusiness();
    loadMedia();
  }, []);

  const loadBusiness = async () => {
    try {
      setLoading(true);
      const data = await ownerService.getBusiness();
      setBusiness(data);
      setJoinCodeEnabled(data.joinCodeEnabled ?? false);
      setReleaseOnEarlyCompletion(data.releaseOnEarlyCompletion ?? false);
      setCancellationWindowMinutes(data.cancellationWindowMinutes ?? 60);
      reset({
        name: data.name || '',
        description: data.description || '',
        address: data.address || '',
        city: data.city || '',
        phone: data.phone || '',
        coordinates: formatCoordinates(data.locationLat, data.locationLng),
      });
    } catch (error: any) {
      Alert.alert(t('common.error'), t('ownerProfile.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async () => {
    try {
      const items = await ownerService.getBusinessMedia();
      setMediaItems(Array.isArray(items) ? items : []);
    } catch {
      setMediaItems([]);
    }
  };

  const handleAddPhoto = async () => {
    if (mediaItems.length >= 5) {
      Alert.alert(t('ownerProfile.photoLimit'), t('ownerProfile.photoLimitDesc'));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) return;

      setMediaLoading(true);
      const url = `data:image/jpeg;base64,${asset.base64}`;
      const newItem = await ownerService.addBusinessMedia(url);
      setMediaItems((prev) => [...prev, newItem]);
      if (business?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.detail(business.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.list() });
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('ownerProfile.uploadError'));
    } finally {
      setMediaLoading(false);
    }
  };

  const handleDeletePhoto = (item: BusinessMedia) => {
    Alert.alert(t('ownerProfile.deletePhoto'), t('ownerProfile.deletePhotoConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await ownerService.deleteBusinessMedia(item.id);
            setMediaItems((prev) => prev.filter((m) => m.id !== item.id));
            if (viewingMedia?.id === item.id) setViewingMedia(null);
            if (business?.id) {
              queryClient.invalidateQueries({ queryKey: queryKeys.businesses.detail(business.id) });
              queryClient.invalidateQueries({ queryKey: queryKeys.businesses.list() });
            }
          } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('ownerProfile.deletePhotoError'));
          }
        },
      },
    ]);
  };

  const onSaveBusiness = async (data: BusinessFormData) => {
    const trimmedCoordinates = data.coordinates?.trim() ?? '';
    const coordinates = trimmedCoordinates ? parseCoordinates(trimmedCoordinates) : null;

    if (trimmedCoordinates && !coordinates) {
      Alert.alert(t('common.error'), t('ownerProfile.coordinatesInvalid'));
      return;
    }

    try {
      setSaving(true);
      const updated = await ownerService.updateBusiness({
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        phone: data.phone,
        locationLat: coordinates ? coordinates.latitude : null,
        locationLng: coordinates ? coordinates.longitude : null,
      });
      setBusiness(updated);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.business });
      if (updated?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.detail(updated.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.list() });
      }
      Alert.alert(t('common.success'), t('ownerProfile.updateSuccess'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('ownerProfile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyJoinCode = async () => {
    if (!business?.joinCode) return;
    await Clipboard.setStringAsync(business.joinCode);
    Alert.alert(t('common.copied'), t('ownerProfile.joinCodeCopied'));
  };

  const onSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const updated = await ownerService.updateBusinessSettings({
        joinCodeEnabled,
        releaseOnEarlyCompletion,
        cancellationWindowMinutes,
      });
      setBusiness(updated);
      Alert.alert(t('ownerProfile.settingsSaved'), t('ownerProfile.settingsUpdated'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('ownerProfile.settingsError'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          if (isLoggingOut) return;
          await logout();
        },
      },
    ]);
  };

  if (!user) return null;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, typography.body, { color: colors.mutedForeground }]}>
          {t('ownerProfile.loading')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
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

      {/* Owner Profile Card */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, typography.headingSemiBold, { color: colors.foreground }]}>
          {t('ownerProfile.title')}
        </Text>

        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
            {t('ownerProfile.name')}
          </Text>
          <View style={styles.tappableValue}>
            <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
              {user.name}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
            {t('ownerProfile.email')}
          </Text>
          <View style={styles.tappableValue}>
            <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
              {user.email}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        <View style={styles.infoRow}>
          <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
            {t('ownerProfile.roleLabel')}
          </Text>
          <Text style={[styles.value, typography.body, { color: colors.foreground }]}>
            {t('ownerProfile.role')}
          </Text>
        </View>
      </Card>

      {/* Photo Gallery Card */}
      {business && (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, typography.headingSemiBold, { color: colors.foreground }]}>
              {t('ownerProfile.photos')}
            </Text>
            <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 12 }]}>
              {mediaItems.length}/5
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            {mediaItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.photoThumb, { backgroundColor: colors.muted }]}
                onPress={() => setViewingMedia(item)}
                activeOpacity={0.85}
              >
                <ImageWithFallback uri={item.url} style={styles.photoThumbImage} iconSize={32} />
                <TouchableOpacity
                  style={styles.photoDeleteBtn}
                  onPress={() => handleDeletePhoto(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.destructive} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {mediaItems.length < 5 && (
              <TouchableOpacity
                style={[styles.photoAddBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={handleAddPhoto}
                disabled={mediaLoading}
                activeOpacity={0.7}
              >
                {mediaLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="add" size={28} color={colors.primary} />
                    <Text style={[typography.body, { fontSize: 11, color: colors.mutedForeground, marginTop: 4 }]}>
                      {t('ownerProfile.addPhoto')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </Card>
      )}

      {/* Business Information Card */}
      {business && (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, typography.headingSemiBold, { color: colors.foreground }]}>
              {t('ownerProfile.businessInfo')}
            </Text>
            {!isEditing && (
              <Button
                title={t('common.edit')}
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
                rules={{ required: t('ownerProfile.businessNameRequired') }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('ownerProfile.businessName')}
                    placeholder={t('ownerProfile.businessNamePlaceholder')}
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
                    label={t('ownerProfile.description')}
                    placeholder={t('ownerProfile.descriptionPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
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
                    label={t('ownerProfile.address')}
                    placeholder={t('ownerProfile.addressPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              <Controller
                control={control}
                name="city"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('ownerProfile.city')}
                    placeholder={t('ownerProfile.cityPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('ownerProfile.phone')}
                    placeholder={t('ownerProfile.phonePlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                  />
                )}
              />
              <Controller
                control={control}
                name="coordinates"
                rules={{
                  validate: (value) =>
                    !value?.trim() || parseCoordinates(value) !== null || t('ownerProfile.coordinatesInvalid'),
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('ownerProfile.coordinates')}
                    placeholder={t('ownerProfile.coordinatesPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.coordinates?.message}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              <Text style={[typography.body, styles.coordinatesHelp, { color: colors.mutedForeground }]}>
                {t('ownerProfile.coordinatesHelp')}
              </Text>
              {previewCoordinates && (
                <View style={[styles.mapPreview, { borderColor: colors.border }]}>
                  <MapView
                    style={StyleSheet.absoluteFill}
                    region={{
                      latitude: previewCoordinates.latitude,
                      longitude: previewCoordinates.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    pointerEvents="none"
                  >
                    <Marker coordinate={previewCoordinates} tracksViewChanges={false}>
                      <View style={styles.markerContainer}>
                        <Ionicons name="location" size={20} color="#4A5E6A" />
                      </View>
                    </Marker>
                  </MapView>
                </View>
              )}
              <View style={styles.buttonRow}>
                <Button
                  title={t('common.cancel')}
                  variant="outline"
                  onPress={() => { setIsEditing(false); reset(); }}
                  style={styles.halfButton}
                />
                <Button
                  title={t('common.save')}
                  onPress={handleSubmit(onSaveBusiness)}
                  loading={saving}
                  style={styles.halfButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.businessInfo}>
              <View style={styles.bizInfoBlock}>
                <Text style={[styles.bizLabel, typography.bodySemiBold, { color: colors.mutedForeground }]}>{t('ownerProfile.name')}</Text>
                <Text style={[styles.bizValue, typography.body, { color: colors.foreground }]}>{business.name}</Text>
              </View>
              {business.description ? (
                <View style={styles.bizInfoBlock}>
                  <Text style={[styles.bizLabel, typography.bodySemiBold, { color: colors.mutedForeground }]}>{t('ownerProfile.description')}</Text>
                  <Text style={[styles.bizValue, typography.body, { color: colors.foreground }]}>{business.description}</Text>
                </View>
              ) : null}
              {business.address ? (
                <View style={styles.bizInfoBlock}>
                  <Text style={[styles.bizLabel, typography.bodySemiBold, { color: colors.mutedForeground }]}>{t('ownerProfile.address')}</Text>
                  <Text style={[styles.bizValue, typography.body, { color: colors.foreground }]}>{business.address}</Text>
                </View>
              ) : null}
              {business.city ? (
                <View style={styles.bizInfoBlock}>
                  <Text style={[styles.bizLabel, typography.bodySemiBold, { color: colors.mutedForeground }]}>{t('ownerProfile.city')}</Text>
                  <Text style={[styles.bizValue, typography.body, { color: colors.foreground }]}>{business.city}</Text>
                </View>
              ) : null}
              {business.locationLat !== undefined && business.locationLng !== undefined && business.locationLat !== null && business.locationLng !== null ? (
                <View style={styles.bizInfoBlock}>
                  <Text style={[styles.bizLabel, typography.bodySemiBold, { color: colors.mutedForeground }]}>{t('ownerProfile.coordinates')}</Text>
                  <Text style={[styles.bizValue, typography.body, { color: colors.foreground, marginBottom: spacing.sm }]}>
                    {formatCoordinates(business.locationLat, business.locationLng)}
                  </Text>
                  <View style={[styles.mapPreview, { borderColor: colors.border }]}>
                    <MapView
                      style={StyleSheet.absoluteFill}
                      region={{
                        latitude: business.locationLat,
                        longitude: business.locationLng,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      pointerEvents="none"
                    >
                      <Marker
                        coordinate={{ latitude: business.locationLat, longitude: business.locationLng }}
                        tracksViewChanges={false}
                      >
                        <View style={styles.markerContainer}>
                          <Ionicons name="location" size={20} color="#4A5E6A" />
                        </View>
                      </Marker>
                    </MapView>
                  </View>
                </View>
              ) : null}
              {business.phone ? (
                <View style={styles.bizInfoBlock}>
                  <Text style={[styles.bizLabel, typography.bodySemiBold, { color: colors.mutedForeground }]}>{t('ownerProfile.phone')}</Text>
                  <Text style={[styles.bizValue, typography.body, { color: colors.foreground }]}>{business.phone}</Text>
                </View>
              ) : null}
              {business.status ? (
                <View style={styles.bizInfoBlock}>
                  <Text style={[styles.bizLabel, typography.bodySemiBold, { color: colors.mutedForeground }]}>{t('ownerProfile.status')}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        alignSelf: 'flex-start',
                        backgroundColor:
                          business.status === 'APPROVED' || business.status === 'ACTIVE'
                            ? colors.success
                            : business.status === 'PENDING'
                              ? colors.warning
                              : colors.destructive,
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, typography.bodySemiBold]}>
                      {business.status === 'ACTIVE' || business.status === 'APPROVED' ? t('status.active') :
                       business.status === 'PENDING' ? t('status.pending') :
                       business.status === 'REJECTED' ? t('status.rejected') :
                       business.status}
                    </Text>
                  </View>
                </View>
              ) : null}
              {business.averageRating !== undefined && business.averageRating !== null ? (
                <View style={[styles.bizInfoBlock, { marginBottom: 0 }]}>
                  <Text style={[styles.bizLabel, typography.bodySemiBold, { color: colors.mutedForeground }]}>{t('ownerProfile.rating')}</Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color={colors.warning} />
                    <Text style={[styles.bizValue, typography.body, { color: colors.foreground, marginLeft: spacing.xs }]}>
                      {Number(business.averageRating || 0).toFixed(1)} {t('ownerProfile.reviewCount', { count: business.reviewCount || 0 })}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </Card>
      )}

      {/* Employee Settings Card */}
      {business && (
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, typography.headingSemiBold, { color: colors.foreground }]}>
            {t('ownerProfile.employeeSettings')}
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
              {t('ownerProfile.joinCode')}
            </Text>
            <View style={styles.joinCodeRow}>
              <Text style={[typography.bodySemiBold, { color: colors.foreground, letterSpacing: 2 }]}>
                {business.joinCode ?? '------'}
              </Text>
              <Button
                title={t('common.copy')}
                variant="outline"
                size="sm"
                onPress={handleCopyJoinCode}
                style={styles.copyButton}
              />
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>{t('ownerProfile.joinCodeEnabled')}</Text>
              <Text style={[styles.settingDescription, typography.body, { color: colors.mutedForeground }]}>
                {t('ownerProfile.joinCodeEnabledDesc')}
              </Text>
            </View>
            <Switch
              value={joinCodeEnabled}
              onValueChange={setJoinCodeEnabled}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>
                {t('ownerProfile.releaseEarly')}
              </Text>
              <Text style={[styles.settingDescription, typography.body, { color: colors.mutedForeground }]}>
                {t('ownerProfile.releaseEarlyDesc')}
              </Text>
            </View>
            <Switch
              value={releaseOnEarlyCompletion}
              onValueChange={setReleaseOnEarlyCompletion}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>

          <View style={styles.cancelWindowSection}>
            <Text style={[typography.bodySemiBold, { color: colors.mutedForeground, fontSize: typography.sizes.sm, marginBottom: spacing.sm }]}>
              {t('ownerProfile.cancellationWindow')}
            </Text>
            <View style={styles.pillRow}>
              {CANCEL_WINDOW_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.windowPill,
                    {
                      backgroundColor: cancellationWindowMinutes === opt.value ? colors.primary : colors.muted,
                    },
                  ]}
                  onPress={() => setCancellationWindowMinutes(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      typography.bodySemiBold,
                      {
                        fontSize: typography.sizes.xs,
                        color: cancellationWindowMinutes === opt.value ? colors.primaryForeground : colors.mutedForeground,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button
            title={t('ownerProfile.saveSettings')}
            onPress={onSaveSettings}
            loading={savingSettings}
            fullWidth
            style={styles.saveSettingsButton}
          />
        </Card>
      )}

      {/* Review Moderation Card */}
      {/* Preferences Card */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, typography.headingSemiBold, { color: colors.foreground }]}>
          {t('ownerProfile.preferences')}
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>{t('ownerProfile.darkMode')}</Text>
            <Text style={[styles.settingDescription, typography.body, { color: colors.mutedForeground }]}>
              {t('ownerProfile.darkModeDesc')}
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
            <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>{t('ownerProfile.notifications')}</Text>
            <Text style={[styles.settingDescription, typography.body, { color: colors.mutedForeground }]}>
              {t('ownerProfile.notificationsDesc')}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotifications}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.card}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>{t('ownerProfile.language')}</Text>
          </View>
          <View style={styles.langRow}>
            {(['en', 'tr'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor: currentLang === lang ? colors.primary : colors.muted,
                    borderColor: currentLang === lang ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setAppLanguage(lang);
                  setCurrentLang(lang);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.bodySemiBold,
                    { fontSize: 13, color: currentLang === lang ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {lang === 'en' ? t('profile.english') : t('profile.turkish')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      <View style={styles.logoutSection}>
        <Button
          title={isLoggingOut ? t('ownerProfile.loggingOut') : t('profile.logout')}
          variant="destructive"
          onPress={handleLogout}
          fullWidth
          disabled={isLoggingOut}
        />
      </View>

      {/* Full-screen photo viewer modal */}
      <Modal
        visible={viewingMedia !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingMedia(null)}
      >
        <View style={styles.photoModal}>
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setViewingMedia(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color={colors.card} />
          </TouchableOpacity>

          {viewingMedia && (
            <ImageWithFallback
              uri={viewingMedia.url}
              style={styles.photoModalImage}
              resizeMode="contain"
              iconSize={48}
            />
          )}

          {viewingMedia && (
            <TouchableOpacity
              style={styles.photoModalDelete}
              onPress={() => handleDeletePhoto(viewingMedia)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.card} />
              <Text style={styles.photoModalDeleteText}>{t('common.delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
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
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tappableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  value: {
    fontSize: typography.sizes.sm,
    textAlign: 'right',
  },
  businessInfo: {
    marginTop: spacing.sm,
  },
  bizInfoBlock: {
    marginBottom: spacing.md,
  },
  bizLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  bizValue: {
    fontSize: typography.sizes.md,
  },
  form: {
    gap: spacing.md,
  },
  coordinatesHelp: {
    fontSize: typography.sizes.xs,
    marginTop: -spacing.sm,
  },
  mapPreview: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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
    color: '#fff',
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
  joinCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copyButton: {
    paddingHorizontal: spacing.sm,
  },
  saveSettingsButton: {
    marginTop: spacing.md,
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  langBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  // Photo gallery
  photoRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10,
  },
  photoAddBtn: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Full-screen modal
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
  },
  photoModalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  photoModalDelete: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  photoModalDeleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  reviewItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewItemLeft: {
    flex: 1,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: spacing.xs,
  },
  reviewStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reviewApproveBtn: {
    flex: 1,
  },
  reviewRejectBtn: {
    flex: 1,
  },
  cancelWindowSection: {
    paddingTop: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  windowPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
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
