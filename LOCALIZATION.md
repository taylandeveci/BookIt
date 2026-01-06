# Localization Guide

## Overview

BookIT now supports full app localization with English (EN) and Turkish (TR) languages. Users can switch between languages using toggles in the Auth screen and Profile screen.

## Language Support

- **English (EN)**: Default language
- **Turkish (TR)**: Full Turkish translation

## Language Detection

The app automatically detects and sets the language based on:
1. Previously saved user preference (stored in AsyncStorage)
2. Device locale (if Turkish device → TR, otherwise → EN)
3. Fallback to English if none of the above applies

## Language Toggle Locations

### 1. Auth/Welcome Screen
- Small EN | TR toggle at the top-right of the screen
- Changes take effect immediately
- Persists across app restarts

### 2. Profile Screen
- Language selector under the Theme selector
- Same UI/UX as the Theme selector
- Options: "English" and "Türkçe"
- Changes apply instantly

## Implementation Details

### Dependencies

```json
{
  "i18next": "^23.x.x",
  "react-i18next": "^14.x.x",
  "expo-localization": "^15.x.x",
  "@react-native-async-storage/async-storage": "^1.x.x"
}
```

### File Structure

```
src/localization/
├── i18n.ts           # i18n configuration and initialization
├── locales/
│   ├── en.json       # English translations
│   └── tr.json       # Turkish translations
```

### Usage in Components

#### Basic Translation

```typescript
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <Text>{t('common.loading')}</Text>
  );
};
```

#### Changing Language

```typescript
import { setAppLanguage } from '../../localization/i18n';

const handleLanguageChange = async (lang: 'en' | 'tr') => {
  await setAppLanguage(lang);
};
```

####Getting Current Language

```typescript
import { getCurrentLanguage } from '../../localization/i18n';

const currentLang = getCurrentLanguage(); // 'en' or 'tr'
```

## Translation Keys

Translation keys are organized by feature/screen:

### Common
- `common.loading`, `common.cancel`, `common.save`, etc.
- Used across multiple screens

### Auth
- `auth.title`, `auth.login`, `auth.register`, etc.
- Login and registration related strings

### Navigation
- `navigation.dashboard`, `navigation.profile`, etc.
- Tab bar and navigation labels

### Dashboard
- `dashboard.welcome`, `dashboard.todaysAppointments`, etc.
- Dashboard-specific strings

### Profile
- `profile.title`, `profile.theme`, `profile.language`, etc.
- Profile and settings strings

### Services, Requests, Employees, Appointments, Reviews, etc.
- Each feature has its own namespace

## Adding New Translations

### Step 1: Add to English translation file

Edit `src/localization/locales/en.json`:

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}
```

### Step 2: Add to Turkish translation file

Edit `src/localization/locales/tr.json`:

```json
{
  "myFeature": {
    "title": "Özelliğim",
    "description": "Bu benim özelliğim"
  }
}
```

### Step 3: Use in component

```typescript
const { t } = useTranslation();

<Text>{t('myFeature.title')}</Text>
<Text>{t('myFeature.description')}</Text>
```

## Screens Status

### ✅ Fully Translated
- [x] AuthScreen (with language toggle)
- [ ] ProfileScreen (pending language selector)
- [ ] DashboardScreen
- [ ] Other screens (see Remaining Work)

### 🔄 Partially Translated
- Most screens have translation keys defined in JSON files
- Need to replace hardcoded strings with `t()` calls

### ❌ Not Yet Translated
- Some components may still have hardcoded strings
- Navigation headers need translation support

## Remaining Work

To complete the localization implementation:

1. **Add Language Selector to ProfileScreen**
   - Add below theme selector
   - Match existing UI style
   - Use `setAppLanguage()` to change language

2. **Update All Screens with useTranslation()**
   - Replace all hardcoded strings with `t('key')` calls
   - Screens to update:
     - ProfileScreen
     - DashboardScreen
     - RequestsScreen
     - EmployeesScreen
     - ServicesScreen
     - OwnerProfileScreen
     - HomeScreen
     - SearchScreen
     - BusinessDetailScreen
     - AppointmentsScreen
     - ReviewScreen
     - EditProfileScreen
     - ChangePasswordScreen
     - BusinessReviewsScreen

3. **Update Navigation Labels**
   - File: `src/navigation/RootNavigator.tsx`
   - Update tab labels to use `t()` or `i18next.t()`
   - Update screen titles

4. **Update Components**
   - Button, Input, and other reusable components
   - Replace any hardcoded strings with translation keys

5. **Handle Backend Messages**
   - Backend error messages remain unchanged (server-provided)
   - Only wrap default/fallback error messages in `t()`

## Backend Messages

The following strings are intentionally NOT translated (server-provided):
- API error messages from backend
- Validation errors from backend (when specific)
- Server-side generated messages

Default error messages (when backend doesn't provide details) ARE translated using:
- `common.error`
- `common.tryAgain`
- Feature-specific error keys

## Testing Checklist

- [ ] Start app → Language toggle visible on Auth screen
- [ ] Switch to TR → All UI text becomes Turkish
- [ ] Register/Login → Forms work in both languages
- [ ] Close and reopen app → Language persists
- [ ] Navigate through customer flow → All screens in selected language
- [ ] Navigate through owner flow → All screens in selected language
- [ ] Switch to EN → All UI returns to English
- [ ] Profile screen → Language selector visible and functional
- [ ] No TypeScript errors
- [ ] No runtime crashes
- [ ] Navigation labels update with language change

## Troubleshooting

### Language not changing

Check:
1. AsyncStorage permissions
2. i18n initialization in App.tsx
3. Component is using `useTranslation()` hook
4. Translation keys exist in both en.json and tr.json

### Translation key not found

Check:
1. Key exists in both language files
2. Key path is correct (e.g., `auth.login` not `login`)
3. No typos in key name
4. JSON files are valid (no trailing commas)

### Language resets on app restart

Check:
1. AsyncStorage is properly saving (`APP_LANGUAGE` key)
2. Language detector is running in i18n.ts
3. No errors in language detector logic

## Best Practices

1. **Always add keys to both language files simultaneously**
2. **Use descriptive key names** (`auth.emailPlaceholder` not `emailPH`)
3. **Group related keys** (all auth-related keys under `auth.*`)
4. **Keep backend messages as-is** (don't translate server responses)
5. **Test both languages** before committing changes
6. **Use nested keys** for organization (e.g., `profile.editProfile.title`)
7. **Avoid hardcoded strings** in UI components

## Example: Complete Feature Translation

```typescript
// 1. Add to en.json
{
  "booking": {
    "title": "Book Appointment",
    "selectService": "Select Service",
    "confirmBooking": "Confirm Booking",
    "success": "Appointment booked successfully"
  }
}

// 2. Add to tr.json
{
  "booking": {
    "title": "Randevu Al",
    "selectService": "Hizmet Seç",
    "confirmBooking": "Randevuyu Onayla",
    "success": "Randevu başarıyla oluşturuldu"
  }
}

// 3. Use in component
import { useTranslation } from 'react-i18next';

export const BookingScreen = () => {
  const { t } = useTranslation();
  
  return (
    <View>
      <Text style={styles.title}>{t('booking.title')}</Text>
      <Text>{t('booking.selectService')}</Text>
      <Button title={t('booking.confirmBooking')} />
    </View>
  );
};
```

## Language-Specific Considerations

### Turkish
- Use proper Turkish characters (ı, ğ, ü, ş, ö, ç)
- Follow Turkish grammar rules
- Formal tone for professional contexts
- Informal tone is acceptable for in-app messages

### English
- Use American English spelling
- Keep messages concise and clear
- Professional but friendly tone

## Support

For questions or issues with localization:
1. Check this documentation
2. Review example implementations in AuthScreen
3. Check translation key definitions in locale files
4. Verify i18n configuration in `src/localization/i18n.ts`
