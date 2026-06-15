import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ownerService } from '../../services/ownerService';
import { businessService } from '../../services/businessService';
import { useAuthStore } from '../../store/authStore';
import { Employee } from '../../types';
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
import { spacing, typography, borderRadius } from '../../theme/theme';
import { queryKeys } from '../../lib/queryKeys';

const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export const EmployeesScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const queryClient = useQueryClient();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
  });

  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: queryKeys.owner.business,
    queryFn: () => ownerService.getBusiness(),
    enabled: !!user,
    staleTime: 60000,
  });

  const businessId = business?.id;

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: businessId ? queryKeys.employees.forBusiness(businessId) : ['employees', '__none__'],
    queryFn: () => businessService.getEmployees(businessId!),
    enabled: !!businessId,
    staleTime: 60000,
  });

  const loading = businessLoading || employeesLoading;

  const isRefetchingRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (isRefetchingRef.current) return;
      isRefetchingRef.current = true;

      const invalidations = [queryClient.invalidateQueries({ queryKey: queryKeys.owner.business })];
      if (businessId) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: queryKeys.employees.forBusiness(businessId) })
        );
      }

      Promise.all(invalidations).finally(() => {
        isRefetchingRef.current = false;
      });
    }, [queryClient, businessId])
  );

  const handleCopyCode = async () => {
    if (!business?.joinCode) return;
    await Clipboard.setStringAsync(business.joinCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    reset({ name: employee.fullName });
    setEditModalVisible(true);
  };

  const closeEdit = () => {
    setEditModalVisible(false);
    setEditingEmployee(null);
    reset({ name: '' });
  };

  const onSaveEdit = async (data: EmployeeFormData) => {
    if (!editingEmployee || !businessId) return;
    setActionLoading(true);
    try {
      await ownerService.updateEmployee(editingEmployee.id, { fullName: data.name });
      setToast({ message: t('employees.updateSuccess'), type: 'success' });
      closeEdit();
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.forBusiness(businessId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.pending });
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.employees(businessId) });
      queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
    } catch (error: any) {
      setToast({ message: error.message || t('employees.updateError'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (employee: Employee) => {
    Alert.alert(
      t('employees.deleteConfirm'),
      `${t('employees.deleteConfirm')} ${employee.fullName}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ownerService.deleteEmployee(employee.id);
              setToast({ message: t('employees.deleteSuccess'), type: 'success' });
              if (businessId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.employees.forBusiness(businessId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.employees.pending });
                queryClient.invalidateQueries({ queryKey: queryKeys.businesses.employees(businessId) });
                queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
              }
            } catch (error: any) {
              setToast({ message: error.message || t('employees.deleteError'), type: 'error' });
            }
          },
        },
      ]
    );
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <Card style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {item.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.employeeInfo}>
          <Text style={[styles.employeeName, typography.headingSemiBold, { color: colors.foreground }]}>
            {item.fullName}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    (item as any).status === 'ACTIVE' ? colors.primary + '1F' :
                    (item as any).status === 'PENDING' ? colors.secondary + '1F' : colors.destructive + '1F',
                },
              ]}
            >
              <Text
                style={[
                  typography.body,
                  {
                    fontSize: 11,
                    fontWeight: '600',
                    color:
                      (item as any).status === 'ACTIVE' ? colors.primary :
                      (item as any).status === 'PENDING' ? colors.secondary : colors.destructive,
                  },
                ]}
              >
                {(item as any).status === 'ACTIVE' ? t('employees.active') :
                 (item as any).status === 'PENDING' ? t('employees.pendingApproval') :
                 (item as any).status === 'REJECTED' ? t('employees.rejected') :
                 item.isActive ? t('employees.active') : t('services.inactive')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.employeeActions}>
        <Button
          title={t('common.edit')}
          variant="outline"
          size="sm"
          onPress={() => openEdit(item)}
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
          title={t('employees.noBusiness')}
          description={t('employees.noBusinessDesc')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}

      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={6}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          business.joinCode ? (
            <Card style={[styles.joinCodeCard, { borderColor: colors.border }]}>
              <Text style={[typography.bodySemiBold, { color: colors.mutedForeground, fontSize: 12, marginBottom: 4 }]}>
                {t('employees.joinCode')}
              </Text>
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 12, marginBottom: spacing.md }]}>
                {t('employees.joinCodeShare')}
              </Text>
              <View style={styles.codeRow}>
                <Text style={[styles.codeText, { color: colors.foreground, letterSpacing: 4 }]}>
                  {business.joinCode}
                </Text>
                <TouchableOpacity
                  style={[styles.copyBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={codeCopied ? 'checkmark' : 'copy-outline'}
                    size={18}
                    color={colors.primaryForeground}
                  />
                  <Text style={styles.copyBtnText}>{codeCopied ? t('employees.copied') : t('employees.copy')}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="people"
            title={t('employees.noEmployeesYet')}
            description={t('employees.joinInstruction')}
          />
        }
      />

      {/* Edit modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={[styles.modalTitle, typography.headingSemiBold, { color: colors.foreground }]}>
              {t('employees.editEmployee')}
            </Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('employees.fullName')}
                  placeholder={t('employees.fullNamePlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                />
              )}
            />

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                variant="outline"
                size="sm"
                onPress={closeEdit}
                style={styles.modalButton}
              />
              <Button
                title={t('common.save')}
                variant="primary"
                size="sm"
                onPress={handleSubmit(onSaveEdit)}
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
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  joinCodeCard: {
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  copyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  employeeCard: {
    marginBottom: spacing.lg,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  employeeActions: {
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
