import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Alert,
  SafeAreaView
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../../constants/colors'

export default function HelpSupport() {
  const [expandedFaq, setExpandedFaq] = useState(null)

  const faqs = [
    {
      id: 1,
      question: "Comment trouver un dépanneur près de chez moi ?",
      answer: "Sur la page d'accueil, activez votre géolocalisation ou entrez votre adresse. Vous verrez la liste des professionnels disponibles à proximité avec leurs notes et avis."
    },
    {
      id: 2,
      question: "Comment contacter un professionnel ?",
      answer: "Cliquez sur le profil du professionnel, puis sur 'Contacter'. Vous pourrez lui envoyer un message directement depuis l'application."
    },
    {
      id: 3,
      question: "Les prix sont-ils affichés ?",
      answer: "Les prix sont indiqués par chaque professionnel dans sa description. N'hésitez pas à demander un devis avant intervention."
    },
    {
      id: 4,
      question: "Comment laisser un avis ?",
      answer: "Après votre intervention, vous pouvez noter et commenter le professionnel depuis la page de conversation ou depuis son profil."
    }
  ]

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id)
  }

  const handleContact = (type) => {
    let url = ''
    if (type === 'tel') url = 'tel:+21612345678'
    if (type === 'mail') url = 'mailto:support@panne.com'
    if (type === 'wa') url = 'https://wa.me/21612345678'

    Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Action impossible'))
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.mainTitle}>Centre d'aide</Text>

        {/* SECTION CONTACT - STYLE GRANDS BLOCS AIRBNB */}
        <Text style={styles.sectionTitle}>Besoin d'aide ?</Text>
        <View style={styles.contactContainer}>
          <TouchableOpacity 
            style={styles.contactRow} 
            onPress={() => handleContact('wa')}
          >
            <View style={styles.contactLeft}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.contactLabel}>Discuter sur WhatsApp</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.black} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactRow} 
            onPress={() => handleContact('tel')}
          >
            <View style={styles.contactLeft}>
              <Ionicons name="call-outline" size={24} color={COLORS.black} />
              <Text style={styles.contactLabel}>Appeler le support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.black} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.contactRow, { borderBottomWidth: 0 }]} 
            onPress={() => handleContact('mail')}
          >
            <View style={styles.contactLeft}>
              <Ionicons name="mail-outline" size={24} color={COLORS.black} />
              <Text style={styles.contactLabel}>Envoyer un e-mail</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        {/* SECTION FAQ - STYLE LIGNES MINIMALISTES */}
        <Text style={[styles.sectionTitle, { marginTop: 40 }]}>FAQ</Text>
        {faqs.map((faq) => (
          <View key={faq.id} style={styles.faqItem}>
            <TouchableOpacity 
              style={styles.faqQuestion} 
              onPress={() => toggleFaq(faq.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.faqQuestionText}>{faq.question}</Text>
              <Ionicons 
                name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={COLORS.black} 
              />
            </TouchableOpacity>
            {expandedFaq === faq.id && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>{faq.answer}</Text>
              </View>
            )}
          </View>
        ))}

        {/* ABOUT SECTION */}
        <View style={styles.aboutBox}>
          <View style={styles.logoRow}>
             <Ionicons name="flash" size={20} color={COLORS.black} />
             <Text style={styles.appName}>Panne.</Text>
          </View>
          <Text style={styles.aboutText}>
            Version 1.0.0 • Fait avec ❤️ à Tunis
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { paddingHorizontal: 12, paddingVertical: 10 },
  backButton: { padding: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 60 },
  
  mainTitle: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: COLORS.black, 
    marginBottom: 30,
    letterSpacing: -0.8
  },
  
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '600', 
    color: COLORS.black, 
    marginBottom: 16 
  },

  // Style Contact
  contactContainer: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    overflow: 'hidden'
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD'
  },
  contactLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  contactLabel: { fontSize: 16, color: COLORS.black, fontWeight: '400' },

  // Style FAQ
  faqItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD'
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  faqQuestionText: { 
    fontSize: 16, 
    color: COLORS.black, 
    flex: 1, 
    paddingRight: 20,
    lineHeight: 22
  },
  faqAnswer: {
    paddingBottom: 20,
  },
  faqAnswerText: { 
    fontSize: 15, 
    color: '#717171', 
    lineHeight: 22 
  },

  // About
  aboutBox: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  appName: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  aboutText: { fontSize: 13, color: '#717171' }
})