import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ownerService } from '../../services/ownerService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { Card, LoadingSpinner, EmptyState, Toast } from '../../components';
import { spacing, typography } from '../../theme/theme';

// Extended appointment type with related data from backend
type AppointmentWithDetails = {
  id: string;
  businessId: string;
  customerId?: string;
  employeeId?: string;
  serviceId?: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  // Included relations from backend
  customer?: {
    id: string;
    fullName: string;
    email: string;
  };
  employee?: {
    id: string;
    fullName: string;
    businessId: string;
  };
  service?: {
    id: string;
    name: string;
    description?: string;
    durationMin: number;
    price: number;
    businessId: string;
  };
};

type Business = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  category?: string;
  averageRating?: number;
  reviewCount?: number;
  ownerId: string;
};

export const DashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [allAppointments, setAllAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [user])
  );

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get owner's business using the owner endpoint
      const ownerBusiness = await ownerService.getBusiness();
      setBusiness(ownerBusiness as Business);
      
      // Get ALL appointments for the business (backend returns with includes)
      const appointments = await ownerService.getOwnerAppointments();
      
      // Ensure we have an array
      const appointmentsArray = Array.isArray(appointments) ? appointments : [];
      
      // Sort by startTime descending (newest first) for "Your Appointments"
      // But we'll keep the original for calculations
      setAllAppointments(appointmentsArray as AppointmentWithDetails[]);
      
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      setToast({ message: error.message || 'Failed to load dashboard data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Get today's date range
  const getTodayRange = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { todayStart, todayEnd };
  };

  // Check if appointment is today
  const isToday = (startTime: string) => {
    const { todayStart, todayEnd } = getTodayRange();
    const aptDate = new Date(startTime);
    return aptDate >= todayStart && aptDate <= todayEnd;
  };

  // Today's appointments (exclude CANCELLED)
  const todayAppointments = useMemo(() => {
    return allAppointments.filter(
      (apt) => isToday(apt.startTime) && apt.status !== 'CANCELLED'
    );
  }, [allAppointments]);

  // Pending requests (all dates)
  const pendingCount = useMemo(() => {
    return allAppointments.filter((apt) => apt.status === 'PENDING').length;
  }, [allAppointments]);

  // Approved today
  const approvedTodayCount = useMemo(() => {
    return allAppointments.filter(
      (apt) => apt.status === 'APPROVED' && isToday(apt.startTime)
    ).length;
  }, [allAppointments]);

  // All appointments sorted by startTime descending (newest first)
  const sortedAllAppointments = useMemo(() => {
    return [...allAppointments].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [allAppointments]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return colors.success;
      case 'PENDING':
        return colors.warning;
      case 'COMPLETED':
        return '#4CAF50';
      case 'CANCELLED':
      case 'REJECTED':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  // Render today's appointment card
  const renderTodayAppointment = ({ item }: { item: AppointmentWithDetails }) => (
    <Card style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Text
          style={[
            styles.appointmentTime,
            typography.headingSemiBold,
            { color: colors.foreground },
          ]}
        >
          {formatTime(item.startTime)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={[styles.statusText, typography.bodySemiBold]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.appointmentService,
          typography.body,
          { color: colors.mutedForeground },
        ]}
      >
        Service: {item.service?.name || 'Unknown'}
      </Text>

      <Text
        style={[
          styles.appointmentEmployee,
          typography.body,
          { color: colors.mutedForeground },
        ]}
      >
        Staff: {item.employee?.fullName || 'Unknown'}
      </Text>

      <Text
        style={[
          styles.appointmentCustomer,
          typography.body,
          { color: colors.mutedForeground },
        ]}
      >
        Customer: {item.customer?.fullName || 'Unknown'}
      </Text>
    </Card>
  );

  // Render all appointments card (with full details)
  const renderAllAppointment = ({ item }: { item: AppointmentWithDetails }) => (
    <Card style={styles.allAppointmentCard}>
      <View style={styles.appointmentHeader}>
        <View>
          <Text
            style={[
              styles.appointmentDate,
              typography.headingSemiBold,
              { color: colors.foreground },
            ]}
          >
            {formatDate(item.startTime)}
          </Text>
          <Text
            style={[
              styles.appointmentTimeSmall,
              typography.body,
              { color: colors.primary },
            ]}
          >
            {formatTime(item.startTime)} - {formatTime(item.endTime)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={[styles.statusText, typography.bodySemiBold]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <Text
          style={[
            styles.detailLabel,
            typography.bodySemiBold,
            { color: colors.foreground },
          ]}
        >
          {item.service?.name || 'Unknown Service'}
        </Text>
        
        <Text
          style={[
            styles.detailText,
            typography.body,
            { color: colors.mutedForeground },
          ]}
        >
          Staff: {item.employee?.fullName || 'Unknown'}
        </Text>

        <Text
          style={[
            styles.detailText,
            typography.body,
            { color: colors.mutedForeground },
          ]}
        >
          Customer: {item.customer?.fullName || 'Unknown'}
        </Text>

        <Text
          style={[
            styles.detailTextSmall,
            typography.body,
            { color: colors.mutedForeground },
          ]}
        >
          {item.customer?.email || ''}
        </Text>

        {item.service?.price && (
          <Text
            style={[
              styles.priceText,
              typography.bodySemiBold,
              { color: colors.success },
            ]}
          >
            ₺{Number(item.service.price).toFixed(2)}
          </Text>
        )}
      </View>
    </Card>
  );

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
          title="No Business Found"
          description="You don't have any registered businesses yet"
        />
      </View>
    );
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
      
      <Text
        style={[
          styles.greeting,
          typography.heading,
          { color: colors.foreground },
        ]}
      >
        Welcome back!
      </Text>

      <Text
        style={[
          styles.businessName,
          typography.body,
          { color: colors.mutedForeground },
        ]}
      >
        {business.name}
      </Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text
            style={[
              styles.statNumber,
              typography.heading,
              { color: colors.primary },
            ]}
          >
            {todayAppointments.length}
          </Text>
          <Text
            style={[
              styles.statLabel,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            Today's Appointments
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text
            style={[
              styles.statNumber,
              typography.heading,
              { color: colors.warning },
            ]}
          >
            {pendingCount}
          </Text>
          <Text
            style={[
              styles.statLabel,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            Pending Requests
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text
            style={[
              styles.statNumber,
              typography.heading,
              { color: colors.success },
            ]}
          >
            {approvedTodayCount}
          </Text>
          <Text
            style={[
              styles.statLabel,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            Approved Today
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text
            style={[
              styles.statNumber,
              typography.heading,
              { color: colors.secondary },
            ]}
          >
            {Number(business.averageRating ?? 0).toFixed(1)}
          </Text>
          <Text
            style={[
              styles.statLabel,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            Average Rating
          </Text>
        </Card>
      </View>

      {/* Today's Schedule Section */}
      <Text
        style={[
          styles.sectionTitle,
          typography.headingSemiBold,
          { color: colors.foreground },
        ]}
      >
        Today's Schedule
      </Text>

      {todayAppointments.length === 0 ? (
        <EmptyState
          title="No appointments today"
          description="Your schedule is clear for today"
        />
      ) : (
        <FlatList
          data={todayAppointments}
          renderItem={renderTodayAppointment}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}

      {/* Your Appointments Section - ALL Appointments */}
      <Text
        style={[
          styles.sectionTitle,
          typography.headingSemiBold,
          { color: colors.foreground },
          { marginTop: spacing.xl },
        ]}
      >
        Your Appointments ({allAppointments.length})
      </Text>

      {sortedAllAppointments.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="You don't have any appointments"
        />
      ) : (
        <FlatList
          data={sortedAllAppointments}
          renderItem={renderAllAppointment}
          keyExtractor={(item) => `all-${item.id}`}
          scrollEnabled={false}
        />
      )}
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
  greeting: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.xl,
  },
  statsGrid: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '88%',
    maxWidth: 420,
    margin: spacing.sm,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.lg,
  },
  appointmentCard: {
    marginBottom: spacing.md,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  appointmentTime: {
    fontSize: typography.sizes.lg,
  },
  appointmentDate: {
    fontSize: typography.sizes.md,
  },
  appointmentTimeSmall: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
  },
  appointmentService: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  appointmentEmployee: {
    fontSize: typography.sizes.sm,
  },
  appointmentCustomer: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  allAppointmentCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  appointmentDetails: {
    marginTop: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    marginBottom: 2,
  },
  detailTextSmall: {
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  priceText: {
    fontSize: typography.sizes.md,
    marginTop: spacing.sm,
  },
});
