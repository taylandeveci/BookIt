import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  Pressable,
  Linking,
  Platform,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { businessService } from '../../services/businessService';
import { appointmentService } from '../../services/appointmentService';
import { reviewService } from '../../services/reviewService';
import { useAuthStore } from '../../store/authStore';
import {
  Business,
  Employee,
  Service,
  Review,
  TimeSlot,
} from '../../types';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  RatingStars,
  Button,
  Chip,
  LoadingSpinner,
  EmptyState,
  Toast,
} from '../../components';
import { useTranslation } from 'react-i18next';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { formatCurrency } from '../../lib/formatCurrency';
import { useBusinessLocation } from '../../hooks/useBusinessLocation';
import { useNotificationStore } from '../../store/notificationStore';

type RouteParams = RouteProp<RootStackParamList, 'BusinessDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;

const GalleryImage: React.FC<{ uri: string; width: number; height: number }> = ({ uri, width, height }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <View style={[{ width, height }, styles.galleryPlaceholder, { backgroundColor: colors.muted }]}>
        <Ionicons name="image-outline" size={40} color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <Image
        source={{ uri }}
        style={{ width, height }}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setHasError(true);
          setLoading(false);
        }}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.galleryLoading]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </View>
  );
};

export const BusinessDetailScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const { t, i18n } = useTranslation();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const businessId = route.params.businessId;

  // Booking state
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [photoIndex, setPhotoIndex] = useState(0);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setPhotoIndex(viewableItems[0].index ?? 0);
  }, []);

  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: queryKeys.businesses.detail(businessId),
    queryFn: () => businessService.getBusiness(businessId),
    staleTime: 60000,
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: queryKeys.businesses.employees(businessId),
    queryFn: async () => {
      const data = await businessService.getEmployees(businessId);
      return Array.isArray(data) ? data as Employee[] : [];
    },
    staleTime: 60000,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: queryKeys.businesses.services(businessId),
    queryFn: async () => {
      const data = await businessService.getServices(businessId);
      return Array.isArray(data) ? data as Service[] : [];
    },
    staleTime: 60000,
  });

  // Effective (employee-override-aware) prices/durations for the selected employee
  const { data: employeeServices = [] } = useQuery({
    queryKey: [...queryKeys.businesses.services(businessId), selectedEmployee],
    queryFn: async () => {
      const data = await businessService.getServices(businessId, selectedEmployee!);
      return Array.isArray(data) ? data as Service[] : [];
    },
    enabled: !!selectedEmployee,
    staleTime: 30000,
  });

  const displayedServices = employeeServices.length > 0 ? employeeServices : services;

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: queryKeys.reviews.forBusiness(businessId),
    queryFn: async () => {
      const data = await reviewService.getReviews(businessId);
      return Array.isArray(data) ? data as Review[] : [];
    },
    staleTime: 30000,
  });

  const loading = businessLoading || employeesLoading || servicesLoading || reviewsLoading;

  const bizLocation = useBusinessLocation(business ?? undefined);

  const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const { data: timeSlots = [], isFetching: loadingSlots } = useQuery({
    queryKey: queryKeys.businesses.timeSlots(businessId, dateStr, selectedEmployee ?? '', selectedService ?? ''),
    queryFn: async () => {
      if (!selectedEmployee || !selectedService || !selectedDate) return [];
      try {
        const slots = await businessService.getAvailableTimeSlots(
          businessId,
          selectedEmployee,
          dateStr,
          selectedService
        );
        return Array.isArray(slots) ? slots : [];
      } catch (error: any) {
        const defaultSlots: TimeSlot[] = [];
        for (let hour = 9; hour <= 17; hour++) {
          defaultSlots.push({ time: `${hour}:00`, available: true });
          defaultSlots.push({ time: `${hour}:30`, available: true });
        }
        return defaultSlots;
      }
    },
    enabled: !!selectedEmployee && !!selectedService && !!selectedDate,
  });

  const formatDate = (date: Date): string => {
    const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
    const day = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
    const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
    return `${day}, ${month} ${date.getDate()}`;
  };

  const handleBookAppointment = async () => {
    if (!user) {
      Alert.alert(t('businessDetail.loginRequired'), t('businessDetail.loginRequiredDesc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }

    if (!selectedEmployee || !selectedService || !selectedDate || !selectedTime) {
      Alert.alert(t('common.error'), t('businessDetail.bookingStepsIncomplete'));
      return;
    }

    try {
      setBookingLoading(true);
      const bookingDateStr = selectedDate.toISOString().split('T')[0];
      await appointmentService.createAppointment(user.id, {
        businessId,
        employeeId: selectedEmployee,
        serviceId: selectedService,
        date: bookingDateStr,
        timeSlot: selectedTime,
      });

      setToast({ message: t('businessDetail.bookingSuccess'), type: 'success' });

      // Notify the employee about the new booking request
      const emp = (employees as Employee[]).find((e) => e.id === selectedEmployee);
      if (emp?.userId) {
        const dateStr = selectedDate
          ? selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' · ' + selectedTime
          : '';
        const svc = (services as Service[]).find((s) => s.id === selectedService);
        addNotification({
          type: 'booking_pending',
          title: t('notifications.newBookingRequest'),
          body: `${user.name} — ${svc?.name ?? ''} — ${dateStr}`,
          userId: emp.userId,
        });
      }
      // Notify the owner about the new booking request
      if (business?.ownerId) {
        const dateStr = selectedDate
          ? selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' · ' + selectedTime
          : '';
        const svc = (services as Service[]).find((s) => s.id === selectedService);
        addNotification({
          type: 'booking_pending',
          title: t('notifications.newBookingRequest'),
          body: `${user.name} — ${svc?.name ?? ''} — ${dateStr}`,
          userId: business.ownerId,
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerPending });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeByDate(bookingDateStr) });
      queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'timeSlots'] });

      // Reset booking state
      setBookingStep(0);
      setSelectedEmployee(null);
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime('');

      setTimeout(() => {
        navigation.navigate('UserTabs');
      }, 1500);
    } catch (error: any) {
      setToast({ message: error.message || t('businessDetail.bookingError'), type: 'error' });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          title={t('businessDetail.notFound')}
          description={t('businessDetail.notFoundDesc')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo gallery — base64 storage; migrate to Supabase Storage URLs in a future pass */}
        {business.media && business.media.length > 0 ? (
          <View>
            <FlatList
              data={business.media}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig.current}
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={6}
              renderItem={({ item }) => (
                <GalleryImage uri={item.url} width={SCREEN_WIDTH} height={220} />
              )}
            />
            {business.media.length > 1 && (
              <View style={styles.dotRow}>
                {business.media.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, { backgroundColor: i === photoIndex ? colors.primary : colors.muted }]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imageGallery, { backgroundColor: colors.muted, borderRadius: borderRadius.xl }]}>
            <Ionicons name="image-outline" size={40} color={colors.mutedForeground} />
            <Text style={[typography.body, { fontSize: typography.sizes.sm, color: colors.mutedForeground, marginTop: spacing.sm }]}>
              Fotoğraf yok
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <Text
            style={[
              styles.businessName,
              typography.heading,
              { color: colors.foreground },
            ]}
          >
            {business.name}
          </Text>

          {business.tags && business.tags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsRow}
            >
              {business.tags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tagChip, { backgroundColor: colors.muted, borderRadius: borderRadius.pill }]}
                >
                  <Text style={[typography.body, { fontSize: typography.sizes.xs, color: colors.mutedForeground }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.ratingRow}
            onPress={() => {
              navigation.navigate('BusinessReviews', {
                businessId: business.id,
                businessName: business.name,
                ratingAvg: Number(business.averageRating) || 0,
                ratingCount: business.reviewCount || 0,
              });
            }}
          >
            <RatingStars rating={Number(business.averageRating) || 0} size={20} />
            <Text
              style={[
                styles.ratingText,
                typography.body,
                { color: colors.mutedForeground },
              ]}
            >
              {Number(business.averageRating || 0).toFixed(1)} {t('businessDetail.reviewCount', { count: business.reviewCount || 0 })}
            </Text>
          </TouchableOpacity>

          <Text
            style={[
              styles.description,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            {business.description}
          </Text>

          <Pressable style={styles.infoRow} onPress={bizLocation.openMapModal}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="location" size={16} color={colors.mutedForeground} />
              <Text style={[typography.bodySemiBold, { color: colors.foreground, flex: 1 }]}>
                {business.address}
              </Text>
              <Ionicons name="map-outline" size={14} color={colors.primary} />
            </View>
            {bizLocation.distance !== null && (
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs, marginLeft: 20, marginTop: spacing.xs }]}>
                {bizLocation.distance}
              </Text>
            )}
          </Pressable>

          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="call" size={16} color={colors.mutedForeground} />
              <Text style={[typography.body, { color: colors.mutedForeground }]}>
                {business.phone}
              </Text>
            </View>
          </View>

          {/* Booking Section */}
          <Card style={styles.bookingCard}>
            <Text
              style={[
                styles.sectionTitle,
                typography.headingSemiBold,
                { color: colors.foreground },
              ]}
            >
              {t('businessDetail.bookAppointment')}
            </Text>

            {/* Step 1: Select Employee */}
            <Text
              style={[
                styles.stepTitle,
                typography.bodySemiBold,
                { color: colors.foreground },
              ]}
            >
              {t('businessDetail.step1Staff')}
            </Text>
            <View style={styles.optionsGrid}>
              {(Array.isArray(employees) ? employees : []).map((emp) => (
                <Chip
                  key={emp.id}
                  label={emp.fullName}
                  selected={selectedEmployee === emp.id}
                  onPress={() => {
                    setSelectedEmployee(emp.id);
                    setBookingStep(Math.max(bookingStep, 1));
                  }}
                />
              ))}
            </View>

            {/* Step 2: Select Service */}
            {selectedEmployee && (
              <>
                <Text
                  style={[
                    styles.stepTitle,
                    typography.bodySemiBold,
                    { color: colors.foreground },
                  ]}
                >
                  {t('businessDetail.step2Service')}
                </Text>
                <View style={styles.servicesList}>
                  {(Array.isArray(displayedServices) ? displayedServices : []).map((svc) => (
                    <TouchableOpacity
                      key={svc.id}
                      onPress={() => {
                        setSelectedService(svc.id);
                        setBookingStep(Math.max(bookingStep, 2));
                      }}
                    >
                      <Card
                        style={[
                          styles.serviceCard,
                          selectedService === svc.id && {
                            borderColor: colors.primary,
                            borderWidth: 2,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.bodySemiBold,
                            { color: colors.foreground },
                          ]}
                        >
                          {svc.name}
                        </Text>
                        <Text
                          style={[
                            styles.servicePrice,
                            typography.body,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {formatCurrency(Number(svc.price || 0))} • {svc.durationMin || 0} {t('common.min')}
                        </Text>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Step 3: Select Date */}
            {selectedService && (
              <>
                <Text
                  style={[
                    styles.stepTitle,
                    typography.bodySemiBold,
                    { color: colors.foreground },
                  ]}
                >
                  {t('businessDetail.step3Date')}
                </Text>
                
                <Pressable
                  onPress={() => setIsCalendarOpen(true)}
                  style={[
                    styles.datePickerButton,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.inputBorder,
                      borderWidth: 1,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.body,
                      {
                        color: selectedDate ? colors.foreground : colors.placeholder,
                        flex: 1,
                      },
                    ]}
                  >
                    {selectedDate ? formatDate(selectedDate) : t('businessDetail.selectDate')}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </>
            )}

            {/* Step 4: Select Time */}
            {selectedDate && (
              <>
                <Text
                  style={[
                    styles.stepTitle,
                    typography.bodySemiBold,
                    { color: colors.foreground },
                  ]}
                >
                  {t('businessDetail.step4Time')}
                </Text>
                {loadingSlots ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <View style={styles.timeSlotsGrid}>
                    {(Array.isArray(timeSlots) ? timeSlots : []).map((slot) => (
                      <Chip
                        key={slot.time}
                        label={slot.time}
                        selected={selectedTime === slot.time}
                        onPress={() => {
                          if (slot.available) {
                            setSelectedTime(slot.time);
                          }
                        }}
                        disabled={!slot.available}
                        style={!slot.available && { opacity: 0.3 }}
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            {selectedTime && (
              <Button
                title={t('businessDetail.confirmBooking')}
                onPress={handleBookAppointment}
                loading={bookingLoading}
                fullWidth
                style={{ marginTop: spacing.lg }}
              />
            )}
          </Card>

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <TouchableOpacity
              style={styles.reviewsHeader}
              onPress={() => {
                  navigation.navigate('BusinessReviews', {
                  businessId: business.id,
                  businessName: business.name,
                  ratingAvg: Number(business.averageRating) || 0,
                  ratingCount: business.reviewCount || 0,
                });
              }}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  typography.headingSemiBold,
                  { color: colors.foreground },
                ]}
              >
                {t('businessDetail.reviewsSection', { count: reviews.length })}
              </Text>
              <Text style={[typography.bodySemiBold, { color: colors.primary }]}>
                {t('common.seeAll')}
              </Text>
            </TouchableOpacity>

            {reviews.length === 0 ? (
              <EmptyState
                icon="star"
                title={t('reviews.noReviews')}
                description={t('reviews.beFirst')}
              />
            ) : (
              (Array.isArray(reviews) ? reviews : []).slice(0, 2).map((review) => (
                <Card key={review.id} style={styles.reviewCard}>
                  <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm, marginBottom: spacing.xs }]}>
                    {review.user?.fullName || t('common.anonymous')}
                  </Text>
                  <RatingStars rating={review.rating} size={16} />
                  <Text
                    style={[
                      styles.reviewComment,
                      typography.body,
                      { color: colors.foreground },
                    ]}
                  >
                    {review.commentText || review.comment}
                  </Text>
                  <Text
                    style={[
                      styles.reviewDate,
                      typography.body,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </Card>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Location Map Modal */}
      <Modal
        visible={bizLocation.modalVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={bizLocation.closeMapModal}
      >
        <View style={styles.mapModalContainer}>
          {bizLocation.isLocating ? (
            <View style={[StyleSheet.absoluteFill, styles.mapModalLoading, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: bizLocation.coordinates?.latitude ?? 39.9208,
                longitude: bizLocation.coordinates?.longitude ?? 32.8541,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation
            >
              {bizLocation.coordinates ? (
                <Marker
                  coordinate={bizLocation.coordinates}
                  tracksViewChanges={false}
                >
                  <View style={styles.markerContainer}>
                    <Ionicons name="location" size={20} color="#4A5E6A" />
                  </View>
                </Marker>
              ) : null}
            </MapView>
          )}

          <TouchableOpacity
            style={[styles.mapCloseBtn, { backgroundColor: colors.card, top: insets.top + 12 }, shadows.sm]}
            onPress={bizLocation.closeMapModal}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>

          <View style={[styles.mapInfoBar, { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing.md }, shadows.lg]}>
            <Text style={[typography.headingSemiBold, { color: colors.foreground, fontSize: typography.sizes.md, marginBottom: spacing.xs }]}>
              {business.name}
            </Text>
            {business.address ? (
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm, marginBottom: spacing.sm }]}>
                {business.address}
              </Text>
            ) : null}
            {bizLocation.distance !== null && (
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm, marginBottom: spacing.md }]}>
                {bizLocation.distance}
              </Text>
            )}
            <Button
              title={t('businessDetail.getDirections')}
              onPress={() => {
                if (!bizLocation.coordinates) return;
                const { latitude: lat, longitude: lng } = bizLocation.coordinates;
                const url =
                  Platform.OS === 'ios'
                    ? `maps://app?daddr=${lat},${lng}`
                    : `google.navigation:q=${lat},${lng}`;
                Linking.openURL(url);
              }}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={isCalendarOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                ...shadows.md,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  typography.headingSemiBold,
                  { color: colors.foreground },
                ]}
              >
                {t('businessDetail.selectDate')}
              </Text>
              <TouchableOpacity
                onPress={() => setIsCalendarOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Calendar */}
            <Calendar
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day: { dateString: string }) => {
                const selected = new Date(day.dateString);
                setSelectedDate(selected);
                setSelectedTime('');
                setBookingStep(Math.max(bookingStep, 3));
              }}
              markedDates={
                selectedDate
                  ? {
                      [selectedDate.toISOString().split('T')[0]]: {
                        selected: true,
                        selectedColor: colors.primary,
                      },
                    }
                  : {}
              }
              theme={{
                backgroundColor: colors.card,
                calendarBackground: colors.card,
                textSectionTitleColor: colors.mutedForeground,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.primaryForeground,
                todayTextColor: colors.primary,
                dayTextColor: colors.foreground,
                textDisabledColor: colors.muted,
                monthTextColor: colors.foreground,
                textMonthFontFamily: typography.headingSemiBold.fontFamily,
                textDayFontFamily: typography.body.fontFamily,
                textDayHeaderFontFamily: typography.bodySemiBold.fontFamily,
                arrowColor: colors.primary,
              }}
            />

            {/* Done Button */}
            <View style={styles.modalFooter}>
              <Button
                title={t('common.ok')}
                onPress={() => setIsCalendarOpen(false)}
                fullWidth
                disabled={!selectedDate}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageGallery: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    margin: spacing.xl,
    marginBottom: spacing.md,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  galleryPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.xl,
  },
  businessName: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ratingText: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.md,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  infoRow: {
    marginBottom: spacing.sm,
  },
  bookingCard: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: typography.sizes.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  servicesList: {
    marginBottom: spacing.md,
  },
  serviceCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  servicePrice: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reviewsSection: {
    marginTop: spacing.xl,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reviewCard: {
    marginBottom: spacing.md,
  },
  reviewComment: {
    fontSize: typography.sizes.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  reviewDate: {
    fontSize: typography.sizes.xs,
  },
  // Location map modal
  mapModalContainer: {
    flex: 1,
  },
  mapModalLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapCloseBtn: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapInfoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  // Calendar modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalFooter: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
