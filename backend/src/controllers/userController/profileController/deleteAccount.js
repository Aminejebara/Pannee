import  {pool} from  "../../../config/db.js"

export const deleteAccount = async (req, res) => { 

    const userId= req.user.id
     
    try {  
         await pool.query(
        `DELETE FROM refresh_tokens WHERE user_id = ?`, [userId]
        )

        

        await pool.query(
            `DELETE FROM users WHERE id = ?`, [userId]
        )
        res.status(200).json({ message: "Compte supprimé avec succès" })


    }
    catch (err) {
        console.error("deleteAccount error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }

   



}