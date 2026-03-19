import express from "express"
import cors from 'cors'
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

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


export { app }