import { pool } from "../../config/db.js"

/**
 * Récupère toutes les catégories de services disponibles
 */
export const getServiceCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT id, name, slug, icon FROM service_categories ORDER BY name ASC`
    )

    res.status(200).json({
      success: true,
      data: categories,
      count: categories.length
    })
  } catch (err) {
    console.error("getServiceCategories error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}

/**
 * Récupère les catégories d'un professionnel spécifique
 */
export const getProCategoriesById = async (req, res) => {
  try {
    const { professionalId } = req.params

    const [categories] = await pool.query(
      `SELECT sc.id, sc.name, sc.slug, sc.icon 
       FROM service_categories sc
       INNER JOIN professional_categories pc ON sc.id = pc.category_id
       WHERE pc.professional_id = ?
       ORDER BY sc.name ASC`,
      [professionalId]
    )

    res.status(200).json({
      success: true,
      data: categories,
      count: categories.length
    })
  } catch (err) {
    console.error("getProCategoriesById error:", err)
    res.status(500).json({ message: "Erreur serveur" })
  }
}
