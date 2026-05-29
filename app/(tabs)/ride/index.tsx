import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, MapPin, Navigation } from 'lucide-react-native';

export default function RideRequest() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  const calculateEstimate = () => {
    if (!origin || !destination) return;
    
    // Mock calculation - replace with real API call
    const mockDistance = Math.random() * 10 + 1; // 1-11 km
    const basePrice = 3.15;
    const estimatedCost = Math.max(8, mockDistance * basePrice); // Minimum R$ 8
    const estimatedDuration = mockDistance * 3; // 3 min per km estimate
    
    setEstimatedPrice(estimatedCost);
    setEstimatedTime(Math.round(estimatedDuration));
  };

  const handleRequestRide = () => {
    if (!origin || !destination) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha origem e destino.');
      return;
    }
    
    Alert.alert(
      'Solicitar Corrida',
      `Origem: ${origin}\nDestino: ${destination}\nValor estimado: R$ ${estimatedPrice?.toFixed(2)}\nTempo estimado: ${estimatedTime} min`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => console.log('Ride requested') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Solicitar Corrida</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <Navigation size={20} color="#059669" />
              <Text style={styles.inputLabel}>De onde?</Text>
            </View>
            <TextInput
              style={styles.input}
              value={origin}
              onChangeText={setOrigin}
              placeholder="Digite o endereço de origem"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.routeIndicator}>
            <ArrowRight size={20} color="#6B7280" />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <MapPin size={20} color="#DC2626" />
              <Text style={styles.inputLabel}>Para onde?</Text>
            </View>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="Digite o endereço de destino"
              placeholderTextColor="#9CA3AF"
              onBlur={calculateEstimate}
            />
          </View>
        </View>

        {estimatedPrice && estimatedTime && (
          <View style={styles.estimateCard}>
            <Text style={styles.estimateTitle}>Estimativa</Text>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Valor:</Text>
              <Text style={styles.estimateValue}>R$ {estimatedPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Tempo:</Text>
              <Text style={styles.estimateValue}>{estimatedTime} min</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.requestButton,
            (!origin || !destination) && styles.disabledButton
          ]}
          onPress={handleRequestRide}
          disabled={!origin || !destination}
        >
          <Text style={styles.requestButtonText}>Solicitar Corrida</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Como funciona?</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>1</Text>
          <Text style={styles.infoText}>Digite origem e destino</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>2</Text>
          <Text style={styles.infoText}>Confirme sua solicitação</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>3</Text>
          <Text style={styles.infoText}>Aguarde um motorista aceitar</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputContainer: {
    marginVertical: 8,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  routeIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  estimateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  estimateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  estimateLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  estimateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  requestButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  requestButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoSection: {
    flex: 1,
    padding: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoNumber: {
    width: 24,
    height: 24,
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#6B7280',
  },
});