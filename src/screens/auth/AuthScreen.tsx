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
  
  const [roleTab, setRoleTab] = useState<'user' | 'employee' | 'owner'>('user');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);

  // Employee-specific registration state
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');
  const [joinCodeVerified, setJoinCodeVerified] = useState(false);
  const [verifiedBusinessName, setVerifiedBusinessName] = useState('');
  const [joinCodeLoading, setJoinCodeLoading] = useState(false);

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
    specialization: '',
  });

  const [registerErrors, setRegisterErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
    businessName?: string;
    joinCode?: string;
  }>({});

  const onLogin = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const expectedRole = roleTab === 'user' ? 'USER' : roleTab === 'employee' ? 'EMPLOYEE' : 'OWNER';
      await login(data, expectedRole);
    } catch (error: any) {
      if (error.message === 'Role mismatch') {
        const errorKey = error.expectedRole === 'USER'
          ? 'auth.roleMismatchCustomer'
          : 'auth.roleMismatchOwner';
        Alert.alert(t('common.error'), t(errorKey));
      } else {
        Alert.alert(t('common.error'), error.message || t('auth.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const onVerifyJoinCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinCodeError(t('auth.joinCodeLength'));
      return;
    }
    setJoinCodeLoading(true);
    setJoinCodeError('');
    setJoinCodeVerified(false);
    try {
      const result = await authService.verifyJoinCode(code);
      setVerifiedBusinessName(result.businessName);
      setJoinCodeVerified(true);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || t('auth.invalidCode');
      setJoinCodeError(msg);
    } finally {
      setJoinCodeLoading(false);
    }
  };

  const onRegister = async () => {
    // Clear previous errors
    setRegisterErrors({});

    // Validate form
    const errors: typeof registerErrors = {};
    
    if (!registerForm.fullName || registerForm.fullName.trim().length < 2) {
      errors.fullName = t('auth.nameMinLength');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!registerForm.email || !emailRegex.test(registerForm.email)) {
      errors.email = t('auth.invalidEmail');
    }

    if (!registerForm.password || registerForm.password.length < 6) {
      errors.password = t('auth.passwordMinLength');
    }

    if (!registerForm.confirmPassword) {
      errors.confirmPassword = t('auth.confirmPasswordRequired');
    } else if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = t('auth.passwordsNotMatch');
    }

    if (roleTab === 'owner' && (!registerForm.businessName || registerForm.businessName.trim() === '')) {
      errors.businessName = t('auth.businessNameRequired');
    }

    if (roleTab === 'employee' && !joinCodeVerified) {
      errors.joinCode = t('auth.verifyCodeFirst');
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }

    setLoading(true);
    try {
      if (roleTab === 'owner') {
        await authService.registerOwner({
          fullName: registerForm.fullName.trim(),
          email: registerForm.email.trim().toLowerCase(),
          password: registerForm.password,
          phone: registerForm.phone?.trim() || undefined,
          businessName: registerForm.businessName.trim(),
        });
      } else if (roleTab === 'employee') {
        await authService.registerEmployee({
          fullName: registerForm.fullName.trim(),
          email: registerForm.email.trim().toLowerCase(),
          password: registerForm.password,
          joinCode: joinCode.trim().toUpperCase(),
          specialization: registerForm.specialization.trim() || undefined,
        });
      } else {
        await authService.registerUser({
          fullName: registerForm.fullName.trim(),
          email: registerForm.email.trim().toLowerCase(),
          password: registerForm.password,
          phone: registerForm.phone?.trim() || undefined,
        });
      }

      // After registration, login with the same credentials
      await login({
        email: registerForm.email.trim().toLowerCase(),
        password: registerForm.password,
      });
    } catch (error: any) {
      let errorMessage = t('auth.registerError');
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show which field has the issue if available
      if (error.response?.data?.field) {
        errorMessage = `${error.response.data.field}: ${errorMessage}`;
      }
      
      Alert.alert(t('auth.registerError'), errorMessage);
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {__DEV__ && <BackendHealthCheck />}
        
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
            label={t('auth.employee')}
            selected={roleTab === 'employee'}
            onPress={() => setRoleTab('employee')}
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
                    style={[styles.demoButton, { borderWidth: 1, borderColor: colors.primary }]}
                    onPress={() => {
                      setRoleTab('user');
                      setLoginValue('email', 'customer@demo.com');
                      setLoginValue('password', 'demo1234');
                    }}
                  >
                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                    <Text style={[styles.demoButtonText, typography.body, { color: colors.primary }]}>
                      {t('auth.customer')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.demoButton, { borderWidth: 1, borderColor: colors.primary }]}
                    onPress={() => {
                      setRoleTab('owner');
                      setLoginValue('email', 'owner@demo.com');
                      setLoginValue('password', 'demo1234');
                    }}
                  >
                    <Ionicons name="business-outline" size={16} color={colors.primary} />
                    <Text style={[styles.demoButtonText, typography.body, { color: colors.primary }]}>
                      {t('auth.businessOwner')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.demoButton, { borderWidth: 1, borderColor: colors.primary }]}
                    onPress={() => {
                      setRoleTab('employee');
                      setLoginValue('email', 'ahmet@craftstudio.com');
                      setLoginValue('password', 'demo1234');
                    }}
                  >
                    <Ionicons name="cut-outline" size={16} color={colors.primary} />
                    <Text style={[styles.demoButtonText, typography.body, { color: colors.primary }]}>
                      {t('auth.employee')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
                    { color: colors.mutedForeground },
                  ]}
                >
                  {t('auth.updateDetailsLater')}
                </Text>

                {/* Business Verification */}
                <View style={styles.verificationSection}>
                  <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.md }]}>
                    {t('auth.businessVerification')}
                  </Text>
                  <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm, marginTop: spacing.xs }]}>
                    {t('auth.businessVerificationSubtitle')}
                  </Text>

                  <View style={{ marginTop: spacing.md }}>
                    <Input
                      placeholder={t('auth.taxNumber')}
                      keyboardType="numeric"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.uploadRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                    <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm, flex: 1 }]}>
                      {t('auth.uploadDocument')}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>

                  <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs, marginTop: spacing.sm }]}>
                    {t('auth.verificationDisclaimer')}
                  </Text>
                </View>
              </>
            )}

            {roleTab === 'employee' && (
              <>
                <View style={styles.joinCodeRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={`${t('auth.joinCode')} *`}
                      placeholder="XXXXXX"
                      value={joinCode}
                      onChangeText={(text) => {
                        setJoinCode(text.toUpperCase());
                        setJoinCodeVerified(false);
                        setJoinCodeError('');
                      }}
                      error={registerErrors.joinCode || joinCodeError}
                      autoCapitalize="characters"
                      maxLength={6}
                    />
                  </View>
                  <View style={styles.verifyButtonWrapper}>
                    <Button
                      title={joinCodeLoading ? '...' : t('auth.verifyCode')}
                      onPress={onVerifyJoinCode}
                      loading={joinCodeLoading}
                      variant="outline"
                    />
                  </View>
                </View>

                {joinCodeVerified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: colors.muted }]}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={[typography.body, { color: colors.success, fontSize: 13 }]}>
                      {t('auth.codeVerifiedFor', { businessName: verifiedBusinessName })}
                    </Text>
                  </View>
                )}

                <Input
                  label={`${t('auth.specialization')} (${t('common.optional')})`}
                  placeholder={t('auth.specializationPlaceholder')}
                  value={registerForm.specialization}
                  onChangeText={(text) => setRegisterForm(prev => ({ ...prev, specialization: text }))}
                  autoCapitalize="sentences"
                />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
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
    borderRadius: borderRadius.pill,
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
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minHeight: 44,
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
  joinCodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  verifyButtonWrapper: {
    paddingBottom: 2,
    minWidth: 90,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  verificationSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
