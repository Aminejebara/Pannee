import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js"
import { generateOTP, getOTPExpiry } from "../../utils/otp.js"
import { sendOTPEmail } from "../../utils/mailer.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID)

export const registerUser = async (req, res) => {
  try {
    const { username, email, password, phone } = req.body

    // 🔍 check si email existe
    const [users] = await pool.query(
      "SELECT id, is_active FROM users WHERE email = ?",
      [email]
    )

    let userId

    // =========================
    // CASE 1: user existe déjà
    // =========================
    if (users.length > 0) {
      const user = users[0]

      // ❌ déjà activé → email bloqué
      if (user.is_active === 1) {
        return res.status(409).json({ message: "Email déjà utilisé" })
      }

      // ♻️ pas activé → on réutilise le compte
      userId = user.id

      const password_hash = await bcrypt.hash(password, 12)

      await pool.query(
        "UPDATE users SET username = ?, password_hash = ?, phone = ? WHERE id = ?",
        [username, password_hash, phone || null, userId]
      )

    } else {
      // =========================
      // CASE 2: nouveau user
      // =========================

      const password_hash = await bcrypt.hash(password, 12)

      const [result] = await pool.query(
        `INSERT INTO users (username, email, password_hash, phone, role, is_active)
         VALUES (?, ?, ?, ?, 'user', FALSE)`,
        [username, email, password_hash, phone || null]
      )

      userId = result.insertId
    }

    // =========================
    // OTP (toujours reset)
    // =========================

    await pool.query("DELETE FROM otps WHERE user_id = ?", [userId])

    const otp = generateOTP()
    const expiry = getOTPExpiry()

    await pool.query(
      `INSERT INTO otps (user_id, code, expires_at) VALUES (?, ?, ?)`,
      [userId, otp, expiry]
    )

    await sendOTPEmail(email, otp)

    return res.status(201).json({
      message: "Compte créé — vérifie ton email"
    })

  } catch (err) {
    console.error("registerUser error:", err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
}