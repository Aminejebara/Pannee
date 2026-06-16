import { pool } from "../../../config/db.js";

/**
 * Récupère toutes les données nécessaires pour la page d'accueil de l'utilisateur.
 * Inclut les professionnels à proximité si les coordonnées sont fournies.
 */
export const getHomeData = async (req, res) => {
    try {
        const { lat, lng, radius = 10 } = req.query;

        // 1. Récupérer les sponsors actifs (home_top)
        const [sponsors] = await pool.query(
            `SELECT id, name, banner_url, website_url, logo_url 
             FROM sponsors 
             WHERE status = 'active' 
               AND placement = 'home_top' 
               AND (starts_at IS NULL OR starts_at <= NOW())
               AND (ends_at IS NULL OR ends_at >= NOW())
             ORDER BY priority DESC 
             LIMIT 10`
        );

        // 2. Récupérer toutes les catégories de services
        const [categories] = await pool.query(
            `SELECT id, name, slug, icon 
             FROM service_categories 
              ORDER BY display_order ASC`
        );

        // 3. Récupérer les professionnels les mieux notés
        const [topRatedPros] = await pool.query(`
            SELECT 
                p.id, 
                p.business_name, 
                p.description,
                p.rating_avg, 
                p.rating_count,
                p.city,
                u.username, 
                u.avatar_url,
                COALESCE(p.rating_avg, 0) as rating
            FROM professionals p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active'
            ORDER BY p.rating_avg DESC, p.rating_count DESC
            LIMIT 10
        `);

        // 4. Récupérer les professionnels récents
        const [recentPros] = await pool.query(`
            SELECT 
                p.id, 
                p.business_name, 
                p.description,
                p.rating_avg, 
                p.rating_count,
                p.city,
                u.username, 
                u.avatar_url,
                p.created_at
            FROM professionals p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active'
            ORDER BY p.created_at DESC
            LIMIT 10
        `);

        // 5. Récupérer les professionnels en vedette (is_featured = 1)
        const [featuredPros] = await pool.query(`
            SELECT 
                p.id, 
                p.business_name, 
                p.description,
                p.rating_avg, 
                p.rating_count,
                p.city,
                u.username, 
                u.avatar_url
            FROM professionals p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active' AND p.is_featured = 1
            ORDER BY p.rating_avg DESC
            LIMIT 6
        `);

        // 6. Récupérer les professionnels les plus proches (si coordonnées fournies)
        let nearbyPros = [];
        if (lat && lng) {
            [nearbyPros] = await pool.query(`
                SELECT 
                    p.id, 
                    p.business_name, 
                    p.description,
                    p.rating_avg, 
                    p.rating_count,
                    p.city,
                    u.username, 
                    u.avatar_url,
                    ROUND(
                        6371 * acos(
                            cos(radians(?)) * cos(radians(p.lat)) * 
                            cos(radians(p.lng) - radians(?)) + 
                            sin(radians(?)) * sin(radians(p.lat))
                        ), 2
                    ) as distance_km
                FROM professionals p
                JOIN users u ON p.user_id = u.id
                WHERE p.status = 'active' 
                    AND p.lat IS NOT NULL 
                    AND p.lng IS NOT NULL
                    AND p.lat != 0
                    AND p.lng != 0
                HAVING distance_km <= ?
                ORDER BY distance_km ASC
                LIMIT 10
            `, [parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius)]);
        } else {
            [nearbyPros] = await pool.query(`
                SELECT 
                    p.id, 
                    p.business_name, 
                    p.description,
                    p.rating_avg, 
                    p.rating_count,
                    p.city,
                    u.username, 
                    u.avatar_url,
                    p.lat,
                    p.lng
                FROM professionals p
                JOIN users u ON p.user_id = u.id
                WHERE p.status = 'active' 
                    AND p.lat IS NOT NULL 
                    AND p.lng IS NOT NULL
                    AND p.lat != 0
                    AND p.lng != 0
                ORDER BY p.created_at DESC
                LIMIT 10
            `);
        }

        // 7. Compter le nombre total de professionnels actifs
        const [totalPros] = await pool.query(`
            SELECT COUNT(*) as total
            FROM professionals
            WHERE status = 'active'
        `);

        // 8. Compter le nombre total de catégories
        const [totalCategories] = await pool.query(`
            SELECT COUNT(*) as total
            FROM service_categories
        `);

        // 9. Récupérer les sponsors du milieu de page (home_middle)
        const [middleSponsors] = await pool.query(
            `SELECT id, name, banner_url, website_url 
             FROM sponsors 
             WHERE status = 'active' 
               AND placement = 'home_middle'
               AND (starts_at IS NULL OR starts_at <= NOW())
               AND (ends_at IS NULL OR ends_at >= NOW())
             ORDER BY priority DESC 
             LIMIT 5`
        );

        // Structurer la réponse
        const response = {
            success: true,
            data: {
                sponsors: {
                    top: sponsors,
                    middle: middleSponsors
                },
                categories: categories,
                professionals: {
                    featured: featuredPros,
                    top_rated: topRatedPros,
                    recent: recentPros,
                    nearby: nearbyPros
                },
                stats: {
                    total_professionals: totalPros[0].total,
                    total_categories: totalCategories[0].total
                }
            }
        };

        // Si des coordonnées ont été fournies, ajouter l'info de localisation
        if (lat && lng) {
            response.data.location = {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                radius_km: parseFloat(radius)
            };
        }

        return res.status(200).json(response);

    } catch (error) {
        console.error("❌ [getHomeData] Erreur :", error);
        return res.status(500).json({ 
            success: false,
            message: "Erreur lors de la récupération des données de la page d'accueil",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ── Récupérer uniquement les professionnels à proximité (avec pagination) ──
export const getNearbyProfessionals = async (req, res) => {
    try {
        const { lat, lng, radius = 10, limit = 20, page = 1, category_id } = req.query;
        const offset = (page - 1) * limit;

        if (!lat || !lng) {
            return res.status(400).json({ 
                success: false, 
                message: "Les coordonnées lat et lng sont requises" 
            });
        }

        // Construction de la requête selon si category_id est présent ou non
        let categoryJoin = '';
        let categoryFilter = '';
        let countParams = [];
        let prosParams = [];

        if (category_id) {
            // Avec filtre catégorie (many-to-many)
            categoryJoin = `INNER JOIN professional_categories pc ON p.id = pc.professional_id`;
            categoryFilter = ` AND pc.category_id = ?`;
            countParams = [parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius), parseInt(category_id)];
            prosParams = [parseFloat(lat), parseFloat(lng), parseFloat(lat), parseInt(category_id), parseFloat(radius), parseInt(limit), offset];
        } else {
            // Sans filtre catégorie
            countParams = [parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius)];
            prosParams = [parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius), parseInt(limit), offset];
        }

        // Compter le nombre total de pros dans le rayon
        const [countResult] = await pool.query(`
            SELECT COUNT(DISTINCT p.id) as total
            FROM professionals p
            ${categoryJoin}
            WHERE p.status = 'active' 
                AND p.lat IS NOT NULL 
                AND p.lng IS NOT NULL
                AND p.lat != 0
                AND p.lng != 0
                AND (
                    6371 * acos(
                        cos(radians(?)) * cos(radians(p.lat)) * 
                        cos(radians(p.lng) - radians(?)) + 
                        sin(radians(?)) * sin(radians(p.lat))
                    )
                ) <= ?
                ${categoryFilter}
        `, countParams);

        // Récupérer les pros avec distance
        const [professionals] = await pool.query(`
            SELECT 
                p.id, 
                p.business_name, 
                p.description,
                p.rating_avg, 
                p.rating_count,
                p.city,
                p.address,
                p.lat,
                p.lng,
                u.username, 
                u.avatar_url,
                u.phone,
                ROUND(
                    6371 * acos(
                        cos(radians(?)) * cos(radians(p.lat)) * 
                        cos(radians(p.lng) - radians(?)) + 
                        sin(radians(?)) * sin(radians(p.lat))
                    ), 2
                ) as distance_km
            FROM professionals p
            JOIN users u ON p.user_id = u.id
            ${categoryJoin}
            WHERE p.status = 'active' 
                AND p.lat IS NOT NULL 
                AND p.lng IS NOT NULL
                AND p.lat != 0
                AND p.lng != 0
                ${categoryFilter}
            HAVING distance_km <= ?
            ORDER BY distance_km ASC
            LIMIT ? OFFSET ?
        `, prosParams);

        res.status(200).json({
            success: true,
            data: professionals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            },
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                radius_km: parseFloat(radius)
            }
        });

    } catch (error) {
        console.error("❌ [getNearbyProfessionals] Erreur :", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors de la récupération des professionnels à proximité",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


// Route pour créer un avis



// Mettre à jour la position de l'utilisateur
export const updateUserLocation = async (req, res) => {
    try {
        const { lat, lng, address, city, country } = req.body;
        const userId = req.user.id; // Après authMiddleware

        if (!lat || !lng) {
            return res.status(400).json({ 
                success: false, 
                message: "Les coordonnées lat et lng sont requises" 
            });
        }

        await pool.query(
            `UPDATE users 
             SET lat = ?, lng = ?, address = ?, city = ?, country = ?
             WHERE id = ?`,
            [parseFloat(lat), parseFloat(lng), address || null, city || null, country || null, userId]
        );

        res.status(200).json({ 
            success: true, 
            message: "Position mise à jour avec succès" 
        });
    } catch (error) {
        console.error("❌ [updateUserLocation] Erreur :", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors de la mise à jour de la position" 
        });
    }
};