import 'dotenv/config'; // Load .env variables into process.env

export default {
  expo: {
    name: "4tp",
    slug: "4tp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ray.4tp"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    // Reference the actual environment variable here
    extra: {
      // Make sure any OTHER keys you might need are also mapped here
      congressGovApiKey: process.env.GOV_API_KEY,
      // Example: Add other keys if they were in your .env
      // googleCivicApiKey: process.env.GOOGLE_CIVIC_API_KEY,
      // supabaseUrl: process.env.SUPABASE_URL,
      // supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    }
  }
}; 