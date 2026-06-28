import { Router } from "express"
import authMiddleware from "../middlewares/authMiddleware.js"
import { profileUpload } from "../middlewares/uploadMiddleware.js"
import { 
    getProfileProData, 
    updateProfileProData, 
    deleteProfileProData, 
    getAvailableCategories,
    uploadProAvatar ,
    getProReviews ,
    updateProLocation
} from "../controllers/proController/profileproController/getProfileProData.js"



import { createConversation} from "../controllers/messageController/createConversation.js"
import {getConversations} from "../controllers/messageController/getConversations.js"
import { getMessages } from "../controllers/messageController/getMessages.js"
import { getUnreadCount } from "../controllers/messageController/getUnreadCount.js"
import { getUnsentMessages} from "../controllers/messageController/getUnsentMessages.js"
import { markConversationAsRead} from "../controllers/messageController/markConversationAsRead.js"
import { sendMessage} from "../controllers/messageController/sendMessage.js"
import { unsendAllMessages } from "../controllers/messageController/unsendAllMessages.js"
import { unsendMessage } from "../controllers/messageController/unsendMessage.js"
import { uploadMessageImage } from "../controllers/messageController/uploadMessageImage.js"


// ✅ IMPORTER LES CONTROLLERS MANQUANTS
import { getProStats } from "../controllers/proController/homeproController/getProStats.js"
import { getProDashboardData } from "../controllers/proController/homeproController/getProDashboardData.js"
import { getRecentMessages } from "../controllers/proController/homeproController/getRecentMessages.js"
import { getUnreadConversations } from "../controllers/proController/homeproController/getUnreadConversations.js"


const router = Router()

// Routes publiques
router.get("/categories", getAvailableCategories)

// Routes protégées
router.use(authMiddleware)

// ─── Profile ────────────────────────────────────────────────
router.get("/profile/:professionalId", getProfileProData)
router.put("/profile/:professionalId", updateProfileProData)
router.delete("/profile/:professionalId", deleteProfileProData)
router.post("/profile/:professionalId/avatar", profileUpload.single('avatar'), uploadProAvatar)

// ─── Dashboard / Stats ─────────────────────────────────────
router.get("/stats", getProStats)
router.get("/dashboard", getProDashboardData)
router.get("/recent-messages", getRecentMessages)
router.get("/unread-conversations", getUnreadConversations)
router.get("/profile/:professionalId/reviews", getProReviews)

// ─── Messages ───────────────────────────────────────────────
router.get("/conversations", getConversations)
router.get("/conversations/:conversationId/messages", getMessages)
router.put("/conversations/:conversationId/read", markConversationAsRead)
router.post("/conversations/:conversationId/messages", sendMessage)
router.get("/messages/unread/count", getUnreadCount)

// ─── Upload image pour messages ─────────────────────────────
router.post("/upload/message-image", authMiddleware, uploadMessageImage)

// ─── Localisation ───────────────────────────────────────────
router.put("/profile/:professionalId/location", authMiddleware, updateProLocation)

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


export default router