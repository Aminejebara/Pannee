import { pool } from "../../../config/db.js"

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id

    const [users] = await pool.query(
      `SELECT id, username, email, phone, avatar_url, role, is_active, address, lat, lng, city, country, created_at
       FROM users WHERE id = ? AND is_banned = FALSE`,
      [userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable" })
    }

    const user = users[0]

    // On renvoie juste le profil global (User) pour le UserController
    res.status(200).json({ user })

  } catch (err) {
    console.error("getProfile error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}
