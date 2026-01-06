import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { useTheme } from '../../theme/useTheme';
import { Button, Input, Chip, BackendHealthCheck } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { setAppLanguage, getCurrentLanguage } from '../../localization/i18n';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const AuthScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const login = useAuthStore((state) => state.login);
  const [currentLang, setCurrentLang] = useState<'en' | 'tr'>(getCurrentLanguage());
  
  const [roleTab, setRoleTab] = useState<'user' | 'owner'>('user');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = async (lang: 'en' | 'tr') => {
    await setAppLanguage(lang);
    setCurrentLang(lang);
  };

  const {
    control: loginControl,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    setValue: setLoginValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Register form state using plain useState
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessName: '',
  });

  const [registerErrors, setRegisterErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
    businessName?: string;
  }>({});

  const onLogin = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await login(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async () => {
    // Clear previous errors
    setRegisterErrors({});

    // Validate form
    const errors: typeof registerErrors = {};
    
    if (!registerForm.fullName || registerForm.fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!registerForm.email || !emailRegex.test(registerForm.email)) {
      errors.email = 'Invalid email address';
    }
    
    if (!registerForm.password || registerForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!registerForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }
    
    if (roleTab === 'owner' && (!registerForm.businessName || registerForm.businessName.trim() === '')) {
      errors.businessName = 'Business name is required for business owners';
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }

    setLoading(true);
    try {
      let payload;
      
      if (roleTab === 'owner') {
        payload = {
          fullName: registerForm.fullName.trim(),
          email: registerForm.email.trim().toLowerCase(),
          password: registerForm.password,
          phone: registerForm.phone?.trim() || undefined,
          businessName: registerForm.businessName.trim(),
        };
        
        console.log('[REGISTER] OWNER PAYLOAD:', payload);
        await authService.registerOwner(payload);
      } else {
        payload = {
          fullName: registerForm.fullName.trim(),
          email: registerForm.email.trim().toLowerCase(),
          password: registerForm.password,
          phone: registerForm.phone?.trim() || undefined,
        };
        
        console.log('[REGISTER] USER PAYLOAD:', payload);
        await authService.registerUser(payload);
      }
      
      console.log('[REGISTER] Success, logging in...');
      
      // After registration, login with the same credentials
      await login({ 
        email: registerForm.email.trim().toLowerCase(), 
        password: registerForm.password 
      });
      
      console.log('[REGISTER] Login successful');
    } catch (error: any) {
      console.error('[REGISTER] Error:', error);
      
      // Extract detailed error message
      let errorMessage = 'Registration failed';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show which field has the issue if available
      if (error.response?.data?.field) {
        errorMessage = `${error.response.data.field}: ${errorMessage}`;
      }
      
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <BackendHealthCheck />
        
        {/* Language Toggle */}
        <View style={styles.languageToggle}>
          <TouchableOpacity
            style={[
              styles.languageButton,
              currentLang === 'en' && { backgroundColor: colors.primary },
            ]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text
              style={[
                styles.languageText,
                typography.bodySemiBold,
                currentLang === 'en'
                  ? { color: colors.primaryForeground }
                  : { color: colors.mutedForeground },
              ]}
            >
              EN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.languageButton,
              currentLang === 'tr' && { backgroundColor: colors.primary },
            ]}
            onPress={() => handleLanguageChange('tr')}
          >
            <Text
              style={[
                styles.languageText,
                typography.bodySemiBold,
                currentLang === 'tr'
                  ? { color: colors.primaryForeground }
                  : { color: colors.mutedForeground },
              ]}
            >
              TR
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              typography.heading,
              { color: colors.foreground },
            ]}
          >
            {t('auth.title')}
          </Text>
          <Text
            style={[
              styles.subtitle,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            {t('auth.subtitle')}
          </Text>
        </View>

        <View style={styles.roleSelector}>
          <Chip
            label={t('auth.customer')}
            selected={roleTab === 'user'}
            onPress={() => setRoleTab('user')}
          />
          <Chip
            label={t('auth.businessOwner')}
            selected={roleTab === 'owner'}
            onPress={() => setRoleTab('owner')}
          />
        </View>

        <View style={styles.modeSelector}>
          <Chip
            label={t('auth.login')}
            selected={authMode === 'login'}
            onPress={() => setAuthMode('login')}
            variant="primary"
          />
          <Chip
            label={t('auth.register')}
            selected={authMode === 'register'}
            onPress={() => setAuthMode('register')}
            variant="primary"
          />
        </View>

        {authMode === 'login' ? (
          <View style={styles.form}>
            <Controller
              control={loginControl}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.email')}
                  placeholder={t('auth.emailPlaceholder')}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={loginErrors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />

            <Controller
              control={loginControl}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => {
                const handlePasswordChange = (text: string) => {
                  // Filter out iOS autofill system text
                  if (
                    text.includes('Automatic Strong Password') ||
                    text.includes('cover view text') ||
                    text.toLowerCase().includes('automatic')
                  ) {
                    // Ignore iOS system-injected text
                    return;
                  }
                  onChange(text);
                };

                return (
                  <Input
                    label={t('auth.password')}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={value || ''}
                    onChangeText={handlePasswordChange}
                    onBlur={onBlur}
                    error={loginErrors.password?.message}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    autoComplete="password"
                  />
                );
              }}
            />

            <Button
              title={t('auth.login')}
              onPress={handleLoginSubmit(onLogin)}
              loading={loading}
              fullWidth
            />

            {__DEV__ && (
              <View style={styles.demoButtons}>
                <Text
                  style={[
                    styles.demoTitle,
                    typography.bodySemiBold,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {t('auth.demoAccounts')}
                </Text>
                <View style={styles.demoButtonRow}>
                  <TouchableOpacity
                    style={[styles.demoButton, { backgroundColor: colors.muted }]}
                    onPress={() => {
                      setLoginValue('email', 'user@test.com');
                      setLoginValue('password', '123456');
                    }}
                  >
                    <Ionicons name="person" size={16} color={colors.primary} />
                    <Text style={[styles.demoButtonText, typography.body, { color: colors.foreground }]}>
                      {t('auth.customerDemo')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.demoButton, { backgroundColor: colors.muted }]}
                    onPress={() => {
                      setLoginValue('email', 'owner@test.com');
                      setLoginValue('password', '123456');
                    }}
                  >
                    <Ionicons name="business" size={16} color={colors.primary} />
                    <Text style={[styles.demoButtonText, typography.body, { color: colors.foreground }]}>
                      {t('auth.ownerDemo')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text
              style={[
                styles.hint,
                typography.body,
                { color: colors.mutedForeground },
              ]}
            >
              Demo: {roleTab === 'user' ? 'user@test.com' : 'owner@test.com'} /
              123456
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label={`${t('auth.fullName')} *`}
              placeholder={t('auth.fullNamePlaceholder')}
              value={registerForm.fullName}
              onChangeText={(text) => setRegisterForm(prev => ({ ...prev, fullName: text }))}
              error={registerErrors.fullName}
              autoCapitalize="words"
            />

            <Input
              label={`${t('auth.email')} *`}
              placeholder={t('auth.emailPlaceholder')}
              value={registerForm.email}
              onChangeText={(text) => setRegisterForm(prev => ({ ...prev, email: text }))}
              error={registerErrors.email}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label={`${t('auth.password')} *`}
              placeholder={t('auth.passwordPlaceholder')}
              value={registerForm.password}
              onChangeText={(text) => setRegisterForm(prev => ({ ...prev, password: text }))}
              error={registerErrors.password}
              secureTextEntry
              textContentType="oneTimeCode"
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              keyboardType="default"
              returnKeyType="done"
              contextMenuHidden={false}
            />

            <Input
              label={`${t('auth.confirmPassword')} *`}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={registerForm.confirmPassword}
              onChangeText={(text) => setRegisterForm(prev => ({ ...prev, confirmPassword: text }))}
              error={registerErrors.confirmPassword}
              secureTextEntry
              textContentType="oneTimeCode"
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              keyboardType="default"
              returnKeyType="done"
              contextMenuHidden={false}
            />

            <Input
              label={roleTab === 'owner' ? t('auth.phone') : `${t('auth.phone')} (${t('common.optional')})`}
              placeholder={t('auth.phonePlaceholder')}
              value={registerForm.phone}
              onChangeText={(text) => setRegisterForm(prev => ({ ...prev, phone: text }))}
              error={registerErrors.phone}
              keyboardType="phone-pad"
            />

            {roleTab === 'owner' && (
              <>
                <Input
                  label={`${t('auth.businessName')} *`}
                  placeholder={t('auth.businessNamePlaceholder')}
                  value={registerForm.businessName}
                  onChangeText={(text) => setRegisterForm(prev => ({ ...prev, businessName: text }))}
                  error={registerErrors.businessName}
                  autoCapitalize="words"
                />
                
                <Text
                  style={[
                    styles.hint,
                    typography.body,
                    { color: colors.mutedForeground, marginTop: spacing.xs },
                  ]}
                >
                  You can update business details after registration
                </Text>
              </>
            )}

            <Button
              title={t('auth.register')}
              onPress={onRegister}
              loading={loading}
              fullWidth
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  languageToggle: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  languageButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 50,
    alignItems: 'center',
  },
  languageText: {
    fontSize: typography.sizes.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxxl,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.md,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  form: {
    width: '100%',
  },
  hint: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    marginTop: spacing.md,
  },
  demoButtons: {
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  demoTitle: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  demoButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  demoButtonText: {
    fontSize: typography.sizes.sm,
  },
  licenseSection: {
    marginBottom: spacing.md,
  },
  licenseLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
});
