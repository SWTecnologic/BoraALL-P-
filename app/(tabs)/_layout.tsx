// app/(tabs)/_layout.tsx
import { Stack } from 'expo-router';
import { TouchableOpacity, View, Text, StyleSheet, Linking, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Drawer } from 'react-native-drawer-layout';
import { Menu, LogOut, Instagram, Facebook } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { menuItems } from './menuItems';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

export default function TabLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { usuario, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  usePushNotifications();
  useTokenRefresh();

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
              await new Promise(resolve => setTimeout(resolve, 300));
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Erro no logout:', error);
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
    Linking.openURL(url).catch(err => {
      console.error('Erro ao abrir link:', err);
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    });
  };

  const DrawerContent = () => (
    <SafeAreaView style={styles.drawerContainer} edges={['top', 'bottom']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.drawerScrollContent}
      >
        <View style={styles.drawerHeader}>
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
            <item.icon size={20} color={item.color} />
            <Text style={styles.drawerItemText}>{item.name}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        <View style={styles.impactContainer}>
          <Text style={styles.impactText}>
            Sua mobilidade é nos que lhe fornece
          </Text>
          <View style={styles.impactLine} />
        </View>

        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>Siga-nos</Text>
          <View style={styles.socialButtons}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialMedia('https://www.instagram.com/boraa.ali/')}
            >
              <Instagram size={24} color="#E4405F" />
              <Text style={styles.socialButtonText}>Instagram</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialMedia('https://www.facebook.com/quebracar')}
            >
              <Facebook size={24} color="#1877F2" />
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
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <LogOut size={20} color="#EF4444" />
          )}
          <Text style={[styles.drawerItemText, { color: '#EF4444' }]}>
            {isLoggingOut ? 'Saindo...' : 'Sair'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );

  return (
   <Drawer
  open={drawerOpen}
  onOpen={() => setDrawerOpen(true)}
  onClose={() => setDrawerOpen(false)}
  drawerType="front"
  drawerPosition="left"
  drawerStyle={{ width: '80%' }}
  swipeEnabled={true}
  renderDrawerContent={DrawerContent}
>
  {/* SafeAreaView apenas para o conteúdo, sem paddingTop */}
  <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: false, // mantém cor de fundo do header
        headerStyle: {
          backgroundColor: '#f6f7f9',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => setDrawerOpen(true)}
            style={{ marginLeft: 16 }}
          >
            <Menu size={24} color="#1F2937" />
          </TouchableOpacity>
        ),
        headerTitleStyle: { 
          color: '#1F2937', 
          fontWeight: '600',
          fontSize: 18,
        },
        contentStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Início' }} />
      <Stack.Screen name="history/index" options={{ title: 'Histórico' }} />
      <Stack.Screen name="profile/index" options={{ title: 'Perfil' }} />
      <Stack.Screen name="ajuda" options={{ title: 'Ajuda' }} />
    </Stack>
  </SafeAreaView>
</Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  drawerScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  drawerHeader: {
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F0FDF4',
    paddingBottom: 16,
  },
  drawerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  drawerEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  drawerItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0FDF4',
    marginVertical: 16,
  },
  impactContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  impactText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  impactLine: {
    width: 50,
    height: 2,
    backgroundColor: '#10B981',
    marginTop: 8,
    borderRadius: 2,
  },
  socialSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  socialTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  bottomSpace: {
    height: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
});