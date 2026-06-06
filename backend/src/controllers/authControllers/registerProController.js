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
      categoryIds // Array of service category IDs that the professional offers
    } = req.body

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

    if (!business_name) {
      return res.status(400).json({ message: "Nom du business obligatoire" })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const [result] = await pool.query(
      `INSERT INTO users 
       (username, email, password_hash, phone, role, is_active, address, lat, lng, city, country)
       VALUES (?, ?, ?, ?, 'professional', FALSE, ?, ?, ?, ?, ?)`,
      [username, email, password_hash, phone || null,
       address || null, lat || null, lng || null,
       city || null, country || null]
    )
    const userId = result.insertId

    const [proResult] = await pool.query(
      `INSERT INTO professionals 
       (user_id, business_name, description, address, lat, lng, city, country,status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, business_name, description || null,
       address || null, lat || null, lng || null,
       city || null, country || null, 'active']
    )
    const professionalId = proResult.insertId

    // ✅ Ajouter les catégories de services si fournies
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      // Valider que les catégories existent
      const placeholders = categoryIds.map(() => '?').join(',')
      const [validCategories] = await pool.query(
        `SELECT id FROM service_categories WHERE id IN (${placeholders})`,
        categoryIds
      )

      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({ message: "Certaines catégories n'existent pas" })
      }

      // ✅ Insérer chaque relation pro-catégorie (une par une pour éviter les problèmes)
      for (const categoryId of categoryIds) {
        await pool.query(
          `INSERT INTO professional_categories (professional_id, category_id) VALUES (?, ?)`,
          [professionalId, categoryId]
        )
      }

      console.log(`✅ [registerPro] ${categoryIds.length} catégories associées au pro ${professionalId}`)
    }

    await pool.query("DELETE FROM otps WHERE user_id = ?", [userId])

    const otp = generateOTP()
    const expiry = getOTPExpiry()

    await pool.query(
      `INSERT INTO otps (user_id, code, expires_at) VALUES (?, ?, ?)`,
      [userId, otp, expiry]
    )

    await sendOTPEmail(email, otp)

    res.status(201).json({ message: "Compte pro créé — vérifie ton email" })

  } catch (err) {
    console.error("registerPro error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}
