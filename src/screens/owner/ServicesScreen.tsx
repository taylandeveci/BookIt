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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ownerService } from '../../services/ownerService';
import { businessService } from '../../services/businessService';
import { useAuthStore } from '../../store/authStore';
import { Service, Business } from '../../types';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  Button,
  Input,
  Chip,
  LoadingSpinner,
  EmptyState,
  Toast,
} from '../../components';
import { spacing, typography } from '../../theme/theme';

const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
  duration: z.string().regex(/^\d+$/, 'Duration must be a number'),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export const ServicesScreen: React.FC = () => {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  
  const [services, setServices] = useState<Service[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
  });

  useFocusEffect(
    React.useCallback(() => {
      loadServices();
    }, [user])
  );

  const loadServices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const allBusinesses = await businessService.getBusinesses({});
      const ownerBusiness = allBusinesses.find((b) => b.ownerId === user.id);
      
      if (ownerBusiness) {
        setBusiness(ownerBusiness);
        const data = await businessService.getServices(ownerBusiness.id);
        setServices(data);
      }
    } catch (error: any) {
      console.error('Failed to load services:', error);
      setToast({ message: error.message || 'Failed to load services', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      reset({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        duration: service.durationMin.toString(),
      });
    } else {
      setEditingService(null);
      reset({ name: '', description: '', price: '', duration: '' });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingService(null);
    reset({ name: '', description: '', price: '', duration: '' });
  };

  const onSubmit = async (data: ServiceFormData) => {
    if (!business) return;

    setActionLoading(true);
    try {
      const serviceData = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        durationMin: parseInt(data.duration),
      };

      if (editingService) {
        await ownerService.updateService(editingService.id, serviceData);
        setToast({ message: 'Service updated', type: 'success' });
      } else {
        await ownerService.createService(business.id, serviceData);
        setToast({ message: 'Service added', type: 'success' });
      }
      closeModal();
      loadServices();
    } catch (error: any) {
      setToast({ message: error.message || 'Operation failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ownerService.deleteService(service.id);
              setToast({ message: 'Service deleted', type: 'success' });
              loadServices();
            } catch (error: any) {
              setToast({ message: error.message || 'Failed to delete service', type: 'error' });
            }
          },
        },
      ]
    );
  };

  const renderService = ({ item }: { item: Service }) => (
    <Card style={styles.serviceCard}>
      <Text
        style={[
          styles.serviceName,
          typography.headingSemiBold,
          { color: colors.foreground },
        ]}
      >
        {item.name}
      </Text>

      <Text
        style={[
          styles.serviceDescription,
          typography.body,
          { color: colors.mutedForeground },
        ]}
      >
        {item.description}
      </Text>

      <View style={styles.serviceDetails}>
        <Text
          style={[
            styles.servicePrice,
            typography.bodySemiBold,
            { color: colors.secondary },
          ]}
        >
          ${item.price}
        </Text>
        <Text
          style={[
            styles.serviceDuration,
            typography.body,
            { color: colors.mutedForeground },
          ]}
        >
          {item.durationMin} min
        </Text>
      </View>

      <View style={styles.serviceActions}>
        <Button
          title="Edit"
          variant="outline"
          size="sm"
          onPress={() => openModal(item)}
          style={styles.actionButton}
        />
        <Button
          title="Delete"
          variant="destructive"
          size="sm"
          onPress={() => handleDelete(item)}
          style={styles.actionButton}
        />
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
          icon="business"
          title="No Business Found"
          description="You need a registered business to manage services"
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
      
      <View style={styles.header}>
        <Button
          title="+ Add Service"
          onPress={() => openModal()}
          variant="primary"
        />
      </View>

      {services.length === 0 ? (
        <EmptyState
          icon="cut"
          title="No services yet"
          description="Add your first service to get started"
        />
      ) : (
        <FlatList
          data={services}
          renderItem={renderService}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
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
              {editingService ? 'Edit Service' : 'Add Service'}
            </Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Service Name"
                  placeholder="Classic Haircut"
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
                  placeholder="Professional haircut with styling"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.description?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="price"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Price ($)"
                  placeholder="35.00"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.price?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />

            <Controller
              control={control}
              name="duration"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Duration (minutes)"
                  placeholder="30"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.duration?.message}
                  keyboardType="number-pad"
                />
              )}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={closeModal}
                style={styles.modalButton}
              />
              <Button
                title={editingService ? 'Update' : 'Add'}
                variant="primary"
                size="sm"
                onPress={handleSubmit(onSubmit)}
                loading={actionLoading}
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
  header: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  serviceCard: {
    marginBottom: spacing.lg,
  },
  serviceName: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.sm,
  },
  serviceDescription: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  servicePrice: {
    fontSize: typography.sizes.lg,
    marginRight: spacing.md,
  },
  serviceDuration: {
    fontSize: typography.sizes.sm,
  },
  serviceActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
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
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.lg,
  },
  categoryLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});
