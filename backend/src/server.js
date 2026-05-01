import express from "express"
import cors from "cors"
import helmet from "helmet"
import "dotenv/config"
import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/user.routes.js"
import proRoutes from "./routes/pro.routes.js"
import "./config/db.js"

const app = express()

app.use(helmet())
app.use(cors({ origin: "*" }))
app.use(express.json())
app.use("/health", async (req, res) => {
    res.json({ message: "ok" })
})
// ── Routes ────────────────────────────────────────────────
app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/pro", proRoutes)

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: "Route introuvable" }))


const PORT = process.env.PORT || 5000
app.listen(PORT ,"0.0.0.0" ,() => console.log(` serveur haw houni hobbi ${PORT}`))





