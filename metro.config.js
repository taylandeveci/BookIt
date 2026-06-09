const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const gradientStub = path.resolve(__dirname, 'src/lib/stubs/linearGradientStub.js');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-linear-gradient': gradientStub,
  'expo-linear-gradient': gradientStub,
};

module.exports = config;
