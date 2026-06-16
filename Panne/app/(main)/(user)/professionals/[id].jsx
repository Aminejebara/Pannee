import React, { useState, useCallback, useRef, useEffect } from 'react'
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
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Animated
} from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import api from '../../../../services/axios'
import { useUser } from '../../../../hooks/useUser'
import { useAuth } from '../../../../hooks/useAuth'
import { COLORS } from '../../../../constants/colors'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

export default function ProfessionalDetail() {
  const { id, returnTo, categoryId, categoryName } = useLocalSearchParams()

  const { user } = useAuth()
  const { createConversation } = useUser()

  const [professional, setProfessional] = useState(null)
  const [reviews, setReviews] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [hasUserReviewed, setHasUserReviewed] = useState(false)
  
  // ✅ CORRECTION : Initialiser correctement le ref
  const scrollViewRef = useRef(null)

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  // Animation d'entree du modal
  useEffect(() => {
    if (showReviewModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start()
    }
  }, [showReviewModal])

  const handleGoBack = () => {
    if (returnTo === 'category' && categoryId) {
      router.push({
        pathname: '/(main)/(user)/category/[id]',
        params: { id: categoryId, name: categoryName }
      })
    } else {
      router.back()
    }
  }

  const loadProfessional = async () => {
    try {
      const response = await api.get(`/pro/profile/${id}`)
      if (response.data.success) {
        const pro = response.data.data
        setProfessional(pro)
        setCategories(pro.categories || [])
        setReviews(pro.reviews || [])
        const userReviewed = pro.reviews?.some(r => r.user_id === user?.id)
        setHasUserReviewed(userReviewed)
      }
    } catch (error) {
      console.error('Erreur chargement pro:', error.response?.data || error.message)
    } {
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
        pathname: '/conversation/[id]',
        params: { 
          id: result.conversationId, 
          contactName: professional?.business_name,
          contactAvatar: professional?.avatar_url,
          professionalId: id 
        }
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
    if (query) Linking.openURL(`http://maps.google.com/maps?q=${query}`)
  }

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert('Info', 'Veuillez selectionner une note.')
      return
    }
    if (!reviewComment.trim()) {
      Alert.alert('Info', 'Veuillez laisser un commentaire pour votre avis.')
      return
    }
    setSubmittingReview(true)
    try {
      const response = await api.post('/user/reviews', {
        professional_id: parseInt(id),
        rating,
        comment: reviewComment
      })
      if (response.data.success) {
        Alert.alert('Merci !', 'Votre avis a été enregistré avec succès.')
        setShowReviewModal(false)
        setHasUserReviewed(true)
        setRating(0)
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
          activeOpacity={0.7}
          style={interactive ? { padding: 4 } : null}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? '#FFD200' : COLORS.gray[300]}
          />
        </TouchableOpacity>
      ))}
    </View>
  )

  if (loading && !professional) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[950]} />
      </View>
    )
  }

  if (!professional) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: COLORS.gray[500], fontWeight: '500' }}>Professionnel introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBackBtn}>
          <Text style={{ color: COLORS.white, fontWeight: '600' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const ratingValue = parseFloat(professional.rating_avg || professional.rating?.average || 0).toFixed(1)
  const ratingCount = parseInt(professional.rating_count || professional.rating?.count || 0, 10)

  return (
    <SafeAreaView style={styles.container}>
      
      
      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blumine[950]} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER BANNIÈRE */}
        <View style={styles.coverContainer}>
          {professional.cover_url ? (
            <Image source={{ uri: professional.cover_url }} style={styles.coverImageReal} />
          ) : (
            <View style={styles.coverDesignBackground} />
          )}
          
          <TouchableOpacity style={styles.backButtonHeader} onPress={handleGoBack}>
            <Ionicons name="chevron-back" size={22} color={COLORS.blumine[950]} />
          </TouchableOpacity>
        </View>

        {/* SECTION PROFIL */}
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
          
          <View style={styles.ratingSummary}>
            <Ionicons name="star" size={14} color="#FFD200" />
            <Text style={styles.airbnbRatingText}>
              {ratingValue} <Text style={styles.dotDivider}>·</Text> {ratingCount} avis
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* DESCRIPTION */}
        {professional.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.description}>{professional.description}</Text>
          </View>
        )}

        {/* SERVICES / CATEGORIES - BADGES JAUNES */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services & Compétences</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((cat) => (
                <View key={cat.id} style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{cat.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* LOCALISATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zone d'intervention</Text>
          <TouchableOpacity style={styles.infoRow} onPress={openMap} activeOpacity={0.7}>
            <View style={styles.locationIconBox}>
              <Ionicons name="location" size={20} color={COLORS.blumine[950]} />
            </View>
            <View style={styles.locationTextBox}>
              <Text style={styles.infoText} numberOfLines={2}>
                {professional.address || professional.city || 'Adresse non spécifiée'}
              </Text>
              <Text style={styles.subInfoText}>Voir sur la carte</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* AVIS CLIENTS */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis clients</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.horizontalReviews}
              snapToInterval={295}
              decelerationRate="fast"
            >
              {reviews.slice(0, 5).map((review) => (
                <View key={review.id} style={styles.airbnbReviewCard}>
                  <View style={styles.reviewHeader}>
                    {review.avatar_url ? (
                      <Image source={{ uri: review.avatar_url }} style={styles.airbnbAvatar} />
                    ) : (
                      <View style={styles.airbnbAvatarPlaceholder}>
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
                  <View style={{ marginBottom: 6 }}>
                    {renderStars(review.rating || 5, 12)}
                  </View>
                  <Text style={styles.airbnbReviewComment} numberOfLines={3}>{review.comment}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* BOUTON ÉCRIRE AVIS */}
        {!hasUserReviewed && (
          <TouchableOpacity 
            style={styles.inlineReviewTrigger} 
            onPress={() => setShowReviewModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.blumine[950]} />
            <Text style={styles.inlineReviewTriggerText}>Écrire un avis</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* BARRE FIXE INFÉRIEURE */}
      <View style={styles.stickyBottomBar}>
        <TouchableOpacity style={styles.callActionButton} onPress={handleCall}>
          <Ionicons name="call" size={18} color={COLORS.blumine[950]} />
          <Text style={styles.callActionText}>Appeler</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactActionButton} onPress={handleContact}>
          <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.white} />
          <Text style={styles.contactActionText}>Contacter</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL AVIS - STYLE AIRBNB */}
      <Modal 
        transparent 
        visible={showReviewModal} 
        onRequestClose={() => setShowReviewModal(false)}
        animationType="none"
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View 
              style={[
                styles.modalOverlay,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              <TouchableWithoutFeedback>
                <Animated.View 
                  style={[
                    styles.modalContent,
                    {
                      transform: [
                        { translateY: slideAnim },
                        { scale: scaleAnim }
                      ]
                    }
                  ]}
                >
                  {/* Indicateur de swipe */}
                  <View style={styles.modalIndicator} />
                  
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Donner un avis</Text>
                    <TouchableOpacity 
                      style={styles.closeModalBtn} 
                      onPress={() => setShowReviewModal(false)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={20} color={COLORS.gray[600]} />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.modalSubtitle}>Comment s'est passée votre intervention ?</Text>
                  
                  {/* Étoiles */}
                  <View style={styles.modalStarsRow}>
                    {renderStars(rating, 40, true)}
                    {rating > 0 && (
                      <Text style={styles.ratingLabelText}>
                        {rating === 1 ? 'Très mauvais' :
                         rating === 2 ? 'Mauvais' :
                         rating === 3 ? 'Moyen' :
                         rating === 4 ? 'Très bien' :
                         'Excellent'}
                      </Text>
                    )}
                  </View>
                  
                  {/* Input commentaire */}
                  <View style={styles.textInputWrapper}>
                    <TextInput
                      style={styles.reviewInput}
                      placeholder="Partagez votre expérience..."
                      placeholderTextColor={COLORS.gray[400]}
                      value={reviewComment}
                      onChangeText={setReviewComment}
                      multiline
                      maxLength={300}
                      textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{reviewComment.length}/300</Text>
                  </View>
                  
                  {/* Bouton envoyer */}
                  <TouchableOpacity 
                    style={[
                      styles.submitButton, 
                      (rating === 0 || !reviewComment.trim() || submittingReview) && styles.submitButtonDisabled
                    ]} 
                    onPress={submitReview} 
                    disabled={submittingReview || rating === 0 || !reviewComment.trim()}
                    activeOpacity={0.8}
                  >
                    {submittingReview ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.submitButtonText}>Envoyer l'avis</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  errorBackBtn: { marginTop: 16, backgroundColor: COLORS.blumine[950], paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  
  /* --- COUVERTURE --- */
  coverContainer: { height: 160, position: 'relative', backgroundColor: '#F5F5F5' },
  coverImageReal: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverDesignBackground: { width: '100%', height: '100%', backgroundColor: COLORS.blumine[950] },
  backButtonHeader: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 20 : 40, 
    left: 24, 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4
  },

  /* --- PROFIL --- */
  profileSection: { alignItems: 'center', marginTop: -45, paddingHorizontal: 24, marginBottom: 20 },
  avatarContainer: { marginBottom: 12 },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: '#FFFFFF' },
  avatarPlaceholder: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: COLORS.blumine[900], 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 4, 
    borderColor: '#FFFFFF' 
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  businessName: { fontSize: 24, fontWeight: '800', color: COLORS.blumine[950], textAlign: 'center', letterSpacing: -0.5 },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  airbnbRatingText: { fontSize: 14, fontWeight: '600', color: COLORS.blumine[950] },
  dotDivider: { color: '#CCCCCC', fontWeight: '400' },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 24, marginVertical: 4 },

  /* --- SECTIONS --- */
  section: { marginTop: 24, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.blumine[950], marginBottom: 10 },
  description: { fontSize: 14, color: COLORS.gray[600], lineHeight: 22, fontWeight: '400' },

  /* --- CATEGORIES BADGES JAUNES --- */
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  categoryBadge: { 
    backgroundColor: '#FFD200',
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6B800'
  },
  categoryBadgeText: { color: COLORS.black, fontSize: 13, fontWeight: '600' },

  /* --- LOCALISATION --- */
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
    padding: 14, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 12,
  },
  locationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  locationTextBox: { flex: 1, gap: 2 },
  infoText: { fontSize: 14, fontWeight: '600', color: COLORS.blumine[950] },
  subInfoText: { fontSize: 12, color: COLORS.gray[400], fontWeight: '500' },

  /* --- AVIS CARDS --- */
  horizontalReviews: { paddingRight: 24, gap: 14, marginTop: 4 },
  airbnbReviewCard: { 
    width: 280, 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#F0F0F0', 
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  airbnbAvatar: { width: 36, height: 36, borderRadius: 18 },
  airbnbAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: COLORS.blumine[950], fontWeight: '700', fontSize: 15 },
  airbnbReviewName: { fontWeight: '700', fontSize: 14, color: COLORS.blumine[950] },
  airbnbReviewDate: { fontSize: 11, color: COLORS.gray[400], marginTop: 1 },
  airbnbReviewComment: { fontSize: 13, color: COLORS.gray[600], lineHeight: 19 },

  /* --- BOUTON ÉCRIRE AVIS --- */
  inlineReviewTrigger: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    marginTop: 28,
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed'
  },
  inlineReviewTriggerText: { color: COLORS.blumine[950], fontSize: 15, fontWeight: '600' },

  /* --- BARRE FIXE --- */
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  callActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.blumine[950],
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF'
  },
  callActionText: { color: COLORS.blumine[950], fontWeight: '700', fontSize: 15 },
  contactActionButton: {
    flex: 1.8,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFD200',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FFD200',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3
  },
  contactActionText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },

  /* --- MODAL AVIS --- */
  modalContainer: { flex: 1 },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    paddingHorizontal: 24, 
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 20
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: COLORS.blumine[950]
  },
  closeModalBtn: { 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    backgroundColor: '#F5F5F5', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalSubtitle: { 
    fontSize: 14, 
    color: COLORS.gray[500], 
    fontWeight: '500', 
    marginBottom: 12 
  },
  modalStarsRow: { 
    alignItems: 'center', 
    marginBottom: 20 
  },
  ratingLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginTop: 8
  },
  textInputWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  reviewInput: { 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: 16, 
    padding: 16, 
    height: 110, 
    textAlignVertical: 'top', 
    fontSize: 14, 
    color: COLORS.blumine[950],
    backgroundColor: '#FAFAFA',
    paddingBottom: 30,
  },
  charCount: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    fontSize: 12,
    color: COLORS.gray[400],
  },
  submitButton: { 
    backgroundColor: '#FFD200', 
    paddingVertical: 16, 
    borderRadius: 14, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitButtonDisabled: {
    opacity: 0.5
  },
  submitButtonText: { 
    color: COLORS.black, 
    fontWeight: '700', 
    fontSize: 16 
  },
  starsContainer: { 
    flexDirection: 'row', 
    gap: 4 
  },
})