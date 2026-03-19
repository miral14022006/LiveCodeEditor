import { Router } from "express"
import {
    createNotification,
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllMyNotifications
} from "../controllers/notification.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

// Send a notification manually
router.post("/", createNotification)

// Get my notifications (paginated + filterable)
router.get("/me", getMyNotifications)

// Get unread notification count (for badge on bell icon 🔔)
router.get("/unread-count", getUnreadCount)

// Mark all notifications as read
router.put("/mark-all-read", markAllAsRead)

// Clear all my notifications
router.delete("/clear-all", deleteAllMyNotifications)

// Mark single notification as read
router.put("/:notificationId/read", markAsRead)

// Delete single notification
router.delete("/:notificationId", deleteNotification)

export default router
