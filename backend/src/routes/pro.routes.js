import { Router } from "express"
import authMiddleware from "../middlewares/authMiddleware.js"
import { getProfileProData, updateProfileProData, deleteProfileProData, getAvailableCategories } from "../controllers/proController/profileproController/getProfileProData.js"

const router = Router()

// ── Categories (no auth needed) ────────────────────────────
router.get("/categories", getAvailableCategories)

// Protéger les autres routes pro avec le authMiddleware


// ── Profile ────────────────────────────────────────────────
router.get("/profile/:professionalId", getProfileProData)
router.put("/profile/:professionalId", updateProfileProData)
router.delete("/profile/:professionalId", deleteProfileProData)

export default router
