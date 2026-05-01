import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client()

export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({ message: "idToken manquant" })
    }

    // ✅ audience multi-plateforme
    const ticket = await client.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_CLIENT_ID_ANDROID,
        process.env.GOOGLE_CLIENT_ID_IOS,
      ].filter(Boolean),
    })

    const payload = ticket.getPayload()
    const { email, name, picture } = payload

    let [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email])
    let user

    if (users.length === 0) {
      const username = name?.replace(/\s+/g, "_").toLowerCase() + "_" + Date.now()
      // ✅ password_hash impossible à matcher
      const impossibleHash = await bcrypt.hash(crypto.randomUUID(), 10)
      const [result] = await pool.query(
        `INSERT INTO users 
         (username, email, password_hash, phone, role, is_active, avatar_url)
         VALUES (?, ?, ?, NULL, 'user', TRUE, ?)`,
        [username, email, impossibleHash, picture || null]
      )
      const [newUsers] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId])
      user = newUsers[0]
    } else {
      user = users[0]
      if (user.is_banned) {
        return res.status(403).json({ message: "Compte banni" })
      }
      await pool.query(
        `UPDATE users SET avatar_url = ? WHERE id = ?`,
        [picture || user.avatar_url, user.id]
      )
    }

    await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [user.id])

    const tokenPayload = { id: user.id, email: user.email, role: user.role }
    const accessToken  = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [user.id, refreshToken]
    )

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id:         user.id,
        email:      user.email,
        username:   user.username,
        phone:      user.phone,
        avatar_url: picture || user.avatar_url,
        role:       user.role,
        is_active:  user.is_active,
        is_banned:  user.is_banned,
      },
      professional: null
    })

  } catch (err) {
    console.error("googleAuth error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}