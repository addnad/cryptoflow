import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cryptoflow.game",
  appName: "Crypto Flow",
  webDir: "out",
  backgroundColor: "#0b0e17",
  ios: {
    contentInset: "never",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
