// app/(tabs)/_layout.tsx
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
  Platform,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
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
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

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
    <View style={styles.drawerContainer}>
      <LinearGradient
        colors={['#000000', '#111111', '#F4B62A']}
        style={styles.drawerGradient}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.drawerScrollContent}
        >
          <View style={styles.drawerHeader}>
            <View style={styles.drawerAvatar}>
              <Text style={styles.drawerAvatarText}>{getInitials()}</Text>
            </View>
            <Text style={styles.drawerName}>
              {usuario?.nome_completo || usuario?.email?.split('@')[0] || 'Usuário'}
            </Text>
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
              <Text style={styles.drawerItemText}>{item.name}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          <View style={styles.impactContainer}>
            <Text style={styles.impactText}>🚀 Sua mobilidade é nós que lhe fornecemos</Text>
          </View>

          <View style={styles.socialSection}>
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
    </View>
  );

  return (
    <>
      <StatusBar style="light" />
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
        {/* 
          ⭐ SOLUÇÃO DEFINITIVA: 
          O SafeAreaView com edges={['top']} dentro do Drawer 
          é a única forma de garantir que o header não suba
        */}
        <SafeAreaView 
          edges={['top']} 
          style={{ flex: 1, backgroundColor: '#0A0A0A' }}
        >
          <Stack
            screenOptions={{
              headerShown: true,
              header: (props) => {
                // ⭐ HEADER PERSONALIZADO COM PADDING TOP DINÂMICO
                const paddingTop = props.options.headerStatusBarHeight !== undefined 
                  ? props.options.headerStatusBarHeight 
                  : insets.top;
                
                return (
                  <View style={[
                    styles.customHeader,
                    { 
                      paddingTop: paddingTop,
                      height: 60 + paddingTop,
                    }
                  ]}>
                    <View style={styles.headerContent}>
                      <TouchableOpacity
                        onPress={() => setDrawerOpen(true)}
                        style={styles.headerLeftButton}
                      >
                        <Menu size={24} color="#F4B62A" />
                      </TouchableOpacity>
                      
                      <Text style={styles.headerTitle}>
                        {props.options.title || 'BoraAli'}
                      </Text>
                      
                      <View style={styles.headerRightContainer}>
                        <TouchableOpacity style={styles.avatarButton}>
                          <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>{getInitials()}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              },
              headerStatusBarHeight: 0,
              headerStyle: {
                backgroundColor: '#000000',
                shadowColor: 'transparent',
                elevation: 0,
              },
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
  customHeader: {
    backgroundColor: '#000000',
    borderBottomWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeftButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#F4B62A',
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: 0.5,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    padding: 2,
  },
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
  drawerEmail: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
    textAlign: 'center',
  },
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(244,182,42,0.25)',
    marginVertical: 16,
  },
  impactContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
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