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
                p.rating_avg,
                p.rating_count,
                p.created_at,
                u.username,
                u.email,
                u.phone,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', sc.id,
                        'name', sc.name,
                        'slug', sc.slug,
                        'icon', sc.icon
                    )
                ) as categories
            FROM professionals p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN professional_categories pc ON p.id = pc.professional_id
            LEFT JOIN service_categories sc ON pc.category_id = sc.id
            WHERE p.id = ?
            GROUP BY p.id
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

        // Parse categories from GROUP_CONCAT
        let categories = [];
        if (proData.categories && proData.categories.trim() !== '') {
            try {
                const categoriesJson = '[' + proData.categories + ']';
                categories = JSON.parse(categoriesJson).filter(cat => cat && cat.id);
            } catch (error) {
                console.warn('Failed to parse categories:', error);
                categories = [];
            }
        }

        const response = {
            success: true,
            data: {
                professional_id: proData.professional_id,
                business_name: proData.business_name,
                description: proData.description,
                username: proData.username,
                email: proData.email,
                phone: proData.phone,
                address: proData.address,
                city: proData.city,
                country: proData.country,
                rating: {
                    average: Number(proData.rating_avg).toFixed(1),
                    count: proData.rating_count,
                },
                categories: categories,
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
        const { businessName, description, address, city, country, categoryIds = [] } =
            req.body;

        console.log('📡 Backend received UPDATE request:');
        console.log('  - professionalId:', professionalId);
        console.log('  - userId from auth:', userId);
        console.log('  - businessName:', businessName);
        console.log('  - description:', description);
        console.log('  - address:', address);
        console.log('  - city:', city);
        console.log('  - country:', country);

        connection = await pool.getConnection();

        // Check if professional exists AND user owns it
        const [existingPro] = await connection.execute(
            'SELECT id, user_id FROM professionals WHERE id = ?',
            [professionalId]
        );

        if (!existingPro || existingPro.length === 0) {
            console.error(`❌ Professional ${professionalId} not found`);
            return res.status(404).json({
                success: false,
                message: 'Professional not found',
            });
        }

        if (existingPro[0].user_id !== userId) {
            console.error(`❌ Unauthorized: userId ${userId} doesn't match professional userId ${existingPro[0].user_id}`);
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only update your own profile',
            });
        }

        // Update professional basic info
        console.log('🔄 Executing UPDATE query with:', [businessName, description, address, city, country, professionalId]);
        await connection.execute(
            `
            UPDATE professionals 
            SET business_name = ?, description = ?, address = ?, city = ?, country = ?
            WHERE id = ?
            `,
            [businessName, description, address, city, country, professionalId]
        );
        console.log('✅ UPDATE query executed successfully');

        // If categoryIds provided, update categories
        if (categoryIds && categoryIds.length > 0) {
            // Validate all categoryIds exist
            const placeholders = categoryIds.map(() => '?').join(',');
            const [validCategories] = await connection.execute(
                `SELECT id FROM service_categories WHERE id IN (${placeholders})`,
                categoryIds
            );

            if (validCategories.length !== categoryIds.length) {
                console.error(`❌ Invalid category IDs: ${categoryIds}`);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category IDs',
                });
            }

            // Delete existing categories
            await connection.execute(
                'DELETE FROM professional_categories WHERE professional_id = ?',
                [professionalId]
            );

            // Insert new categories
            for (const categoryId of categoryIds) {
                await connection.execute(
                    'INSERT INTO professional_categories (professional_id, category_id) VALUES (?, ?)',
                    [professionalId, categoryId]
                );
            }
        }

        console.log('✅ Professional profile updated successfully');
        return res.status(200).json({
            success: true,
            message: 'Professional profile updated successfully',
        });
    } catch (error) {
        console.error('❌ Error updating professional profile:', error);
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

        // Check if professional exists AND user owns it
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
                message: 'Unauthorized: You can only delete your own profile',
            });
        }

        // Delete professional profile (cascades should delete related data)
        await connection.execute(
            'DELETE FROM professionals WHERE id = ?',
            [professionalId]
        );

        return res.status(200).json({
            success: true,
            message: 'Professional profile deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting professional profile:', error);
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

export { getProfileProData, updateProfileProData, deleteProfileProData, getAvailableCategories };
