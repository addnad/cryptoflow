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
  plugins: {
    // Native Google Sign-In returns a credential that the Firebase JS SDK
    // consumes (skipNativeAuth), so a single JS auth state backs Firestore.
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["google.com"],
    },
  },
};

export default config;
