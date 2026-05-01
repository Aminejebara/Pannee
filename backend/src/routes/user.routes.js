import { Router } from "express"
import authMiddleware from "../middlewares/authMiddleware.js"
import { getProfile } from "../controllers/userController/profileController/getProfile.js"
import { getHomeData } from "../controllers/userController/homeController/getHomeData.js"

const router = Router()

// Protéger toutes les routes user avec le authMiddleware
router.use(authMiddleware)

// ── Profile ────────────────────────────────────────────────
router.get("/profile", getProfile)

// ── Home ──────────────────────────────────────────────────
router.get("/home", getHomeData)

export default router
