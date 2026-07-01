import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { spacing, typography } from '../theme/theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, right }) => {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = onBack ?? (() => navigation.goBack());

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="chevron-back" size={24} color={colors.foreground} />
      </TouchableOpacity>

      <Text style={[styles.title, typography.headingSemiBold, { color: colors.foreground }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightSlot}>
        {right ?? null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    marginHorizontal: spacing.xs,
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
});
