import { pool } from "../config/db.js"

// ============================================================
// ENREGISTRER LE TOKEN PUSH
// ============================================================
export const registerPushToken = async (req, res) => {
  try {
    const { pushToken, deviceType } = req.body
    const userId = req.user.id

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Token push requis'
      })
    }

    // Supprimer l'ancien token si existe
    await pool.query(
      'DELETE FROM push_tokens WHERE token = ?',
      [pushToken]
    )

    // Insérer le nouveau token
    await pool.query(
      `INSERT INTO push_tokens (user_id, token, device_type) VALUES (?, ?, ?)`,
      [userId, pushToken, deviceType || 'android']
    )

    res.status(200).json({
      success: true,
      message: 'Token enregistré avec succès'
    })

  } catch (error) {
    console.error('❌ registerPushToken error:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du token'
    })
  }
}

// ============================================================
// DESACTIVER UN TOKEN
// ============================================================
export const deactivatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body
    const userId = req.user.id

    await pool.query(
      'UPDATE push_tokens SET is_active = FALSE WHERE token = ? AND user_id = ?',
      [pushToken, userId]
    )

    res.status(200).json({
      success: true,
      message: 'Token désactivé'
    })

  } catch (error) {
    console.error('❌ deactivatePushToken error:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la désactivation du token'
    })
  }
}