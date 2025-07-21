import type { CapacitorConfig } from '@capacitor/cli';

console.log('📱 Capacitor Config: Using LOCAL assets (capacitor://localhost)');

const config: CapacitorConfig = {
  appId: 'com.yoganebula.insidemeter',
  appName: 'InsideMeter',
  webDir: 'dist/public',
  // NO server.url - forces Capacitor to use local assets
  bundledWebRuntime: false,
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    App: {
      schemes: ["insidemeter"]
    }
  },
  ios: {
    scheme: 'InsideMeter',
    // Handle custom URL schemes for auth callbacks
    allowsLinkPreview: false,
    contentMode: 'mobile',
    customUrlScheme: 'insidemeter'
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'insidemeter'
  }
};

export default config;
