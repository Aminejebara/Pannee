import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js"
import { generateOTP, getOTPExpiry } from "../../utils/otp.js"
import { sendOTPEmail } from "../../utils/mailer.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID)







export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body

    await pool.query(
      "UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?",
      [refreshToken]
    )

    res.status(200).json({ message: "Déconnecté avec succès" })

  } catch (err) {
    console.error("logout error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}


