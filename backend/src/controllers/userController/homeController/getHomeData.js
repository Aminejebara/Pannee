import { pool } from "../../../config/db.js";

/**
 * Récupère toutes les données nécessaires pour la page d'accueil de l'utilisateur.
 */
export const getHomeData = async (req, res) => {
    try {
        // 1. Récupérer les sponsors actifs (home_top)
        const [sponsors] = await pool.query(
            "SELECT id, name, banner_url FROM sponsors WHERE status = 'active' AND placement = 'home_top' ORDER BY priority DESC LIMIT 5"
        );

        // 2. Récupérer toutes les catégories de services
        const [categories] = await pool.query(
            "SELECT id, name, slug, icon FROM service_categories ORDER BY name ASC"
        );

        // 3. Récupérer les professionnels les mieux notés
        // On joint la table 'users' pour avoir le nom et l'avatar du pro
        const [topRatedPros] = await pool.query(`
            SELECT 
                p.id, p.business_name, p.rating_avg, p.rating_count, 
                u.username, u.avatar_url 
            FROM professionals p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active'
            ORDER BY p.rating_avg DESC, p.rating_count DESC
            LIMIT 10
        `);

        // 4. Récupérer les professionnels récents
        const [recentPros] = await pool.query(`
            SELECT 
                p.id, p.business_name, p.rating_avg, p.rating_count, 
                u.username, u.avatar_url 
            FROM professionals p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active'
            ORDER BY p.created_at DESC
            LIMIT 10
        `);

        // Renvoyer les données structurées
        return res.status(200).json({
            sponsors,
            categories,
            topRatedPros,
            recentPros
        });

    } catch (error) {
        console.error("❌ [getHomeData] Erreur :", error);
        return res.status(500).json({ message: "Erreur lors de la récupération des données de la page d'accueil" });
    }
};
