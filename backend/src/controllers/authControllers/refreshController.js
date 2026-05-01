import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js"
import { generateOTP, getOTPExpiry } from "../../utils/otp.js"
import { sendOTPEmail } from "../../utils/mailer.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID)
//refresh token controller



export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body

    const decoded = verifyRefreshToken(refreshToken)

    const [tokens] = await pool.query(
      `SELECT * FROM refresh_tokens 
       WHERE token = ? AND revoked = FALSE AND expires_at > NOW()`,
      [refreshToken]
    )
    if (tokens.length === 0) {
      return res.status(401).json({ message: "Session expirée — reconnecte toi" })
    }

    const payload = { id: decoded.id, email: decoded.email, role: decoded.role }
    const accessToken = generateAccessToken(payload)

    res.status(200).json({ accessToken })

  } catch (err) {
    console.error("refresh error:", err)
    res.status(401).json({ message: "Session expirée — reconnecte toi" })
  }
}