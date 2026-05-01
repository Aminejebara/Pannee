
import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js"
import { generateOTP, getOTPExpiry } from "../../utils/otp.js"
import { sendOTPEmail } from "../../utils/mailer.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID)






export const resetpassword = async (req,res) => {
  try {
    const {email , code , newpassword} = req.body

    const [users] = await pool.query("SELECT * FROM users WHERE email = ? " , [email])
    if(users.length === 0) {
      return res.status(404).json({message : "Utilisateur introuvable"})  
    
    }

    const user = users [0]

    const [otps] = await pool.query(`
      SELECT * FROM otps WHERE user_id = ? AND code = ? AND expires_at > NOW() AND used = FALSE
      ORDER BY created_at DESC LIMIT 1
    `, [user.id , code])

    if(otps.length === 0) 
    {
      return res.status(400).json({message : "Code invalide ou expiré"})
    }

    const password_hash = await bcrypt.hash(newpassword , 12)

    await pool.query ("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash , user.id])
    await pool.query ("UPDATE otps SET used = TRUE WHERE id= ?", [otps[0].id])
    res.status(200).json({message : "Mot de passe réinitialisé avec succès"})

      

  }

  catch (err) {
    console.error("resetPassword error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}