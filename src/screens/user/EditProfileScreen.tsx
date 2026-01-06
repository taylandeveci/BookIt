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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { Button, Input, Card } from '../../components';
import { spacing, typography } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;

const editProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export const EditProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  const onSaveChanges = async (data: EditProfileFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      // Update profile via API
      const updatedUser = await authService.updateProfile(user.id, {
        name: data.name,
        email: data.email,
      });
      
      // Update store (which also persists to AsyncStorage via login method)
      setUser(updatedUser);
      
      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.card}>
        <Text
          style={[
            styles.title,
            typography.headingSemiBold,
            { color: colors.foreground },
          ]}
        >
          Edit Profile
        </Text>

        <Text
          style={[
            styles.description,
            typography.body,
            { color: colors.mutedForeground },
          ]}
        >
          Update your personal information below
        </Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="Enter your name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="Enter your email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />
        </View>
      </Card>

      <View style={styles.buttonSection}>
        <Button
          title="Save Changes"
          onPress={handleSubmit(onSaveChanges)}
          loading={loading}
          fullWidth
        />
      </View>
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
    fontSize: typography.sizes.xl,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  buttonSection: {
    marginTop: spacing.lg,
  },
});
