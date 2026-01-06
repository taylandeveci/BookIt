import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { appointmentService } from '../../services/appointmentService';
import { businessService } from '../../services/businessService';
import { useAuthStore } from '../../store/authStore';
import { Appointment, Business, Service, Employee } from '../../types';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  Chip,
  Button,
  LoadingSpinner,
  EmptyState,
  Toast,
} from '../../components';
import { spacing, typography } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type AppointmentWithDetails = Appointment & {
  business?: Business;
  service?: Service;
  employee?: Employee;
};

export const AppointmentsScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);
  
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadAppointments();
    }, [user])
  );

  const loadAppointments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await appointmentService.getAppointments(user.id);
      
      // Ensure data is an array
      const appointmentsArray = Array.isArray(data) ? data : [];
      
      // Fetch related data
      const appointmentsWithDetails = await Promise.all(
        appointmentsArray.map(async (apt) => {
          try {
            const [business, service, employee] = await Promise.all([
              businessService.getBusiness(apt.businessId),
              businessService.getServices(apt.businessId).then((svcs) =>
                (Array.isArray(svcs) ? svcs : []).find((s) => s.id === apt.serviceId)
              ),
              businessService.getEmployees(apt.businessId).then((emps) =>
                (Array.isArray(emps) ? emps : []).find((e) => e.id === apt.employeeId)
              ),
            ]);
            
            return {
              ...apt,
              business,
              service,
              employee,
            };
          } catch (err) {
            console.error('Error fetching appointment details:', err);
            return apt;
          }
        })
      );
      
      setAppointments(appointmentsWithDetails);
    } catch (error: any) {
      console.error('Failed to load appointments:', error);
      setToast({ message: error.message || 'Failed to load appointments', type: 'error' });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentService.cancelAppointment(appointmentId);
              setToast({ message: 'Appointment cancelled', type: 'success' });
              loadAppointments();
            } catch (error: any) {
              setToast({ message: error.message || 'Failed to cancel appointment', type: 'error' });
            }
          },
        },
      ]
    );
  };

  const handleWriteReview = (appointmentId: string, businessId: string) => {
    navigation.navigate('Review', { appointmentId, businessId });
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'APPROVED':
        return colors.success;
      case 'PENDING':
        return colors.warning;
      case 'REJECTED':
      case 'CANCELLED':
        return colors.destructive;
      case 'COMPLETED':
        return colors.info;
      default:
        return colors.mutedForeground;
    }
  };

  const filterAppointments = (): AppointmentWithDetails[] => {
    if (tab === 'active') {
      return appointments.filter(
        (apt) =>
          apt.status === 'PENDING' ||
          apt.status === 'APPROVED' ||
          apt.status === 'CANCELLED'
      );
    } else {
      return appointments.filter((apt) => apt.status === 'COMPLETED');
    }
  };

  const renderAppointment = ({ item }: { item: AppointmentWithDetails }) => (
    <Card style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Text
          style={[
            styles.businessName,
            typography.headingSemiBold,
            { color: colors.foreground },
          ]}
        >
          {item.business?.name || 'Unknown Business'}
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
          styles.serviceText,
          typography.body,
          { color: colors.mutedForeground },
        ]}
      >
        Service: {item.service?.name || 'Unknown'}
      </Text>

      <Text
        style={[
          styles.employeeText,
          typography.body,
          { color: colors.mutedForeground },
        ]}
      >
        Staff: {item.employee?.fullName || 'Unknown'}
      </Text>

      <Text
        style={[
          styles.dateText,
          typography.bodySemiBold,
          { color: colors.foreground },
        ]}
      >
        {new Date(item.date || item.startTime || '').toLocaleDateString()} at {item.timeSlot || (item.startTime ? new Date(item.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'TBD')}
      </Text>

      {item.rejectionReason && (
        <Text
          style={[
            styles.rejectionReason,
            typography.body,
            { color: colors.destructive },
          ]}
        >
          Reason: {item.rejectionReason}
        </Text>
      )}

      <View style={styles.appointmentActions}>
        {item.status === 'PENDING' && (
          <Button
            title="Cancel"
            variant="destructive"
            size="sm"
            onPress={() => handleCancelAppointment(item.id)}
          />
        )}

        {item.status === 'COMPLETED' && (
          <Button
            title="Write Review"
            variant="secondary"
            size="sm"
            onPress={() => handleWriteReview(item.id, item.businessId)}
          />
        )}
      </View>
    </Card>
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          title="Login Required"
          description="Please login to view your appointments"
        />
        <View style={styles.loginButton}>
          <Button
            title="Go to Login"
            onPress={() => navigation.navigate('Auth')}
          />
        </View>
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
      
      <View style={styles.tabSelector}>
        <Chip
          label="Active"
          selected={tab === 'active'}
          onPress={() => setTab('active')}
          variant="primary"
        />
        <Chip
          label="Past"
          selected={tab === 'past'}
          onPress={() => setTab('past')}
          variant="primary"
        />
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : filterAppointments().length === 0 ? (
        <EmptyState
          title="No appointments"
          description={
            tab === 'active'
              ? 'Book your first appointment from the home screen'
              : 'You have no past appointments'
          }
        />
      ) : (
        <FlatList
          data={filterAppointments()}
          renderItem={renderAppointment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabSelector: {
    flexDirection: 'row',
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  appointmentCard: {
    marginBottom: spacing.lg,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  businessName: {
    fontSize: typography.sizes.md,
    flex: 1,
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
  serviceText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  employeeText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.sm,
  },
  rejectionReason: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  appointmentActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  loginButton: {
    padding: spacing.xl,
  },
});
