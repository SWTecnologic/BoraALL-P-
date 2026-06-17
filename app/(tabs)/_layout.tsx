import { Stack } from 'expo-router';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Linking,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useState } from 'react';
import { Drawer } from 'react-native-drawer-layout';
import {
  Menu,
  LogOut,
  Instagram,
  Facebook,
  User,
  Home,
  Clock,
  HelpCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { LinearGradient } from 'expo-linear-gradient';

// 1. Menu com a cor dourada unificada
const menuItems = [
  { name: 'Início', icon: Home, path: '/(tabs)', color: '#F4B62A' },
  { name: 'Histórico', icon: Clock, path: '/(tabs)/history', color: '#F4B62A' },
  { name: 'Perfil', icon: User, path: '/(tabs)/profile', color: '#F4B62A' },
  { name: 'Ajuda', icon: HelpCircle, path: '/(tabs)/ajuda', color: '#F4B62A' },
];

export default function TabLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { usuario, signOut } = useAuth();
  const router = useRouter();

  usePushNotifications();
  useTokenRefresh();

  const getInitials = () => {
    if (usuario?.nome_completo) {
      const names = usuario.nome_completo.split(' ');
      return names.length >= 2
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return usuario?.email?.[0]?.toUpperCase() || 'U';
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              setDrawerOpen(false);
              await new Promise((resolve) => setTimeout(resolve, 300));
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível sair da conta.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleSocialMedia = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link.'));
  };

  const DrawerContent = () => (
    <SafeAreaView style={styles.drawerContainer} edges={['top', 'bottom']}>
      {/* 2. Gradiente do Drawer: preto → cinza → dourado */}
      <LinearGradient
        colors={['#000000', '#111111', '#F4B62A']}
        style={styles.drawerGradient}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.drawerScrollContent}
        >
          <View style={styles.drawerHeader}>
            {/* 5. Avatar do Drawer com borda dourada e fundo suave */}
            <View style={styles.drawerAvatar}>
              <Text style={styles.drawerAvatarText}>{getInitials()}</Text>
            </View>
            <Text style={styles.drawerName}>
              {usuario?.nome_completo || usuario?.email?.split('@')[0] || 'Usuário'}
            </Text>
            {/* 6. E-mail com cor clara D1D5DB */}
            <Text style={styles.drawerEmail}>{usuario?.email || ''}</Text>
          </View>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.drawerItem}
              onPress={() => {
                setDrawerOpen(false);
                router.push(item.path);
              }}
            >
              <View style={[styles.drawerIconBox, { backgroundColor: item.color + '20' }]}>
                <item.icon size={20} color={item.color} />
              </View>
              {/* 7. Texto do item branco */}
              <Text style={styles.drawerItemText}>{item.name}</Text>
            </TouchableOpacity>
          ))}

          {/* 8. Divisor com tom dourado */}
          <View style={styles.divider} />

          <View style={styles.impactContainer}>
            {/* 9. Slogan com dourado */}
            <Text style={styles.impactText}>🚀 Sua mobilidade é nós que lhe fornecemos</Text>
          </View>

          <View style={styles.socialSection}>
            {/* 10. Título social dourado, botões com fundo e borda dourada suave */}
            <Text style={styles.socialTitle}>Siga-nos</Text>
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialMedia('https://www.instagram.com/boraa.ali/')}
              >
                <Instagram size={22} color="#E4405F" />
                <Text style={styles.socialButtonText}>Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialMedia('https://www.facebook.com/quebracar')}
              >
                <Facebook size={22} color="#1877F2" />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.drawerItem, isLoggingOut && styles.disabledButton]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <View style={[styles.drawerIconBox, { backgroundColor: '#EF444420' }]}>
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <LogOut size={20} color="#ff0000" />
              )}
            </View>
            <Text style={[styles.drawerItemText, { color: '#ff0000' }]}>
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );

  return (
    <>
      {/* StatusBar em modo claro para fundo escuro */}
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Drawer
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        drawerType="front"
        drawerPosition="left"
        drawerStyle={{ width: '78%' }}
        swipeEnabled={true}
        renderDrawerContent={DrawerContent}
      >
        {/* 11. Fundo geral preto premium #0A0A0A */}
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }} edges={['top']}>
          <Stack
            screenOptions={{
              headerShown: true,
              headerTransparent: false,
              // 3. Header preto, sem sombra
              headerStyle: {
                backgroundColor: '#000000',
                shadowColor: 'transparent',
                elevation: 0,
              },
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => setDrawerOpen(true)}
                  style={styles.headerLeftButton}
                >
                  {/* 3. Ícone Menu na cor dourada */}
                  <Menu size={24} color="#F4B62A" />
                </TouchableOpacity>
              ),
              headerRight: () => (
                <View style={styles.headerRightContainer}>
                  <TouchableOpacity style={styles.avatarButton}>
                    {/* 4. Avatar do Header com borda dourada e fundo escuro */}
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>{getInitials()}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ),
              // 3. Título do header em dourado
              headerTitleStyle: {
                color: '#F4B62A',
                fontWeight: '700',
                fontSize: 20,
                letterSpacing: 0.5,
              },
              // 11. Conteúdo das telas com fundo escuro
              contentStyle: { backgroundColor: '#0A0A0A' },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'Início' }} />
            <Stack.Screen name="history/index" options={{ title: 'Histórico' }} />
            <Stack.Screen name="profile/index" options={{ title: 'Perfil' }} />
            <Stack.Screen name="ajuda" options={{ title: 'Ajuda' }} />
          </Stack>
        </SafeAreaView>
      </Drawer>
    </>
  );
}

const styles = StyleSheet.create({
  // ===== HEADER =====
  headerLeftButton: {
    marginLeft: 16,
    padding: 4,
  },
  headerRightContainer: {
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    padding: 2,
  },
  // 4. Avatar do Header: fundo escuro, borda dourada, texto dourado
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F4B62A',
  },
  avatarText: {
    color: '#F4B62A',
    fontSize: 16,
    fontWeight: '700',
  },

  // ===== DRAWER =====
  drawerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  drawerGradient: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  drawerHeader: {
    alignItems: 'center',
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244,182,42,0.2)',
    paddingBottom: 24,
  },
  // 5. Avatar do Drawer
  drawerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(244,182,42,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F4B62A',
  },
  drawerAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // 6. E-mail com cor D1D5DB
  drawerEmail: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
    textAlign: 'center',
  },
  // 7. Itens do menu: fundo leve e texto branco
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  drawerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // 8. Divisor com dourado translúcido
  divider: {
    height: 1,
    backgroundColor: 'rgba(244,182,42,0.25)',
    marginVertical: 16,
  },
  impactContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  // 9. Slogan dourado
  impactText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F4B62A',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  socialSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  // 10. Título social dourado
  socialTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F4B62A',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,182,42,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,182,42,0.25)',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpace: {
    height: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
});