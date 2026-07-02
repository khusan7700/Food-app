import type { ExpoConfig } from 'expo/config';

const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;

const plugins: ExpoConfig['plugins'] = [
  [
    'expo-router',
    {
      root: './src/app',
    },
  ],
  [
    'expo-splash-screen',
    {
      image: './src/assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
  ],
  [
    'expo-image-picker',
    {
      photosPermission: 'Allow $(PRODUCT_NAME) to access your photos to upload images.',
    },
  ],
  [
    'expo-location',
    {
      locationWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location for delivery tracking.',
    },
  ],
];

if (kakaoNativeAppKey) {
  plugins.push(['@react-native-kakao/core', { nativeAppKey: kakaoNativeAppKey }]);
}

const config: ExpoConfig = {
  name: '오더이츠',
  slug: 'order-eats',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/images/icon.png',
  scheme: 'ordereats',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.khusan.ordereats',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './src/assets/images/android-icon-foreground.png',
      backgroundImage: './src/assets/images/android-icon-background.png',
      monochromeImage: './src/assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './src/assets/images/favicon.png',
  },
  plugins,
  experiments: {
    typedRoutes: true,
  },
};

export default config;
