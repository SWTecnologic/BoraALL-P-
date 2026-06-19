// app/(tabs)/index.tsx
import 'react-native-get-random-values';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  Share,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Navigation,
  CreditCard,
  Banknote,
  X,
  Check,
  Zap,
  Clock,
  Car,
  User,
  Star,
  ThumbsUp,
  MessageCircle,
  ChevronDown,
  AlertTriangle,
  Share2,
  Shield,
  PhoneCall,
  Camera,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { ChatModal } from '@/components/ChatModal';
import { DriverCurrentRideCard } from '@/components/DriverCurrentRideCard';
import { useCorridaAtiva } from '@/hooks/useCorridaAtiva';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { decodePolyline } from '@/utils/decodePolyline';
import { MapPickerModal } from '@/components/MapPickerModal';

const GOOGLE_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || '';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SANTA_RITA_COORDS = { latitude: -22.2464, longitude: -45.7033 };
const PRICE_PER_KM = 3.15;
const MINIMUM_FARE = 8.0;
const SPEED_KMH = 25;
const CANCELLATION_PENALTY_AMOUNT = 3.5;
const CANCEL_FREE_MINUTES = 3;

function isNightTime(): boolean {
  const now = new Date();
  const hours = now.getHours();
  return hours >= 18 || hours < 6;
}

const PAYMENT_OPTIONS = [
  { id: 'pix', label: 'Pix', Icon: Zap },
  { id: 'card', label: 'Cartão', Icon: CreditCard },
  { id: 'cash', label: 'Dinheiro', Icon: Banknote },
];

const BLOCK_REASONS = [
  { id: 'rude', label: 'Mal educado' },
  { id: 'dirty_car', label: 'Carro sujo' },
  { id: 'annoying', label: 'Chato / Inconveniente' },
  { id: 'unsafe_driving', label: 'Direção perigosa' },
  { id: 'wrong_route', label: 'Rota errada' },
  { id: 'bad_smell', label: 'Mau cheiro no veículo' },
  { id: 'other', label: 'Outro motivo' },
];

type RideStep = 'idle' | 'selecting_dest' | 'confirming' | 'searching' | 'accepted' | 'in_progress' | 'completed' | 'reservada';
type ManualSelectTarget = 'origin' | 'dest' | null;

interface RatingModalProps {
  visible: boolean;
  rideId: string;
  driverName: string;
  price: number | null;
  distance: string | null;
  onClose: () => void;
  usuarioId: string;
}

interface AlertModalProps {
  visible: boolean;
  driverName: string;
  originAddress: string;
  destAddress: string;
  driverCoord: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onShareRide: () => void;
  onReportDriver: () => void;
  onCallPolice: () => void;
  onCallSAMU: () => void;
}

interface DriverProfileModalProps {
  visible: boolean;
  driverId: string | null;
  driverName: string;
  driverRating: number;
  onClose: () => void;
  onBlockDriver: (reason: string) => void;
}

// ─── Modal: Sem foto de perfil ────────────────────────────────────────────────

interface NoProfilePhotoModalProps {
  visible: boolean;
  onClose: () => void;
  onGoToProfile: () => void;
}

function NoProfilePhotoModal({ visible, onClose, onGoToProfile }: NoProfilePhotoModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={noPhotoStyles.overlay}>
        <Animated.View style={[noPhotoStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={noPhotoStyles.iconContainer}>
            <Camera size={36} color="#1E40AF" />
          </View>

          <Text style={noPhotoStyles.title}>Foto de perfil necessária</Text>
          <Text style={noPhotoStyles.description}>
            Para solicitar corridas, você precisa ter uma foto de perfil cadastrada.{'\n\n'}
            Acesse a aba <Text style={noPhotoStyles.bold}>Perfil</Text> para adicionar sua foto e começar a usar o app.
          </Text>

          <TouchableOpacity style={noPhotoStyles.primaryBtn} onPress={onGoToProfile}>
            <Camera size={18} color="#FFF" />
            <Text style={noPhotoStyles.primaryBtnText}>Ir para o Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={noPhotoStyles.secondaryBtn} onPress={onClose}>
            <Text style={noPhotoStyles.secondaryBtnText}>Agora não</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── MODAIS ──────────────────────────────────────────────────────────────

function RatingModal({ visible, rideId, driverName, price, distance, onClose, usuarioId }: RatingModalProps) {
  const [driverRating, setDriverRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setDriverRating(0); setServiceRating(0); setComentario('');
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }).start();
    } else { scaleAnim.setValue(0); }
  }, [visible]);

  const handleSubmit = async () => {
    if (driverRating === 0) { Alert.alert('Avaliação', 'Por favor, avalie o motorista antes de continuar.'); return; }
    setSubmitting(true);
    try {
      const { data: corrida } = await supabase.from('corridas').select('motorista_id, passageiro_id').eq('id', rideId).single();
      if (corrida?.motorista_id) {
        const { data: motorista } = await supabase.from('motoristas').select('usuario_id').eq('id', corrida.motorista_id).single();
        const { data: passageiro } = await supabase.from('passageiros').select('usuario_id').eq('id', corrida.passageiro_id).single();
        if (motorista?.usuario_id && passageiro?.usuario_id) {
          await supabase.from('avaliacoes').insert({ corrida_id: rideId, avaliador_id: passageiro.usuario_id, avaliado_id: motorista.usuario_id, tipo_avaliador: 'passageiro', nota: driverRating, comentario: comentario.trim() || null });
          const { data: allRatings } = await supabase.from('avaliacoes').select('nota').eq('avaliado_id', motorista.usuario_id).eq('tipo_avaliador', 'passageiro');
          if (allRatings && allRatings.length > 0) {
            const avg = allRatings.reduce((sum, r) => sum + r.nota, 0) / allRatings.length;
            await supabase.from('motoristas').update({ avaliacao_media: avg }).eq('id', corrida.motorista_id);
          }
          await supabase.from('corridas').update({ avaliacao_motorista: driverRating, comentario_passageiro: comentario.trim() || null }).eq('id', rideId);
        }
      }
      Alert.alert('Obrigado!', 'Sua avaliação foi enviada com sucesso.');
    } catch (err) { console.error('Erro ao enviar avaliação:', err); }
    finally { setSubmitting(false); onClose(); }
  };

  const StarRow = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <View style={ratingStyles.starSection}>
      <Text style={ratingStyles.starLabel}>{label}</Text>
      <View style={ratingStyles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onChange(star)} style={ratingStyles.starBtn}>
            <Star size={32} color={star <= value ? '#FBBF24' : '#E5E7EB'} fill={star <= value ? '#FBBF24' : 'transparent'} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ratingStyles.overlay}>
        <Animated.View style={[ratingStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={ratingStyles.header}>
            <View style={ratingStyles.checkCircle}><Check size={28} color="#FFF" /></View>
            <Text style={ratingStyles.title}>Corrida finalizada!</Text>
            <Text style={ratingStyles.subtitle}>Como foi sua experiência?</Text>
          </View>
          <View style={ratingStyles.summary}>
            <View style={ratingStyles.summaryItem}><Text style={ratingStyles.summaryLabel}>Motorista</Text><Text style={ratingStyles.summaryValue}>{driverName}</Text></View>
            {distance && <View style={ratingStyles.summaryItem}><Text style={ratingStyles.summaryLabel}>Distância</Text><Text style={ratingStyles.summaryValue}>{distance}</Text></View>}
            {price && <View style={ratingStyles.summaryItem}><Text style={ratingStyles.summaryLabel}>Valor</Text><Text style={[ratingStyles.summaryValue, { color: '#1E40AF' }]}>R$ {price.toFixed(2)}</Text></View>}
          </View>
          <StarRow label="Avalie o motorista" value={driverRating} onChange={setDriverRating} />
          <StarRow label="Avalie o serviço" value={serviceRating} onChange={setServiceRating} />
          <TextInput style={ratingStyles.commentInput} placeholder="Deixe um comentário (opcional)..." placeholderTextColor="#9CA3AF" value={comentario} onChangeText={setComentario} multiline numberOfLines={3} maxLength={200} />
          <View style={ratingStyles.actions}>
            <TouchableOpacity style={ratingStyles.skipBtn} onPress={onClose}><Text style={ratingStyles.skipText}>Pular</Text></TouchableOpacity>
            <TouchableOpacity style={[ratingStyles.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <><ThumbsUp size={18} color="#FFF" /><Text style={ratingStyles.submitText}>Enviar avaliação</Text></>}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function AlertModal({ visible, driverName, originAddress, destAddress, driverCoord, onClose, onShareRide, onReportDriver, onCallPolice, onCallSAMU }: AlertModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.card}>
          <View style={alertStyles.header}>
            <View style={alertStyles.iconContainer}>
              <AlertTriangle size={32} color="#EF4444" />
            </View>
            <Text style={alertStyles.title}>Central de Alerta</Text>
            <Text style={alertStyles.subtitle}>Escolha uma opção de emergência</Text>
          </View>
          <View style={alertStyles.optionsContainer}>
            <TouchableOpacity style={alertStyles.optionBtn} onPress={onShareRide}>
              <View style={[alertStyles.optionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Share2 size={24} color="#1E40AF" />
              </View>
              <View style={alertStyles.optionInfo}>
                <Text style={alertStyles.optionTitle}>Compartilhar Corrida</Text>
                <Text style={alertStyles.optionDesc}>Enviar detalhes via WhatsApp/SMS</Text>
              </View>
              <ChevronDown size={20} color="#9CA3AF" style={{ transform: [{ rotate: '-90deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={alertStyles.optionBtn} onPress={onReportDriver}>
              <View style={[alertStyles.optionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Shield size={24} color="#D97706" />
              </View>
              <View style={alertStyles.optionInfo}>
                <Text style={alertStyles.optionTitle}>Denunciar Motorista</Text>
                <Text style={alertStyles.optionDesc}>Reportar comportamento inadequado</Text>
              </View>
              <ChevronDown size={20} color="#9CA3AF" style={{ transform: [{ rotate: '-90deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={alertStyles.optionBtn} onPress={onCallPolice}>
              <View style={[alertStyles.optionIcon, { backgroundColor: '#FEE2E2' }]}>
                <PhoneCall size={24} color="#DC2626" />
              </View>
              <View style={alertStyles.optionInfo}>
                <Text style={alertStyles.optionTitle}>Ligar para Polícia</Text>
                <Text style={alertStyles.optionDesc}>Emergência - Disque 190</Text>
              </View>
              <ChevronDown size={20} color="#9CA3AF" style={{ transform: [{ rotate: '-90deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={alertStyles.optionBtn} onPress={onCallSAMU}>
              <View style={[alertStyles.optionIcon, { backgroundColor: '#FEE2E2' }]}>
                <PhoneCall size={24} color="#DC2626" />
              </View>
              <View style={alertStyles.optionInfo}>
                <Text style={alertStyles.optionTitle}>Ligar para SAMU</Text>
                <Text style={alertStyles.optionDesc}>Emergência médica - 192</Text>
              </View>
              <ChevronDown size={20} color="#9CA3AF" style={{ transform: [{ rotate: '-90deg' }] }} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={alertStyles.closeBtn} onPress={onClose}>
            <Text style={alertStyles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL: PERFIL DO MOTORISTA COM SAFEAREAVIEW ──────────────────────

function DriverProfileModal({ visible, driverId, driverName, driverRating, onClose, onBlockDriver }: DriverProfileModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [showBlockReasons, setShowBlockReasons] = useState(false);
  const [selectedBlockReason, setSelectedBlockReason] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    foto_perfil?: string;
    veiculo_modelo?: string;
    veiculo_placa?: string;
    veiculo_cor?: string;
    total_corridas?: number;
    avaliacao_media?: number;
  }>({});

  useEffect(() => {
    if (visible && driverId) {
      setShowBlockReasons(false);
      setSelectedBlockReason(null);
      loadDriverProfile();
    }
  }, [visible, driverId]);

  const loadDriverProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('motoristas')
        .select(`
          id,
          veiculo_modelo,
          veiculo_placa,
          veiculo_cor,
          total_corridas,
          avaliacao_media,
          usuarios:usuario_id (
            nome_completo,
            foto_perfil_url
          )
        `)
        .eq('id', driverId)
        .single();

      if (!error && data) {
        setProfile({
          foto_perfil: (data.usuarios as any)?.foto_perfil_url,
          veiculo_modelo: data.veiculo_modelo || 'Não informado',
          veiculo_placa: data.veiculo_placa || 'Não informada',
          veiculo_cor: data.veiculo_cor || 'Não informada',
          total_corridas: data.total_corridas || 0,
          avaliacao_media: data.avaliacao_media || driverRating,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBlock = () => {
    if (!selectedBlockReason) {
      Alert.alert('Selecione um motivo', 'Por favor, selecione o motivo do bloqueio.');
      return;
    }
    const reasonLabel = BLOCK_REASONS.find(r => r.id === selectedBlockReason)?.label || selectedBlockReason;
    onBlockDriver(reasonLabel);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={driverProfileStyles.safeArea} edges={['bottom']}>
        <View style={driverProfileStyles.overlay}>
          <View style={[
            driverProfileStyles.card,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 24 }
          ]}>
            <View style={driverProfileStyles.handle} />
            {loading ? (
              <View style={driverProfileStyles.loadingContainer}>
                <ActivityIndicator size="large" color="#1E40AF" />
                <Text style={driverProfileStyles.loadingText}>Carregando perfil...</Text>
              </View>
            ) : showBlockReasons ? (
              <>
                <Text style={driverProfileStyles.blockReasonTitle}>Motivo do bloqueio</Text>
                <Text style={driverProfileStyles.blockReasonSubtitle}>
                  Selecione o motivo pelo qual deseja bloquear {driverName}:
                </Text>
                <View style={driverProfileStyles.reasonsList}>
                  {BLOCK_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason.id}
                      style={[driverProfileStyles.reasonItem, selectedBlockReason === reason.id && driverProfileStyles.reasonItemSelected]}
                      onPress={() => setSelectedBlockReason(reason.id)}
                    >
                      <View style={[driverProfileStyles.reasonRadio, selectedBlockReason === reason.id && driverProfileStyles.reasonRadioSelected]}>
                        {selectedBlockReason === reason.id && <View style={driverProfileStyles.reasonRadioInner} />}
                      </View>
                      <Text style={[driverProfileStyles.reasonLabel, selectedBlockReason === reason.id && driverProfileStyles.reasonLabelSelected]}>
                        {reason.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[driverProfileStyles.blockConfirmBtn, !selectedBlockReason && { opacity: 0.5 }]}
                  onPress={handleConfirmBlock}
                  disabled={!selectedBlockReason}
                >
                  <Shield size={20} color="#FFF" />
                  <Text style={driverProfileStyles.blockConfirmBtnText}>Confirmar bloqueio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={driverProfileStyles.closeBtn} onPress={() => setShowBlockReasons(false)}>
                  <Text style={driverProfileStyles.closeBtnText}>Voltar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={driverProfileStyles.header}>
                  <View style={driverProfileStyles.avatarLarge}>
                    {profile.foto_perfil ? (
                      <Image source={{ uri: profile.foto_perfil }} style={driverProfileStyles.avatarImage} />
                    ) : (
                      <User size={40} color="#FFF" />
                    )}
                  </View>
                  <Text style={driverProfileStyles.driverName}>{driverName}</Text>
                  <View style={driverProfileStyles.ratingBadge}>
                    <Star size={16} color="#FBBF24" fill="#FBBF24" />
                    <Text style={driverProfileStyles.ratingText}>{profile.avaliacao_media?.toFixed(1) || driverRating.toFixed(1)}</Text>
                  </View>
                </View>
                <View style={driverProfileStyles.section}>
                  <Text style={driverProfileStyles.sectionTitle}>🚗 Veículo</Text>
                  <View style={driverProfileStyles.infoGrid}>
                    <View style={driverProfileStyles.infoItem}>
                      <Text style={driverProfileStyles.infoLabel}>Modelo</Text>
                      <Text style={driverProfileStyles.infoValue}>{profile.veiculo_modelo}</Text>
                    </View>
                    <View style={driverProfileStyles.infoItem}>
                      <Text style={driverProfileStyles.infoLabel}>Placa</Text>
                      <Text style={driverProfileStyles.infoValue}>{profile.veiculo_placa}</Text>
                    </View>
                    <View style={driverProfileStyles.infoItem}>
                      <Text style={driverProfileStyles.infoLabel}>Cor</Text>
                      <Text style={driverProfileStyles.infoValue}>{profile.veiculo_cor}</Text>
                    </View>
                  </View>
                </View>
                <View style={driverProfileStyles.section}>
                  <Text style={driverProfileStyles.sectionTitle}>📊 Estatísticas</Text>
                  <View style={driverProfileStyles.statsContainer}>
                    <View style={driverProfileStyles.statItem}>
                      <Text style={driverProfileStyles.statNumber}>{profile.total_corridas}</Text>
                      <Text style={driverProfileStyles.statLabel}>Corridas</Text>
                    </View>
                    <View style={driverProfileStyles.statDivider} />
                    <View style={driverProfileStyles.statItem}>
                      <Text style={driverProfileStyles.statNumber}>⭐ {profile.avaliacao_media?.toFixed(1) || '5.0'}</Text>
                      <Text style={driverProfileStyles.statLabel}>Avaliação</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={driverProfileStyles.blockBtn} onPress={() => setShowBlockReasons(true)}>
                  <Shield size={20} color="#DC2626" />
                  <Text style={driverProfileStyles.blockBtnText}>Bloquear para futuras corridas</Text>
                </TouchableOpacity>
                <TouchableOpacity style={driverProfileStyles.closeBtn} onPress={onClose}>
                  <Text style={driverProfileStyles.closeBtnText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────

export default function PassengerHome() {
  const { usuario } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView>(null);
  const originAutocompleteRef = useRef<any>(null);
  const destAutocompleteRef = useRef<any>(null);
  const rideTimerRef = useRef<any>(null);
  const pollRideRef = useRef<any>(null);
  const locationWatcherRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);

  const { corridaAtiva, loading: loadingCorrida } = useCorridaAtiva();

  // ── Hook de verificação de foto de perfil ──
  const { hasFotoProfile, loading: loadingFoto, refetch: refetchFoto } = useProfilePhoto(usuario?.id);

  const [showNoPhotoModal, setShowNoPhotoModal] = useState(false);

  const [originCoord, setOriginCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [originAddress, setOriginAddress] = useState('');
  const [region, setRegion] = useState<Region>({ ...SANTA_RITA_COORDS, latitudeDelta: 0.04, longitudeDelta: 0.04 });
  const [destCoord, setDestCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destAddress, setDestAddress] = useState('');
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [step, setStep] = useState<RideStep>('idle');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState('pix');
  const [manualSelectTarget, setManualSelectTarget] = useState<ManualSelectTarget>(null);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [currentRideCreatedAt, setCurrentRideCreatedAt] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [driverCoord, setDriverCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverRating, setDriverRating] = useState(5);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverCarModel, setDriverCarModel] = useState('');
  const [driverCarColor, setDriverCarColor] = useState('');
  const [driverTotalRides, setDriverTotalRides] = useState<number>(0);
  const [driverPhoto, setDriverPhoto] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showDriverProfile, setShowDriverProfile] = useState(false);
  const [isNight, setIsNight] = useState(isNightTime());
  const [driverRouteCoords, setDriverRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [driverToPickupDistance, setDriverToPickupDistance] = useState<string | null>(null);
  const [driverToPickupDuration, setDriverToPickupDuration] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [completedRideId, setCompletedRideId] = useState<string | null>(null);
  const [completedDriverName, setCompletedDriverName] = useState('');
  const [showDriverCurrentRide, setShowDriverCurrentRide] = useState(false);
  const [reservedRouteDriverToDropoff, setReservedRouteDriverToDropoff] = useState<{ latitude: number; longitude: number }[]>([]);
  const [reservedRouteDropoffToOrigin, setReservedRouteDropoffToOrigin] = useState<{ latitude: number; longitude: number }[]>([]);
  const [reservedDropoffCoord, setReservedDropoffCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<'origin' | 'dest' | null>(null);

  const cardAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Função para buscar foto do motorista ──
  const fetchDriverPhoto = async (motoristaId: string) => {
    try {
      const { data, error } = await supabase
        .from('motoristas')
        .select(`
          usuarios:usuario_id (
            foto_perfil_url
          )
        `)
        .eq('id', motoristaId)
        .single();

      if (!error && data?.usuarios) {
        const fotoUrl = (data.usuarios as any)?.foto_perfil_url;
        setDriverPhoto(fotoUrl || null);
      }
    } catch (err) {
      console.error('Erro ao buscar foto do motorista:', err);
      setDriverPhoto(null);
    }
  };

  // ── Função modificada para buscar informações do veículo E FOTO ──
  const fetchDriverVehicleInfo = async (motoristaId: string) => {
    try {
      const { data, error } = await supabase
        .from('motoristas')
        .select(`
          veiculo_modelo,
          veiculo_cor,
          total_corridas,
          usuarios:usuario_id (
            foto_perfil_url
          )
        `)
        .eq('id', motoristaId)
        .single();
        
      if (!error && data) {
        setDriverCarModel(data.veiculo_modelo || '');
        setDriverCarColor(data.veiculo_cor || '');
        setDriverTotalRides(data.total_corridas || 0);
        const fotoUrl = (data.usuarios as any)?.foto_perfil_url;
        setDriverPhoto(fotoUrl || null);
      }
    } catch (err) {
      console.error('Erro ao buscar veículo:', err);
    }
  };

  // ── Effect para buscar foto quando driverId mudar ──
  useEffect(() => {
    if (driverId) {
      fetchDriverPhoto(driverId);
    }
  }, [driverId]);

  const calculateDistance = (c1: { latitude: number; longitude: number }, c2: { latitude: number; longitude: number }): number => {
    const R = 6371;
    const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
    const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((c1.latitude * Math.PI) / 180) * Math.cos((c2.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const mapStatusToStep = (status: string): RideStep => {
    switch (status) {
      case 'solicitada': return 'searching';
      case 'aceita': return 'accepted';
      case 'iniciada': return 'in_progress';
      case 'finalizada': return 'completed';
      case 'reservada': return 'reservada';
      default: return 'idle';
    }
  };

  // ⭐ NOVA FUNÇÃO: Atualiza rota do motorista em tempo real (polyline consumível)
  const updateDriverRouteToPickup = async (driverPos: { latitude: number; longitude: number }) => {
    if (!originCoord) return;
    
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverPos.latitude},${driverPos.longitude}&destination=${originCoord.latitude},${originCoord.longitude}&language=pt-BR&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      
      if (json.status === 'OK' && json.routes.length > 0) {
        const leg = json.routes[0].legs[0];
        
        // Atualiza distância e tempo RESTANTES
        setDriverToPickupDistance(leg.distance.text);
        setDriverToPickupDuration(leg.duration.text);
        
        // Pega a rota da posição ATUAL do motorista até o passageiro
        const remainingRoute = decodePolyline(json.routes[0].overview_polyline.points);
        
        // Atualiza o polyline com a rota restante (consumindo o que já foi percorrido)
        setDriverRouteCoords(remainingRoute);
        
        console.log(`🚗 Motorista se moveu - Distância restante: ${leg.distance.text}, Tempo: ${leg.duration.text}`);
      }
    } catch (e) { 
      console.error('Erro ao atualizar rota do motorista:', e); 
    }
  };

  const fetchRoute = async (origin: { latitude: number; longitude: number }, dest: { latitude: number; longitude: number }, fitCamera = true) => {
    setLoadingRoute(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}&language=pt-BR&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.routes.length > 0) {
        const leg = json.routes[0].legs[0];
        const distKm = leg.distance.value / 1000;
        setDistance(leg.distance.text); setDuration(leg.duration.text);
        setPrice(Math.max(MINIMUM_FARE, distKm * PRICE_PER_KM));
        setRouteCoords(decodePolyline(json.routes[0].overview_polyline.points));
        if (fitCamera) mapRef.current?.fitToCoordinates([origin, dest], { edgePadding: { top: 80, right: 60, bottom: 340, left: 60 }, animated: true });
      } else {
        const distKm = calculateDistance(origin, dest);
        setDistance(`${distKm.toFixed(1)} km`); setDuration(`${Math.round((distKm / SPEED_KMH) * 60)} min`);
        setPrice(Math.max(MINIMUM_FARE, distKm * PRICE_PER_KM));
        setRouteCoords([origin, dest]);
        if (fitCamera) mapRef.current?.fitToCoordinates([origin, dest], { edgePadding: { top: 80, right: 60, bottom: 340, left: 60 }, animated: true });
      }
    } catch (e) { Alert.alert('Erro', 'Não foi possível calcular a rota.'); }
    finally { setLoadingRoute(false); }
  };

  const animateCard = (show: boolean) => {
    Animated.spring(cardAnim, { toValue: show ? 1 : 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const handleRideCompleted = () => {
    clearInterval(rideTimerRef.current); clearInterval(pollRideRef.current);
    setStep('completed'); setCompletedRideId(currentRideId); setCompletedDriverName(driverName);
    setShowRatingModal(true);
  };

  const resetRide = () => {
    setDestCoord(null); setDestAddress(''); setRouteCoords([]); setDriverRouteCoords([]);
    setDistance(null); setDuration(null); setPrice(null); setStep('idle');
    animateCard(false); destAutocompleteRef.current?.clear(); setManualSelectTarget(null);
    setDriverCoord(null); setDriverName(''); setDriverPhone(''); setElapsedSeconds(0);
    setCurrentRideId(null); setCurrentRideCreatedAt(null);
    setDriverToPickupDistance(null); setDriverToPickupDuration(null);
    setDriverId(null);
    setDriverCarModel(''); setDriverCarColor(''); setDriverTotalRides(0);
    setDriverPhoto(null);
    setShowDriverCurrentRide(false);
    setReservedRouteDriverToDropoff([]); setReservedRouteDropoffToOrigin([]); setReservedDropoffCoord(null);
    clearInterval(rideTimerRef.current); clearInterval(pollRideRef.current);
    if (originCoord) mapRef.current?.animateToRegion({ ...originCoord, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 600);
  };

  // ⭐ NOVA: Verifica se deve aplicar multa por cancelamento
  const shouldApplyPenalty = (): boolean => {
    if (!currentRideCreatedAt) return false;
    const now = new Date();
    const createdAt = new Date(currentRideCreatedAt);
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return diffMinutes > CANCEL_FREE_MINUTES;
  };

  // ⭐ NOVA: Função de cancelamento com verificação de multa
  const performCancellation = async (withPenalty: boolean, penaltyAmount?: number) => {
    if (currentRideId) {
      try {
        const updateData: any = { 
          status: 'cancelada', 
          cancelado_por: 'passageiro', 
          updated_at: new Date().toISOString() 
        };
        
        if (withPenalty && penaltyAmount) {
          updateData.multa_cancelamento = penaltyAmount;
        }
        
        await supabase.from('corridas').update(updateData).eq('id', currentRideId);
      } catch (err) { 
        console.warn('Erro ao cancelar:', err); 
      }
    }
    
    resetRide();
    
    if (withPenalty && penaltyAmount) {
      Alert.alert(
        'Corrida cancelada com multa', 
        `Como se passaram mais de ${CANCEL_FREE_MINUTES} minutos, será cobrada uma multa de R$ ${penaltyAmount.toFixed(2)} na sua próxima corrida.`
      );
    }
  };

  // ⭐ NOVA: Lógica de cancelamento com verificação de tempo
  const handleCancelRide = async () => {
    // Não permite cancelar corrida em andamento
    if (step === 'in_progress') { 
      Alert.alert('Cancelamento indisponível', 'Não é possível cancelar a corrida após o início da viagem.'); 
      return; 
    }
    
    // Se estiver procurando motorista (searching), cancela sem multa
    if (step === 'searching' && currentRideId) {
      Alert.alert('Cancelar busca', 'Deseja cancelar a busca por motorista?', [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim, cancelar', onPress: () => performCancellation(false), style: 'destructive' },
      ]);
      return;
    }
    
    // Se já foi aceita ou está reservada, verifica tempo
    if ((step === 'accepted' || step === 'reservada') && currentRideId) {
      const hasPenalty = shouldApplyPenalty();
      
      if (hasPenalty) {
        Alert.alert(
          'Atenção - Multa por cancelamento',
          `Já se passaram mais de ${CANCEL_FREE_MINUTES} minutos desde que a corrida foi solicitada.\n\nSe cancelar agora, será cobrada uma multa de R$ ${CANCELLATION_PENALTY_AMOUNT.toFixed(2)}.`,
          [
            { text: 'Voltar', style: 'cancel' },
            { 
              text: `Pagar multa de R$ ${CANCELLATION_PENALTY_AMOUNT.toFixed(2)}`, 
              onPress: () => performCancellation(true, CANCELLATION_PENALTY_AMOUNT),
              style: 'destructive' 
            },
          ]
        );
      } else {
        const minutesLeft = CANCEL_FREE_MINUTES - (new Date().getTime() - new Date(currentRideCreatedAt!).getTime()) / (1000 * 60);
        
        Alert.alert(
          'Cancelar corrida',
          `Você ainda está dentro do período de cancelamento grátis (${Math.ceil(minutesLeft)} min restantes).\n\nDeseja cancelar sem multa?`,
          [
            { text: 'Não', style: 'cancel' },
            { text: 'Sim, cancelar grátis', onPress: () => performCancellation(false), style: 'destructive' },
          ]
        );
      }
      return;
    }
    
    // Qualquer outro caso, apenas reseta
    resetRide();
  };

  // ── Verificação de foto antes de confirmar corrida ──
  const handleConfirmRide = async () => {
    if (!originCoord || !destCoord || !distance || !duration || !price) {
      Alert.alert('Erro', 'Preencha origem e destino.');
      return;
    }

    if (hasFotoProfile === false) {
      setShowNoPhotoModal(true);
      return;
    }

    if (hasFotoProfile === null || loadingFoto) {
      try {
        await refetchFoto();
        if (hasFotoProfile === false) {
          setShowNoPhotoModal(true);
          return;
        }
      } catch {
        // em caso de erro na verificação, prossegue normalmente
      }
    }

    setStep('searching');
    try {
      const { data: passenger } = await supabase.from('passageiros').select('id').eq('usuario_id', usuario.id).single();
      if (!passenger) { Alert.alert('Erro', 'Perfil não encontrado.'); setStep('confirming'); return; }
      const distanciaNum = parseFloat(distance.replace(',', '.').match(/[\d,.]+/)?.[0] || '0');
      const duracaoNum = parseInt(duration.match(/\d+/)?.[0] || '0', 10);
      const { data: motoristaDisponivel } = await supabase.from('motoristas').select('id').eq('status', 'disponivel').eq('online', true).limit(1).single();
      let statusCorrida = 'solicitada';
      let motoristaId = motoristaDisponivel?.id || null;
      if (!motoristaId) {
        const { data: motoristaOcupado } = await supabase.from('motoristas').select('id').eq('status', 'em_corrida').eq('online', true).limit(1).single();
        if (motoristaOcupado) { motoristaId = motoristaOcupado.id; statusCorrida = 'reservada'; }
      }
      const { data: corrida, error } = await supabase.from('corridas').insert({
        passageiro_id: passenger.id, motorista_id: motoristaId,
        origem_endereco: originAddress, origem_latitude: originCoord.latitude, origem_longitude: originCoord.longitude,
        destino_endereco: destAddress, destino_latitude: destCoord.latitude, destino_longitude: destCoord.longitude,
        distancia_km: distanciaNum, duracao_estimada: duracaoNum, valor_estimado: price,
        status: statusCorrida, data_solicitacao: new Date().toISOString(), metodo_pagamento: selectedPayment,
      }).select('id, created_at').single();
      if (error || !corrida) { Alert.alert('Erro', 'Falha ao solicitar.'); setStep('confirming'); return; }
      setCurrentRideId(corrida.id);
      setCurrentRideCreatedAt(corrida.created_at);
      if (statusCorrida === 'reservada' && motoristaId) { setStep('reservada'); setShowDriverCurrentRide(true); }
    } catch (err) { Alert.alert('Erro', 'Erro inesperado.'); setStep('confirming'); }
  };

  const initLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Localização necessária', 'Ative a localização para usar o app.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setOriginCoord(coord);
      const newRegion = { ...coord, latitudeDelta: 0.015, longitudeDelta: 0.015 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 800);
      try {
        const res = await Location.reverseGeocodeAsync(coord);
        if (res.length > 0) {
          const addr = [res[0].street, res[0].streetNumber, res[0].district].filter(Boolean).join(', ') || 'Localização atual';
          setOriginAddress(addr); originAutocompleteRef.current?.setAddressText(addr);
        }
      } catch { setOriginAddress('Localização atual'); originAutocompleteRef.current?.setAddressText('Localização atual'); }
    } catch (err) { Alert.alert('Erro', 'Não foi possível obter sua localização.'); }
    finally { setLoadingLocation(false); }
  };

  const handleSelectOrigin = (data: any, details: any = null) => {
    if (!details) return;
    const coord = { latitude: details.geometry.location.lat, longitude: details.geometry.location.lng };
    setOriginCoord(coord);
    const streetName = data.description.split(',')[0].trim();
    setOriginAddress(streetName); originAutocompleteRef.current?.setAddressText(streetName);
    mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 600);
    if (destCoord) fetchRoute(coord, destCoord);
  };

  const handleSelectDestination = (data: any, details: any = null) => {
    if (!details) return;
    const coord = { latitude: details.geometry.location.lat, longitude: details.geometry.location.lng };
    setDestCoord(coord);
    const streetName = data.description.split(',')[0].trim();
    setDestAddress(streetName); destAutocompleteRef.current?.setAddressText(streetName);
    setStep('confirming'); animateCard(true);
    if (originCoord) fetchRoute(originCoord, coord);
  };

  const handleOpenMapPicker = (target: 'origin' | 'dest') => {
    setMapPickerTarget(target);
    setShowMapPicker(true);
  };

  const handleMapPickerConfirm = (
    coord: { latitude: number; longitude: number },
    address: string
  ) => {
    setShowMapPicker(false);
    if (mapPickerTarget === 'origin') {
      setOriginCoord(coord);
      setOriginAddress(address);
      originAutocompleteRef.current?.setAddressText(address);
      mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 600);
      if (destCoord) fetchRoute(coord, destCoord);
    } else {
      setDestCoord(coord);
      setDestAddress(address);
      destAutocompleteRef.current?.setAddressText(address);
      setStep('confirming');
      animateCard(true);
      if (originCoord) fetchRoute(originCoord, coord);
    }
    setMapPickerTarget(null);
  };

  const onMapPress = async (e: any) => {
    if (!manualSelectTarget) return;
    const { coordinate } = e.nativeEvent;
    let addr = 'Local escolhido';
    try {
      const results = await Location.reverseGeocodeAsync(coordinate);
      if (results.length > 0) addr = [results[0].street, results[0].streetNumber, results[0].district].filter(Boolean).join(', ') || addr;
    } catch {}
    if (manualSelectTarget === 'origin') {
      setOriginCoord(coordinate); setOriginAddress(addr); originAutocompleteRef.current?.setAddressText(addr);
      mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 600);
      if (destCoord) fetchRoute(coordinate, destCoord);
    } else {
      setDestCoord(coordinate); setDestAddress(addr); destAutocompleteRef.current?.setAddressText(addr);
      setStep('confirming'); animateCard(true);
      if (originCoord) fetchRoute(originCoord, coordinate);
    }
    setManualSelectTarget(null);
  };

  const handleOpenChat = () => { if (currentRideId && usuario) setShowChat(true); };

  const handleShareRide = async () => {
    if (!driverName || !currentRideId) return;
    const trackingLink = driverCoord ? `https://www.google.com/maps?q=${driverCoord.latitude},${driverCoord.longitude}` : '';
    const message = `🚗 *Corrida em andamento*\n\n👤 Motorista: ${driverName}\n⭐ Avaliação: ${driverRating.toFixed(1)}\n\n📍 Embarque: ${originAddress}\n🎯 Destino: ${destAddress}\n\n📏 Distância: ${distance || 'Calculando...'}\n⏱ Tempo estimado: ${duration || 'Calculando...'}\n\n${trackingLink ? `🔍 Rastrear:\n${trackingLink}\n\n` : ''}_Localização atualizada automaticamente_`;
    try { await Share.share({ message, title: 'Minha corrida' }); } catch (error) { console.error('Erro ao compartilhar:', error); }
    setShowAlertModal(false);
  };

  const handleReportDriver = () => {
    setShowAlertModal(false);
    Alert.alert('Denunciar Motorista', 'Deseja realmente denunciar este motorista?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Denunciar', style: 'destructive', onPress: async () => {
        if (currentRideId) {
          try { await supabase.from('corridas').update({ denuncia_motorista: true, updated_at: new Date().toISOString() }).eq('id', currentRideId); Alert.alert('Denúncia enviada', 'Sua denúncia foi registrada.'); }
          catch (err) { Alert.alert('Erro', 'Não foi possível registrar a denúncia.'); }
        }
      }}
    ]);
  };

  const handleCallPolice = () => { setShowAlertModal(false); Alert.alert('Ligar para Polícia (190)', 'Deseja realmente ligar?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Ligar 190', style: 'destructive', onPress: () => Linking.openURL('tel:190') }]); };
  const handleCallSAMU = () => { setShowAlertModal(false); Alert.alert('Ligar para SAMU (192)', 'Deseja realmente ligar?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Ligar 192', style: 'destructive', onPress: () => Linking.openURL('tel:192') }]); };
  const handleViewDriverProfile = () => { if (driverId) setShowDriverProfile(true); };

  const handleBlockDriver = async (reason: string) => {
    setShowDriverProfile(false);
    if (usuario && driverId) {
      try {
        const { data: passenger } = await supabase.from('passageiros').select('id').eq('usuario_id', usuario.id).single();
        if (passenger) {
          await supabase.from('motoristas_bloqueados').insert({ passageiro_id: passenger.id, motorista_id: driverId, created_at: new Date().toISOString() });
          Alert.alert('Motorista bloqueado', `Motorista bloqueado por: ${reason}.`);
        }
      } catch (err) { Alert.alert('Erro', 'Não foi possível bloquear o motorista.'); }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setIsNight(isNightTime()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ((step === 'accepted' || step === 'in_progress') && driverCoord) {
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]));
      pulse.start();
      return () => pulse.stop();
    } else { pulseAnim.setValue(1); }
  }, [step, driverCoord]);

  useEffect(() => {
    if (step === 'searching') {
      const loop = Animated.loop(Animated.timing(searchAnim, { toValue: 1, duration: 1200, useNativeDriver: true }));
      loop.start();
      return () => loop.stop();
    } else { searchAnim.setValue(0); }
  }, [step]);

  useEffect(() => {
    if (step === 'in_progress' && currentRideId) {
      rideTimerRef.current = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
      return () => clearInterval(rideTimerRef.current);
    }
  }, [step, currentRideId]);

  useEffect(() => {
    if (loadingCorrida) return;
    if (corridaAtiva) {
      setCurrentRideId(corridaAtiva.id);
      setCurrentRideCreatedAt(corridaAtiva.created_at || corridaAtiva.data_solicitacao || null);
      setOriginCoord({ latitude: corridaAtiva.origem_latitude, longitude: corridaAtiva.origem_longitude });
      setOriginAddress(corridaAtiva.origem_endereco);
      if (corridaAtiva.destino_latitude) { setDestCoord({ latitude: corridaAtiva.destino_latitude, longitude: corridaAtiva.destino_longitude }); setDestAddress(corridaAtiva.destino_endereco); }
      setDistance(corridaAtiva.distancia_km ? `${corridaAtiva.distancia_km.toFixed(1)} km` : null);
      setDuration(corridaAtiva.duracao_estimada ? `${corridaAtiva.duracao_estimada} min` : null);
      setPrice(corridaAtiva.valor_estimado);
      if (corridaAtiva.motoristas) {
        setDriverId(corridaAtiva.motoristas.id);
        setDriverName(corridaAtiva.motoristas.usuarios?.nome_completo || 'Motorista');
        setDriverPhone(corridaAtiva.motoristas.usuarios?.telefone || '');
        setDriverRating(corridaAtiva.motoristas.avaliacao_media || 5);
        fetchDriverVehicleInfo(corridaAtiva.motoristas.id);
      }
      if (corridaAtiva.motorista_latitude && corridaAtiva.motorista_longitude) {
        setDriverCoord({ latitude: corridaAtiva.motorista_latitude, longitude: corridaAtiva.motorista_longitude });
      }
      const newStep = mapStatusToStep(corridaAtiva.status);
      setStep(newStep);
      if (corridaAtiva.status === 'reservada') setShowDriverCurrentRide(true);
      if (corridaAtiva.origem_latitude && corridaAtiva.destino_latitude) {
        fetchRoute({ latitude: corridaAtiva.origem_latitude, longitude: corridaAtiva.origem_longitude }, { latitude: corridaAtiva.destino_latitude, longitude: corridaAtiva.destino_longitude }, false);
      }
    }
  }, [corridaAtiva, loadingCorrida]);

  useEffect(() => {
    const initialize = async () => { try { await initLocation(); } finally { setIsInitializing(false); } };
    initialize();
    return () => { if (locationWatcherRef.current) locationWatcherRef.current.remove(); };
  }, []);

  useEffect(() => {
    let watcher: any = null;
    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        (loc) => { if (step === 'idle' || step === 'selecting_dest') setOriginCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }); }
      );
      locationWatcherRef.current = watcher;
    };
    startWatching();
    return () => { if (watcher) watcher.remove(); };
  }, [step]);

  // ⭐ POLLING ATUALIZADO: Atualiza rota do motorista em tempo real
  useEffect(() => {
    const isActive = step === 'searching' || step === 'accepted' || step === 'in_progress' || step === 'reservada';
    if (!isActive || !currentRideId) return;
    
    const pollRide = async () => {
      try {
        const { data: ride } = await supabase
          .from('corridas')
          .select(`status, motorista_latitude, motorista_longitude, motoristas!inner(id, avaliacao_media, usuarios:usuario_id(nome_completo, telefone))`)
          .eq('id', currentRideId).single();
        if (!ride) return;
        
        const newStep = mapStatusToStep(ride.status);
        
        // Se o status mudou
        if (newStep !== step && ride.status !== 'cancelada' && ride.status !== 'finalizada') {
          setStep(newStep);
          
          if (newStep === 'accepted' && ride.motoristas) {
            setDriverId(ride.motoristas.id); 
            setDriverName(ride.motoristas.usuarios?.nome_completo || 'Motorista');
            setDriverRating(ride.motoristas.avaliacao_media || 5); 
            fetchDriverVehicleInfo(ride.motoristas.id);
          }
          
          if (newStep === 'reservada') setShowDriverCurrentRide(true);
          
          if (newStep === 'accepted' && ride.motorista_latitude && ride.motorista_longitude) {
            await updateDriverRouteToPickup({ 
              latitude: ride.motorista_latitude, 
              longitude: ride.motorista_longitude 
            });
            setShowDriverCurrentRide(false);
          }
          
          if (newStep === 'in_progress') {
            setShowDriverCurrentRide(false); 
            setDriverRouteCoords([]);
            setDriverToPickupDistance(null); 
            setDriverToPickupDuration(null);
            setReservedRouteDriverToDropoff([]); 
            setReservedRouteDropoffToOrigin([]); 
            setReservedDropoffCoord(null);
          }
        }
        
        // ⭐ ATUALIZA ROTA EM TEMPO REAL: Se motorista se moveu e status é 'accepted'
        if (step === 'accepted' && ride.status === 'aceita' && 
            ride.motorista_latitude && ride.motorista_longitude) {
          const newDriverPos = {
            latitude: ride.motorista_latitude,
            longitude: ride.motorista_longitude
          };
          
          // Verifica se a posição mudou significativamente
          if (driverCoord && 
              (Math.abs(driverCoord.latitude - newDriverPos.latitude) > 0.0001 ||
               Math.abs(driverCoord.longitude - newDriverPos.longitude) > 0.0001)) {
            
            setDriverCoord(newDriverPos);
            await updateDriverRouteToPickup(newDriverPos);
          } else if (!driverCoord) {
            setDriverCoord(newDriverPos);
            await updateDriverRouteToPickup(newDriverPos);
          }
        }
        
        if (ride.status === 'finalizada') handleRideCompleted();
        if (ride.status === 'cancelada') { 
          resetRide(); 
          Alert.alert('Corrida cancelada', 'Sua corrida foi cancelada.'); 
        }
      } catch (err) { 
        console.error('Erro no poll:', err); 
      }
    };
    
    pollRideRef.current = setInterval(pollRide, 3000);
    return () => clearInterval(pollRideRef.current);
  }, [step, currentRideId, driverCoord]);

  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });
  const spin = searchAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const manualFooter = (target: ManualSelectTarget) => (
    <TouchableOpacity style={styles.manualOption} onPress={() => handleManualSelect(target)}>
      <MapPin size={18} color="#1E40AF" />
      <Text style={styles.manualOptionText}>Definir local manualmente com pin</Text>
    </TouchableOpacity>
  );

  const handleManualSelect = (target: ManualSelectTarget) => {
    setManualSelectTarget(target);
    Alert.alert('Toque no mapa', target === 'origin' ? 'Toque no local de embarque desejado.' : 'Toque no local de destino desejado.');
  };

  const isSearching = step === 'searching';
  const isAccepted = step === 'accepted';
  const isInProgress = step === 'in_progress';
  const isReservada = step === 'reservada';
  const hideTopBar = isSearching || isAccepted || isInProgress || isReservada;

  // ── RENDER DO CARD DO MOTORISTA COM FOTO ──
  const renderDriverCard = (showDistanceInfo: boolean) => (
    <TouchableOpacity style={styles.driverCard} onPress={handleViewDriverProfile} activeOpacity={0.7}>
      <View style={styles.driverHeader}>
        <View style={styles.driverAvatarWrapper}>
          {driverPhoto ? (
            <Image 
              source={{ uri: driverPhoto }} 
              style={styles.driverAvatarImage}
            />
          ) : (
            <View style={styles.driverAvatarPlaceholder}>
              <Car size={20} color="#FFF" />
            </View>
          )}
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{driverName}</Text>
          <View style={styles.driverRatingWrap}>
            <Star size={12} color="#FBBF24" fill="#FBBF24" />
            <Text style={styles.driverRating}>{driverRating.toFixed(1)}</Text>
            {driverTotalRides > 0 && <Text style={styles.driverRidesCount}>• {driverTotalRides} corridas</Text>}
          </View>
        </View>
        <View style={styles.driverActions}>
          <TouchableOpacity style={styles.chatBtn} onPress={handleOpenChat}>
            <MessageCircle size={20} color="#1E40AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.alertBtn} onPress={() => setShowAlertModal(true)}>
            <AlertTriangle size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
      {(driverCarModel || driverCarColor) && (
        <View style={styles.driverVehicleRow}>
          <Car size={13} color="#6B7280" />
          <Text style={styles.driverVehicleText}>
            {[driverCarModel, driverCarColor].filter(Boolean).join(' • ')}
          </Text>
        </View>
      )}
      {showDistanceInfo && driverToPickupDistance && (
        <View style={styles.driverDistanceInfo}>
          <Navigation size={13} color="#10B981" />
          <Text style={styles.driverDistanceText}>
            A {driverToPickupDistance} de você • {driverToPickupDuration}
          </Text>
        </View>
      )}
      <Text style={styles.viewMoreText}>Toque para ver perfil completo →</Text>
    </TouchableOpacity>
  );

  if (isInitializing) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Modais ── */}
      <RatingModal visible={showRatingModal} rideId={completedRideId || ''} driverName={completedDriverName} price={price} distance={distance} usuarioId={usuario?.id || ''} onClose={() => { setShowRatingModal(false); resetRide(); }} />
      <ChatModal visible={showChat} corridaId={currentRideId || ''} usuarioId={usuario?.id || ''} driverName={driverName} onClose={() => setShowChat(false)} />
      <AlertModal visible={showAlertModal} driverName={driverName} originAddress={originAddress} destAddress={destAddress} driverCoord={driverCoord} onClose={() => setShowAlertModal(false)} onShareRide={handleShareRide} onReportDriver={handleReportDriver} onCallPolice={handleCallPolice} onCallSAMU={handleCallSAMU} />
      <DriverProfileModal visible={showDriverProfile} driverId={driverId} driverName={driverName} driverRating={driverRating} onClose={() => setShowDriverProfile(false)} onBlockDriver={handleBlockDriver} />

      {/* ── Modal: sem foto de perfil ── */}
      <NoProfilePhotoModal
        visible={showNoPhotoModal}
        onClose={() => setShowNoPhotoModal(false)}
        onGoToProfile={() => {
          setShowNoPhotoModal(false);
          router.push('/(tabs)/profile');
        }}
      />

      {/* ── MapPickerModal ── */}
      <MapPickerModal
        visible={showMapPicker}
        initialCoord={mapPickerTarget === 'origin' ? originCoord : destCoord}
        target={mapPickerTarget}
        onConfirm={handleMapPickerConfirm}
        onClose={() => {
          setShowMapPicker(false);
          setMapPickerTarget(null);
        }}
      />

      {showDriverCurrentRide && driverId && (
        <View style={styles.driverCurrentRideContainer}>
          <DriverCurrentRideCard
            motoristaId={driverId}
            corridaReservadaId={currentRideId}
            corridaReservadaCriadaEm={currentRideCreatedAt}
            myOriginCoord={originCoord}
            onPress={handleViewDriverProfile}
            onCancel={performCancellation}
            onRouteUpdate={(routes) => {
              setReservedRouteDriverToDropoff(routes.driverToDropoff);
              setReservedRouteDropoffToOrigin(routes.dropoffToOrigin);
              setReservedDropoffCoord(routes.dropoffCoord);
            }}
          />
        </View>
      )}

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={false}
        toolbarEnabled={false}
        showsPointsOfInterest={false}
        showsIndoors={false}
        showsBuildings={false}
        showsScale={false}
        customMapStyle={isNight ? mapNightStyle : []}
        onPress={step === 'confirming' || step === 'idle' ? onMapPress : undefined}
      >
        {originCoord && (
          <Marker coordinate={originCoord} anchor={{ x: 0.5, y: 0.5 }} title="Embarque">
            <View style={styles.markerOriginGreen}><View style={styles.markerOriginInnerGreen}><MapPin size={14} color="#FFF" fill="#FFF" /></View></View>
          </Marker>
        )}
        {destCoord && (
          <Marker coordinate={destCoord} anchor={{ x: 0.5, y: 1 }} title="Desembarque">
            <View style={styles.markerDestWrap}><View style={styles.markerDestRed}><MapPin size={16} color="#FFF" fill="#FFF" /></View><View style={styles.markerPinRed} /></View>
          </Marker>
        )}

        {isReservada && reservedRouteDriverToDropoff.length > 1 && (
          <>
            <Polyline coordinates={reservedRouteDriverToDropoff} strokeColor="#F97316" strokeWidth={5} lineDashPattern={[6, 3]} />
            <Polyline coordinates={reservedRouteDriverToDropoff} strokeColor="#FED7AA" strokeWidth={2} />
          </>
        )}
        {isReservada && reservedRouteDropoffToOrigin.length > 1 && (
          <>
            <Polyline coordinates={reservedRouteDropoffToOrigin} strokeColor="#8B5CF6" strokeWidth={5} lineDashPattern={[6, 3]} />
            <Polyline coordinates={reservedRouteDropoffToOrigin} strokeColor="#DDD6FE" strokeWidth={2} />
          </>
        )}
        {isReservada && reservedDropoffCoord && (
          <Marker coordinate={reservedDropoffCoord} anchor={{ x: 0.5, y: 0.5 }} title="Desembarque passageiro atual">
            <View style={styles.markerDropoff}><MapPin size={14} color="#FFF" /></View>
          </Marker>
        )}

        {/* ⭐ POLYLINE CONSUMÍVEL: Rota restante do motorista */}
        {isAccepted && driverRouteCoords.length > 1 && (
          <>
            <Polyline coordinates={driverRouteCoords} strokeColor="#10B981" strokeWidth={6} lineDashPattern={[8, 4]} />
            <Polyline coordinates={driverRouteCoords} strokeColor="#34D399" strokeWidth={3} />
          </>
        )}
        {isInProgress && routeCoords.length > 1 && (
          <><Polyline coordinates={routeCoords} strokeColor="#0000FF" strokeWidth={8} /><Polyline coordinates={routeCoords} strokeColor="#1E40AF" strokeWidth={5} /></>
        )}
        {!hideTopBar && routeCoords.length > 1 && (
          <><Polyline coordinates={routeCoords} strokeColor="#0000FF" strokeWidth={8} /><Polyline coordinates={routeCoords} strokeColor="#1E40AF" strokeWidth={5} /></>
        )}
        {(isAccepted || isInProgress) && driverCoord && (
          <Marker ref={driverMarkerRef} coordinate={driverCoord} anchor={{ x: 0.5, y: 0.5 }} zIndex={999} title={driverName}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.markerDriverPulse}><View style={styles.markerDriver}><View style={styles.markerDriverInner}><Car size={16} color="#FFF" /></View></View></View>
            </Animated.View>
          </Marker>
        )}
      </MapView>

      {/* ── Topbar com campos de origem/destino + botões de pin ── */}
      {!hideTopBar && (
        <SafeAreaView style={styles.overlay} edges={['top']}>
          {hasFotoProfile === false && (
            <TouchableOpacity
              style={styles.noPhotoBanner}
              onPress={() => setShowNoPhotoModal(true)}
              activeOpacity={0.85}
            >
              <Camera size={16} color="#92400E" />
              <Text style={styles.noPhotoBannerText}>
                Adicione uma foto de perfil para solicitar corridas
              </Text>
              <Text style={styles.noPhotoBannerCta}>Adicionar →</Text>
            </TouchableOpacity>
          )}

          <View style={styles.topBar}>
            <View style={styles.fieldRow}>
              <View style={styles.dotGreen} />
              <View style={styles.autocompleteWrap}>
                <GooglePlacesAutocomplete
                  ref={originAutocompleteRef}
                  placeholder="Local de embarque"
                  onPress={handleSelectOrigin}
                  fetchDetails
                  debounce={300}
                  minLength={2}
                  nearbyPlacesAPI="GooglePlacesSearch"
                  listViewDisplayed="auto"
                  enablePoweredByContainer={false}
                  query={{ key: GOOGLE_API_KEY, language: 'pt-BR', components: 'country:br', location: `${SANTA_RITA_COORDS.latitude},${SANTA_RITA_COORDS.longitude}`, radius: 10000 }}
                  styles={{ textInput: styles.fieldInput, container: { flex: 1 }, listView: styles.suggestionList, row: styles.suggestionRow, description: styles.suggestionText, separator: { height: 1, backgroundColor: '#F3F4F6' } }}
                  textInputProps={{ placeholderTextColor: '#9CA3AF', returnKeyType: 'search', clearButtonMode: 'while-editing', autoCorrect: false, autoCapitalize: 'words' }}
                  keyboardShouldPersistTaps="handled"
                  flatListProps={{ keyboardShouldPersistTaps: 'handled', ListFooterComponent: manualFooter('origin') }}
                />
              </View>
              <TouchableOpacity
                style={styles.pinBtn}
                onPress={() => handleOpenMapPicker('origin')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MapPin size={20} color="#10B981" fill="#10B981" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchDivider}><View style={styles.dottedLine} /></View>

            <View style={styles.fieldRow}>
              <View style={styles.dotRed} />
              <View style={styles.autocompleteWrap}>
                <GooglePlacesAutocomplete
                  ref={destAutocompleteRef}
                  placeholder="Para onde vamos?"
                  onPress={handleSelectDestination}
                  fetchDetails
                  debounce={300}
                  minLength={2}
                  nearbyPlacesAPI="GooglePlacesSearch"
                  listViewDisplayed="auto"
                  enablePoweredByContainer={false}
                  query={{ key: GOOGLE_API_KEY, language: 'pt-BR', components: 'country:br', location: `${SANTA_RITA_COORDS.latitude},${SANTA_RITA_COORDS.longitude}`, radius: 10000 }}
                  styles={{ textInput: styles.fieldInput, container: { flex: 1 }, listView: styles.suggestionList, row: styles.suggestionRow, description: styles.suggestionText, separator: { height: 1, backgroundColor: '#F3F4F6' } }}
                  textInputProps={{ placeholderTextColor: '#9CA3AF', returnKeyType: 'search', clearButtonMode: 'while-editing', autoCorrect: false, autoCapitalize: 'words' }}
                  keyboardShouldPersistTaps="handled"
                  flatListProps={{ keyboardShouldPersistTaps: 'handled', ListFooterComponent: manualFooter('dest') }}
                />
              </View>
              <TouchableOpacity
                style={styles.pinBtn}
                onPress={() => handleOpenMapPicker('dest')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MapPin size={20} color="#EF4444" fill="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* ── Card de confirmação ── */}
      {!hideTopBar && (
        <Animated.View
          style={[
            styles.bottomCard,
            {
              transform: [{ translateY: cardTranslateY }],
              paddingBottom: insets.bottom || 24,
            },
          ]}
        >
          <View style={styles.cardHandle} />
          <View style={styles.routeSummary}>
            <View style={styles.routePoint}><View style={styles.routeDotGreen} /><View style={styles.routeInfo}><Text style={styles.routePointLabel}>EMBARQUE</Text><Text style={styles.routePointAddr} numberOfLines={1}>{originAddress || '—'}</Text></View></View>
            <View style={styles.routeConnector}>{[0, 1, 2, 3].map((i) => <View key={i} style={styles.connectorDot} />)}</View>
            <View style={styles.routePoint}><View style={styles.routeDotRed} /><View style={styles.routeInfo}><Text style={styles.routePointLabel}>DESTINO</Text><Text style={styles.routePointAddr} numberOfLines={1}>{destAddress || '—'}</Text></View></View>
          </View>
          {loadingRoute ? (<View style={styles.loadingStats}><ActivityIndicator color="#1E40AF" /><Text style={styles.loadingStatsText}>Calculando rota...</Text></View>) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={styles.statValue}>{distance ?? '—'}</Text><Text style={styles.statLabel}>Distância</Text></View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}><Text style={styles.statValue}>{duration ?? '—'}</Text><Text style={styles.statLabel}>Tempo est.</Text></View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}><Text style={[styles.statValue, styles.statPrice]}>{price ? `R$ ${price.toFixed(2)}` : '—'}</Text><Text style={styles.statLabel}>Valor est.</Text></View>
            </View>
          )}
          <View style={styles.paymentRow}>
            {PAYMENT_OPTIONS.map(({ id, label, Icon }) => (<TouchableOpacity key={id} style={[styles.payOpt, selectedPayment === id && styles.payOptActive]} onPress={() => setSelectedPayment(id)}><Icon size={18} color={selectedPayment === id ? '#FFF' : '#6B7280'} /><Text style={[styles.payLabel, selectedPayment === id && styles.payLabelActive]}>{label}</Text></TouchableOpacity>))}
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRide}><X size={20} color="#6B7280" /></TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (loadingRoute || hasFotoProfile === false) && { opacity: 0.75 },
              ]}
              onPress={handleConfirmRide}
              disabled={loadingRoute}
            >
              {hasFotoProfile === false
                ? <><Camera size={20} color="#FFF" /><Text style={styles.confirmBtnText}>Adicionar foto para continuar</Text></>
                : <><Check size={20} color="#FFF" /><Text style={styles.confirmBtnText}>Confirmar corrida</Text></>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Card de busca ── */}
      {isSearching && (
        <SafeAreaView style={styles.searchingOverlay} edges={['bottom']}>
          <View style={[styles.searchingCard, { paddingBottom: insets.bottom || 24 }]}>
            <View style={styles.cardHandle} />
            <View style={styles.searchingInner}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}><MapPin size={40} color="#1E40AF" /></Animated.View>
              <Text style={styles.searchingTitle}>Procurando motorista</Text>
              <Text style={styles.searchingSubtitle}>Aguardando um motorista próximo aceitar sua corrida...</Text>
              <View style={styles.searchStatsRow}>
                <View style={styles.searchStatItem}>
                  <Text style={styles.searchStatValue}>{distance ?? '—'}</Text>
                  <Text style={styles.searchStatLabel}>Distância</Text>
                </View>
                <View style={styles.searchStatDivider} />
                <View style={styles.searchStatItem}>
                  <Text style={styles.searchStatValue}>{duration ?? '—'}</Text>
                  <Text style={styles.searchStatLabel}>Tempo est.</Text>
                </View>
                <View style={styles.searchStatDivider} />
                <View style={styles.searchStatItem}>
                  <Text style={[styles.searchStatValue, { color: '#1E40AF' }]}>
                    {price ? `R$ ${price.toFixed(2)}` : '—'}
                  </Text>
                  <Text style={styles.searchStatLabel}>Valor est.</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.cancelSearchBtn} onPress={handleCancelRide}>
                <X size={20} color="#6B7280" />
                <Text style={styles.cancelSearchText}>Cancelar busca</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* ── Card de motorista a caminho ── */}
      {isAccepted && (
        <SafeAreaView style={styles.inProgressOverlay} edges={['bottom', 'top']}>
          {renderDriverCard(true)}
          <View style={[styles.inProgressCard, { paddingBottom: insets.bottom || 24 }]}>
            <View style={styles.cardHandle} />
            <View style={styles.phaseStatus}><View style={styles.phaseContent}><User size={16} color="#10B981" /><Text style={[styles.phaseText, { color: '#10B981' }]}>Motorista está indo até você</Text></View></View>
            {driverToPickupDuration && (<View style={styles.etaContainer}><Clock size={16} color="#6B7280" /><Text style={styles.etaText}>Chegada estimada: {driverToPickupDuration}</Text></View>)}
            <TouchableOpacity style={styles.cancelInProgressBtn} onPress={handleCancelRide}><X size={18} color="#FFF" /><Text style={styles.cancelInProgressText}>Cancelar corrida</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* ⭐ Card de em viagem - SEM botão de cancelamento */}
      {isInProgress && (
        <SafeAreaView style={styles.inProgressOverlay} edges={['bottom', 'top']}>
          {renderDriverCard(false)}
          <View style={[styles.inProgressCard, { paddingBottom: insets.bottom || 24 }]}>
            <View style={styles.cardHandle} />
            <View style={styles.phaseStatus}><View style={styles.phaseContent}><Car size={16} color="#1E40AF" /><Text style={styles.phaseText}>Em viagem para o destino</Text></View></View>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────
const mapNightStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

// ── Estilos do NoProfilePhotoModal ──
const noPhotoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  bold: {
    fontWeight: '700',
    color: '#1E40AF',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A5F',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});

// ── Estilos do DriverProfileModal ──
const driverProfileStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    paddingHorizontal: 24, 
    paddingTop: 12,
    maxHeight: SCREEN_HEIGHT * 0.80,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20 },
  loadingContainer: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  header: { alignItems: 'center', marginBottom: 24, gap: 12 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E40AF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 40 },
  driverName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  infoGrid: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 12 },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  statsContainer: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 20, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 20, fontWeight: '700', color: '#1E40AF' },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  blockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#FEE2E2', marginBottom: 12 },
  blockBtnText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  closeBtn: { paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' },
  closeBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  blockReasonTitle: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 6 },
  blockReasonSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  reasonsList: { gap: 8, marginBottom: 20 },
  reasonItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB' },
  reasonItemSelected: { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
  reasonRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  reasonRadioSelected: { borderColor: '#DC2626' },
  reasonRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  reasonLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  reasonLabelSelected: { color: '#DC2626', fontWeight: '700' },
  blockConfirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#DC2626', paddingVertical: 14, borderRadius: 14, marginBottom: 12 },
  blockConfirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});

const alertStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  optionsContainer: { gap: 12, marginBottom: 20 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  optionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  optionDesc: { fontSize: 12, color: '#6B7280' },
  closeBtn: { paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' },
  closeText: { fontSize: 16, fontWeight: '600', color: '#374151' },
});

const ratingStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  summary: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, marginBottom: 20, justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  starSection: { marginBottom: 16 },
  starLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  starsRow: { flexDirection: 'row', gap: 6 },
  starBtn: { padding: 2 },
  commentInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  skipBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' },
  skipText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  submitBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1E3A5F' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E5E7EB' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  // ── Banner sem foto ──
  noPhotoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noPhotoBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  noPhotoBannerCta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  topBar: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#D1FAE5' },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FEE2E2' },
  autocompleteWrap: { flex: 1 },
  fieldInput: { fontSize: 15, color: '#111827', fontWeight: '500', paddingVertical: 0, paddingHorizontal: 0, backgroundColor: 'transparent', height: 36 },
  searchDivider: { paddingLeft: 14, marginVertical: 6 },
  dottedLine: { width: 1.5, height: 16, backgroundColor: '#E5E7EB', marginLeft: 3 },
  pinBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionList: { position: 'absolute', top: 52, left: -16, right: -16, backgroundColor: '#FFF', borderRadius: 16, marginHorizontal: -16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 10, zIndex: 999 },
  suggestionRow: { paddingHorizontal: 16, paddingVertical: 14 },
  suggestionText: { fontSize: 14, color: '#374151' },
  manualOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderTopWidth: 1, borderColor: '#F3F4F6' },
  manualOptionText: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },
  markerOriginGreen: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  markerOriginInnerGreen: { alignItems: 'center', justifyContent: 'center' },
  markerDestWrap: { alignItems: 'center' },
  markerDestRed: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  markerPinRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginTop: -2 },
  markerDropoff: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 5 },
  markerDriverPulse: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(59, 130, 246, 0.2)', alignItems: 'center', justifyContent: 'center' },
  markerDriver: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  markerDriverInner: { alignItems: 'center', justifyContent: 'center' },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
  },
  cardHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  routeSummary: { marginBottom: 16, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14, gap: 4 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#D1FAE5' },
  routeDotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FEE2E2' },
  routeConnector: { flexDirection: 'column', alignItems: 'center', gap: 3, marginLeft: 4, paddingVertical: 2 },
  connectorDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: '#D1D5DB' },
  routeInfo: { flex: 1 },
  routePointLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.6 },
  routePointAddr: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 1 },
  loadingStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12 },
  loadingStatsText: { fontSize: 14, color: '#6B7280' },
  statsRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 14, marginBottom: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statPrice: { color: '#1E40AF' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  paymentRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  payOpt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  payOptActive: { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' },
  payLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  payLabelActive: { color: '#FFF' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { flex: 1, height: 52, backgroundColor: '#1E3A5F', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  searchingOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 },
  searchingCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
  },
  searchingInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 16 },
  searchingTitle: { fontSize: 20, fontWeight: '700', color: '#1E3A5F', marginTop: 8 },
  searchingSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginHorizontal: 24 },
  searchStatsRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, marginTop: 4, marginBottom: 8, width: '100%' },
  searchStatItem: { flex: 1, alignItems: 'center' },
  searchStatDivider: { width: 1, backgroundColor: '#E5E7EB' },
  searchStatValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  searchStatLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  cancelSearchBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3F4F6' },
  cancelSearchText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  inProgressOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', zIndex: 25, pointerEvents: 'box-none' },
  driverCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  driverHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatarWrapper: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1E40AF' },
  driverAvatarImage: { width: 48, height: 48, borderRadius: 24 },
  driverAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E40AF', alignItems: 'center', justifyContent: 'center' },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  driverRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  driverRating: { fontSize: 13, color: '#374151', fontWeight: '600' },
  driverRidesCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  driverActions: { flexDirection: 'row', gap: 8 },
  chatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  alertBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' },
  driverVehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  driverVehicleText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  driverDistanceInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  driverDistanceText: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  viewMoreText: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 6 },
  inProgressCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
  },
  phaseStatus: { backgroundColor: '#EFF6FF', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  phaseContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phaseText: { fontSize: 12, fontWeight: '600', color: '#1E40AF' },
  etaContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, paddingVertical: 8, backgroundColor: '#F0FDF4', borderRadius: 8 },
  etaText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  cancelInProgressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#EF4444' },
  cancelInProgressText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  noCancelWarning: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#FEF2F2', borderRadius: 14, borderWidth: 1, borderColor: '#FEE2E2' },
  noCancelText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  driverCurrentRideContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 10, left: 0, right: 0, zIndex: 30 },
});