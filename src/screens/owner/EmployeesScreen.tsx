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
import { Employee, Business } from '../../types';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  Button,
  Input,
  LoadingSpinner,
  EmptyState,
  Toast,
} from '../../components';
import { spacing, typography } from '../../theme/theme';

const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export const EmployeesScreen: React.FC = () => {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
  });

  useFocusEffect(
    React.useCallback(() => {
      loadEmployees();
    }, [user])
  );

  const loadEmployees = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const allBusinesses = await businessService.getBusinesses({});
      const ownerBusiness = allBusinesses.find((b) => b.ownerId === user.id);
      
      if (ownerBusiness) {
        setBusiness(ownerBusiness);
        const data = await businessService.getEmployees(ownerBusiness.id);
        setEmployees(data);
      }
    } catch (error: any) {
      console.error('Failed to load employees:', error);
      setToast({ message: error.message || 'Failed to load employees', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      reset({ name: employee.fullName });
    } else {
      setEditingEmployee(null);
      reset({ name: '' });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingEmployee(null);
    reset({ name: '' });
  };

  const onSubmit = async (data: EmployeeFormData) => {
    if (!business) return;

    setActionLoading(true);
    try {
      const employeeData = {
        fullName: data.name,
      };
      
      if (editingEmployee) {
        await ownerService.updateEmployee(editingEmployee.id, employeeData);
        setToast({ message: 'Employee updated', type: 'success' });
      } else {
        await ownerService.createEmployee(business.id, employeeData);
        setToast({ message: 'Employee added', type: 'success' });
      }
      closeModal();
      loadEmployees();
    } catch (error: any) {
      setToast({ message: error.message || 'Operation failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (employee: Employee) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ownerService.deleteEmployee(employee.id);
              setToast({ message: 'Employee deleted', type: 'success' });
              loadEmployees();
            } catch (error: any) {
              setToast({ message: error.message || 'Failed to delete employee', type: 'error' });
            }
          },
        },
      ]
    );
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <Card style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.employeeInfo}>
          <Text
            style={[
              styles.employeeName,
              typography.headingSemiBold,
              { color: colors.foreground },
            ]}
          >
            {item.fullName}
          </Text>
          <Text
            style={[
              styles.employeeRole,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.employeeActions}>
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
          description="You need a registered business to manage employees"
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
          title="+ Add Employee"
          onPress={() => openModal()}
          variant="primary"
        />
      </View>

      {employees.length === 0 ? (
        <EmptyState
          icon="people"
          title="No employees yet"
          description="Add your first employee to get started"
        />
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployee}
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
              {editingEmployee ? 'Edit Employee' : 'Add Employee'}
            </Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Name"
                  placeholder="John Doe"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
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
                title={editingEmployee ? 'Update' : 'Add'}
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
    backgroundColor: '#5D7052',
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
  employeeRole: {
    fontSize: typography.sizes.sm,
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
