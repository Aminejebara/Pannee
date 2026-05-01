import { pool } from "../../../config/db.js"

export const updateProfile = async (req, res) => {
    let connection
    try {
        const userId = req.user.id
        const { 
            username, 
            phone, 
            address, 
            city, 
            country, 
            lat, 
            lng, 
            place_id,
            avatar_url 
        } = req.body

        connection = await pool.getConnection()

        // Vérifier si l'utilisateur existe
        const [existingUser] = await connection.execute(
            "SELECT id FROM users WHERE id = ?",
            [userId]
        )

        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            })
        }

        // Si username est modifié, vérifier qu'il n'est pas déjà pris
        if (username) {
            const [usernameCheck] = await connection.execute(
                "SELECT id FROM users WHERE username = ? AND id != ?",
                [username, userId]
            )
            if (usernameCheck.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Ce nom d'utilisateur est déjà pris"
                })
            }
        }

        // Mettre à jour l'utilisateur
        await connection.execute(
            `UPDATE users 
             SET username = COALESCE(?, username),
                 phone = COALESCE(?, phone),
                 address = COALESCE(?, address),
                 city = COALESCE(?, city),
                 country = COALESCE(?, country),
                 lat = COALESCE(?, lat),
                 lng = COALESCE(?, lng),
                 place_id = COALESCE(?, place_id),
                 avatar_url = COALESCE(?, avatar_url)
             WHERE id = ?`,
            [username, phone, address, city, country, lat, lng, place_id, avatar_url, userId]
        )

        // Récupérer l'utilisateur mis à jour
        const [updatedUser] = await connection.execute(
            `SELECT id, email, username, phone, avatar_url, role, is_active, is_banned, 
                    address, lat, lng, place_id, city, country, created_at
             FROM users WHERE id = ?`,
            [userId]
        )

        // Si c'est un professionnel, récupérer aussi ses infos pro
        let professional = null
        if (updatedUser[0].role === 'professional') {
            const [pros] = await connection.execute(
                `SELECT * FROM professionals WHERE user_id = ?`,
                [userId]
            )
            if (pros.length > 0) professional = pros[0]
        }

        res.status(200).json({
            success: true,
            message: "Profil mis à jour avec succès",
            user: updatedUser[0],
            professional: professional
        })

    } catch (err) {
        console.error("updateProfile error:", err)
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: err.message
        })
    } finally {
        if (connection) connection.release()
    }
}