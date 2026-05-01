//loginController.js
import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js"
import { generateOTP, getOTPExpiry } from "../../utils/otp.js"
import { sendOTPEmail } from "../../utils/mailer.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID)


export const login = async (req, res) => {
  try {
    const { email, password, lat, lng, place_id, city, country, address } = req.body

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?", [email]
    )
    if (users.length === 0) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect 1 " })
    }
    const user = users[0]

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect 2" })
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Compte non vérifié — vérifie ton email" })
    }

    if (user.is_banned) {
      return res.status(403).json({ message: "Compte banni" })
    }

    if (lat && lng) {
      await pool.query(
        `UPDATE users 
         SET lat = ?, lng = ?, place_id = ?, city = ?, country = ?, address = ?
         WHERE id = ?`,
        [lat, lng, place_id || null, city || null, country || null, address || null, user.id]
      )
    }

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
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        avatar_url: user.avatar_url,
        role: user.role,
        is_active: user.is_active,
        is_banned: user.is_banned,
        address: address || user.address,
        lat: lat || user.lat,
        lng: lng || user.lng,
        place_id: place_id || user.place_id,
        city: city || user.city,
        country: country || user.country,
      },
      professional
    })

  } catch (err) {
    console.error("login error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}