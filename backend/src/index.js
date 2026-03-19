
import dotenv from 'dotenv';
import http from 'http';
import { connectDB } from './config/db.js';
import { app } from './app.js';
import { initializeSocket } from './sockets/index.js';

dotenv.config({
    path: './.env'
})

// Create HTTP server (needed for Socket.IO)
const server = http.createServer(app)

// Initialize Socket.IO on the server
const io = initializeSocket(server)

// Make io accessible in controllers if needed
app.set("io", io)

connectDB()
    .then(() => {
        server.listen(process.env.PORT || 8000, () => {
            console.log(`🚀 Server running at http://localhost:${process.env.PORT}`)
            console.log(`🔌 Socket.IO ready for connections`)
        })
    })
    .catch((error) => {
        console.log(error)
    })