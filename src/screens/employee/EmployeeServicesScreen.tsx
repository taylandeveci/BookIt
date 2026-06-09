import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput as RNTextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { employeeService } from '../../services/employeeService';
import { businessService } from '../../services/businessService';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, Toast } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { formatCurrency } from '../../lib/formatCurrency';

type Step = 'list' | 'pick' | 'form';

interface BusinessService {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  description?: string;
}

interface MyService {
  id: string;
  serviceId: string;
  service?: BusinessService;
}

export const EmployeeServicesScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [myServices, setMyServices] = useState<MyService[]>([]);
  const [allServices, setAllServices] = useState<BusinessService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal state
  const [step, setStep] = useState<Step>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<BusinessService | null>(null);
  const [editingMyService, setEditingMyService] = useState<MyService | null>(null);
  const [formDuration, setFormDuration] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const businessId = user?.employee?.businessId;

  const load = useCallback(
    async (showRefresh = false) => {
      if (!businessId) {
        setLoading(false);
        return;
      }
      if (showRefresh) setRefreshing(true);
      try {
        const [all, mine] = await Promise.all([
          businessService.getServices(businessId),
          employeeService.getServices(),
        ]);
        setAllServices(Array.isArray(all) ? (all as BusinessService[]) : []);
        setMyServices(
          (Array.isArray(mine) ? mine : []).map((es: any) => ({
            id: es.id,
            serviceId: es.serviceId ?? es.service?.id,
            service: es.service ?? undefined,
          }))
        );
      } catch {
        // silent
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessId]
  );

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const getServiceDetails = (myService: MyService): BusinessService | undefined => {
    return myService.service ?? allServices.find((s) => s.id === myService.serviceId);
  };

  const openAddFlow = () => {
    setSearchQuery('');
    setSelectedService(null);
    setEditingMyService(null);
    setFormDuration('');
    setFormPrice('');
    setFormNotes('');
    setStep('pick');
  };

  const openEditForm = (myService: MyService) => {
    const svc = getServiceDetails(myService);
    if (!svc) return;
    setSelectedService(svc);
    setEditingMyService(myService);
    setFormDuration('');
    setFormPrice('');
    setFormNotes('');
    setStep('form');
  };

  const selectBusinessService = (svc: BusinessService) => {
    setSelectedService(svc);
    setFormDuration('');
    setFormPrice('');
    setFormNotes('');
    setStep('form');
  };

  const handleFormSave = async () => {
    if (!selectedService) return;
    const isAlreadyAdded = myServices.some((ms) => ms.serviceId === selectedService.id);

    const parsedDuration = formDuration.trim() !== '' ? parseInt(formDuration.trim(), 10) : undefined;
    const parsedPrice = formPrice.trim() !== '' ? parseFloat(formPrice.trim()) : undefined;
    const parsedNotes = formNotes.trim() !== '' ? formNotes.trim() : undefined;

    setSaving(true);
    try {
      if (!isAlreadyAdded) {
        await employeeService.addService(selectedService.id, {
          durationOverride: parsedDuration,
          priceOverride: parsedPrice,
          notes: parsedNotes,
        });
      }
      await load();
      // Invalidate all affected caches so changes are visible across roles immediately
      if (businessId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.services(businessId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.employees(businessId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.detail(businessId) });
        queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'timeSlots'] });
      }
      const employeeId = user?.employee?.id;
      if (employeeId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.services(employeeId) });
      }
      setStep('list');
      setToast({ message: isAlreadyAdded ? t('employeeServices.updateSuccess') : t('employeeServices.addSuccess'), type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message || t('employeeServices.saveError'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (myService: MyService) => {
    const svc = getServiceDetails(myService);
    Alert.alert(
      t('employeeServices.removeTitle'),
      `${t('employeeServices.removeTitle')} "${svc?.name ?? ''}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('employeeServices.removeBtn'),
          style: 'destructive',
          onPress: async () => {
            try {
              await employeeService.removeService(myService.serviceId);
              setMyServices((prev) => prev.filter((ms) => ms.id !== myService.id));
              // Invalidate all affected caches so removal is reflected immediately across roles
              if (businessId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.businesses.services(businessId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.businesses.employees(businessId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.businesses.detail(businessId) });
                queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'timeSlots'] });
              }
              const employeeId = user?.employee?.id;
              if (employeeId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.employees.services(employeeId) });
              }
              setToast({ message: t('employeeServices.removeSuccess'), type: 'success' });
            } catch (e: any) {
              setToast({ message: e.message || t('employeeServices.removeError'), type: 'error' });
            }
          },
        },
      ]
    );
  };

  const closeModal = () => {
    setStep('list');
    setSelectedService(null);
    setEditingMyService(null);
  };

  const filteredServices = allServices.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ---- Empty states ----

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!businessId) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
        <EmptyState
          icon="briefcase-outline"
          title={t('employeeServices.joinBusinessFirst')}
          description={t('employeeServices.joinBusinessFirstDesc')}
        />
      </SafeAreaView>
    );
  }

  // ---- Main list ----

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

      <FlatList
        data={myServices}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
            onPress={openAddFlow}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={colors.primaryForeground} />
            <Text style={[typography.bodySemiBold, { color: colors.primaryForeground }]}>
              {t('employeeServices.addService')}
            </Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          allServices.length === 0 ? (
            <EmptyState
              icon="cut-outline"
              title={t('employeeServices.noServices')}
              description={t('employeeServices.noServicesDesc')}
            />
          ) : (
            <EmptyState
              icon="list-outline"
              title={t('employeeServices.noServicesAdded')}
              description={t('employeeServices.noServicesAddedDesc')}
            />
          )
        }
        renderItem={({ item }) => {
          const svc = getServiceDetails(item);
          if (!svc) return null;
          return (
            <TouchableOpacity
              style={[styles.serviceRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openEditForm(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.8}
              delayLongPress={400}
            >
              <View style={styles.serviceInfo}>
                <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>{svc.name}</Text>
                <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 13, marginTop: 2 }]}>
                  {svc.durationMin} {t('common.min')}{' '}
                  <Text style={{ color: colors.secondary }}>
                    · {formatCurrency(Number(svc.price))}
                  </Text>
                </Text>
                {svc.description ? (
                  <Text
                    style={[typography.body, { color: colors.mutedForeground, fontSize: 12, marginTop: 2 }]}
                    numberOfLines={1}
                  >
                    {svc.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          );
        }}
      />

      {/* Add / Edit Modal */}
      <Modal
        visible={step !== 'list'}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              {step === 'form' ? (
                <TouchableOpacity
                  onPress={() => (editingMyService ? closeModal() : setStep('pick'))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.foreground} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 22 }} />
              )}
              <Text style={[typography.headingSemiBold, { color: colors.foreground, fontSize: 17 }]}>
                {step === 'pick'
                  ? t('employeeServices.selectService')
                  : editingMyService
                  ? t('employeeServices.editService')
                  : t('employeeServices.addService')}
              </Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Step: pick from business services */}
            {step === 'pick' && (
              <>
                <View
                  style={[styles.searchBox, { backgroundColor: colors.muted, borderRadius: borderRadius.md }]}
                >
                  <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
                  <RNTextInput
                    style={[styles.searchInput, typography.body, { color: colors.foreground }]}
                    placeholder={t('employeeServices.searchServices')}
                    placeholderTextColor={colors.placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                </View>

                <FlatList
                  data={filteredServices}
                  keyExtractor={(s) => s.id}
                  removeClippedSubviews
                  maxToRenderPerBatch={10}
                  style={styles.pickList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <Text style={[typography.body, { color: colors.mutedForeground, textAlign: 'center', paddingTop: spacing.xl }]}>
                      {t('employeeServices.noMatchingServices')}
                    </Text>
                  }
                  renderItem={({ item }) => {
                    const isAdded = myServices.some((ms) => ms.serviceId === item.id);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.pickRow,
                          {
                            backgroundColor: colors.background,
                            borderColor: isAdded ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => selectBusinessService(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.pickInfo}>
                          <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>
                            {item.name}
                          </Text>
                          <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 13 }]}>
                            {item.durationMin} {t('common.min')} · {formatCurrency(Number(item.price))}
                          </Text>
                        </View>
                        {isAdded ? (
                          <View style={[styles.addedBadge, { backgroundColor: colors.primary + '22' }]}>
                            <Text style={[typography.bodySemiBold, { color: colors.primary, fontSize: 11 }]}>
                              {t('employeeServices.added')}
                            </Text>
                          </View>
                        ) : (
                          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </>
            )}

            {/* Step: service detail form */}
            {step === 'form' && selectedService && (
              <FlatList
                data={[]}
                renderItem={null}
                keyExtractor={() => 'empty'}
                removeClippedSubviews
                maxToRenderPerBatch={10}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <View style={styles.formContent}>
                    {/* Base service name (read-only) */}
                    <View
                      style={[
                        styles.serviceNameCard,
                        { backgroundColor: colors.muted, borderRadius: borderRadius.md },
                      ]}
                    >
                      <Text style={[typography.headingSemiBold, { color: colors.foreground, fontSize: 17 }]}>
                        {selectedService.name}
                      </Text>
                      <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 13, marginTop: 2 }]}>
                        {t('employeeServices.base')}: {selectedService.durationMin} {t('common.min')} · {formatCurrency(Number(selectedService.price))}
                      </Text>
                    </View>

                    {/* Duration override */}
                    <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                      {t('employeeServices.durationOverride')}
                    </Text>
                    <RNTextInput
                      style={[
                        styles.formInput,
                        typography.body,
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.inputBorder,
                          color: colors.foreground,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                      value={formDuration}
                      onChangeText={setFormDuration}
                      placeholder={`${selectedService.durationMin} ${t('employeeServices.defaultHint')}`}
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />

                    {/* Price override */}
                    <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                      {t('employeeServices.priceOverride')}
                    </Text>
                    <RNTextInput
                      style={[
                        styles.formInput,
                        typography.body,
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.inputBorder,
                          color: colors.foreground,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                      value={formPrice}
                      onChangeText={setFormPrice}
                      placeholder={`${Number(selectedService.price).toFixed(2)} ${t('employeeServices.defaultHint')}`}
                      placeholderTextColor={colors.placeholder}
                      keyboardType="decimal-pad"
                    />

                    {/* Notes */}
                    <Text style={[styles.label, typography.bodySemiBold, { color: colors.mutedForeground }]}>
                      {t('employeeServices.notes')}
                    </Text>
                    <RNTextInput
                      style={[
                        styles.formInput,
                        styles.formNotes,
                        typography.body,
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.inputBorder,
                          color: colors.foreground,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                      value={formNotes}
                      onChangeText={setFormNotes}
                      placeholder={t('employeeServices.notesPlaceholder')}
                      placeholderTextColor={colors.placeholder}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />

                    <Button
                      title={saving ? t('employeeServices.saving') : editingMyService ? t('employeeServices.update') : t('employeeServices.addToMyServices')}
                      onPress={handleFormSave}
                      loading={saving}
                      fullWidth
                      style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}
                    />
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  serviceInfo: { flex: 1 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    paddingVertical: 0,
  },
  pickList: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  pickInfo: { flex: 1 },
  addedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  formContent: {
    padding: spacing.lg,
  },
  serviceNameCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  formInput: {
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
  },
  formNotes: {
    minHeight: 80,
  },
});
