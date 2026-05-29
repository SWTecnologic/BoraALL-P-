import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useState } from 'react';
import { 
  HelpCircle, 
  Briefcase, 
  MessageCircle, 
  Star, 
  Shield, 
  Phone, 
  Mail,
  ChevronDown,
  ChevronUp,
  Bell,
  Package,
  Truck,
  Users,
  Facebook,
  Instagram,
  Twitter
} from 'lucide-react-native';

export default function AjudaScreen() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <HelpCircle size={48} color="#2563EB" />
        <Text style={styles.headerTitle}>Central de Ajuda</Text>
        <Text style={styles.headerSubtitle}>Estamos aqui para ajudar você!</Text>
      </View>

      {/* Seção 1: Esqueceu algum objeto */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => toggleSection('lost')}
        >
          <Package size={24} color="#2563EB" />
          <Text style={styles.sectionTitle}>Esqueceu um objeto no veículo?</Text>
          {expandedSection === 'lost' ? (
            <ChevronUp size={20} color="#6B7280" />
          ) : (
            <ChevronDown size={20} color="#6B7280" />
          )}
        </TouchableOpacity>
        
        {expandedSection === 'lost' && (
          <View style={styles.sectionContent}>
            <Text style={styles.text}>
              Não se preocupe! Estamos aqui para te ajudar a recuperar seus pertences.
            </Text>
            
            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Acesse o histórico de corridas</Text>
                <Text style={styles.stepDescription}>
                  Vá até a seção "Histórico" e encontre a corrida onde o objeto foi esquecido
                </Text>
              </View>
            </View>

            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Entre em contato com o motorista</Text>
                <Text style={styles.stepDescription}>
                  Utilize o botão "Contatar Motorista" disponível nos detalhes da corrida
                </Text>
              </View>
            </View>

            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Reporte ao suporte</Text>
                <Text style={styles.stepDescription}>
                  Se não conseguir contato, abra um chamado no nosso suporte com os detalhes do ocorrido
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.contactButton}>
              <MessageCircle size={20} color="#FFF" />
              <Text style={styles.contactButtonText}>Abrir Chamado de Objeto Perdido</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Seção 2: Dúvidas Frequentes */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => toggleSection('faq')}
        >
          <HelpCircle size={24} color="#2563EB" />
          <Text style={styles.sectionTitle}>Dúvidas Frequentes</Text>
          {expandedSection === 'faq' ? (
            <ChevronUp size={20} color="#6B7280" />
          ) : (
            <ChevronDown size={20} color="#6B7280" />
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
          </View>
        )}
      </View>

      {/* Seção 3: Novidades Futuras */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => toggleSection('news')}
        >
          <Bell size={24} color="#2563EB" />
          <Text style={styles.sectionTitle}>Novidades Futuras</Text>
          {expandedSection === 'news' ? (
            <ChevronUp size={20} color="#6B7280" />
          ) : (
            <ChevronDown size={20} color="#6B7280" />
          )}
        </TouchableOpacity>
        
        {expandedSection === 'news' && (
          <View style={styles.sectionContent}>
            <View style={styles.newsItem}>
              <Text style={styles.newsTitle}>🚀 BoraALL VIP</Text>
              <Text style={styles.newsDescription}>
                Programa de fidelidade com descontos exclusivos e benefícios para usuários frequentes. Lançamento em breve!
              </Text>
            </View>

            <View style={styles.newsItem}>
              <Text style={styles.newsTitle}>🔋 Frota Elétrica</Text>
              <Text style={styles.newsDescription}>
                Expansão da frota com veículos elétricos para reduzir emissões de carbono e oferecer corridas mais sustentáveis.
              </Text>
            </View>

            <View style={styles.newsItem}>
              <Text style={styles.newsTitle}>👨‍👩‍👧‍👦 BoraALL Família</Text>
              <Text style={styles.newsDescription}>
                Modalidade exclusiva com cadeirinhas e espaço para toda a família viajar com segurança.
              </Text>
            </View>

            <View style={styles.newsItem}>
              <Text style={styles.newsTitle}>📦 BoraALL Entrega</Text>
              <Text style={styles.newsDescription}>
                Serviço de entregas rápidas para encomendas e documentos na sua cidade.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Seção 4: Parcerias */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => toggleSection('partners')}
        >
          <Users size={24} color="#2563EB" />
          <Text style={styles.sectionTitle}>Parceiros</Text>
          {expandedSection === 'partners' ? (
            <ChevronUp size={20} color="#6B7280" />
          ) : (
            <ChevronDown size={20} color="#6B7280" />
          )}
        </TouchableOpacity>
        
        {expandedSection === 'partners' && (
          <View style={styles.sectionContent}>
            <Text style={styles.text}>
              Nossos parceiros que tornam a experiência BoraALL ainda melhor:
            </Text>

            <View style={styles.partnerCard}>
              <Text style={styles.partnerName}>🏨 Hotéis BoraALL</Text>
              <Text style={styles.partnerDescription}>
                Desconto especial em hotéis parceiros para usuários do app
              </Text>
            </View>

            <View style={styles.partnerCard}>
              <Text style={styles.partnerName}>✈️ BoraALL Viagens</Text>
              <Text style={styles.partnerDescription}>
                Parceria com agências de viagem para transfers executivos
              </Text>
            </View>

            <View style={styles.partnerCard}>
              <Text style={styles.partnerName}>💳 BoraALL Bank</Text>
              <Text style={styles.partnerDescription}>
                Cartão de crédito com cashback em todas as corridas
              </Text>
            </View>

            <TouchableOpacity style={styles.partnerButton}>
              <Text style={styles.partnerButtonText}>Seja um parceiro →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Seção 5: Contato */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Precisa de ajuda urgente?</Text>
        
        <TouchableOpacity style={styles.phoneButton} onPress={() => handleCall('0800-123-4567')}>
          <Phone size={20} color="#FFF" />
          <Text style={styles.phoneButtonText}>Ligue para 0800-123-4567</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.emailButton} onPress={() => handleEmail('suporte@boraall.com')}>
          <Mail size={20} color="#2563EB" />
          <Text style={styles.emailButtonText}>suporte@boraall.com</Text>
        </TouchableOpacity>

        {/* Redes Sociais */}
        <View style={styles.socialContainer}>
          <Text style={styles.socialTitle}>Siga-nos nas redes</Text>
          <View style={styles.socialIcons}>
            <TouchableOpacity style={styles.socialIcon}>
              <Facebook size={24} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon}>
              <Instagram size={24} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon}>
              <Twitter size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Versão do App */}
      <Text style={styles.version}>BoraALL v2.29.05</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  sectionContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  text: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  contactButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  newsItem: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 6,
  },
  newsDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  partnerCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  partnerDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  partnerButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  partnerButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  contactSection: {
    backgroundColor: '#FFF',
    marginTop: 20,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  phoneButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 8,
    width: '100%',
    gap: 8,
  },
  emailButtonText: {
    color: '#2563EB',
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
    color: '#6B7280',
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
    color: '#9CA3AF',
    fontSize: 12,
    marginVertical: 24,
  },
});