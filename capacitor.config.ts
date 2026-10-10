import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ayk.echo",
  appName: "课猫 Echo",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_echo",
      iconColor: "#C8FF3D",
      sound: "echo_meow.wav",
    },
  },
};

export default config;
