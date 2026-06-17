import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  Clock,
  MapPin,
  Star,
  ChevronRight,
  X,
  Car,
  User,
  DollarSign,
  Timer,
  TrendingUp,
  Navigation,
  PauseCircle,
  Route,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Cores do tema: Preto e Dourado
const COLORS = {
  primary: '#D4AF37',
  primaryDark: '#B8962E',
  primaryLight: '#F5D98E',
  background: '#000000',
  backgroundCard: '#1A1A1A',
  surface: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#333333',
  success: '#D4AF37',
  warning: '#F5A623',
  error: '#FF4444',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface RideHistoryItem {
  id: string;
  status: string;
  data_solicitacao: string;
  data_inicio: string | null;
  data_finalizacao: string | null;
  origem_endereco: string;
  origem_latitude: number;
  origem_longitude: number;
  destino_endereco: string;
  destino_latitude: number;
  destino_longitude: number;
  distancia_km: number;
  duracao_estimada: number;
  valor_estimado: number;
  valor_final: number | null;
  multiplicador_tarifa: number;
  multa_cancelamento: number;
  tempo_pausado: number;
  valor_pausa: number;
  pausas: any[];
  avaliacao_passageiro: number | null;
  avaliacao_motorista: number | null;
  comentario_passageiro: string | null;
  comentario_motorista: string | null;
  motorista_id: string | null;
  motoristas?: {
    id: string;
    veiculo_modelo: string | null;
    veiculo_cor: string | null;
    veiculo_placa: string | null;
    avaliacao_media: number;
    usuario_id: string;
  } | null;
  motorista_usuario?: {
    nome_completo: string;
    foto_perfil_url: string | null;
    telefone: string;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
};

const calcDuration = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  finalizada: { label: 'Concluída', color: COLORS.success, bg: COLORS.surface },
  cancelada:  { label: 'Cancelada', color: COLORS.error, bg: COLORS.surface },
};

const getStatus = (status: string) =>
  STATUS_MAP[status] ?? { label: status, color: COLORS.textSecondary, bg: COLORS.surface };

const getDetailedStatus = (ride: RideHistoryItem): { label: string; color: string; bg: string } => {
  if (ride.status === 'cancelada') {
    if (!ride.motorista_id) {
      return { label: 'Cancelada por você', color: COLORS.error, bg: COLORS.surface };
    } else {
      return { label: 'Cancelada', color: '#B45309', bg: COLORS.surface };
    }
  }
  return getStatus(ride.status);
};

// ─── Subcomponents ───────────────────────────────────────────────────────────

const StarRow = ({ value, size = 16 }: { value: number | null; size?: number }) => {
  if (!value) return <Text style={styles.noRating}>Sem avaliação</Text>;
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color={COLORS.primary}
          fill={s <= value ? COLORS.primary : 'transparent'}
        />
      ))}
      <Text style={styles.starValue}>{value}.0</Text>
    </View>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>{icon}</View>
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  </View>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const RideDetailModal = ({
  ride,
  visible,
  onClose,
}: {
  ride: RideHistoryItem | null;
  visible: boolean;
  onClose: () => void;
}) => {
  if (!ride) return null;

  const status = getDetailedStatus(ride);
  const duration = calcDuration(ride.data_inicio, ride.data_finalizacao);
  const driver = ride.motoristas;
  const driverUser = ride.motorista_usuario;

  const valorBase = ride.valor_estimado;
  const valorFinal = ride.valor_final ?? ride.valor_estimado;
  const difPreco = valorFinal - valorBase;
  const temPausa = ride.valor_pausa > 0;
  const temMulta = ride.multa_cancelamento > 0;

  const origin = {
    latitude: Number(ride.origem_latitude),
    longitude: Number(ride.origem_longitude),
  };
  const destination = {
    latitude: Number(ride.destino_latitude),
    longitude: Number(ride.destino_longitude),
  };
  const midLat = (origin.latitude + destination.latitude) / 2;
  const midLon = (origin.longitude + destination.longitude) / 2;
  const latDelta = Math.abs(origin.latitude - destination.latitude) * 1.8 + 0.02;
  const lonDelta = Math.abs(origin.longitude - destination.longitude) * 1.8 + 0.02;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Detalhes da Corrida</Text>
            <Text style={styles.modalSubtitle}>
              {formatDate(ride.data_solicitacao)} • {formatTime(ride.data_solicitacao)}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>

          {/* MAP */}
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: midLat,
                longitude: midLon,
                latitudeDelta: latDelta,
                longitudeDelta: lonDelta,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker coordinate={origin} title="Embarque" pinColor={COLORS.success} />
              <Marker coordinate={destination} title="Desembarque" pinColor={COLORS.error} />
              <Polyline
                coordinates={[origin, destination]}
                strokeColor={COLORS.primary}
                strokeWidth={3}
                lineDashPattern={[8, 4]}
              />
            </MapView>

            {/* Map overlay labels */}
            <View style={styles.mapOriginLabel}>
              <View style={[styles.mapLabelDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.mapLabelText} numberOfLines={1}>{ride.origem_endereco}</Text>
            </View>
            <View style={styles.mapDestLabel}>
              <MapPin size={12} color={COLORS.error} />
              <Text style={styles.mapLabelText} numberOfLines={1}>{ride.destino_endereco}</Text>
            </View>
          </View>

          {/* Trip Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações da Viagem</Text>

            <InfoRow
              icon={<Navigation size={18} color={COLORS.primary} />}
              label="Distância"
              value={`${Number(ride.distancia_km).toFixed(1)} km`}
            />
            {duration > 0 && (
              <InfoRow
                icon={<Timer size={18} color={COLORS.primary} />}
                label="Duração"
                value={formatDuration(duration)}
              />
            )}
            {ride.tempo_pausado > 0 && (
              <InfoRow
                icon={<PauseCircle size={18} color={COLORS.warning} />}
                label="Tempo pausado"
                value={formatDuration(ride.tempo_pausado)}
              />
            )}
            <InfoRow
              icon={<Route size={18} color={COLORS.textSecondary} />}
              label="Multiplicador de tarifa"
              value={`${ride.multiplicador_tarifa}x`}
            />
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Valores</Text>

            <InfoRow
              icon={<DollarSign size={18} color={COLORS.textSecondary} />}
              label="Valor estimado"
              value={`R$ ${Number(valorBase).toFixed(2)}`}
            />

            {temPausa && (
              <InfoRow
                icon={<PauseCircle size={18} color={COLORS.warning} />}
                label="Adicional de pausa"
                value={`+ R$ ${Number(ride.valor_pausa).toFixed(2)}`}
                highlight
              />
            )}

            {temMulta && (
              <InfoRow
                icon={<DollarSign size={18} color={COLORS.error} />}
                label="Multa de cancelamento"
                value={`R$ ${Number(ride.multa_cancelamento).toFixed(2)}`}
                highlight
              />
            )}

            {difPreco !== 0 && !temMulta && (
              <InfoRow
                icon={<TrendingUp size={18} color={difPreco > 0 ? COLORS.error : COLORS.success} />}
                label={difPreco > 0 ? 'Adicional de rota' : 'Desconto aplicado'}
                value={`${difPreco > 0 ? '+' : ''} R$ ${difPreco.toFixed(2)}`}
                highlight
              />
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Valor total</Text>
              <Text style={styles.totalValue}>R$ {Number(valorFinal).toFixed(2)}</Text>
            </View>
          </View>

          {/* Driver Info */}
          {driver && driverUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Motorista</Text>
              <View style={styles.driverCard}>
                <View style={styles.driverAvatar}>
                  {driverUser.foto_perfil_url ? (
                    <Image
                      source={{ uri: driverUser.foto_perfil_url }}
                      style={styles.driverPhoto}
                    />
                  ) : (
                    <View style={styles.driverPhotoFallback}>
                      <User size={28} color={COLORS.textSecondary} />
                    </View>
                  )}
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driverUser.nome_completo ?? '—'}</Text>
                  <StarRow value={driver.avaliacao_media} size={14} />
                  <View style={styles.vehicleRow}>
                    <Car size={14} color={COLORS.textSecondary} />
                    <Text style={styles.vehicleText}>
                      {[driver.veiculo_modelo, driver.veiculo_cor, driver.veiculo_placa]
                        .filter(Boolean)
                        .join(' · ') || 'Veículo não informado'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Ratings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avaliações</Text>

            <View style={styles.ratingBlock}>
              <View style={styles.ratingBlockHeader}>
                <User size={16} color={COLORS.textSecondary} />
                <Text style={styles.ratingBlockTitle}>Sua avaliação ao motorista</Text>
              </View>
              <StarRow value={ride.avaliacao_motorista} size={20} />
              {ride.comentario_motorista ? (
                <Text style={styles.comment}>"{ride.comentario_motorista}"</Text>
              ) : null}
            </View>

            <View style={[styles.ratingBlock, styles.ratingBlockAlt]}>
              <View style={styles.ratingBlockHeader}>
                <Car size={16} color={COLORS.textSecondary} />
                <Text style={styles.ratingBlockTitle}>Avaliação do motorista a você</Text>
              </View>
              <StarRow value={ride.avaliacao_passageiro} size={20} />
              {ride.comentario_passageiro ? (
                <Text style={styles.comment}>"{ride.comentario_passageiro}"</Text>
              ) : null}
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RideHistory() {
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<RideHistoryItem | null>(null);

  const fetchRides = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('User error:', userError);
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      const { data: passageiroData, error: passErr } = await supabase
        .from('passageiros')
        .select('id')
        .eq('usuario_id', userData.user.id)
        .maybeSingle();

      if (passErr) {
        console.error('Passageiro error:', passErr);
        Alert.alert('Erro', 'Não foi possível encontrar o passageiro');
        return;
      }

      if (!passageiroData) {
        console.log('Passageiro não encontrado');
        setRides([]);
        return;
      }

      const { data: corridasData, error: corridasError } = await supabase
        .from('corridas')
        .select(`
          id,
          status,
          data_solicitacao,
          data_inicio,
          data_finalizacao,
          origem_endereco,
          origem_latitude,
          origem_longitude,
          destino_endereco,
          destino_latitude,
          destino_longitude,
          distancia_km,
          duracao_estimada,
          valor_estimado,
          valor_final,
          multiplicador_tarifa,
          multa_cancelamento,
          tempo_pausado,
          valor_pausa,
          pausas,
          avaliacao_passageiro,
          avaliacao_motorista,
          comentario_passageiro,
          comentario_motorista,
          motorista_id,
          motoristas (
            id,
            veiculo_modelo,
            veiculo_cor,
            veiculo_placa,
            avaliacao_media,
            usuario_id
          )
        `)
        .eq('passageiro_id', passageiroData.id)
        .in('status', ['finalizada', 'cancelada'])
        .order('data_solicitacao', { ascending: false });

      if (corridasError) {
        console.error('Corridas error:', corridasError);
        Alert.alert('Erro', `Erro ao carregar histórico: ${corridasError.message}`);
        return;
      }

      if (!corridasData || corridasData.length === 0) {
        setRides([]);
        return;
      }

      const ridesWithUsers = await Promise.all(
        (corridasData as any[]).map(async (ride) => {
          if (ride.motoristas && ride.motoristas.usuario_id) {
            const { data: userData, error: userError } = await supabase
              .from('usuarios')
              .select('nome_completo, foto_perfil_url, telefone')
              .eq('id', ride.motoristas.usuario_id)
              .maybeSingle();

            if (!userError && userData) {
              return {
                ...ride,
                motorista_usuario: userData
              };
            }
          }
          return {
            ...ride,
            motorista_usuario: null
          };
        })
      );

      setRides(ridesWithUsers as RideHistoryItem[]);
      console.log(`Carregadas ${ridesWithUsers.length} corridas`);
      
    } catch (e) {
      console.error('Unexpected error:', e);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao carregar o histórico');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRides();
  }, [fetchRides]);

  const completed = rides.filter((r) => r.status === 'finalizada');
  const cancelled = rides.filter((r) => r.status === 'cancelada');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando histórico...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Corridas</Text>
        <Text style={styles.subtitle}>{rides.length} corridas</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {rides.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>Nenhuma corrida ainda</Text>
            <Text style={styles.emptySubtitle}>Suas corridas anteriores aparecerão aqui</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{completed.length}</Text>
                <Text style={styles.statLabel}>Concluídas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{cancelled.length}</Text>
                <Text style={styles.statLabel}>Canceladas</Text>
              </View>
            </View>

            {rides.map((ride) => {
              const st = getDetailedStatus(ride);
              const driver = ride.motoristas;
              const driverUser = ride.motorista_usuario;
              const duration = calcDuration(ride.data_inicio, ride.data_finalizacao);

              return (
                <TouchableOpacity
                  key={ride.id}
                  style={styles.rideCard}
                  onPress={() => setSelected(ride)}
                  activeOpacity={0.75}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardDate}>{formatDate(ride.data_solicitacao)}</Text>
                      <Text style={styles.cardTime}>{formatTime(ride.data_solicitacao)}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>

                  <View style={styles.routeContainer}>
                    <View style={styles.routeLeft}>
                      <View style={[styles.originDot, { backgroundColor: COLORS.success }]} />
                      <View style={styles.routeConnector} />
                      <MapPin size={14} color={COLORS.error} />
                    </View>
                    <View style={styles.routeRight}>
                      <Text style={styles.routeAddr} numberOfLines={1}>{ride.origem_endereco}</Text>
                      <View style={{ height: 16 }} />
                      <Text style={styles.routeAddr} numberOfLines={1}>{ride.destino_endereco}</Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.cardMeta}>
                      {duration > 0 && (
                        <View style={styles.metaItem}>
                          <Timer size={13} color={COLORS.textSecondary} />
                          <Text style={styles.metaText}>{formatDuration(duration)}</Text>
                        </View>
                      )}
                      <View style={styles.metaItem}>
                        <Navigation size={13} color={COLORS.textSecondary} />
                        <Text style={styles.metaText}>{Number(ride.distancia_km).toFixed(1)} km</Text>
                      </View>
                      {ride.avaliacao_motorista && (
                        <View style={styles.metaItem}>
                          <Star size={13} color={COLORS.primary} fill={COLORS.primary} />
                          <Text style={styles.metaText}>{ride.avaliacao_motorista}.0</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={styles.cardPrice}>
                        R$ {Number(ride.valor_final ?? ride.valor_estimado).toFixed(2)}
                      </Text>
                      <ChevronRight size={16} color={COLORS.textSecondary} />
                    </View>
                  </View>

                  {driver && driverUser && (
                    <View style={styles.driverMini}>
                      {driverUser.foto_perfil_url ? (
                        <Image source={{ uri: driverUser.foto_perfil_url }} style={styles.driverMiniPhoto} />
                      ) : (
                        <View style={styles.driverMiniPhotoFallback}>
                          <User size={12} color={COLORS.textSecondary} />
                        </View>
                      )}
                      <Text style={styles.driverMiniName} numberOfLines={1}>
                        {driverUser.nome_completo?.split(' ')[0]}
                      </Text>
                      {driver.veiculo_modelo && (
                        <Text style={styles.driverMiniCar} numberOfLines={1}>
                          {' · '}{driver.veiculo_modelo} {driver.veiculo_cor ? `(${driver.veiculo_cor})` : ''}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <RideDetailModal
        ride={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:      { fontSize: 15, color: COLORS.textSecondary },

  header: {
    backgroundColor: COLORS.backgroundCard,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title:     { fontSize: 24, fontWeight: '700', color: COLORS.text },
  subtitle:  { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  content: { flex: 1, padding: 16 },

  emptyState:    { justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyTitle:    { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statNumber:  { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  statLabel:   { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },

  rideCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardDate:       { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardTime:       { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statusPill:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot:      { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText:     { fontSize: 12, fontWeight: '600' },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },

  routeContainer:  { flexDirection: 'row', marginBottom: 14 },
  routeLeft:       { alignItems: 'center', marginRight: 12, paddingTop: 2 },
  originDot:       { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  routeConnector:  { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  routeRight:      { flex: 1, justifyContent: 'space-between' },
  routeAddr:       { fontSize: 13, color: COLORS.text, lineHeight: 18 },

  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 4 },
  cardMeta:    { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 12, color: COLORS.textSecondary },
  cardRight:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardPrice:   { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  driverMini:            { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  driverMiniPhoto:       { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  driverMiniPhotoFallback: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  driverMiniName:        { fontSize: 12, fontWeight: '600', color: COLORS.text },
  driverMiniCar:         { fontSize: 12, color: COLORS.textSecondary, flex: 1 },

  modalContainer:  { flex: 1, backgroundColor: COLORS.background },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.backgroundCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle:      { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalSubtitle:   { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  closeBtn:        { padding: 8, borderRadius: 20, backgroundColor: COLORS.surface },
  modalScroll:     { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  mapContainer:    { height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 16, position: 'relative', borderWidth: 1, borderColor: COLORS.border },
  map:             { flex: 1 },
  mapOriginLabel:  { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, gap: 6 },
  mapDestLabel:    { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, gap: 6 },
  mapLabelDot:     { width: 8, height: 8, borderRadius: 4 },
  mapLabelText:    { fontSize: 12, color: COLORS.text, flex: 1 },

  section:       { backgroundColor: COLORS.backgroundCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

  infoRow:             { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoIcon:            { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoText:            { flex: 1 },
  infoLabel:           { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  infoValue:           { fontSize: 14, fontWeight: '600', color: COLORS.text },
  infoValueHighlight:  { color: COLORS.primary },

  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 14 },
  totalLabel:  { fontSize: 15, fontWeight: '700', color: COLORS.text },
  totalValue:  { fontSize: 20, fontWeight: '800', color: COLORS.primary },

  driverCard:          { flexDirection: 'row', alignItems: 'center' },
  driverAvatar:        { marginRight: 14 },
  driverPhoto:         { width: 60, height: 60, borderRadius: 30 },
  driverPhotoFallback: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  driverInfo:          { flex: 1, gap: 4 },
  driverName:          { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  vehicleRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  vehicleText:         { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  ratingBlock:       { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  ratingBlockAlt:    { backgroundColor: COLORS.backgroundCard },
  ratingBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ratingBlockTitle:  { fontSize: 13, fontWeight: '600', color: COLORS.text },
  starRow:           { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starValue:         { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginLeft: 6 },
  noRating:          { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  comment:           { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 10, lineHeight: 18 },
});