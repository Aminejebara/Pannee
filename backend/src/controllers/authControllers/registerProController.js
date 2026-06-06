import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js"
import { generateOTP, getOTPExpiry } from "../../utils/otp.js"
import { sendOTPEmail } from "../../utils/mailer.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID)

export const registerPro = async (req, res) => {
  try {
    const {
      username, email, password, phone,
      business_name, description,
      address, lat, lng, city, country,
      categoryIds
    } = req.body

    const [users] = await pool.query(
      "SELECT id, is_active FROM users WHERE email = ?",
      [email]
    )

    let userId
    let professionalId

    if (users.length > 0) {
      const user = users[0]

      if (user.is_active === 1) {
        return res.status(409).json({ message: "Email déjà utilisé" })
      }

      userId = user.id

      const password_hash = await bcrypt.hash(password, 12)

      await pool.query(
        `UPDATE users
         SET username = ?, password_hash = ?, phone = ?, role = 'professional'
         WHERE id = ?`,
        [username, password_hash, phone || null, userId]
      )

      await pool.query(
        "DELETE FROM professionals WHERE user_id = ?",
        [userId]
      )

    } else {
      const password_hash = await bcrypt.hash(password, 12)

      const [result] = await pool.query(
        `INSERT INTO users
        (username, email, password_hash, phone, role, is_active)
        VALUES (?, ?, ?, ?, 'professional', FALSE)`,
        [username, email, password_hash, phone || null]
      )

      userId = result.insertId
    }

    const [proResult] = await pool.query(
      `INSERT INTO professionals
       (user_id, business_name, description, address, lat, lng, city, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        business_name,
        description || null,
        address || null,
        lat || null,
        lng || null,
        city || null,
        country || null
      ]
    )

    professionalId = proResult.insertId

    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => '?').join(',')

      const [validCategories] = await pool.query(
        `SELECT id FROM service_categories WHERE id IN (${placeholders})`,
        categoryIds
      )

      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({ message: "Certaines catégories n'existent pas" })
      }

      for (const categoryId of categoryIds) {
        await pool.query(
          `INSERT INTO professional_categories (professional_id, category_id)
           VALUES (?, ?)`,
          [professionalId, categoryId]
        )
      }
    }

    await pool.query("DELETE FROM otps WHERE user_id = ?", [userId])

    const otp = generateOTP()
    const expiry = getOTPExpiry()

    await pool.query(
      "INSERT INTO otps (user_id, code, expires_at) VALUES (?, ?, ?)",
      [userId, otp, expiry]
    )

    await sendOTPEmail(email, otp)

    return res.status(201).json({
      message: "Compte pro créé — vérifie ton email"
    })

  } catch (err) {
    console.error("registerPro error:", err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
}