import { Router } from "express"
import authMiddleware from "../middlewares/authMiddleware.js"
import {createReview} from "../controllers/userController/homeController/reviewController.js"
import { profileUpload } from "../middlewares/uploadMiddleware.js"
import { getProfile } from "../controllers/userController/profileController/getProfile.js"
import { updateProfile } from "../controllers/userController/profileController/updateProfile.js"
import { deleteAccount } from "../controllers/userController/profileController/deleteAccount.js"
import { uploadUserAvatar } from "../controllers/userController/profileController/uploadAvatar.js"
import { getHomeData, getNearbyProfessionals , updateUserLocation} from "../controllers/userController/homeController/getHomeData.js"
import { 
    getConversations, 
    getMessages, 
    markConversationAsRead,
    createConversation,
    sendMessage,
    getUnreadCount,
    uploadMessageImage,
    // ✅ AJOUT DES NOUVEAUX CONTROLLERS UNSEND
    unsendMessage,
    unsendAllMessages,
    getUnsentMessages
} from "../controllers/messageController/messageController.js"
import { registerPushToken, deactivatePushToken } from "../controllers/notificationController.js"

const router = Router()

// Routes publiques
router.get("/home", getHomeData)
router.get("/nearby", getNearbyProfessionals)

// Routes protégées
router.use(authMiddleware)

// ─── Avis ───────────────────────────────────────────────────
router.post("/reviews", createReview)

// ─── Profile ────────────────────────────────────────────────
router.get("/profile", getProfile)
router.put("/profile", updateProfile)
router.delete("/profile", deleteAccount)
router.post("/upload/avatar", profileUpload.single('avatar'), uploadUserAvatar)

// ─── Messages ───────────────────────────────────────────────
router.get("/conversations", getConversations)
router.get("/conversations/:conversationId/messages", getMessages)
router.put("/conversations/:conversationId/read", markConversationAsRead)
router.post("/conversations", createConversation)
router.post("/conversations/:conversationId/messages", sendMessage)
router.get("/messages/unread/count", getUnreadCount)
router.post("/upload/message-image", authMiddleware, uploadMessageImage)

// ─── Localisation ───────────────────────────────────────────
router.put("/location", updateUserLocation)

// ============================================================
// 🆕 ROUTES UNSEND - SUPPRIMER POUR TOUT LE MONDE
// ============================================================

// UNSEND un message (le sender supprime pour tout le monde)
router.delete("/messages/:messageId/unsend", unsendMessage)

// UNSEND tous les messages d'une conversation (le sender supprime tous ses messages)
router.delete("/conversations/:conversationId/unsend-all", unsendAllMessages)

// Recuperer les messages UNSEND d'une conversation (pour audit)
router.get("/conversations/:conversationId/unsent", getUnsentMessages)

// ─── Notifications ─────────────────────────────────────────
router.post("/notifications/register-token", registerPushToken)
router.post("/notifications/deactivate-token", deactivatePushToken)

export default router