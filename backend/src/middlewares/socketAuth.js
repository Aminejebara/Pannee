import { verifyAccessToken } from "../utils/jwt.js"

export const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error("Authentication error: token missing"))
    }
    
    const decoded = verifyAccessToken(token)
    socket.user = decoded
    socket.userId = decoded.id
    socket.userRole = decoded.role
    
    next()
  } catch (err) {
    next(new Error("Authentication error: invalid token"))
  }
}