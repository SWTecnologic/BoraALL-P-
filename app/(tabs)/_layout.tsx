import { Stack } from 'expo-router';
import { TouchableOpacity, View, Text, StyleSheet, Linking, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Drawer } from 'react-native-drawer-layout';
import { Menu, LogOut, Instagram, Facebook } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { menuItems } from './menuItems';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { usuario, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log('Drawer open state:', drawerOpen);
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    setDrawerOpen(false);
    router.replace('/(auth)/login');
  };

  const handleSocialMedia = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Erro ao abrir link:', err);
    });
  };

  const DrawerContent = () => (
    <SafeAreaView style={styles.drawerContainer} edges={['top', 'bottom']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.drawerScrollContent}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerName}>{usuario?.nome || 'Usuário'}</Text>
          <Text style={styles.drawerEmail}>{usuario?.email}</Text>
        </View>

        {/* Menu Items */}
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

        {/* Frase de Impacto */}
        <View style={styles.impactContainer}>
          <Text style={styles.impactText}>
            Sua mobilidade é nos que lhe fornece
          </Text>
          <View style={styles.impactLine} />
        </View>

        {/* Redes Sociais */}
        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>Siga-nos</Text>
          <View style={styles.socialButtons}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialMedia('https://www.instagram.com/quebracar')}
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

        {/* Sair */}
        <TouchableOpacity style={styles.drawerItem} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={[styles.drawerItemText, { color: '#EF4444' }]}>Sair</Text>
        </TouchableOpacity>

        {/* Espaço extra no final */}
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
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <Stack
          screenOptions={{
            headerShown: true,
            headerTransparent: true,
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
            headerStyle: {
              backgroundColor: 'transparent',
            },
            contentStyle: { 
              backgroundColor: '#F9FAFB',
            },
          }}
        >
          <Stack.Screen 
            name="index" 
            options={{ 
              title: 'Início',
            }} 
          />
          <Stack.Screen 
            name="history/index" 
            options={{ 
              title: 'Histórico',
            }} 
          />
          <Stack.Screen 
            name="profile/index" 
            options={{ 
              title: 'Perfil',
            }} 
          />
          <Stack.Screen 
            name="ajuda" 
            options={{ 
              title: 'Ajuda',
            }} 
          />
        </Stack>
      </View>
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
});