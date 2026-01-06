import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
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
import { spacing, typography, borderRadius } from '../../theme/theme';

type RouteParams = RouteProp<RootStackParamList, 'BusinessDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const BusinessDetailScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Booking state
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadBusinessData();
  }, [route.params.businessId]);

  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      loadTimeSlots();
    }
  }, [selectedEmployee, selectedDate]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      const [businessData, employeesData, servicesData, reviewsData] = await Promise.all([
        businessService.getBusiness(route.params.businessId),
        businessService.getEmployees(route.params.businessId),
        businessService.getServices(route.params.businessId),
        reviewService.getReviews(route.params.businessId),
      ]);
      
      setBusiness(businessData || null);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (error: any) {
      console.error('Failed to load business:', error);
      setToast({ message: error.message || 'Failed to load business details', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    if (!selectedEmployee || !selectedDate) return;
    
    try {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const slots = await businessService.getAvailableTimeSlots(
        route.params.businessId,
        selectedEmployee,
        dateStr
      );
      setTimeSlots(Array.isArray(slots) ? slots : []);
    } catch (error: any) {
      console.error('Failed to load time slots:', error);
      setToast({ message: error.message || 'Failed to load available time slots', type: 'error' });
    } finally {
      setLoadingSlots(false);
    }
  };

  const formatDate = (date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const handleBookAppointment = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to book an appointment', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }

    if (!selectedEmployee || !selectedService || !selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please complete all booking steps');
      return;
    }

    try {
      setBookingLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      await appointmentService.createAppointment(user.id, {
        businessId: route.params.businessId,
        employeeId: selectedEmployee,
        serviceId: selectedService,
        date: dateStr,
        timeSlot: selectedTime,
      });
      
      setToast({ message: 'Appointment requested successfully!', type: 'success' });
      
      // Reset booking state
      setBookingStep(0);
      setSelectedEmployee(null);
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime('');
      
      // Navigate to Appointments screen after short delay
      setTimeout(() => {
        navigation.navigate('UserTabs');
      }, 1500);
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to book appointment', type: 'error' });
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
          title="Business not found"
          description="This business may no longer be available"
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
        <View
          style={[
            styles.imageGallery,
            { backgroundColor: colors.muted, borderRadius: borderRadius.xl },
          ]}
        >
          <Ionicons name="business" size={48} color={colors.mutedForeground} />
        </View>

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

          <TouchableOpacity
            style={styles.ratingRow}
            onPress={() => {
              console.log('Opening reviews for business:', business.id);
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
              {Number(business.averageRating || 0).toFixed(1)} ({business.reviewCount || 0} reviews)
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

          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="location" size={16} color={colors.mutedForeground} />
              <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>
                {business.address}
              </Text>
            </View>
          </View>

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
              Book an Appointment
            </Text>

            {/* Step 1: Select Employee */}
            <Text
              style={[
                styles.stepTitle,
                typography.bodySemiBold,
                { color: colors.foreground },
              ]}
            >
              1. Choose a Staff Member
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
                  2. Choose a Service
                </Text>
                <View style={styles.servicesList}>
                  {(Array.isArray(services) ? services : []).map((svc) => (
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
                          ${Number(svc.price || 0).toFixed(2)} • {svc.durationMin || 0} min
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
                  3. Pick a Date
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
                    {selectedDate ? formatDate(selectedDate) : 'Select a date'}
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
                  4. Choose a Time
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
                title="Confirm Booking"
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
                console.log('Opening reviews for business:', business.id);
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
                Reviews ({reviews.length})
              </Text>
              <Text style={[typography.bodySemiBold, { color: colors.primary }]}>
                See all
              </Text>
            </TouchableOpacity>

            {reviews.length === 0 ? (
              <EmptyState
                icon="star"
                title="No reviews yet"
                description="Be the first to review this business"
              />
            ) : (
              (Array.isArray(reviews) ? reviews : []).slice(0, 2).map((review) => (
                <Card key={review.id} style={styles.reviewCard}>
                  <RatingStars rating={review.rating} size={16} />
                  <Text
                    style={[
                      styles.reviewComment,
                      typography.body,
                      { color: colors.foreground },
                    ]}
                  >
                    {review.comment}
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
                Select Date
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
                title="Done"
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
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    margin: spacing.xl,
    marginBottom: spacing.md,
  },
  galleryPlaceholder: {
    fontSize: 64,
  },
  content: {
    padding: spacing.xl,
  },
  businessName: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.sm,
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
