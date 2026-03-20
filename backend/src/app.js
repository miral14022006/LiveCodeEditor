import express from "express"
import cors from 'cors'
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler.middleware.js";

const app = express();

app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
            .split(',')
            .map(s => s.trim())
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true)
        } else {
            callback(null, true) // Be permissive in development
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

// Request logging (development only)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// ==================== HEALTH CHECK ====================
app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "CodeSync API is running",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
    })
})

// ==================== ROUTES ====================
import userRouter from './routes/user.routes.js'
app.use("/api/v1/users", userRouter);

import authRouter from './routes/auth.routes.js'
app.use("/api/v1/auth", authRouter);

import projectRoutes from "./routes/project.routes.js"
app.use("/api/v1/projects", projectRoutes)

import editorRoutes from "./routes/editor.routes.js"
app.use("/api/v1/editor", editorRoutes)

import historyRoutes from "./routes/history.routes.js"
app.use("/api/v1/history", historyRoutes)

import activityRoutes from "./routes/activity.routes.js"
app.use("/api/v1/activity", activityRoutes)

import notificationRoutes from "./routes/notification.routes.js"
app.use("/api/v1/notifications", notificationRoutes)

import dashboardRoutes from "./routes/dashboard.routes.js"
app.use("/api/v1/dashboard", dashboardRoutes)

import chatRoutes from "./routes/chat.routes.js"
app.use("/api/v1/chat", chatRoutes)

import settingsRoutes from "./routes/settings.routes.js"
app.use("/api/v1/settings", settingsRoutes)

import executionRoutes from "./routes/execution.routes.js"
app.use("/api/v1/execute", executionRoutes)

// ==================== 404 HANDLER ====================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    })
})

// ==================== GLOBAL ERROR HANDLER ====================
app.use(errorHandler)

export { app }