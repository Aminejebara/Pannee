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

    const [existingEmail] = await pool.query(
      "SELECT id FROM users WHERE email = ?", [email]
    )
    if (existingEmail.length > 0) {
      return res.status(409).json({ message: "Email déjà utilisé" })
    }

    const [existingUsername] = await pool.query(
      "SELECT id FROM users WHERE username = ?", [username]
    )
    if (existingUsername.length > 0) {
      return res.status(409).json({ message: "Username déjà utilisé" })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, phone, role, is_active)
       VALUES (?, ?, ?, ?, 'user', FALSE)`,
      [username, email, password_hash, phone || null]
    )
    const userId = result.insertId

    await pool.query("DELETE FROM otps WHERE user_id = ?", [userId])

    const otp = generateOTP()
    const expiry = getOTPExpiry()

    await pool.query(
      `INSERT INTO otps (user_id, code, expires_at) VALUES (?, ?, ?)`,
      [userId, otp, expiry]
    )

    await sendOTPEmail(email, otp)

    res.status(201).json({ message: "Compte créé — vérifie ton email" })

  } catch (err) {
    console.error("registerUser error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}
