import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"
import  { sendNewMessageNotification } from "../../middlewares/pushNotificationService.js"





export const createConversation = async (req, res) => {
    try {
        const { professionalId } = req.body
        const userId = req.user.id

        if (!professionalId) {
            return res.status(400).json({ success: false, message: "professionalId est requis" })
        }

        const [proExists] = await pool.query(`SELECT id FROM professionals WHERE id = ? AND status = 'active'`, [professionalId])
        if (proExists.length === 0) {
            return res.status(404).json({ success: false, message: "Professionnel non trouvé" })
        }

        const [existing] = await pool.query(`SELECT id FROM conversations WHERE user_id = ? AND professional_id = ?`, [userId, professionalId])
        if (existing.length > 0) {
            return res.status(200).json({ success: true, conversationId: existing[0].id, exists: true })
        }

        const [result] = await pool.query(`INSERT INTO conversations (user_id, professional_id) VALUES (?, ?)`, [userId, professionalId])
        res.status(201).json({ success: true, conversationId: result.insertId, exists: false })
    } catch (err) {
        console.error("createConversation error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}
