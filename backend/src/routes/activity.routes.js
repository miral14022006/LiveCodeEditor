import { Router } from "express"
import {
    createActivity,
    getProjectActivities,
    getUserActivities,
    getActivityById,
    deleteActivity,
    deleteProjectActivities
} from "../controllers/activity.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

// Create activity log entry
router.post("/", createActivity)

// Get logged-in user's activities (My Activity)
router.get("/me", getUserActivities)

// Get all activities for a specific project
router.get("/project/:projectId", getProjectActivities)

// Get single activity by ID
router.get("/:activityId", getActivityById)

// Delete single activity (owner only)
router.delete("/:activityId", deleteActivity)

// Clear all activities for a project (owner only)
router.delete("/project/:projectId/clear", deleteProjectActivities)

export default router
