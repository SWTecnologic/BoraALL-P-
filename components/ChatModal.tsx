// components/ChatModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Send, ChevronDown, MessageCircle, Mic, X, Play, Pause, StopCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  corrida_id: string;
  remetente_id: string;
  tipo_remetente: 'passageiro' | 'motorista';
  mensagem: string;
  tipo_mensagem: 'texto' | 'audio';
  audio_url?: string;
  audio_duracao?: number;
  lida: boolean;
  created_at: string;
}

interface ChatModalProps {
  visible: boolean;
  corridaId: string;
  usuarioId: string;
  driverName: string;
  onClose: () => void;
}

export function ChatModal({ visible, corridaId, usuarioId, driverName, onClose }: ChatModalProps) {
  const insets = useSafeAreaInsets();
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef<any>(null);
  
  // Áudio states
  const [gravando, setGravando] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioGravado, setAudioGravado] = useState<string | null>(null);
  const [enviandoAudio, setEnviandoAudio] = useState(false);
  const [reproduzindoId, setReproduzindoId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const gravandoAnim = useRef(new Animated.Value(1)).current;

  // Animar microfone durante gravação
  useEffect(() => {
    if (gravando) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(gravandoAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(gravandoAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      gravandoAnim.setValue(1);
    }
  }, [gravando]);

  // Configurar áudio e permissões
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso ao microfone para enviar mensagens de voz.');
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    })();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Carregar mensagens e inscrever para novas
  useEffect(() => {
    if (visible && corridaId) {
      carregarMensagens();
      marcarMensagensComoLidas();
      
      const subscription = supabase
        .channel(`chat_${corridaId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens_chat',
            filter: `corrida_id=eq.${corridaId}`,
          },
          (payload) => {
            const novaMsg = payload.new as ChatMessage;
            setMensagens((prev) => [...prev, novaMsg]);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            
            if (novaMsg.remetente_id !== usuarioId) {
              marcarMensagensComoLidas();
            }
          }
        )
        .subscribe();

      subscriptionRef.current = subscription;

      return () => {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
        }
      };
    }
  }, [visible, corridaId]);

  const carregarMensagens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mensagens_chat')
        .select('*')
        .eq('corrida_id', corridaId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMensagens(data);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 200);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoading(false);
    }
  };

  const marcarMensagensComoLidas = async () => {
    try {
      await supabase.rpc('marcar_mensagens_como_lidas', {
        p_corrida_id: corridaId,
        p_usuario_id: usuarioId,
      });
    } catch (err) {
      console.error('Erro ao marcar mensagens como lidas:', err);
    }
  };

  const enviarMensagemTexto = async () => {
    if (!novaMensagem.trim() || !corridaId || !usuarioId) return;

    const mensagem = novaMensagem.trim();
    setNovaMensagem('');

    try {
      await supabase.from('mensagens_chat').insert({
        corrida_id: corridaId,
        remetente_id: usuarioId,
        tipo_remetente: 'passageiro',
        mensagem: mensagem,
        tipo_mensagem: 'texto',
      });
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setNovaMensagem(mensagem);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    }
  };

  // INICIAR GRAVAÇÃO
  const startRecording = async () => {
    try {
      setGravando(true);
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Erro ao iniciar gravação:', err);
      setGravando(false);
      Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
    }
  };

  // PARAR GRAVAÇÃO (salva o áudio localmente)
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        setAudioGravado(uri);
      }
    } catch (err) {
      console.error('Erro ao parar gravação:', err);
      Alert.alert('Erro', 'Não foi possível processar o áudio.');
    } finally {
      setRecording(null);
      setGravando(false);
    }
  };

  // CANCELAR GRAVAÇÃO
  const cancelRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setGravando(false);
    }
    setAudioGravado(null);
  };

  // ENVIAR ÁUDIO GRAVADO
  const enviarAudioGravado = async () => {
    if (!audioGravado) return;
    
    setEnviandoAudio(true);
    
    try {
      await enviarAudio(audioGravado);
      setAudioGravado(null);
    } catch (err) {
      console.error('Erro ao enviar áudio:', err);
      Alert.alert('Erro', 'Não foi possível enviar o áudio.');
    } finally {
      setEnviandoAudio(false);
    }
  };

  // Enviar áudio para o Supabase Storage (versão corrigida)
  const enviarAudio = async (audioUri: string) => {
    try {
      const fileName = `chat_${corridaId}_${Date.now()}.m4a`;
      const filePath = `chat_audio/${fileName}`;
      
      // Ler o arquivo como base64 usando a API legacy
      const base64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Converter base64 para Uint8Array
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Fazer upload
      const { error: uploadError } = await supabase.storage
        .from('chat_audio')
        .upload(filePath, byteArray, {
          contentType: 'audio/m4a',
        });
      
      if (uploadError) throw uploadError;
      
      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('chat_audio')
        .getPublicUrl(filePath);
      
      // Obter duração do áudio
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false }
      );
      const status = await audioSound.getStatusAsync();
      const duracao = status.isLoaded ? Math.floor(status.durationMillis! / 1000) : 0;
      await audioSound.unloadAsync();
      
      // Salvar no banco
      await supabase.from('mensagens_chat').insert({
        corrida_id: corridaId,
        remetente_id: usuarioId,
        tipo_remetente: 'passageiro',
        mensagem: '🎤 Mensagem de voz',
        tipo_mensagem: 'audio',
        audio_url: urlData.publicUrl,
        audio_duracao: duracao,
      });
      
    } catch (err) {
      console.error('Erro ao enviar áudio:', err);
      throw err;
    }
  };

  const reproduzirAudio = async (audioUrl: string, messageId: string) => {
    try {
      if (reproduzindoId === messageId && sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setReproduzindoId(null);
        setSound(null);
        return;
      }
      
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      
      setReproduzindoId(messageId);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setReproduzindoId(null);
          setSound(null);
          newSound.unloadAsync();
        }
      });
      
    } catch (err) {
      console.error('Erro ao reproduzir áudio:', err);
      setReproduzindoId(null);
      Alert.alert('Erro', 'Não foi possível reproduzir o áudio.');
    }
  };

  const formatDuracao = (segundos?: number) => {
    if (!segundos) return '0:00';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatHora = (dataStr: string) => {
    const data = new Date(dataStr);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderAudioMessage = (item: ChatMessage, isMyMessage: boolean) => (
    <View style={[styles.audioContainer, isMyMessage && styles.audioContainerRight]}>
      <TouchableOpacity
        onPress={() => reproduzirAudio(item.audio_url!, item.id)}
        style={[styles.playButton, isMyMessage && styles.playButtonMyMessage]}
      >
        {reproduzindoId === item.id ? (
          <Pause size={20} color={isMyMessage ? "#FFF" : "#1E40AF"} />
        ) : (
          <Play size={20} color={isMyMessage ? "#FFF" : "#1E40AF"} fill={isMyMessage ? "#FFF" : "#1E40AF"} />
        )}
      </TouchableOpacity>
      
      <View style={styles.audioInfo}>
        <View style={styles.audioWaveform}>
          {[4, 6, 8, 12, 10, 8, 6, 4].map((height, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: reproduzindoId === item.id ? height + Math.random() * 8 : height,
                  backgroundColor: isMyMessage ? "#FFF" : "#1E40AF",
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.audioDuration, isMyMessage && styles.audioDurationMyMessage]}>
          {formatDuracao(item.audio_duracao)}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.overlay}>
            <View style={[
              styles.chatContainer,
              { 
                paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
              }
            ]}>
              {/* HEADER */}
              <View style={styles.header}>
                <View style={styles.headerInfo}>
                  <View style={styles.avatar}>
                    <User size={20} color="#FFF" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>{driverName}</Text>
                    <Text style={styles.headerSubtitle}>Motorista</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <ChevronDown size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* MENSAGENS */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#1E40AF" />
                  <Text style={styles.loadingText}>Carregando mensagens...</Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={mensagens}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.messagesList}
                  renderItem={({ item }) => {
                    const isMyMessage = item.tipo_remetente === 'passageiro' && item.remetente_id === usuarioId;
                    
                    return (
                      <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage]}>
                        {item.tipo_mensagem === 'audio' ? (
                          renderAudioMessage(item, isMyMessage)
                        ) : (
                          <>
                            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                              {item.mensagem}
                            </Text>
                            <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
                              {formatHora(item.created_at)}
                            </Text>
                          </>
                        )}
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <MessageCircle size={48} color="#D1D5DB" />
                      <Text style={styles.emptyText}>Nenhuma mensagem ainda</Text>
                      <Text style={styles.emptySubtext}>Envie uma mensagem ou áudio para o motorista</Text>
                    </View>
                  }
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
              )}

              {/* INPUT COM ÁUDIO */}
              <View style={styles.inputContainer}>
                {gravando ? (
                  <View style={styles.recordingContainer}>
                    <Animated.View style={{ transform: [{ scale: gravandoAnim }] }}>
                      <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText}>Gravando...</Text>
                      </View>
                    </Animated.View>
                    <TouchableOpacity style={styles.stopRecordBtn} onPress={stopRecording}>
                      <StopCircle size={28} color="#EF4444" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelRecordBtn} onPress={cancelRecording}>
                      <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ) : audioGravado ? (
                  <View style={styles.audioPreviewContainer}>
                    <View style={styles.audioPreview}>
                      <Mic size={20} color="#1E40AF" />
                      <Text style={styles.audioPreviewText}>Áudio gravado!</Text>
                    </View>
                    <View style={styles.audioPreviewActions}>
                      <TouchableOpacity style={styles.cancelAudioBtn} onPress={() => setAudioGravado(null)}>
                        <X size={20} color="#EF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.sendAudioBtn} 
                        onPress={enviarAudioGravado}
                        disabled={enviandoAudio}
                      >
                        {enviandoAudio ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Send size={18} color="#FFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : enviandoAudio ? (
                  <View style={styles.sendingContainer}>
                    <ActivityIndicator size="small" color="#1E40AF" />
                    <Text style={styles.sendingText}>Enviando áudio...</Text>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Digite sua mensagem..."
                      placeholderTextColor="#9CA3AF"
                      value={novaMensagem}
                      onChangeText={setNovaMensagem}
                      multiline
                      maxLength={500}
                    />
                    <TouchableOpacity
                      style={styles.micBtn}
                      onPress={startRecording}
                    >
                      <Mic size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sendBtn, !novaMensagem.trim() && { opacity: 0.5 }]}
                      onPress={enviarMensagemTexto}
                      disabled={!novaMensagem.trim()}
                    >
                      <Send size={20} color="#FFF" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: { 
    flex: 1,
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  chatContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E40AF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  closeBtn: { padding: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginBottom: 8 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#1E40AF', borderBottomRightRadius: 4 },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  otherMessageText: { color: '#111827' },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  otherMessageTime: { color: '#9CA3AF' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
  emptySubtext: { fontSize: 14, color: '#D1D5DB' },
  
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioContainerRight: {
    justifyContent: 'flex-end',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30,64,175,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonMyMessage: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#1E40AF',
  },
  audioDuration: {
    fontSize: 12,
    color: '#6B7280',
  },
  audioDurationMyMessage: {
    color: 'rgba(255,255,255,0.8)',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E40AF', alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  recordingText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  stopRecordBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelRecordBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  audioPreviewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioPreviewText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  audioPreviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelAudioBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendAudioBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  sendingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 10,
  },
  sendingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});