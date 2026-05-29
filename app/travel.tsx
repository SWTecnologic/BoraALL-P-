// app/travel.tsx
import 'react-native-get-random-values';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Check, Crosshair } from 'lucide-react-native';
import Constants from 'expo-constants';

const GOOGLE_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || '';

// Coordenadas aproximadas do centro de Santa Rita do Sapucaí
const SANTA_RITA_COORDS = {
  latitude: -22.2464,
  longitude: -45.7033,
};

export default function TravelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [pinCoordinate, setPinCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addressText, setAddressText] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const mapRef = useRef<MapView>(null);

  const originLat = params.originLat ? parseFloat(params.originLat as string) : null;
  const originLng = params.originLng ? parseFloat(params.originLng as string) : null;
  const destLat = params.destLat ? parseFloat(params.destLat as string) : null;
  const destLng = params.destLng ? parseFloat(params.destLng as string) : null;
  const destAddress = params.destAddress as string | undefined;

  useEffect(() => {
    if (originLat && originLng) {
      const region = {
        latitude: originLat,
        longitude: originLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setMapRegion(region);
      if (!pinCoordinate) {
        setPinCoordinate({ latitude: originLat, longitude: originLng });
        reverseGeocode(originLat, originLng);
      }
    } else {
      requestUserLocation();
    }
  }, []);

  useEffect(() => {
    if (destLat && destLng && destAddress) {
      setPinCoordinate({ latitude: destLat, longitude: destLng });
      setAddressText(destAddress);
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: destLat,
            longitude: destLng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          1000
        );
      }
    }
  }, [destLat, destLng]);

  const requestUserLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Ative a localização para usar o mapa.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    const region = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    setMapRegion(region);
    setPinCoordinate({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    reverseGeocode(location.coords.latitude, location.coords.longitude);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result.length > 0) {
        const addr = result[0];
        const formatted = `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city} - ${addr.region}`;
        setAddressText(formatted.trim() || 'Endereço não disponível');
      } else {
        setAddressText('Endereço não encontrado');
      }
    } catch (error) {
      console.error(error);
      setAddressText('Erro ao obter endereço');
    }
    setLoadingAddress(false);
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPinCoordinate({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const handleDragEnd = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPinCoordinate({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const confirmLocation = () => {
    if (!pinCoordinate) {
      Alert.alert('Nenhum local selecionado', 'Toque no mapa ou mova o pino para escolher um destino.');
      return;
    }
    Alert.alert('Local confirmado', `Destino: ${addressText}`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
    // Aqui você pode salvar o endereço nos lugares recentes
  };

  const centerOnUser = async () => {
    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      500
    );
    setPinCoordinate({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  if (!mapRegion) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text>Carregando mapa...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header com botão voltar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Definir local no mapa</Text>
        </View>

        {/* Busca de endereço */}
        <View style={styles.searchWrapper}>
          <GooglePlacesAutocomplete
            placeholder="Buscar endereço..."
            onPress={(data, details = null) => {
              if (details) {
                const { lat, lng } = details.geometry.location;
                setPinCoordinate({ latitude: lat, longitude: lng });
                reverseGeocode(lat, lng);
                mapRef.current?.animateToRegion(
                  { latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
                  1000
                );
              }
            }}
            query={{
              key: GOOGLE_API_KEY,
              language: 'pt-BR',
            }}
            // 🔧 CORREÇÃO: usa locationRestriction com círculo para restringir à área
            locationRestriction={{
              latitude: SANTA_RITA_COORDS.latitude,
              longitude: SANTA_RITA_COORDS.longitude,
              radius: 10000, // 10 km de raio
            }}
            styles={{
              textInput: styles.searchInput,
              container: { flex: 0, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 },
              listView: {
                backgroundColor: 'white',
                borderRadius: 8,
                marginTop: 60,
                elevation: 3,
                maxHeight: 200,
              },
            }}
            fetchDetails
            renderLeftButton={() => <MapPin size={20} color="#6B7280" style={{ marginLeft: 12 }} />}
            onFail={(error) => console.error('Google Places error:', error)}
            textInputProps={{
              placeholderTextColor: '#9CA3AF',
              returnKeyType: 'search',
            }}
            keyboardShouldPersistTaps="handled"
          />
        </View>

        {/* Mapa com pin arrastável */}
        <MapView
          ref={mapRef}
          style={styles.map}
          region={mapRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {pinCoordinate && (
            <Marker
              coordinate={pinCoordinate}
              draggable
              onDragEnd={handleDragEnd}
              pinColor="#2563EB"
              title="Destino"
            />
          )}
        </MapView>

        {/* Botão centralizar no usuário */}
        <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
          <Crosshair size={24} color="#2563EB" />
        </TouchableOpacity>

        {/* Card inferior com endereço e confirmação */}
        <View style={styles.bottomCard}>
          <View style={styles.addressContainer}>
            <MapPin size={20} color="#2563EB" />
            {loadingAddress ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.addressText}>{addressText || 'Toque no mapa para selecionar'}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.confirmButton} onPress={confirmLocation}>
            <Check size={20} color="#FFF" />
            <Text style={styles.confirmButtonText}>Confirmar local</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchWrapper: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 40,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  map: {
    flex: 1,
  },
  centerButton: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 4,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    elevation: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 40,
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
});