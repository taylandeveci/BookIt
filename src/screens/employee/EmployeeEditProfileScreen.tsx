import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { Button, Input, Card, ImageWithFallback } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export const EmployeeEditProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar || null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  const handlePickAvatar = async () => {
    setUploadError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        setUploadError('Could not read image data');
        return;
      }

      setUploading(true);
      const avatarUrl = `data:image/jpeg;base64,${asset.base64}`;

      if (user) {
        const updatedUser = await authService.updateProfile({ avatarUrl });
        setUser(updatedUser);
        setAvatarUri(avatarUrl);
      }
    } catch (error: any) {
      setUploadError(error.message || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSave = async (data: FormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const updatedUser = await authService.updateProfile({
        name: data.name,
        email: data.email,
      });
      setUser(updatedUser);
      Alert.alert(t('common.success'), t('editProfile.updateSuccess'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('editProfile.updateError'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={[styles.title, typography.headingSemiBold, { color: colors.foreground }]}>
            {t('profile.editProfile')}
          </Text>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                style={[styles.avatarContainer, { borderColor: colors.accent }]}
                onPress={handlePickAvatar}
                disabled={uploading}
                activeOpacity={0.8}
              >
                {avatarUri ? (
                  <ImageWithFallback uri={avatarUri} style={styles.avatarImage} iconSize={40} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                    <Ionicons name="person" size={40} color={colors.mutedForeground} />
                  </View>
                )}
                {uploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator color={colors.primaryForeground} />
                  </View>
                )}
              </TouchableOpacity>

              <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
              </View>
            </View>

            {uploadError ? (
              <Text style={[styles.uploadError, typography.body, { color: colors.destructive }]}>
                {uploadError}
              </Text>
            ) : null}
          </View>

          {/* Fields */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('editProfile.fullName')}
                  placeholder={t('auth.fullNamePlaceholder')}
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
                  label={t('editProfile.email')}
                  placeholder={t('auth.emailPlaceholder')}
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
            title={t('editProfile.save')}
            onPress={handleSubmit(onSave)}
            loading={loading}
            disabled={uploading}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: spacing.xl },
  card: { marginBottom: spacing.lg },
  title: {
    fontSize: typography.sizes.xl,
    marginBottom: spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadError: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  form: { gap: spacing.md },
  buttonSection: { marginTop: spacing.lg },
});
