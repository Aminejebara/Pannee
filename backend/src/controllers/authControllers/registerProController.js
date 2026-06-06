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

    // =============================================
    // 1. Vérifier email et username existants
    // =============================================
    const [existingEmail] = await pool.query(
      "SELECT id, is_active, role FROM users WHERE email = ?",
      [email]
    )

    const [existingUsername] = await pool.query(
      "SELECT id, is_active, role FROM users WHERE username = ?",
      [username]
    )

    let userId

    // =============================================
    // Cas 1 : Email existe et est ACTIF
    // =============================================
    if (existingEmail.length > 0 && existingEmail[0].is_active === 1) {
      return res.status(409).json({ message: "Email déjà utilisé" })
    }

    // =============================================
    // Cas 2 : Username existe et est ACTIF
    // =============================================
    if (existingUsername.length > 0 && existingUsername[0].is_active === 1) {
      // Vérifier si cet username appartient au même email que la requête
      const [userWithThisUsername] = await pool.query(
        "SELECT id, email FROM users WHERE id = ?",
        [existingUsername[0].id]
      )
      
      if (userWithThisUsername[0].email !== email) {
        return res.status(409).json({ message: "Nom d'utilisateur déjà pris" })
      }
    }

    // =============================================
    // Cas 3 : Email existe mais est INACTIF
    // =============================================
    if (existingEmail.length > 0 && existingEmail[0].is_active === 0) {
      userId = existingEmail[0].id
      
      const password_hash = await bcrypt.hash(password, 12)
      
      // Vérifier si cet utilisateur inactif avait déjà un profil pro
      const [existingPro] = await pool.query(
        "SELECT id FROM professionals WHERE user_id = ?",
        [userId]
      )
      
      if (existingPro.length > 0) {
        // Mettre à jour le profil pro existant au lieu de le supprimer
        await pool.query(
          `UPDATE professionals 
           SET business_name = ?, description = ?, address = ?, lat = ?, lng = ?, city = ?, country = ?
           WHERE user_id = ?`,
          [business_name, description || null, address || null, lat || null, lng || null, city || null, country || null, userId]
        )
        professionalId = existingPro[0].id
      }
      
      await pool.query(
        `UPDATE users 
         SET username = ?, password_hash = ?, phone = ?, role = 'professional', is_active = FALSE
         WHERE id = ?`,
        [username, password_hash, phone || null, userId]
      )
    } 
    // =============================================
    // Cas 4 : Username existe mais est INACTIF (et email différent)
    // =============================================
    else if (existingUsername.length > 0 && existingUsername[0].is_active === 0) {
      userId = existingUsername[0].id
      
      const password_hash = await bcrypt.hash(password, 12)
      
      // Vérifier si cet utilisateur inactif avait déjà un profil pro
      const [existingPro] = await pool.query(
        "SELECT id FROM professionals WHERE user_id = ?",
        [userId]
      )
      
      if (existingPro.length > 0) {
        await pool.query(
          `UPDATE professionals 
           SET business_name = ?, description = ?, address = ?, lat = ?, lng = ?, city = ?, country = ?
           WHERE user_id = ?`,
          [business_name, description || null, address || null, lat || null, lng || null, city || null, country || null, userId]
        )
        professionalId = existingPro[0].id
      }
      
      await pool.query(
        `UPDATE users 
         SET email = ?, password_hash = ?, phone = ?, role = 'professional', is_active = FALSE
         WHERE id = ?`,
        [email, password_hash, phone || null, userId]
      )
    }
    // =============================================
    // Cas 5 : Nouvel utilisateur
    // =============================================
    else {
      const password_hash = await bcrypt.hash(password, 12)
      
      const [result] = await pool.query(
        `INSERT INTO users 
         (username, email, password_hash, phone, role, is_active)
         VALUES (?, ?, ?, ?, 'professional', FALSE)`,
        [username, email, password_hash, phone || null]
      )
      
      userId = result.insertId
    }

    // =============================================
    // 2. Créer/mettre à jour le profil professional
    // =============================================
    
    // Si professionalId n'a pas déjà été défini (cas inactif sans ancien pro)
    if (!professionalId) {
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
    }

    // =============================================
    // 3. Gérer les catégories
    // =============================================
    
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      // Supprimer les anciennes catégories si on est en mode "réactivation"
      await pool.query(
        "DELETE FROM professional_categories WHERE professional_id = ?",
        [professionalId]
      )
      
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

    // =============================================
    // 4. OTP
    // =============================================
    
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