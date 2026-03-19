import { Router } from "express"
import {
    getDashboardOverview,
    getRecentProjects,
    getRecentActivity,
    getRecentNotifications,
    getFullDashboard
} from "../controllers/dashboard.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

// Full dashboard (all-in-one — single API call)
router.get("/", getFullDashboard)

// Individual endpoints (if frontend wants to load separately)
router.get("/stats", getDashboardOverview)
router.get("/recent-projects", getRecentProjects)
router.get("/recent-activity", getRecentActivity)
router.get("/recent-notifications", getRecentNotifications)

export default router
