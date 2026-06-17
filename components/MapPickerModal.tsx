// components/MapPickerModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { X, Check, MapPin, Navigation } from 'lucide-react-native';

const SANTA_RITA_COORDS = { latitude: -22.2464, longitude: -45.7033 };

interface MapPickerModalProps {
  visible: boolean;
  initialCoord: { latitude: number; longitude: number } | null;
  onConfirm: (coord: { latitude: number; longitude: number }, address: string) => void;
  onClose: () => void;
  target: 'origin' | 'dest' | null;
}

export function MapPickerModal({
  visible,
  initialCoord,
  onConfirm,
  onClose,
  target,
}: MapPickerModalProps) {
  const [coord, setCoord] = useState<{ latitude: number; longitude: number } | null>(
    initialCoord || null
  );
  const [address, setAddress] = useState<string>('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Atualiza coordenada quando o modal abre
  useEffect(() => {
    if (visible) {
      const startCoord = initialCoord || SANTA_RITA_COORDS;
      setCoord(startCoord);
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            ...startCoord,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      }, 300);
      fetchAddress(startCoord.latitude, startCoord.longitude);
    }
  }, [visible, initialCoord]);

  // Busca endereço a partir de coordenadas
  const fetchAddress = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const addr = [results[0].street, results[0].streetNumber, results[0].district]
          .filter(Boolean)
          .join(', ') || 'Local escolhido';
        setAddress(addr);
      } else {
        setAddress('Local escolhido');
      }
    } catch {
      setAddress('Local escolhido');
    } finally {
      setLoadingAddress(false);
    }
  };

  // Ao tocar no mapa, move o pin
  const handleMapPress = (e: any) => {
    const { coordinate } = e.nativeEvent;
    setCoord(coordinate);
    fetchAddress(coordinate.latitude, coordinate.longitude);
    mapRef.current?.animateToRegion(
      {
        ...coordinate,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      300
    );
  };

  const handleConfirm = () => {
    if (coord) {
      onConfirm(coord, address || 'Local selecionado');
    }
  };

  const isOrigin = target === 'origin';
  const pinColor = isOrigin ? '#10B981' : '#EF4444';
  const pinBg = isOrigin ? '#D1FAE5' : '#FEE2E2';

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={22} color="#6B7280" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.headerIconWrap, { backgroundColor: pinBg }]}>
              <MapPin size={18} color={pinColor} fill={pinColor} />
            </View>
            <Text style={styles.title}>
              {isOrigin ? 'Local de embarque' : 'Local de destino'}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Instrução */}
        <View style={styles.instructionBar}>
          <Navigation size={14} color="#6B7280" />
          <Text style={styles.instructionText}>
            Toque no mapa ou arraste o pin para escolher o local
          </Text>
        </View>

        {/* Mapa */}
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: coord?.latitude || SANTA_RITA_COORDS.latitude,
              longitude: coord?.longitude || SANTA_RITA_COORDS.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            showsPointsOfInterest={false}
          >
            {coord && (
              <Marker
                coordinate={coord}
                draggable
                onDragEnd={(e) => {
                  const { coordinate } = e.nativeEvent;
                  setCoord(coordinate);
                  fetchAddress(coordinate.latitude, coordinate.longitude);
                }}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.markerWrap}>
                  <View style={[styles.markerBubble, { backgroundColor: pinColor }]}>
                    <MapPin size={18} color="#FFF" fill="#FFF" />
                  </View>
                  <View style={[styles.markerTail, { borderTopColor: pinColor }]} />
                </View>
              </Marker>
            )}
          </MapView>

          {/* Indicador central de crosshair (visual) */}
          <View style={styles.centerIndicator} pointerEvents="none">
            <View style={[styles.centerDot, { backgroundColor: pinColor }]} />
          </View>
        </View>

        {/* Rodapé com endereço e botões */}
        <View style={styles.footer}>
          <View style={[styles.addressBox, { borderLeftColor: pinColor }]}>
            <View style={styles.addressRow}>
              <MapPin size={16} color={pinColor} fill={pinColor} />
              {loadingAddress ? (
                <ActivityIndicator size="small" color={pinColor} style={{ marginLeft: 8 }} />
              ) : (
                <Text style={styles.addressText} numberOfLines={2}>
                  {address || 'Toque no mapa para escolher o local'}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <X size={18} color="#6B7280" />
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: isOrigin ? '#059669' : '#1E3A5F' }, !coord && { opacity: 0.5 }]}
              onPress={handleConfirm}
              disabled={!coord}
            >
              <Check size={20} color="#FFF" />
              <Text style={styles.confirmText}>
                {isOrigin ? 'Confirmar embarque' : 'Confirmar destino'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  instructionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  instructionText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  markerWrap: {
    alignItems: 'center',
  },
  markerBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  centerIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -3,
    marginTop: -3,
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 14,
    ...Platform.select({
      android: { paddingBottom: 16 },
    }),
  },
  addressBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});