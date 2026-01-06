export const lightTheme = {
  background: '#FDFCF8',
  foreground: '#2C2C24',
  primary: '#5D7052',
  primaryForeground: '#F3F4F1',
  secondary: '#C18C5D',
  secondaryForeground: '#FFFFFF',
  accent: '#E6DCCD',
  accentForeground: '#2C2C24',
  muted: '#F0EBE5',
  mutedForeground: '#78786C',
  border: '#DED8CF',
  destructive: '#A85448',
  destructiveForeground: '#FFFFFF',
  card: '#FFFFFF',
  cardForeground: '#2C2C24',
  input: '#FFFFFF',
  inputBorder: '#DED8CF',
  placeholder: '#B0AFA5',
  success: '#5D7052',
  warning: '#C18C5D',
  info: '#6B8E9F',
};

export const darkTheme = {
  background: '#1A1A16',
  foreground: '#F3F4F1',
  primary: '#7A9570',
  primaryForeground: '#1A1A16',
  secondary: '#D4A574',
  secondaryForeground: '#1A1A16',
  accent: '#3D3D35',
  accentForeground: '#F3F4F1',
  muted: '#2A2A22',
  mutedForeground: '#A8A89C',
  border: '#3D3D35',
  destructive: '#C86B5E',
  destructiveForeground: '#FFFFFF',
  card: '#242420',
  cardForeground: '#F3F4F1',
  input: '#2A2A22',
  inputBorder: '#3D3D35',
  placeholder: '#6B6B5F',
  success: '#7A9570',
  warning: '#D4A574',
  info: '#8BAAB9',
};

export type Theme = typeof lightTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  heading: {
    fontFamily: 'Fraunces_700Bold',
  },
  headingSemiBold: {
    fontFamily: 'Fraunces_600SemiBold',
  },
  body: {
    fontFamily: 'Nunito_400Regular',
  },
  bodySemiBold: {
    fontFamily: 'Nunito_600SemiBold',
  },
  bodyBold: {
    fontFamily: 'Nunito_700Bold',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },
};

// Organic shadow with moss tint for light mode
export const shadows = {
  light: {
    sm: {
      shadowColor: '#5D7052',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#5D7052',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#5D7052',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  dark: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
