import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js"
import { generateOTP, getOTPExpiry } from "../../utils/otp.js"
import { sendOTPEmail } from "../../utils/mailer.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID)





export const verifyOTP = async (req, res) => {
  try {
    const { email, code } = req.body

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?", [email]
    )
    if (users.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable" })
    }
    const user = users[0]

    const [otps] = await pool.query(
      `SELECT * FROM otps 
       WHERE user_id = ? AND code = ? AND expires_at > NOW() AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, code]
    )
    if (otps.length === 0) {
      return res.status(400).json({ message: "Code invalide ou expiré" })
    }

    await pool.query("UPDATE otps SET used = TRUE WHERE id = ?", [otps[0].id])
    await pool.query("UPDATE users SET is_active = TRUE WHERE id = ?", [user.id])

    const updatedUser = { ...user, is_active: true }

    await pool.query(
      "DELETE FROM refresh_tokens WHERE user_id = ?",
      [user.id]
    )

    const payload = { id: user.id, email: user.email, role: user.role }
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [user.id, refreshToken]
    )

    let professional = null
    if (user.role === "professional") {
      const [pros] = await pool.query(
        "SELECT * FROM professionals WHERE user_id = ?", [user.id]
      )
      if (pros.length > 0) professional = pros[0]
    }

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        phone: updatedUser.phone,
        avatar_url: updatedUser.avatar_url,
        role: updatedUser.role,
        is_active: updatedUser.is_active,
        is_banned: updatedUser.is_banned,
        address: updatedUser.address,
        lat: updatedUser.lat,
        lng: updatedUser.lng,
        place_id: updatedUser.place_id,
        city: updatedUser.city,
        country: updatedUser.country,
      },
      professional
    })

  } catch (err) {
    console.error("verifyOTP error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}
