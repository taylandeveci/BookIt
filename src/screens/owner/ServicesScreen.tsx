import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
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
  LoadingSpinner,
  EmptyState,
  Toast,
} from '../../components';
import { useTranslation } from 'react-i18next';
import { spacing, typography } from '../../theme/theme';
import { formatCurrency } from '../../lib/formatCurrency';

const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
  duration: z.string().regex(/^\d+$/, 'Duration must be a number'),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export const ServicesScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  
  const queryClient = useQueryClient();
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

  const { data: ownerData, isLoading: loading } = useQuery({
    queryKey: queryKeys.owner.services,
    queryFn: async () => {
      const biz = await ownerService.getBusiness();
      const svcs = await businessService.getServices(biz.id);
      return { business: biz as Business, services: Array.isArray(svcs) ? svcs : [] as Service[] };
    },
    enabled: !!user,
  });

  const business = ownerData?.business ?? null;
  const services = ownerData?.services ?? [];

  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.services });
    }, [queryClient])
  );

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
    if (!business) {
      setToast({ message: t('services.businessNotFound'), type: 'error' });
      return;
    }

    const price = parseFloat(data.price);
    const durationMin = parseInt(data.duration, 10);

    if (isNaN(price) || price <= 0) {
      setToast({ message: t('services.priceError'), type: 'error' });
      return;
    }

    if (isNaN(durationMin) || durationMin <= 0) {
      setToast({ message: t('services.durationError'), type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      const serviceData = {
        name: data.name.trim(),
        description: data.description.trim(),
        price: price,
        durationMin: durationMin,
        isActive: true, // New services are active by default
      };

      if (editingService) {
        await ownerService.updateService(editingService.id, serviceData);
        setToast({ message: t('services.updateSuccess'), type: 'success' });
      } else {
        await ownerService.createService(business.id, serviceData);
        setToast({ message: t('services.addSuccess'), type: 'success' });
      }
      closeModal();
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.services });
      if (business) {
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.services(business.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.detail(business.id) });
        if (editingService) {
          queryClient.invalidateQueries({ queryKey: ['employees'] });
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || t('services.updateError');
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      t('services.deleteConfirm'),
      `${t('services.deleteConfirm')} "${service.name}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ownerService.deleteService(service.id);
              setToast({ message: t('services.deleteSuccess'), type: 'success' });
              queryClient.invalidateQueries({ queryKey: queryKeys.owner.services });
              if (business) {
                queryClient.invalidateQueries({ queryKey: queryKeys.businesses.services(business.id) });
                queryClient.invalidateQueries({ queryKey: queryKeys.businesses.detail(business.id) });
                queryClient.invalidateQueries({ queryKey: ['businesses', business.id, 'timeSlots'] });
                queryClient.invalidateQueries({ queryKey: ['employees'] });
              }
            } catch (error: any) {
              setToast({ message: error.message || t('services.deleteError'), type: 'error' });
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
          {formatCurrency(Number(item.price))}
        </Text>
        <Text
          style={[
            styles.serviceDuration,
            typography.body,
            { color: colors.mutedForeground },
          ]}
        >
          {item.durationMin} {t('common.min')}
        </Text>
      </View>

      <View style={styles.serviceActions}>
        <Button
          title={t('common.edit')}
          variant="outline"
          size="sm"
          onPress={() => openModal(item)}
          style={styles.actionButton}
        />
        <Button
          title={t('common.delete')}
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
          title={t('services.noBusiness')}
          description={t('services.noBusinessDesc')}
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
          title={t('services.addServiceBtn')}
          onPress={() => openModal()}
          variant="primary"
        />
      </View>

      {services.length === 0 ? (
        <EmptyState
          icon="cut"
          title={t('services.noServicesYet')}
          description={t('services.addFirst')}
        />
      ) : (
        <FlatList
          data={services}
          renderItem={renderService}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          maxToRenderPerBatch={10}
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
              {editingService ? t('services.editService') : t('services.addService')}
            </Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('services.serviceName')}
                  placeholder={t('services.serviceNamePlaceholder')}
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
                  label={t('services.description')}
                  placeholder={t('services.descriptionPlaceholder')}
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
                  label={t('services.priceLabel')}
                  placeholder={t('services.pricePlaceholder')}
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
                  label={t('services.duration')}
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
                title={t('common.cancel')}
                variant="outline"
                size="sm"
                onPress={closeModal}
                style={styles.modalButton}
              />
              <Button
                title={editingService ? t('common.save') : t('common.add')}
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
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});
