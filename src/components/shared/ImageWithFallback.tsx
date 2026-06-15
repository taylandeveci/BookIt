import React, { useState } from 'react';
import { Image, ImageProps, View, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

interface ImageWithFallbackProps extends Omit<ImageProps, 'source' | 'style'> {
  uri: string;
  style?: StyleProp<ImageStyle | ViewStyle>;
  iconSize?: number;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ uri, style, iconSize = 24, ...rest }) => {
  const { colors } = useTheme();
  const [hasError, setHasError] = useState(false);

  if (hasError || !uri) {
    return (
      <View style={[style as StyleProp<ViewStyle>, styles.placeholder, { backgroundColor: colors.muted }]}>
        <Ionicons name="image-outline" size={iconSize} color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style as StyleProp<ImageStyle>}
      onError={() => setHasError(true)}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
