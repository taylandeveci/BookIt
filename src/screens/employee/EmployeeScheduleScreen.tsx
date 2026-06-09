import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { useAuthStore } from '../../store/authStore';
import { Button, Card } from '../../components';
import { employeeService } from '../../services/employeeService';
import { spacing, typography, borderRadius } from '../../theme/theme';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const ITEM_H = 48;
const VISIBLE = 5;
const PAD = 2; // items above/below center

type DayEntry = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

const defaultSchedule = (): DayEntry[] =>
  DAY_KEYS.map((_, i) => ({
    dayOfWeek: i,
    enabled: i >= 1 && i <= 5,
    startTime: '09:00',
    endTime: '18:00',
  }));

// ---- Drum-roll column ----

interface PickerColumnProps {
  values: string[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

const PickerColumn: React.FC<PickerColumnProps> = ({ values, selectedIdx, onSelect, colors }) => {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIdx * ITEM_H, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [selectedIdx]);

  return (
    <View style={{ height: ITEM_H * VISIBLE, width: 72, overflow: 'hidden' }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H * PAD }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          onSelect(Math.max(0, Math.min(values.length - 1, idx)));
        }}
        scrollEventThrottle={16}
      >
        {values.map((v, i) => (
          <TouchableOpacity
            key={v}
            style={styles.pickerItem}
            onPress={() => {
              scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
              onSelect(i);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pickerItemText,
                typography.bodySemiBold,
                {
                  color: i === selectedIdx ? colors.foreground : colors.mutedForeground,
                  opacity: Math.abs(i - selectedIdx) > 1 ? 0.3 : 1,
                },
              ]}
            >
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Selection highlight lines */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ height: ITEM_H * PAD }} />
        <View
          style={{
            height: ITEM_H,
            borderTopWidth: 1.5,
            borderBottomWidth: 1.5,
            borderColor: colors.primary,
          }}
        />
      </View>
    </View>
  );
};

// ---- Main screen ----

export const EmployeeScheduleScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<DayEntry[]>(defaultSchedule());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDayOfWeek, setPickerDayOfWeek] = useState(0);
  const [pickerField, setPickerField] = useState<'startTime' | 'endTime'>('startTime');
  const [pickerHourIdx, setPickerHourIdx] = useState(9);
  const [pickerMinIdx, setPickerMinIdx] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await employeeService.getSchedule();
      if (Array.isArray(data) && data.length > 0) {
        setSchedule((prev) =>
          prev.map((day) => {
            const saved = data.find((d: any) => d.dayOfWeek === day.dayOfWeek);
            if (saved) {
              return { ...day, enabled: true, startTime: saved.startTime, endTime: saved.endTime };
            }
            return { ...day, enabled: false };
          })
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const update = (dayOfWeek: number, field: keyof DayEntry, value: any) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    );
  };

  const openPicker = (dayOfWeek: number, field: 'startTime' | 'endTime') => {
    const day = schedule.find((d) => d.dayOfWeek === dayOfWeek)!;
    const timeStr = field === 'startTime' ? day.startTime : day.endTime;
    const [hStr, mStr] = timeStr.split(':');
    const hIdx = HOURS.indexOf(hStr.padStart(2, '0'));
    const mIdx = MINUTES.indexOf(mStr.padStart(2, '0'));
    setPickerDayOfWeek(dayOfWeek);
    setPickerField(field);
    setPickerHourIdx(hIdx >= 0 ? hIdx : 9);
    setPickerMinIdx(mIdx >= 0 ? mIdx : 0);
    setPickerVisible(true);
  };

  const confirmPicker = () => {
    const time = `${HOURS[pickerHourIdx]}:${MINUTES[pickerMinIdx]}`;
    update(pickerDayOfWeek, pickerField, time);
    setPickerVisible(false);
  };

  const save = async () => {
    const entries = schedule
      .filter((d) => d.enabled)
      .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));

    setSaving(true);
    try {
      await employeeService.updateSchedule(entries);
      const employeeId = user?.employee?.id;
      const businessId = user?.employee?.businessId;
      if (employeeId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.schedule(employeeId) });
      }
      if (businessId) {
        queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'timeSlots'] });
      }
      Alert.alert(t('common.success'), t('employeeSchedule.saveSuccess'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('employeeSchedule.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {schedule.map((day) => (
          <Card key={day.dayOfWeek} style={styles.dayCard}>
            {/* Day row: name + toggle */}
            <View style={styles.dayHeader}>
              <Text style={[typography.bodySemiBold, styles.dayName, { color: colors.foreground }]}>
                {t(`employeeSchedule.${DAY_KEYS[day.dayOfWeek]}`)}
              </Text>
              <Switch
                value={day.enabled}
                onValueChange={(v) => update(day.dayOfWeek, 'enabled', v)}
                trackColor={{ true: colors.primary, false: colors.muted }}
                thumbColor={colors.background}
              />
            </View>

            {/* Summary line */}
            {day.enabled ? (
              <>
                <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 13, marginBottom: spacing.sm }]}>
                  {day.startTime} – {day.endTime}
                </Text>

                {/* Time trigger buttons */}
                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={[styles.timeBtn, { backgroundColor: colors.muted, borderRadius: borderRadius.md }]}
                    onPress={() => openPicker(day.dayOfWeek, 'startTime')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={15} color={colors.mutedForeground} />
                    <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: 15 }]}>
                      {day.startTime}
                    </Text>
                  </TouchableOpacity>

                  <Ionicons name="arrow-forward" size={16} color={colors.mutedForeground} />

                  <TouchableOpacity
                    style={[styles.timeBtn, { backgroundColor: colors.muted, borderRadius: borderRadius.md }]}
                    onPress={() => openPicker(day.dayOfWeek, 'endTime')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={15} color={colors.mutedForeground} />
                    <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: 15 }]}>
                      {day.endTime}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 13 }]}>
                {t('employeeSchedule.dayOff')}
              </Text>
            )}
          </Card>
        ))}

        <Button title={t('common.save')} onPress={save} loading={saving} fullWidth style={{ marginTop: spacing.sm }} />
      </ScrollView>

      {/* Drum-roll time picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[typography.bodySemiBold, { color: colors.mutedForeground }]}>{t('employeeSchedule.cancelBtn')}</Text>
              </TouchableOpacity>
              <Text style={[typography.headingSemiBold, { color: colors.foreground, fontSize: 16 }]}>
                {pickerField === 'startTime' ? t('employeeSchedule.startTime') : t('employeeSchedule.endTime')}
              </Text>
              <TouchableOpacity onPress={confirmPicker} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[typography.bodySemiBold, { color: colors.primary }]}>{t('employeeSchedule.doneBtn')}</Text>
              </TouchableOpacity>
            </View>

            {/* Drum-roll */}
            <View style={styles.pickerBody}>
              <PickerColumn
                values={HOURS}
                selectedIdx={pickerHourIdx}
                onSelect={setPickerHourIdx}
                colors={colors}
              />
              <Text style={[styles.pickerColon, typography.heading, { color: colors.foreground }]}>
                :
              </Text>
              <PickerColumn
                values={MINUTES}
                selectedIdx={pickerMinIdx}
                onSelect={setPickerMinIdx}
                colors={colors}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  dayCard: {
    marginBottom: spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dayName: {
    fontSize: typography.sizes.md,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // Picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xxl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  pickerBody: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  pickerItem: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 22,
  },
  pickerColon: {
    fontSize: 28,
    marginHorizontal: spacing.xs,
    lineHeight: 34,
  },
});
