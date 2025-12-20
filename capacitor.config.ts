import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myiep.app',
  appName: 'MyIEP',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.file"
      ],
      serverClientId: "910593096810-ta1dn24769q4loaqjes10e5gkh2gfhml.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    }
  }
  // ▲▲▲ 여기까지 ▲▲▲
};
export default config;
