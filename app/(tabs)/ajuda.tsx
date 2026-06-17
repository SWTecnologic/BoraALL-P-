import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Modal, TextInput, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  HelpCircle, 
  MessageCircle, 
  Phone, 
  Mail,
  ChevronDown,
  ChevronUp,
  Bell,
  Package,
  Users,
  Facebook,
  Instagram,
  Twitter,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  History
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// Cores do tema: Preto e Dourado
const COLORS = {
  primary: '#D4AF37',      // Dourado principal
  primaryDark: '#B8962E',  // Dourado escuro
  primaryLight: '#F5D98E', // Dourado claro
  background: '#000000',   // Preto fundo
  backgroundCard: '#1A1A1A', // Preto para cards
  surface: '#2A2A2A',     // Cinza escuro para superfícies
  text: '#FFFFFF',        // Branco para textos
  textSecondary: '#B0B0B0', // Cinza claro
  border: '#333333',      // Borda escura
  success: '#D4AF37',     // Dourado para sucesso
  warning: '#F5A623',     // Amarelo dourado
  error: '#FF4444',       // Vermelho para erros
};

export default function AjudaScreen() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCorrida, setSelectedCorrida] = useState<any>(null);
  const [corridasDisponiveis, setCorridasDisponiveis] = useState<any[]>([]);
  const [nomeObjeto, setNomeObjeto] = useState('');
  const [descricaoObjeto, setDescricaoObjeto] = useState('');
  const [loading, setLoading] = useState(false);
  const [carregandoCorridas, setCarregandoCorridas] = useState(false);
  const [chamadosExistentes, setChamadosExistentes] = useState<any[]>([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [passageiro, setPassageiro] = useState<any>(null);

  // Buscar dados do passageiro
  const buscarPassageiro = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: passageiroData } = await supabase
        .from('passageiros')
        .select('id')
        .eq('usuario_id', user.id)
        .single();
      
      setPassageiro(passageiroData);
      return passageiroData;
    } catch (error) {
      console.error('Erro ao carregar passageiro:', error);
      return null;
    }
  };

  // Buscar corridas do passageiro
  const buscarCorridasParaObjeto = async () => {
    setCarregandoCorridas(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      let passageiroData = passageiro;
      if (!passageiroData) {
        passageiroData = await buscarPassageiro();
      }

      if (!passageiroData) {
        Alert.alert('Erro', 'Perfil de passageiro não encontrado');
        return;
      }

      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const { data: corridas, error } = await supabase
        .from('corridas')
        .select(`
          id,
          origem_endereco,
          destino_endereco,
          data_finalizacao,
          valor_final,
          motorista_id,
          distancia_km,
          duracao_estimada
        `)
        .eq('passageiro_id', passageiroData.id)
        .eq('status', 'finalizada')
        .gte('data_finalizacao', seteDiasAtras.toISOString())
        .order('data_finalizacao', { ascending: false })
        .limit(20);

      if (error) throw error;

      const corridasComHoras = await Promise.all((corridas || []).map(async (corrida) => {
        const dataFinalizacao = new Date(corrida.data_finalizacao);
        const agora = new Date();
        const horasDiff = (agora.getTime() - dataFinalizacao.getTime()) / (1000 * 60 * 60);
        
        let motoristaNome = 'Motorista';
        if (corrida.motorista_id) {
          const { data: motorista } = await supabase
            .from('motoristas')
            .select(`
              id,
              usuarios (
                nome_completo
              )
            `)
            .eq('id', corrida.motorista_id)
            .single();
          
          if (motorista?.usuarios) {
            motoristaNome = motorista.usuarios.nome_completo;
          }
        }
        
        return {
          ...corrida,
          motorista_nome: motoristaNome,
          horas_desde_corrida: horasDiff,
          pode_solicitar: horasDiff <= 48,
          esta_atrasado: horasDiff > 24 && horasDiff <= 48
        };
      }));

      setCorridasDisponiveis(corridasComHoras);

      const { data: chamados } = await supabase
        .from('objetos_perdidos')
        .select('*')
        .eq('passageiro_id', passageiroData.id)
        .order('criado_em', { ascending: false });

      setChamadosExistentes(chamados || []);
      
    } catch (error: any) {
      console.error('Erro ao buscar corridas:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar suas corridas');
    } finally {
      setCarregandoCorridas(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarPassageiro();
    }, [])
  );

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      if (section === 'lost') {
        buscarCorridasParaObjeto();
      }
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const abrirModalChamado = () => {
    if (corridasDisponiveis.filter(c => c.pode_solicitar).length === 0) {
      Alert.alert(
        'Nenhuma corrida disponível',
        'Você não possui corridas recentes (menos de 48h) para solicitar objetos perdidos.'
      );
      return;
    }
    setSelectedCorrida(null);
    setModalVisible(true);
  };

  const selecionarCorrida = (corrida: any) => {
    if (!corrida.pode_solicitar) {
      Alert.alert(
        'Prazo Expirado',
        'Não é possível solicitar objeto perdido para corridas com mais de 48 horas.'
      );
      return;
    }
    
    const chamadoExistente = chamadosExistentes.find(c => c.corrida_id === corrida.id);
    
    if (chamadoExistente) {
      Alert.alert(
        'Chamado já existe',
        `Você já possui um chamado para esta corrida. Status: ${getStatusText(chamadoExistente.status)}`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedCorrida(corrida);
  };

  const enviarChamadoObjeto = async () => {
    if (!selectedCorrida) {
      Alert.alert('Atenção', 'Selecione uma corrida primeiro');
      return;
    }

    if (!nomeObjeto.trim()) {
      Alert.alert('Atenção', 'Por favor, descreva o objeto perdido');
      return;
    }

    if (!passageiro) {
      Alert.alert('Erro', 'Perfil não encontrado. Faça login novamente.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('objetos_perdidos')
        .insert({
          corrida_id: selectedCorrida.id,
          passageiro_id: passageiro.id,
          motorista_id: selectedCorrida.motorista_id,
          nome_objeto: nomeObjeto.trim(),
          descricao: descricaoObjeto.trim() || null,
          status: 'pendente'
        });

      if (error) throw error;

      Alert.alert(
        'Chamado aberto com sucesso!',
        'Entraremos em contato com o motorista para localizar seu objeto. Acompanhe o status no histórico de chamados.'
      );
      
      setModalVisible(false);
      setNomeObjeto('');
      setDescricaoObjeto('');
      setSelectedCorrida(null);
      
      await buscarCorridasParaObjeto();
      
    } catch (error: any) {
      console.error('Erro ao criar chamado:', error);
      Alert.alert('Erro', error.message || 'Não foi possível abrir o chamado');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock size={16} color={COLORS.warning} />;
      case 'em_andamento':
        return <AlertCircle size={16} color={COLORS.primary} />;
      case 'resolvido':
        return <CheckCircle size={16} color={COLORS.success} />;
      case 'cancelado':
        return <XCircle size={16} color={COLORS.error} />;
      default:
        return <HelpCircle size={16} color={COLORS.textSecondary} />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pendente': 'Pendente',
      'em_andamento': 'Em andamento',
      'resolvido': 'Resolvido',
      'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const formatarData = (dataISO: string) => {
    return new Date(dataISO).toLocaleString('pt-BR');
  };

  const formatarHoras = (horas: number) => {
    if (horas < 1) {
      const minutos = Math.floor(horas * 60);
      return `${minutos} minutos atrás`;
    }
    return `${Math.floor(horas)} horas atrás`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <HelpCircle size={48} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Central de Ajuda</Text>
          <Text style={styles.headerSubtitle}>Estamos aqui para ajudar você!</Text>
        </View>

        {/* Seção 1: Esqueceu algum objeto */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader} 
            onPress={() => toggleSection('lost')}
          >
            <Package size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Esqueceu um objeto no veículo?</Text>
            {expandedSection === 'lost' ? (
              <ChevronUp size={20} color={COLORS.textSecondary} />
            ) : (
              <ChevronDown size={20} color={COLORS.textSecondary} />
            )}
          </TouchableOpacity>
          
          {expandedSection === 'lost' && (
            <View style={styles.sectionContent}>
              <Text style={styles.text}>
                Não se preocupe! Estamos aqui para te ajudar a recuperar seus pertences.
              </Text>
              
              {/* Regras de prazo */}
              <View style={styles.prazoContainer}>
                <Text style={styles.prazoTitulo}>⏰ Prazos para solicitação:</Text>
                <View style={styles.prazoItem}>
                  <CheckCircle size={18} color={COLORS.success} />
                  <Text style={styles.prazoText}>
                    <Text style={styles.prazoDestaque}>Até 24 horas:</Text> Solicitação normal
                  </Text>
                </View>
                <View style={styles.prazoItem}>
                  <AlertCircle size={18} color={COLORS.warning} />
                  <Text style={styles.prazoText}>
                    <Text style={styles.prazoDestaque}>24h - 48h:</Text> Solicitação com atraso
                  </Text>
                </View>
                <View style={styles.prazoItem}>
                  <XCircle size={18} color={COLORS.error} />
                  <Text style={styles.prazoText}>
                    <Text style={styles.prazoDestaque}>Após 48h:</Text> Não é possível solicitar
                  </Text>
                </View>
              </View>

              <View style={styles.stepContainer}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Selecione a corrida</Text>
                  <Text style={styles.stepDescription}>
                    Escolha a corrida onde você esqueceu o objeto
                  </Text>
                </View>
              </View>

              <View style={styles.stepContainer}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Descreva o objeto</Text>
                  <Text style={styles.stepDescription}>
                    Informe qual objeto foi esquecido e detalhes para identificação
                  </Text>
                </View>
              </View>

              <View style={styles.stepContainer}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Acompanhe o status</Text>
                  <Text style={styles.stepDescription}>
                    O motorista será notificado e você poderá acompanhar o andamento
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.contactButton}
                onPress={abrirModalChamado}
              >
                <MessageCircle size={20} color="#000" />
                <Text style={styles.contactButtonText}>Abrir Chamado de Objeto Perdido</Text>
              </TouchableOpacity>

              {chamadosExistentes.length > 0 && (
                <TouchableOpacity 
                  style={styles.historicoButton}
                  onPress={() => setMostrarHistorico(!mostrarHistorico)}
                >
                  <History size={20} color={COLORS.primary} />
                  <Text style={styles.historicoButtonText}>
                    {mostrarHistorico ? 'Ocultar' : 'Ver'} Histórico de Chamados ({chamadosExistentes.length})
                  </Text>
                </TouchableOpacity>
              )}

              {mostrarHistorico && chamadosExistentes.map((chamado) => (
                <View key={chamado.id} style={styles.historicoItem}>
                  <View style={styles.historicoHeader}>
                    {getStatusIcon(chamado.status)}
                    <Text style={styles.historicoStatus}>{getStatusText(chamado.status)}</Text>
                  </View>
                  <Text style={styles.historicoObjeto}>📦 {chamado.nome_objeto}</Text>
                  {chamado.descricao && (
                    <Text style={styles.historicoDescricao}>📝 {chamado.descricao}</Text>
                  )}
                  <Text style={styles.historicoData}>
                    🗓️ Aberto em: {formatarData(chamado.criado_em)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Modal para criar chamado */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
            setSelectedCorrida(null);
            setNomeObjeto('');
            setDescricaoObjeto('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {!selectedCorrida ? 'Selecionar Corrida' : 'Descrever Objeto'}
              </Text>
              
              {!selectedCorrida ? (
                <>
                  <Text style={styles.modalSubtitle}>Selecione a corrida onde perdeu o objeto:</Text>
                  {carregandoCorridas ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
                  ) : (
                    <ScrollView style={styles.corridasList}>
                      {corridasDisponiveis.map((corrida) => (
                        <TouchableOpacity
                          key={corrida.id}
                          style={[
                            styles.corridaItem,
                            !corrida.pode_solicitar && styles.corridaItemDisabled
                          ]}
                          onPress={() => selecionarCorrida(corrida)}
                          disabled={!corrida.pode_solicitar}
                        >
                          <View style={styles.corridaInfo}>
                            <Text style={styles.corridaOrigem}>
                              📍 {corrida.origem_endereco?.substring(0, 50)}...
                            </Text>
                            <Text style={styles.corridaDestino}>
                              🎯 {corrida.destino_endereco?.substring(0, 50)}...
                            </Text>
                            <Text style={styles.corridaData}>
                              🗓️ {formatarData(corrida.data_finalizacao)}
                            </Text>
                            <Text style={styles.corridaMotorista}>
                              👤 {corrida.motorista_nome}
                            </Text>
                            <View style={styles.corridaDetalhes}>
                              <Text style={styles.corridaDistancia}>📏 {corrida.distancia_km?.toFixed(1)} km</Text>
                              <Text style={styles.corridaValor}>💰 R$ {corrida.valor_final?.toFixed(2)}</Text>
                            </View>
                            {corrida.esta_atrasado && (
                              <View style={styles.atrasoBadge}>
                                <AlertCircle size={12} color={COLORS.warning} />
                                <Text style={styles.atrasoText}>Solicitação com atraso</Text>
                              </View>
                            )}
                            <Text style={[
                              styles.corridaHoras,
                              !corrida.pode_solicitar && styles.textoVermelho
                            ]}>
                              ⏰ {formatarHoras(corrida.horas_desde_corrida)}
                              {!corrida.pode_solicitar && ' - Prazo expirado'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                      {corridasDisponiveis.length === 0 && !carregandoCorridas && (
                        <View style={styles.semCorridasContainer}>
                          <Package size={48} color={COLORS.textSecondary} />
                          <Text style={styles.semCorridasText}>
                            Nenhuma corrida finalizada encontrada nos últimos 7 dias.
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setSelectedCorrida(null)} style={styles.voltarButton}>
                    <ChevronUp size={20} color={COLORS.primary} />
                    <Text style={styles.voltarButtonText}>Voltar para seleção de corrida</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.corridaSelecionadaCard}>
                    <Text style={styles.corridaSelecionadaLabel}>Corrida selecionada:</Text>
                    <Text style={styles.corridaSelecionadaData}>
                      {formatarData(selectedCorrida.data_finalizacao)}
                    </Text>
                    <Text style={styles.corridaSelecionadaEndereco}>
                      📍 {selectedCorrida.origem_endereco?.substring(0, 60)}...
                    </Text>
                    <Text style={styles.corridaSelecionadaMotorista}>
                      👤 Motorista: {selectedCorrida.motorista_nome}
                    </Text>
                  </View>
                  
                  <Text style={styles.modalSubtitle}>Descreva o objeto perdido:</Text>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Nome do objeto * (ex: Celular, Carteira, Chaves)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={nomeObjeto}
                    onChangeText={setNomeObjeto}
                  />
                  
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Descrição detalhada (cor, marca, características importantes)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={descricaoObjeto}
                    onChangeText={setDescricaoObjeto}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  
                  {selectedCorrida.esta_atrasado && (
                    <View style={styles.avisoAtraso}>
                      <AlertCircle size={20} color={COLORS.warning} />
                      <Text style={styles.avisoAtrasoText}>
                        ⚠️ Esta solicitação está sendo feita com atraso (entre 24h e 48h da corrida). 
                        Ainda é possível solicitar, mas o processo pode ser mais demorado.
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonCancel]}
                      onPress={() => {
                        setModalVisible(false);
                        setSelectedCorrida(null);
                        setNomeObjeto('');
                        setDescricaoObjeto('');
                      }}
                    >
                      <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonConfirm]}
                      onPress={enviarChamadoObjeto}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={styles.modalButtonConfirmText}>Enviar Chamado</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Seção 2: Dúvidas Frequentes */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader} 
            onPress={() => toggleSection('faq')}
          >
            <HelpCircle size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Dúvidas Frequentes</Text>
            {expandedSection === 'faq' ? (
              <ChevronUp size={20} color={COLORS.textSecondary} />
            ) : (
              <ChevronDown size={20} color={COLORS.textSecondary} />
            )}
          </TouchableOpacity>
          
          {expandedSection === 'faq' && (
            <View style={styles.sectionContent}>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>❓ Como funciona o pagamento?</Text>
                <Text style={styles.faqAnswer}>
                  Aceitamos pagamento via cartão de crédito, débito, PIX e dinheiro. O valor é calculado com base na distância e tempo da corrida.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>❓ Como avaliar um motorista?</Text>
                <Text style={styles.faqAnswer}>
                  Após finalizar a corrida, você pode avaliar o motorista de 1 a 5 estrelas e deixar um comentário sobre a experiência.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>❓ Como cancelar uma corrida?</Text>
                <Text style={styles.faqAnswer}>
                  Você pode cancelar a qualquer momento antes do motorista chegar. Cancelamentos após 5 minutos podem ter taxa.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>❓ Como funciona a tarifa dinâmica?</Text>
                <Text style={styles.faqAnswer}>
                  Em horários de alta demanda, os preços podem aumentar para incentivar mais motoristas a ficarem disponíveis.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>❓ Como recuperar um objeto esquecido?</Text>
                <Text style={styles.faqAnswer}>
                  Acesse a seção "Esqueceu um objeto" acima, selecione a corrida e abra um chamado. Você pode solicitar apenas dentro de 48 horas após a corrida.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Seção 3: Contato */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Precisa de ajuda urgente?</Text>
          
          <TouchableOpacity style={styles.phoneButton} onPress={() => handleCall('0800-123-4567')}>
            <Phone size={20} color="#000" />
            <Text style={styles.phoneButtonText}>Ligue para 0800-123-4567</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emailButton} onPress={() => handleEmail('suporte@boraall.com')}>
            <Mail size={20} color={COLORS.primary} />
            <Text style={styles.emailButtonText}>suporte@BoraAli.com</Text>
          </TouchableOpacity>

          <View style={styles.socialContainer}>
            <Text style={styles.socialTitle}>Siga-nos nas redes</Text>
            <View style={styles.socialIcons}>
              <TouchableOpacity style={styles.socialIcon}>
                <Facebook size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}>
                <Instagram size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}>
                <Twitter size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.version}>BoraAli v2.07.02</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: COLORS.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.backgroundCard,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.backgroundCard,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 12,
  },
  sectionContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  prazoContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prazoTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  prazoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  prazoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  prazoDestaque: {
    fontWeight: '600',
    color: COLORS.text,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  contactButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  historicoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historicoButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  historicoItem: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historicoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  historicoStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  historicoObjeto: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  historicoDescricao: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  historicoData: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 30,
  },
  corridasList: {
    maxHeight: 400,
  },
  corridaItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.backgroundCard,
  },
  corridaItemDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.surface,
  },
  corridaInfo: {
    gap: 6,
  },
  corridaOrigem: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  corridaDestino: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  corridaData: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  corridaMotorista: {
    fontSize: 11,
    color: COLORS.primary,
  },
  corridaDetalhes: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  corridaDistancia: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  corridaValor: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  corridaHoras: {
    fontSize: 11,
    color: COLORS.error,
    fontWeight: '500',
  },
  textoVermelho: {
    color: COLORS.error,
  },
  atrasoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 166, 35, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  atrasoText: {
    fontSize: 10,
    color: COLORS.warning,
  },
  semCorridasContainer: {
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  semCorridasText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  voltarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  voltarButtonText: {
    color: COLORS.primary,
    fontSize: 13,
  },
  corridaSelecionadaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  corridaSelecionadaLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  corridaSelecionadaData: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  corridaSelecionadaEndereco: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  corridaSelecionadaMotorista: {
    fontSize: 12,
    color: COLORS.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
  },
  avisoAtraso: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  avisoAtrasoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.warning,
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalButtonConfirmText: {
    color: '#000',
    fontWeight: '600',
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  contactSection: {
    backgroundColor: COLORS.backgroundCard,
    marginTop: 20,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  phoneButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 8,
    width: '100%',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emailButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  socialContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  socialTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  socialIcon: {
    padding: 8,
  },
  version: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginVertical: 24,
  },
});