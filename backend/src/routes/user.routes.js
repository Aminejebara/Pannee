import { Router } from "express"
import authMiddleware from "../middlewares/authMiddleware.js"
import { getProfile } from "../controllers/userController/profileController/getProfile.js"
import { updateProfile } from "../controllers/userController/profileController/updateProfile.js"
import { deleteAccount } from "../controllers/userController/profileController/deleteAccount.js"
import { getHomeData, getNearbyProfessionals } from "../controllers/userController/homeController/getHomeData.js"
import { 
    getConversations, 
    getMessages, 
    markConversationAsRead,
    createConversation,
    sendMessage,
    getUnreadCount
} from "../controllers/messageController/messageController.js"

const router = Router()

// Routes publiques (pas besoin d'auth pour la home et la recherche)
router.get("/home", getHomeData)
router.get("/nearby", getNearbyProfessionals)

// Protéger toutes les routes user avec le authMiddleware
router.use(authMiddleware)

// ── Profile ────────────────────────────────────────────────
router.get("/profile", getProfile)
router.put("/profile", updateProfile)
router.delete("/profile", deleteAccount)

// ── Messages (utilisation du controller unique) ───────────
router.get("/conversations", getConversations)
router.get("/conversations/:conversationId/messages", getMessages)
router.put("/conversations/:conversationId/read", markConversationAsRead)
router.post("/conversations", createConversation)
router.post("/conversations/:conversationId/messages", sendMessage)
router.get("/messages/unread/count", getUnreadCount)

export default router