import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js"
import { generateOTP, getOTPExpiry } from "../../utils/otp.js"
import { sendOTPEmail } from "../../utils/mailer.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID)



export const forgetPasswordRequest = async (req,res) => {
  try {
  
    const {email} = req.body
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?" , [email])

    if(users.length === 0) {
      return res.status(404).json({message : "Utilisateur introuvable"})
    }

    if(users[0].is_banned) {
      return res.status(403).json({message : "Compte banni"})
    }


    const user= users[0]
    const otp = generateOTP()
    const expirty = getOTPExpiry()
    await pool.query("DELETE FROM otps WHERE user_id = ?", [user.id])

    await pool.query(
      `INSERT INTO otps (user_id, code, expires_at) VALUES (?, ?, ?)`,
      [user.id, otp, expirty]
    )
    await sendOTPEmail(email, otp)

    res.status(200).json({message : "OTP envoyé à votre adresse email"})
   



  } catch (err) {
    console.error("forgetPassword error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }

}