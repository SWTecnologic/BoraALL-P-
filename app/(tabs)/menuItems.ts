import { Home, Car, User, HelpCircle } from 'lucide-react-native';

export const menuItems = [
  {
    name: 'Início',
    icon: Home,
    path: '/(tabs)',
    color: '#059669', // Verde combinando com o tema
  },
  {
    name: 'Histórico',
    icon: Car,
    path: '/(tabs)/history',
    color: '#059669',
  },
  {
    name: 'Perfil',
    icon: User,
    path: '/(tabs)/profile',
    color: '#059669',
  },
  {
    name: 'Ajuda',
    icon: HelpCircle,
    path: '/(tabs)/ajuda',
    color: '#059669',
  },
];