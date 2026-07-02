import { Platform } from 'react-native';

function getApiUrl(): string {
  // Web da browser qaysi hostda ishlasa, API ham o'sha hostda deb hisoblaymiz.
  // Misol: localhost:8081 → localhost:3000/api
  //        192.168.0.x:8081 → 192.168.0.x:3000/api
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
}

export const API_URL = getApiUrl();
