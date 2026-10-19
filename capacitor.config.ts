import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sagardas.portfolio',
  appName: 'Sagar Portfolio',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  }
};

export default config;
