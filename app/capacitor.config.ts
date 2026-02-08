import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockpile.app',
  appName: 'OdicamStock',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
