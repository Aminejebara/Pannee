import { Router } from "express"
import authMiddleware from "../middlewares/authMiddleware.js"
import {createReview} from "../controllers/userController/homeController/reviewController.js"
import { profileUpload } from "../middlewares/uploadMiddleware.js"
import { getProfile } from "../controllers/userController/profileController/getProfile.js"
import { updateProfile } from "../controllers/userController/profileController/updateProfile.js"
import { deleteAccount } from "../controllers/userController/profileController/deleteAccount.js"
import { uploadUserAvatar } from "../controllers/userController/profileController/uploadAvatar.js"
import { getHomeData, getNearbyProfessionals , updateUserLocation} from "../controllers/userController/homeController/getHomeData.js"


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

export default router