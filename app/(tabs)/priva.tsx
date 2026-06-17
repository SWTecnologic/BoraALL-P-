import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, CreditCard, Car, Lock, Database, CheckCircle } from 'lucide-react-native';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  gold: '#FFD700',
  goldDark: '#D4A800',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#6B6B6B',
  border: '#333333',
  danger: '#FF4444',
  starEmpty: '#444444',
};

export default function Privacy() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidade e Segurança</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Seção de Proteção de Dados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={24} color={COLORS.gold} />
            <Text style={styles.sectionTitle}>Proteção de Dados</Text>
          </View>
          <Text style={styles.sectionText}>
            A BoraAli utiliza criptografia de ponta a ponta para proteger suas informações pessoais. 
            Seus dados são armazenados em servidores seguros e nunca são compartilhados com terceiros 
            sem seu consentimento explícito.
          </Text>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Criptografia SSL/TLS em todas as transações</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Armazenamento seguro na AWS com certificação ISO 27001</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Acesso restrito apenas a funcionários autorizados</Text>
          </View>
        </View>

        {/* Seção de Dados de Pagamento */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={24} color={COLORS.gold} />
            <Text style={styles.sectionTitle}>Segurança nos Pagamentos</Text>
          </View>
          <Text style={styles.sectionText}>
            Todas as transações financeiras são processadas com os mais altos padrões de segurança do mercado. 
            Seus dados de pagamento são tokenizados e nunca armazenados em nossos servidores.
          </Text>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Pagamentos processados pela Stripe e PayPal</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Tokenização de cartões de crédito (PCI DSS Level 1)</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Autenticação de dois fatores para saques</Text>
          </View>
        </View>

        {/* Seção de Segurança nos Veículos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Car size={24} color={COLORS.gold} />
            <Text style={styles.sectionTitle}>Segurança nos Veículos</Text>
          </View>
          <Text style={styles.sectionText}>
            Priorizamos sua segurança em cada viagem. Nossos motoristas passam por rigorosos processos 
            de seleção e verificação para garantir sua tranquilidade.
          </Text>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Verificação completa de antecedentes criminais</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>CNH e documentos do veículo validados</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Curso de capacitação e atendimento ao cliente</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Vistoria anual do veículo</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Seguro de acidentes pessoais incluso</Text>
          </View>
        </View>

        {/* Seção de Motoristas Altamente Selecionados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={24} color={COLORS.gold} />
            <Text style={styles.sectionTitle}>Seleção Rigorosa de Motoristas</Text>
          </View>
          <Text style={styles.sectionText}>
            Nossos motoristas são profissionais altamente qualificados que passam por um processo 
            de seleção em múltiplas etapas:
          </Text>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Análise curricular e entrevista presencial</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Teste de direção defensiva</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Avaliação psicológica</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Treinamento sobre o código de conduta da BoraAli</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Avaliação contínua através das corridas realizadas</Text>
          </View>
        </View>

        {/* Seção de Privacidade Online */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={24} color={COLORS.gold} />
            <Text style={styles.sectionTitle}>Privacidade Online</Text>
          </View>
          <Text style={styles.sectionText}>
            Respeitamos sua privacidade e seguimos rigorosamente a LGPD (Lei Geral de Proteção de Dados):
          </Text>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Você tem controle total sobre seus dados</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Pode solicitar exclusão dos dados a qualquer momento</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Não compartilhamos dados com anunciantes</Text>
          </View>
          <View style={styles.bulletPoint}>
            <CheckCircle size={16} color={COLORS.gold} />
            <Text style={styles.bulletText}>Relatórios de transparência disponíveis sob demanda</Text>
          </View>
        </View>

        {/* Botão Central de Ajuda */}
        <TouchableOpacity style={styles.helpButton}>
          <Text style={styles.helpButtonText}>Central de Privacidade</Text>
        </TouchableOpacity>

        <Text style={styles.lastUpdate}>Última atualização: Janeiro de 2026</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  sectionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  helpButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  lastUpdate: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 30,
  },
});