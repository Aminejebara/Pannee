import { verifyAccessToken } from "../utils/jwt.js"

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant" })
    }

    const token = authHeader.split(" ")[1]

    // Vérifie mathématiquement — 0 appel DB
    const decoded = verifyAccessToken(token)

    // Injecte le user dans la requête
    req.user = decoded

    next()

  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" })
  }
}

export default authMiddleware
