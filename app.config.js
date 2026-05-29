import 'dotenv/config';

export default {
  expo: {
    name: "QuebraCar",
    slug: "quebra-car-transport",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "quebracar",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.quebracar.transport",
      config: {
        googleMapsApiKey: "AIzaSyBbJCXhzMsFn78A-fA-06ZPoXganyoEMP8",  // 🔑 substitua aqui
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "QuebraCar precisa da sua localização para encontrar motoristas próximos e calcular rotas.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "QuebraCar precisa da sua localização para rastreamento de corridas em tempo real.",
        NSCameraUsageDescription: "QuebraCar precisa acessar a câmera para foto do perfil e documentos.",
      },
    },
    
    android: {
      package: "com.quebracar.transport",
      config: {
        googleMaps: {
          apiKey: "AIzaSyBbJCXhzMsFn78A-fA-06ZPoXganyoEMP8",  // 🔑 substitua aqui
        },
      },
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.WAKE_LOCK",
      ],
    },
    
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png",
    },
    
    plugins: [
      "expo-router",
      "expo-font",
      "expo-location",
      "expo-camera",
      "expo-notifications",
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
      googleMapsApiKey: "AIzaSyBbJCXhzMsFn78A-fA-06ZPoXganyoEMP8",  // para uso no código JS
    },
  },
};