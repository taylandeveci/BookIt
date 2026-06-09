import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';

export const EmployeePendingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const logout = useAuthStore((state) => state.logout);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.muted }]}>
          <Ionicons name="time-outline" size={48} color={colors.primary} />
        </View>

        <Text style={[styles.title, typography.heading, { color: colors.foreground }]}>
          {t('employeePending.title')}
        </Text>

        <Text style={[styles.body, typography.body, { color: colors.mutedForeground }]}>
          {t('employeePending.description')}
        </Text>

        <View style={[styles.infoRow, { backgroundColor: colors.muted, borderRadius: borderRadius.md }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
          <Text style={[styles.infoText, typography.body, { color: colors.mutedForeground }]}>
            {t('employeePending.afterApproval')}
          </Text>
        </View>

        <Button
          title={t('employeePending.back')}
          onPress={logout}
          variant="outline"
          fullWidth
        />
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
});
