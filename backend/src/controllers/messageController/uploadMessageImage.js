import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"
import  { sendNewMessageNotification } from "../../middlewares/pushNotificationService.js"



export const uploadMessageImage = [
    messageUpload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' })
            }

            // ✅ EN LOCAL (développement) - Utilisez votre IP locale
            // const baseUrl = 'https://pannebackend.duckdns.org'  // ou le port que vous utilisez
            // OU si vous testez sur le même ordinateur :
             const baseUrl = 'https://pannebackend.duckdns.org'
            
            // ❌ SUR LE SERVEUR (production) - À commenter en local
            // const baseUrl = 'https://pannebackend.duckdns.org'
            
            const imageUrl = `${baseUrl}/uploads/messages/${req.file.filename}`

            res.status(200).json({ success: true, message: 'Image uploadée avec succès', data: { url: imageUrl } })
        } catch (error) {
            console.error('Error uploading message image:', error)
            res.status(500).json({ success: false, message: "Erreur lors de l'upload", error: error.message })
        }
    }
]

