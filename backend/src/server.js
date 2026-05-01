import express from "express"
import cors from "cors"
import helmet from "helmet"
import http from "http"
import path from "path"
import { fileURLToPath } from "url"
import "dotenv/config"
import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/user.routes.js"
import proRoutes from "./routes/pro.routes.js"
import "./config/db.js"
import { initializeSocket } from "./socket/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = http.createServer(app)

app.use(helmet())
app.use(cors({ origin: "*" }))
app.use(express.json())

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use("/health", async (req, res) => {
    res.json({ message: "ok" })
})

app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/pro", proRoutes)

app.use((req, res) => res.status(404).json({ message: "Route introuvable" }))

const io = initializeSocket(server)

const PORT = process.env.PORT || 5000
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Serveur HTTP sur le port ${PORT}`)
    console.log(`🔌 Socket.IO prêt sur le même port`)
})