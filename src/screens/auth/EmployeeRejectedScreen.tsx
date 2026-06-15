import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { employeeService } from '../../services/employeeService';
import { Button, Input } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';

export const EmployeeRejectedScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await employeeService.joinBusiness(joinCode.trim().toUpperCase());
      Alert.alert(t('common.success'), t('employeeRejected.success'), [
        {
          text: t('common.ok'),
          onPress: () => {
            if (user) {
              setUser({
                ...user,
                employee: {
                  id: result.employee.id,
                  status: result.employee.status,
                  businessId: result.employee.businessId,
                },
              });
            }
          },
        },
      ]);
    } catch (e: any) {
      setError(e.message || t('auth.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.muted }]}>
          <Ionicons name="close-circle-outline" size={48} color={colors.destructive} />
        </View>

        <Text style={[styles.title, typography.heading, { color: colors.foreground }]}>
          {t('employeeRejected.title')}
        </Text>

        <Text style={[styles.body, typography.body, { color: colors.mutedForeground }]}>
          {t('employeeRejected.description')}
        </Text>

        <Input
          placeholder={t('employeeRejected.joinCodePlaceholder')}
          value={joinCode}
          onChangeText={(v) => setJoinCode(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={8}
          error={error ?? undefined}
          containerStyle={styles.input}
        />

        <Button
          title={t('employeeRejected.submit')}
          onPress={handleSubmit}
          loading={loading}
          fullWidth
        />

        <Button title={t('employeeRejected.back')} onPress={logout} variant="outline" fullWidth />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.xl,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    width: '100%',
  },
});
