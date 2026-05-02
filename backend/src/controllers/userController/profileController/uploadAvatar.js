import { pool } from "../../../config/db.js"

export const uploadUserAvatar = async (req, res) => {
    let connection;
    try {
        const userId = req.user?.id;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier uploadé'
            });
        }

        connection = await pool.getConnection();

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const avatarUrl = `${baseUrl}/uploads/profiles/${req.file.filename}`;

        await connection.execute(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [avatarUrl, userId]
        );

        res.status(200).json({
            success: true,
            message: 'Photo de profil mise à jour',
            data: { avatar_url: avatarUrl }
        });

    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'upload',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};