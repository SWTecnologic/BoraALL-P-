import 'dotenv/config';

export default {
  expo: {
    name: "BoraAli",
    slug: "quebra-car-transport",
    version: "3.6.26",

    // ✅ ADICIONE ISSO
    jsEngine: "hermes",

    orientation: "portrait",
    icon: "./assets/images/LogoAli.png",
    scheme: "BoraAli",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    owner: "pablo095",

    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.quebracar.transport",

      config: {
        googleMapsApiKey:
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },

      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "BoraAli precisa da sua localização para encontrar motoristas próximos e calcular rotas.",

        NSLocationAlwaysAndWhenInUseUsageDescription:
          "BoraAli precisa da sua localização para rastreamento de corridas em tempo real.",

        NSCameraUsageDescription:
          "BoraAli precisa acessar a câmera para foto do perfil e documentos.",

        NSUserNotificationUsageDescription:
          "BoraAli utiliza notificações para avisos de corridas e atualizações.",
      },
    },

    android: {
      package: "com.quebracar.transport",

      versionCode: 2126,

      adaptiveIcon: {
        foregroundImage: "./assets/images/LogoAli.png",
        backgroundColor: "#ffffff",
      },

      config: {
        googleMaps: {
          apiKey:
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },

      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.WAKE_LOCK",
        "android.permission.POST_NOTIFICATIONS",
      ],
    },

    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/LogoAli.png",
    },

    plugins: [
      "expo-router",
      "expo-font",
      "expo-location",
      "expo-camera",

      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#2563EB",
        },
      ],

      "expo-web-browser",
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      eas: {
        projectId: "bb4a269c-dfc8-4865-a866-fd3f43f34c74",
      },

      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL,

      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      googleMapsApiKey:
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
};