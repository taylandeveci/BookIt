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
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { Button, Input, Card } from '../../components';
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
      await authService.changePassword(user.id, data.currentPassword, data.newPassword);
      Alert.alert(
        'Success',
        'Password changed successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              reset();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
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
          Change Password
        </Text>

        <Text
          style={[
            styles.description,
            typography.body,
            { color: colors.mutedForeground },
          ]}
        >
          Enter your current password and choose a new one
        </Text>

        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Current Password"
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
              label="New Password"
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
              label="Confirm New Password"
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
          title="Update Password"
          onPress={handleSubmit(onChangePassword)}
          loading={loading}
          fullWidth
        />
      </Card>
    </ScrollView>
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
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.xl,
  },
});
