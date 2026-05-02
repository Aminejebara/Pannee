import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Platform,
  Linking,
  SafeAreaView,
  Modal,
  TextInput
} from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../../../../services/axios'
import { useUser } from '../../../../hooks/useUser'
import { useAuth } from '../../../../hooks/useAuth'
import { COLORS } from '../../../../constants/colors'

export default function ProfessionalDetail() {
  const { id } = useLocalSearchParams()
  const { user } = useAuth()
  const { createConversation } = useUser()

  const [professional, setProfessional] = useState(null)
  const [reviews, setReviews] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [hasUserReviewed, setHasUserReviewed] = useState(false)

  const loadProfessional = async () => {
    try {
      const response = await api.get(`/pro/profile/${id}`)
      console.log('🔵 Réponse API:', response.data.data)
      
      if (response.data.success) {
        const pro = response.data.data
        setProfessional(pro)
        setCategories(pro.categories || [])
        setReviews(pro.reviews || [])
        
        // Vérifier si l'utilisateur a déjà laissé un avis
        const userReviewed = pro.reviews?.some(r => r.user_id === user?.id)
        setHasUserReviewed(userReviewed)
      }
    } catch (error) {
      console.error('Erreur chargement pro:', error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadProfessional()
    }, [id])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await loadProfessional()
    setRefreshing(false)
  }

  const handleContact = async () => {
    const result = await createConversation(id)
    if (result.success) {
      router.push({
        pathname: '/(main)/(user)/conversation/[id]',
        params: { id: result.conversationId, contactName: professional?.business_name, professionalId: id }
      })
    } else {
      Alert.alert('Erreur', 'Impossible de contacter le professionnel')
    }
  }

  const handleCall = () => {
    professional?.phone ? Linking.openURL(`tel:${professional.phone}`) : Alert.alert('Info', 'Numéro indisponible')
  }

  const openMap = () => {
    const query = professional?.lat && professional?.lng 
      ? `${professional.lat},${professional.lng}` 
      : encodeURIComponent(professional?.address || '')
    if (query) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
  }

  const submitReview = async () => {
    setSubmittingReview(true)
    try {
      const response = await api.post('/user/reviews', {
        professional_id: parseInt(id),
        rating,
        comment: reviewComment
      })
      if (response.data.success) {
        Alert.alert('Merci !', 'Votre avis a été enregistré')
        setShowReviewModal(false)
        setHasUserReviewed(true)
        setRating(5)
        setReviewComment('')
        loadProfessional()
      }
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de l\'envoi')
    } finally {
      setSubmittingReview(false)
    }
  }

  const renderStars = (rating, size = 16, interactive = false) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity 
          key={star} 
          onPress={() => interactive && setRating(star)} 
          disabled={!interactive}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? COLORS.dixie[500] : COLORS.gray[300]}
          />
        </TouchableOpacity>
      ))}
    </View>
  )

  if (loading && !professional) {
    return <View style={styles.loaderContainer}><ActivityIndicator size="large" color={COLORS.blumine[600]} /></View>
  }

  if (!professional) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: COLORS.gray[500] }}>Professionnel non trouvé</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: COLORS.blumine[600] }}>Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ✅ Récupération correcte des notes
  const ratingValue = professional.rating_avg || professional.rating?.average || 0
  const ratingCount = professional.rating_count || professional.rating?.count || 0

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blumine[600]} />}
      >
        {/* Header / Cover */}
        <View style={styles.coverContainer}>
          <View style={styles.coverImage}>
            <Ionicons name="business-outline" size={60} color={COLORS.white} />
          </View>
          <TouchableOpacity style={styles.backButtonHeader} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Profil Infos */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {professional.avatar_url ? (
              <Image source={{ uri: professional.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{professional.business_name?.charAt(0).toUpperCase() || '?'}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.businessName}>{professional.business_name}</Text>
          
          {/* ✅ Affichage corrigé des notes */}
          <View style={styles.ratingSummary}>
            <Ionicons name="star" size={16} color={COLORS.black} />
            <Text style={styles.airbnbRatingText}>
              {ratingValue} · {ratingCount} avis
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.white} />
              <Text style={styles.contactBtnText}>Contacter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
              <Ionicons name="call-outline" size={20} color={COLORS.blumine[600]} />
              <Text style={styles.callBtnText}>Appeler</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        {professional.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.description}>{professional.description}</Text>
          </View>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services proposés</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((cat) => (
                <View key={cat.id} style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{cat.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localisation</Text>
          <TouchableOpacity style={styles.infoRow} onPress={openMap}>
            <Ionicons name="location-outline" size={22} color={COLORS.gray[500]} />
            <Text style={styles.infoText}>{professional.address || professional.city || 'Adresse non renseignée'}</Text>
            <Ionicons name="open-outline" size={16} color={COLORS.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* SECTION AVIS STYLE AIRBNB HORIZONTAL */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ce qu'en pensent les clients</Text>
              <TouchableOpacity onPress={() => router.push(`/(main)/(user)/professionals/${id}/reviews`)}>
                <Text style={styles.viewAllText}>Afficher tout</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.horizontalReviews}
            >
              {reviews.slice(0, 5).map((review) => (
                <View key={review.id} style={styles.airbnbReviewCard}>
                  <View style={styles.reviewHeader}>
                    {review.avatar_url ? (
                      <Image source={{ uri: review.avatar_url }} style={styles.airbnbAvatar} />
                    ) : (
                      <View style={[styles.airbnbAvatar, styles.airbnbAvatarPlaceholder]}>
                        <Text style={styles.avatarLetter}>{review.username?.charAt(0).toUpperCase() || 'U'}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.airbnbReviewName}>{review.username || 'Client'}</Text>
                      <Text style={styles.airbnbReviewDate}>
                        {new Date(review.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.airbnbReviewComment} numberOfLines={3}>{review.comment}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bouton Laisser un avis - toujours visible si pas déjà fait */}
        {!hasUserReviewed && (
          <View style={{ padding: 20 }}>
            <TouchableOpacity style={styles.reviewBtn} onPress={() => setShowReviewModal(true)}>
              <Ionicons name="star-outline" size={18} color={COLORS.white} />
              <Text style={styles.reviewBtnText}>Laisser un avis</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODAL D'AVIS */}
      <Modal animationType="slide" transparent visible={showReviewModal} onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Votre avis</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              {renderStars(rating, 35, true)}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Comment s'est passée votre intervention ?"
              placeholderTextColor={COLORS.gray[400]}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
            />
            <TouchableOpacity style={styles.submitButton} onPress={submitReview} disabled={submittingReview}>
              {submittingReview ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Publier</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coverContainer: { height: 140, backgroundColor: COLORS.blumine[600], justifyContent: 'center', alignItems: 'center' },
  backButtonHeader: { position: 'absolute', top: 50, left: 20 },
  profileSection: { alignItems: 'center', marginTop: -50, paddingHorizontal: 20 },
  avatarContainer: { marginBottom: 10 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: COLORS.white },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.blumine[100], justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: COLORS.white },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: COLORS.blumine[600] },
  businessName: { fontSize: 22, fontWeight: 'bold', color: COLORS.black, textAlign: 'center' },
  
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 5, marginVertical: 10 },
  airbnbRatingText: { fontSize: 16, fontWeight: '600', color: COLORS.black },
  
  actionButtons: { flexDirection: 'row', gap: 10, marginVertical: 15 },
  contactBtn: { flex: 1, backgroundColor: COLORS.blumine[600], height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  contactBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  callBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.blumine[600], height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  callBtnText: { color: COLORS.blumine[600], fontWeight: '600', fontSize: 15 },

  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  viewAllText: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline', color: COLORS.blumine[600] },
  description: { fontSize: 15, color: COLORS.gray[600], lineHeight: 22 },

  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBadge: { backgroundColor: COLORS.blumine[50], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  categoryBadgeText: { color: COLORS.blumine[600], fontSize: 13, fontWeight: '500' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  infoText: { flex: 1, fontSize: 15 },

  horizontalReviews: { paddingRight: 20, gap: 15 },
  airbnbReviewCard: { width: 280, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray[200], backgroundColor: COLORS.white },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  airbnbAvatar: { width: 40, height: 40, borderRadius: 20 },
  airbnbAvatarPlaceholder: { backgroundColor: COLORS.blumine[50], justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: COLORS.blumine[600], fontWeight: 'bold', fontSize: 18 },
  airbnbReviewName: { fontWeight: '600', fontSize: 15 },
  airbnbReviewDate: { fontSize: 12, color: COLORS.gray[500] },
  airbnbReviewComment: { fontSize: 14, color: COLORS.gray[700], lineHeight: 20 },

  reviewBtn: { backgroundColor: COLORS.dixie[500], padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  reviewBtnText: { color: COLORS.white, fontWeight: 'bold' },

  starsContainer: { flexDirection: 'row', gap: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  reviewInput: { borderWidth: 1, borderColor: COLORS.gray[200], borderRadius: 12, padding: 15, height: 100, textAlignVertical: 'top', marginVertical: 15, fontSize: 16 },
  submitButton: { backgroundColor: COLORS.blumine[600], padding: 15, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
})