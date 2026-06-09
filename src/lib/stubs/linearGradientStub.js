/**
 * Stub for react-native-linear-gradient / expo-linear-gradient.
 * react-native-gifted-charts requires one of these packages even when no
 * gradient props are used. This stub renders a plain View so the chart
 * works without the gradient package installed.
 */
import React from 'react';
import { View } from 'react-native';

function LinearGradient({ colors: gradientColors, style, children, ...rest }) {
  const backgroundColor =
    gradientColors && gradientColors.length > 0 ? gradientColors[0] : 'transparent';
  return (
    <View style={[{ backgroundColor }, style]} {...rest}>
      {children}
    </View>
  );
}

export { LinearGradient };
export default LinearGradient;
