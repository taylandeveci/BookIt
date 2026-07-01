import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, ScreenHeader } from '../../components';
import { spacing, typography } from '../../theme/theme';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export const ChangePasswordScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onChangePassword = async (data: PasswordFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      Alert.alert(
        t('common.success'),
        t('changePassword.updateSuccess'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              reset();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('changePassword.updateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title={t('navigation.changePassword')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
      <Card style={styles.card}>
        <Text
          style={[
            styles.title,
            typography.heading,
            { color: colors.foreground },
          ]}
        >
          {t('changePassword.title')}
        </Text>

        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('changePassword.currentPassword')}
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.currentPassword?.message}
              secureTextEntry
            />
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('changePassword.newPassword')}
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.newPassword?.message}
              secureTextEntry
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('changePassword.confirmPassword')}
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              secureTextEntry
            />
          )}
        />

        <Button
          title={t('changePassword.save')}
          onPress={handleSubmit(onChangePassword)}
          loading={loading}
          fullWidth
        />
      </Card>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.xl,
  },
});
