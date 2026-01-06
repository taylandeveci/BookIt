import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput as RNTextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ownerService } from '../../services/ownerService';
import { businessService } from '../../services/businessService';
import { useAuthStore } from '../../store/authStore';
import { Appointment, Business } from '../../types';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  Chip,
  Button,
  LoadingSpinner,
  EmptyState,
  Toast,
} from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';

type TabType = 'pending' | 'approved' | 'rejected';

export const RequestsScreen: React.FC = () => {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  
  const [tab, setTab] = useState<TabType>('pending');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{
    visible: boolean;
    appointmentId: string | null;
  }>({ visible: false, appointmentId: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadAppointments();
    }, [user])
  );

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get owner's appointments directly from owner endpoint
      const data = await ownerService.getOwnerAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load appointments:', error);
      setToast({ message: error.message || 'Failed to load requests', type: 'error' });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appointmentId: string) => {
    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setActionLoading(appointmentId);
              await ownerService.approveAppointment(appointmentId);
              setToast({ message: 'Appointment approved', type: 'success' });
              loadAppointments();
            } catch (error: any) {
              setToast({ message: error.message || 'Failed to approve appointment', type: 'error' });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (appointmentId: string) => {
    setRejectionModal({ visible: true, appointmentId });
  };

  const confirmReject = async () => {
    if (!rejectionModal.appointmentId) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(rejectionModal.appointmentId);
      await ownerService.rejectAppointment(
        rejectionModal.appointmentId,
        rejectionReason
      );
      setToast({ message: 'Appointment rejected', type: 'success' });
      setRejectionModal({ visible: false, appointmentId: null });
      setRejectionReason('');
      loadAppointments();
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to reject appointment', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (appointmentId: string) => {
    Alert.alert(
      'Mark as Completed',
      'Mark this appointment as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setActionLoading(appointmentId);
              await ownerService.completeAppointment(appointmentId);
              setToast({ message: 'Appointment marked as completed', type: 'success' });
              loadAppointments();
            } catch (error: any) {
              setToast({ message: error.message || 'Failed to update appointment', type: 'error' });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const filterAppointments = (): Appointment[] => {
    switch (tab) {
      case 'pending':
        return appointments.filter((apt) => apt.status === 'PENDING');
      case 'approved':
        return appointments.filter((apt) => apt.status === 'APPROVED');
      case 'rejected':
        return appointments.filter(
          (apt) => apt.status === 'REJECTED' || apt.status === 'CANCELLED'
        );
      default:
        return [];
    }
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const isLoading = actionLoading === item.id;
    
    // Handle both date and startTime from backend
    const appointmentDate = item.date || item.startTime;
    const displayDate = appointmentDate 
      ? new Date(appointmentDate).toLocaleDateString() 
      : 'Date not set';
    
    // Extract time from startTime or use timeSlot
    const displayTime = item.timeSlot || 
      (item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time not set');

    return (
      <Card style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <Text
            style={[
              styles.date,
              typography.headingSemiBold,
              { color: colors.foreground },
            ]}
          >
            {displayDate}
          </Text>
          <Text
            style={[
              styles.time,
              typography.bodySemiBold,
              { color: colors.primary },
            ]}
          >
            {displayTime}
          </Text>
        </View>

        <Text
          style={[
            styles.info,
            typography.body,
            { color: colors.mutedForeground },
          ]}
        >
          Booking ID: {item.id.slice(0, 8)}...
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

        <View style={styles.actions}>
          {item.status === 'PENDING' && (
            <>
              <Button
                title="Approve"
                variant="primary"
                size="sm"
                onPress={() => handleApprove(item.id)}
                loading={isLoading}
                style={styles.actionButton}
              />
              <Button
                title="Reject"
                variant="destructive"
                size="sm"
                onPress={() => handleReject(item.id)}
                disabled={isLoading}
                style={styles.actionButton}
              />
            </>
          )}

          {item.status === 'APPROVED' && (
            <Button
              title="Mark Completed"
              variant="secondary"
              size="sm"
              onPress={() => handleComplete(item.id)}
              loading={isLoading}
            />
          )}
        </View>
      </Card>
    );
  };

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
          label="Pending"
          selected={tab === 'pending'}
          onPress={() => setTab('pending')}
          variant="primary"
        />
        <Chip
          label="Approved"
          selected={tab === 'approved'}
          onPress={() => setTab('approved')}
          variant="primary"
        />
        <Chip
          label="Rejected"
          selected={tab === 'rejected'}
          onPress={() => setTab('rejected')}
          variant="primary"
        />
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : filterAppointments().length === 0 ? (
        <EmptyState
          icon="mail"
          title={`No ${tab} requests`}
          description={`You don't have any ${tab} appointment requests`}
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

      <Modal
        visible={rejectionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectionModal({ visible: false, appointmentId: null })}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text
              style={[
                styles.modalTitle,
                typography.headingSemiBold,
                { color: colors.foreground },
              ]}
            >
              Reject Appointment
            </Text>

            <Text
              style={[
                styles.modalLabel,
                typography.body,
                { color: colors.mutedForeground },
              ]}
            >
              Please provide a reason for rejection:
            </Text>

            <RNTextInput
              style={[
                styles.modalInput,
                typography.body,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.foreground,
                  borderRadius: borderRadius.lg,
                },
              ]}
              placeholder="e.g., Fully booked, time slot unavailable..."
              placeholderTextColor={colors.placeholder}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => {
                  setRejectionModal({ visible: false, appointmentId: null });
                  setRejectionReason('');
                }}
                style={styles.modalButton}
              />
              <Button
                title="Confirm Reject"
                variant="destructive"
                size="sm"
                onPress={confirmReject}
                loading={!!actionLoading}
                style={styles.modalButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
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
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  date: {
    fontSize: typography.sizes.md,
  },
  time: {
    fontSize: typography.sizes.md,
  },
  info: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  rejectionReason: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    padding: spacing.lg,
    fontSize: typography.sizes.md,
    minHeight: 80,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});
