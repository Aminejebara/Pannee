import { pool } from '../../../config/db.js';

// ── GET ────────────────────────────────────────────────────
const getProfileProData = async (req, res) => {
    let connection;
    try {
        const { professionalId } = req.params;
        const userId = req.user?.id;

        connection = await pool.getConnection();

        const [professional] = await connection.execute(
            `
            SELECT 
                p.id as professional_id,
                p.user_id,
                p.business_name,
                p.description,
                p.address,
                p.city,
                p.country,
                p.lat,
                p.lng,
                p.rating_avg,
                p.rating_count,
                p.created_at,
                u.username,
                u.email,
                u.phone,
                u.avatar_url
            FROM professionals p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
            `,
            [professionalId]
        );

        if (!professional || professional.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Professional not found',
            });
        }

        const proData = professional[0];

        const [categories] = await connection.execute(
            `
            SELECT sc.id, sc.name, sc.slug, sc.icon
            FROM service_categories sc
            JOIN professional_categories pc ON sc.id = pc.category_id
            WHERE pc.professional_id = ?
            ORDER BY sc.name ASC
            `,
            [professionalId]
        );

        const [reviews] = await connection.execute(
            `
            SELECT 
                r.id, r.rating, r.comment, r.created_at,
                u.id as user_id, u.username, u.avatar_url
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.professional_id = ? AND r.is_visible = 1
            ORDER BY r.created_at DESC
            LIMIT 5
            `,
            [professionalId]
        );

        const response = {
            success: true,
            data: {
                professional_id: proData.professional_id,
                business_name: proData.business_name,
                description: proData.description,
                username: proData.username,
                email: proData.email,
                phone: proData.phone,
                avatar_url: proData.avatar_url,
                address: proData.address,
                city: proData.city,
                country: proData.country,
                lat: proData.lat,
                lng: proData.lng,
                rating: {
                    average: Number(proData.rating_avg).toFixed(1),
                    count: proData.rating_count,
                },
                categories: categories,
                reviews: reviews,
                joinedAt: proData.created_at,
                isOwner: userId === proData.user_id,
            },
        };

        return res.status(200).json(response);
        
    } catch (error) {
        console.error('Error fetching professional profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching professional profile',
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// ── UPDATE ──────────────────────────────────────────────────
const updateProfileProData = async (req, res) => {
    let connection;
    try {
        const { professionalId } = req.params;
        const userId = req.user?.id;
        const { 
            businessName, 
            description, 
            address, 
            city, 
            country,
            lat,
            lng,
            categoryIds = [] 
        } = req.body;

        console.log('📡 Backend received UPDATE request:');
        console.log('  - professionalId:', professionalId);
        console.log('  - businessName:', businessName);

        connection = await pool.getConnection();

        const [existingPro] = await connection.execute(
            'SELECT id, user_id FROM professionals WHERE id = ?',
            [professionalId]
        );

        if (!existingPro || existingPro.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Professional not found',
            });
        }

        if (existingPro[0].user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        await connection.beginTransaction();

        // Convertir undefined en null pour MySQL
        const updateLat = lat !== undefined ? lat : null;
        const updateLng = lng !== undefined ? lng : null;

        await connection.execute(
            `
            UPDATE professionals 
            SET business_name = ?, 
                description = ?, 
                address = ?, 
                city = ?, 
                country = ?,
                lat = ?,
                lng = ?
            WHERE id = ?
            `,
            [businessName, description, address, city, country, updateLat, updateLng, professionalId]
        );

        if (categoryIds && categoryIds.length > 0) {
            const placeholders = categoryIds.map(() => '?').join(',');
            const [validCategories] = await connection.execute(
                `SELECT id FROM service_categories WHERE id IN (${placeholders})`,
                categoryIds
            );

            if (validCategories.length !== categoryIds.length) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category IDs',
                });
            }

            await connection.execute(
                'DELETE FROM professional_categories WHERE professional_id = ?',
                [professionalId]
            );

            for (const categoryId of categoryIds) {
                await connection.execute(
                    'INSERT INTO professional_categories (professional_id, category_id) VALUES (?, ?)',
                    [professionalId, categoryId]
                );
            }
        }

        await connection.commit();

        const [updatedPro] = await connection.execute(
            `
            SELECT 
                p.id as professional_id,
                p.business_name,
                p.description,
                p.address,
                p.city,
                p.country,
                p.lat,
                p.lng,
                u.username,
                u.email,
                u.phone,
                u.avatar_url
            FROM professionals p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
            `,
            [professionalId]
        );

        return res.status(200).json({
            success: true,
            message: 'Professional profile updated successfully',
            data: updatedPro[0]
        });
        
    } catch (error) {
        console.error('❌ Error updating professional profile:', error);
        if (connection) await connection.rollback();
        return res.status(500).json({
            success: false,
            message: 'Error updating professional profile',
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// ── DELETE ──────────────────────────────────────────────────
const deleteProfileProData = async (req, res) => {
    let connection;
    try {
        const { professionalId } = req.params;
        const userId = req.user?.id;

        connection = await pool.getConnection();

        const [existingPro] = await connection.execute(
            'SELECT id, user_id FROM professionals WHERE id = ?',
            [professionalId]
        );

        if (!existingPro || existingPro.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Professional not found',
            });
        }

        if (existingPro[0].user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        await connection.beginTransaction();

        await connection.execute(
            'DELETE FROM professional_categories WHERE professional_id = ?',
            [professionalId]
        );

        await connection.execute(
            'DELETE FROM professionals WHERE id = ?',
            [professionalId]
        );

        await connection.execute(
            'UPDATE users SET role = "user" WHERE id = ?',
            [userId]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Professional profile deleted successfully',
        });
        
    } catch (error) {
        console.error('Error deleting professional profile:', error);
        if (connection) await connection.rollback();
        return res.status(500).json({
            success: false,
            message: 'Error deleting professional profile',
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// ── GET AVAILABLE CATEGORIES ────────────────────────────────
const getAvailableCategories = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const [categories] = await connection.execute(
            'SELECT id, name, slug, icon FROM service_categories ORDER BY name ASC'
        );

        return res.status(200).json({
            success: true,
            data: categories || [],
            message: 'Categories retrieved successfully',
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// ── UPLOAD AVATAR ───────────────────────────────────────────
const uploadProAvatar = async (req, res) => {
    let connection;
    try {
        const { professionalId } = req.params;
        const userId = req.user?.id;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier uploadé'
            });
        }

        connection = await pool.getConnection();

        const [existingPro] = await connection.execute(
            'SELECT id, user_id FROM professionals WHERE id = ?',
            [professionalId]
        );

        if (!existingPro || existingPro.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Professional not found',
            });
        }

        if (existingPro[0].user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized',
            });
        }

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

// ── GET REVIEWS AVEC PAGINATION ─────────────────────────────
const getProReviews = async (req, res) => {
    let connection;
    try {
        const { professionalId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        console.log('🔵 getProReviews - professionalId:', professionalId);
        console.log('🔵 getProReviews - page:', page, 'limit:', limit, 'offset:', offset);

        connection = await pool.getConnection();

        // Utiliser query() au lieu de execute() pour LIMIT et OFFSET
        const [reviews] = await connection.query(
            `
            SELECT 
                r.id, r.rating, r.comment, r.created_at,
                u.id as user_id, u.username, u.avatar_url as user_avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.professional_id = ? AND r.is_visible = 1
            ORDER BY r.created_at DESC
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `,
            [professionalId]
        );

        const [countResult] = await connection.query(
            `SELECT COUNT(*) as total FROM reviews WHERE professional_id = ? AND is_visible = 1`,
            [professionalId]
        );

        res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                page: page,
                limit: limit,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};



export { 
    getProfileProData, 
    updateProfileProData, 
    deleteProfileProData, 
    getAvailableCategories,
    uploadProAvatar ,
    getProReviews
};