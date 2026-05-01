import { Router } from "express"
import { registerPro } from "../controllers/authControllers/registerProController.js"
import { registerUser } from "../controllers/authControllers/registerUserController.js"
import { verifyOTP } from "../controllers/authControllers/verifyOtpController.js"
import { login } from "../controllers/authControllers/loginController.js"
import { refresh } from "../controllers/authControllers/refreshController.js"
import { logout } from "../controllers/authControllers/logoutController.js"
import { forgetPasswordRequest } from "../controllers/authControllers/forgetPasswordRequest.js"
import { resetpassword } from "../controllers/authControllers/resetPasswordRequest.js"
import { googleAuth } from "../controllers/authControllers/authGoogleController.js"
import { getServiceCategories, getProCategoriesById } from "../controllers/authControllers/categoriesController.js"

const router = Router()

// ✅ Auth routes
router.post("/register", registerUser)
router.post("/register-pro", registerPro)
router.post("/verify-otp", verifyOTP)
router.post("/login", login)
router.post("/refresh", refresh)
router.post("/logout", logout)
router.post("/forget-password", forgetPasswordRequest)
router.post("/reset-password", resetpassword)
router.post("/google-auth", googleAuth)

// ✅ Service categories routes
router.get("/categories", getServiceCategories)
router.get("/pro/:professionalId/categories", getProCategoriesById)


export default router