// components/DriverCurrentRideCard.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import {
  Navigation,
  Car,
  Clock,
  MapPin,
  X,
  RefreshCw,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { decodePolyline } from '@/utils/decodePolyline';

const GOOGLE_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

const CANCELLATION_PENALTY_AMOUNT = 3.5;
const CANCEL_FREE_MINUTES = 3;

interface Props {
  motoristaId: string;
  corridaReservadaId: string | null;
  corridaReservadaCriadaEm: string | null;
  myOriginCoord: { latitude: number; longitude: number } | null;
  onPress?: () => void;
  onCancel: (withPenalty: boolean) => void;
  onRouteUpdate?: (routes: {
    driverToDropoff: { latitude: number; longitude: number }[];
    dropoffToOrigin: { latitude: number; longitude: number }[];
    dropoffCoord: { latitude: number; longitude: number } | null;
  }) => void;
}

export function DriverCurrentRideCard({
  motoristaId,
  corridaReservadaId,
  corridaReservadaCriadaEm,
  myOriginCoord,
  onPress,
  onCancel,
  onRouteUpdate,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [corridaAtual, setCorridaAtual] = useState<any>(null);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [minutosDesde, setMinutosDesde] = useState<number>(0);
  const [routeDriverToDropoff, setRouteDriverToDropoff] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeDropoffToMyOrigin, setRouteDropoffToMyOrigin] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [dropoffCoord, setDropoffCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distToDropoff, setDistToDropoff] = useState<string | null>(null);
  const [distDropoffToMe, setDistDropoffToMe] = useState<string | null>(null);

  // Cálculo de minutos desde a criação da corrida reservada
  useEffect(() => {
    if (!corridaReservadaCriadaEm) return;
    const calc = () => {
      const criado = new Date(corridaReservadaCriadaEm).getTime();
      const agora = Date.now();
      setMinutosDesde(Math.floor((agora - criado) / 1000 / 60));
    };
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [corridaReservadaCriadaEm]);

  const buscarRotas = async (
    driverPos: { latitude: number; longitude: number },
    destLat: number,
    destLng: number,
  ) => {
    const drop = { latitude: destLat, longitude: destLng };
    setDropoffCoord(drop);

    let newRouteDriverToDropoff: { latitude: number; longitude: number }[] = [];
    let newRouteDropoffToMyOrigin: { latitude: number; longitude: number }[] = [];

    try {
      const url1 = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverPos.latitude},${driverPos.longitude}&destination=${destLat},${destLng}&language=pt-BR&key=${GOOGLE_API_KEY}`;
      const r1 = await fetch(url1);
      const j1 = await r1.json();
      if (j1.status === 'OK' && j1.routes.length > 0) {
        setDistToDropoff(j1.routes[0].legs[0].distance.text);
        newRouteDriverToDropoff = decodePolyline(j1.routes[0].overview_polyline.points);
        setRouteDriverToDropoff(newRouteDriverToDropoff);
      }
    } catch {}

    if (myOriginCoord) {
      try {
        const url2 = `https://maps.googleapis.com/maps/api/directions/json?origin=${destLat},${destLng}&destination=${myOriginCoord.latitude},${myOriginCoord.longitude}&language=pt-BR&key=${GOOGLE_API_KEY}`;
        const r2 = await fetch(url2);
        const j2 = await r2.json();
        if (j2.status === 'OK' && j2.routes.length > 0) {
          setDistDropoffToMe(j2.routes[0].legs[0].distance.text);
          newRouteDropoffToMyOrigin = decodePolyline(j2.routes[0].overview_polyline.points);
          setRouteDropoffToMyOrigin(newRouteDropoffToMyOrigin);
        }
      } catch {}
    }

    // 🔥 Envia as rotas para o componente pai via callback
    if (onRouteUpdate) {
      onRouteUpdate({
        driverToDropoff: newRouteDriverToDropoff,
        dropoffToOrigin: newRouteDropoffToMyOrigin,
        dropoffCoord: drop,
      });
    }
  };

  const buscarDadosMotorista = async () => {
    try {
      setLoading(true);

      const { data: localizacao } = await supabase
        .from('localizacao_motorista_atual')
        .select('latitude, longitude')
        .eq('motorista_id', motoristaId)
        .single();

      if (localizacao) {
        setDriverLocation({
          latitude: localizacao.latitude,
          longitude: localizacao.longitude,
        });
      }

      const { data: corrida, error } = await supabase
        .from('corridas')
        .select('*')
        .eq('motorista_id', motoristaId)
        .eq('status', 'iniciada')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar corrida atual:', error);
      }

      setCorridaAtual(corrida || null);

      if (corrida && corrida.data_inicio && corrida.duracao_estimada) {
        const inicio = new Date(corrida.data_inicio).getTime();
        const agora = Date.now();
        const decorrido = Math.floor((agora - inicio) / 1000 / 60);
        setTempoRestante(
          Math.max(0, corrida.duracao_estimada - decorrido),
        );
      }

      if (localizacao && corrida && corrida.destino_latitude) {
        await buscarRotas(
          { latitude: localizacao.latitude, longitude: localizacao.longitude },
          corrida.destino_latitude,
          corrida.destino_longitude,
        );
      }
    } catch (err) {
      console.error('Erro ao buscar dados do motorista:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (motoristaId) {
      buscarDadosMotorista();
      const interval = setInterval(buscarDadosMotorista, 15000);
      return () => clearInterval(interval);
    }
  }, [motoristaId, myOriginCoord]);

  const handleCancelar = () => {
    const temMulta = minutosDesde >= CANCEL_FREE_MINUTES;
    Alert.alert(
      'Cancelar corrida reservada',
      temMulta
        ? `Já se passaram ${minutosDesde} minutos. Será cobrada uma multa de R$ ${CANCELLATION_PENALTY_AMOUNT.toFixed(2)} na sua próxima corrida. Deseja cancelar mesmo assim?`
        : `Você ainda está dentro do período gratuito (${minutosDesde} min de ${CANCEL_FREE_MINUTES} min). Nenhuma multa será cobrada. Deseja cancelar?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: () => onCancel(temMulta),
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#6B7280" />
        <Text style={styles.loadingText}>
          Buscando localização do motorista...
        </Text>
      </View>
    );
  }

  const temMulta = minutosDesde >= CANCEL_FREE_MINUTES;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Navigation size={22} color="#1E40AF" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Motorista em outra corrida</Text>
          <View style={styles.badge}>
            <Car size={11} color="#1E40AF" />
            <Text style={styles.badgeText}>Em andamento</Text>
          </View>
        </View>
        <View style={styles.timerBadge}>
          <Clock
            size={12}
            color={temMulta ? '#EF4444' : '#10B981'}
          />
          <Text
            style={[
              styles.timerText,
              { color: temMulta ? '#EF4444' : '#10B981' },
            ]}
          >
            {minutosDesde} min
          </Text>
        </View>
      </View>

      {/* Aviso de multa */}
      <View
        style={[
          styles.multaBox,
          { backgroundColor: temMulta ? '#FEF2F2' : '#F0FDF4' },
        ]}
      >
        <Text
          style={[
            styles.multaText,
            { color: temMulta ? '#DC2626' : '#059669' },
          ]}
        >
          {temMulta
            ? `⚠️ Cancelamento agora gera multa de R$ ${CANCELLATION_PENALTY_AMOUNT.toFixed(2)}`
            : `✅ Cancelamento gratuito por mais ${CANCEL_FREE_MINUTES - minutosDesde} min`}
        </Text>
      </View>

      {corridaAtual ? (
        <>
          {/* Localização do motorista */}
          {driverLocation && (
            <View style={styles.locationContainer}>
              <Car size={13} color="#3B82F6" />
              <Text style={styles.locationText} numberOfLines={1}>
                Motorista: {driverLocation.latitude.toFixed(4)},{' '}
                {driverLocation.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {/* Rota da corrida ativa */}
          <View style={styles.routeInfo}>
            <View style={styles.routePoint}>
              <View style={styles.dotGreen} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>
                  ORIGEM CORRIDA ATIVA
                </Text>
                <Text style={styles.routeAddress} numberOfLines={1}>
                  {corridaAtual.origem_endereco}
                </Text>
              </View>
            </View>
            <View style={styles.routeLine}>
              <View style={styles.dottedLine} />
            </View>
            <View style={styles.routePoint}>
              <View style={styles.dotRed} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>
                  DESEMBARQUE PASSAGEIRO ATUAL
                </Text>
                <Text style={styles.routeAddress} numberOfLines={1}>
                  {corridaAtual.destino_endereco}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats corrida ativa */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MapPin size={13} color="#6B7280" />
              <Text style={styles.statText}>
                {corridaAtual.distancia_km?.toFixed(1) || '?'} km
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Clock size={13} color="#6B7280" />
              <Text style={styles.statText}>
                {tempoRestante !== null
                  ? `~${tempoRestante} min restante`
                  : `${corridaAtual.duracao_estimada || '?'} min total`}
              </Text>
            </View>
          </View>

          {/* Deslocamento até você */}
          {(distToDropoff || distDropoffToMe) && (
            <View style={styles.deslocamentoBox}>
              <Text style={styles.deslocamentoTitle}>
                📍 Trajeto até você
              </Text>
              {distToDropoff && (
                <View style={styles.deslocamentoRow}>
                  <View style={styles.dotOrange} />
                  <Text style={styles.deslocamentoText}>
                    Até desembarque passageiro atual:{' '}
                    <Text style={{ fontWeight: '700' }}>
                      {distToDropoff}
                    </Text>
                  </Text>
                </View>
              )}
              {distDropoffToMe && (
                <View style={styles.deslocamentoRow}>
                  <View style={styles.dotBlue} />
                  <Text style={styles.deslocamentoText}>
                    Até seu embarque:{' '}
                    <Text style={{ fontWeight: '700' }}>
                      {distDropoffToMe}
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.noRideContainer}>
          <Car size={18} color="#10B981" />
          <Text style={styles.noRideText}>
            Motorista está finalizando e logo irá ao seu embarque
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <RefreshCw size={11} color="#9CA3AF" />
        <Text style={styles.footerText}>
          Atualizando em tempo real
        </Text>
      </View>

      {/* Botão cancelar */}
      <TouchableOpacity
        style={[
          styles.cancelBtn,
          temMulta && styles.cancelBtnMulta,
        ]}
        onPress={handleCancelar}
        activeOpacity={0.8}
      >
        <X
          size={16}
          color={temMulta ? '#FFF' : '#DC2626'}
        />
        <Text
          style={[
            styles.cancelBtnText,
            temMulta && { color: '#FFF' },
          ]}
        >
          {temMulta
            ? `Cancelar (multa R$ ${CANCELLATION_PENALTY_AMOUNT.toFixed(2)})`
            : 'Cancelar corrida (grátis)'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#1E40AF' },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timerText: { fontSize: 11, fontWeight: '700' },
  multaBox: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  multaText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    padding: 7,
    borderRadius: 8,
    marginBottom: 10,
  },
  locationText: { fontSize: 11, color: '#1E40AF', flex: 1 },
  routeInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotGreen: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  dotRed: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  dotOrange: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F97316',
    marginRight: 8,
    marginTop: 2,
    flexShrink: 0,
  },
  dotBlue: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
    marginRight: 8,
    marginTop: 2,
    flexShrink: 0,
  },
  routeTextContainer: { flex: 1 },
  routeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    marginTop: 1,
  },
  routeLine: { alignItems: 'center', paddingVertical: 3, marginLeft: 3 },
  dottedLine: { width: 1.5, height: 14, backgroundColor: '#D1D5DB' },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  statText: { fontSize: 11, color: '#6B7280' },
  statDivider: { width: 1, height: 18, backgroundColor: '#E5E7EB' },
  deslocamentoBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  deslocamentoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 7,
  },
  deslocamentoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  deslocamentoText: {
    fontSize: 11,
    color: '#374151',
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 10,
  },
  footerText: { fontSize: 10, color: '#9CA3AF' },
  noRideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  noRideText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    flex: 1,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
  },
  cancelBtnMulta: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});