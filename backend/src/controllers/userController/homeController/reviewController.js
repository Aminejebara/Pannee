import { pool } from "../../../config/db.js";


// ──────────────────────────────────────────────────────────
//  CRÉER UN AVIS
// ──────────────────────────────────────────────────────────
export const createReview = async (req, res) => {
    let connection;
    try {
        const { professional_id, rating, comment, conversation_id } = req.body
        const user_id = req.user.id

        if (!professional_id || !rating) {
            return res.status(400).json({
                success: false,
                message: "professional_id et rating sont requis"
            })
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "La note doit être comprise entre 1 et 5"
            })
        }

        connection = await pool.getConnection()

        // Vérifier si l'utilisateur a déjà laissé un avis
        const [existingReview] = await connection.execute(
            `SELECT id FROM reviews WHERE user_id = ? AND professional_id = ?`,
            [user_id, professional_id]
        )

        if (existingReview.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Vous avez déjà laissé un avis pour ce professionnel"
            })
        }

        // Insérer l'avis
        await connection.execute(
            `INSERT INTO reviews (user_id, professional_id, rating, comment, conversation_id, is_visible, created_at)
             VALUES (?, ?, ?, ?, ?, 1, NOW())`,
            [user_id, professional_id, rating, comment || null, conversation_id || null]
        )

        // Mettre à jour la moyenne et le compteur du professionnel
        await connection.execute(
            `UPDATE professionals p 
             SET rating_avg = (
                 SELECT AVG(rating) 
                 FROM reviews 
                 WHERE professional_id = p.id AND is_visible = 1
             ),
             rating_count = (
                 SELECT COUNT(*) 
                 FROM reviews 
                 WHERE professional_id = p.id AND is_visible = 1
             )
             WHERE p.id = ?`,
            [professional_id]
        )

        res.status(201).json({
            success: true,
            message: "Avis envoyé avec succès"
        })

    } catch (error) {
        console.error("Create review error:", error)
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'envoi de l'avis",
            error: error.message
        })
    } finally {
        if (connection) connection.release()
    }
}

// ──────────────────────────────────────────────────────────
//  RÉCUPÉRER LES AVIS D'UN PROFESSIONNEL
// ──────────────────────────────────────────────────────────
export const getProfessionalReviews = async (req, res) => {
    let connection;
    try {
        const { professionalId } = req.params
        const { page = 1, limit = 10 } = req.query
        const offset = (page - 1) * limit

        connection = await pool.getConnection()

        const [reviews] = await connection.execute(
            `
            SELECT 
                r.id, r.rating, r.comment, r.created_at,
                u.id as user_id, u.username, u.avatar_url
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.professional_id = ? AND r.is_visible = 1
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
            `,
            [professionalId, parseInt(limit), offset]
        )

        const [countResult] = await connection.execute(
            `SELECT COUNT(*) as total FROM reviews WHERE professional_id = ? AND is_visible = 1`,
            [professionalId]
        )

        res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        })

    } catch (error) {
        console.error("Get reviews error:", error)
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des avis",
            error: error.message
        })
    } finally {
        if (connection) connection.release()
    }
}