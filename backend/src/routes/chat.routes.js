import { Router } from "express"
import {
    sendMessage,
    getProjectMessages,
    getMessageById,
    deleteMessage,
    clearProjectChat
} from "../controllers/chat.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

// Send a message in a project
router.post("/:projectId", sendMessage)

// Get all messages of a project (paginated)
router.get("/:projectId", getProjectMessages)

// Clear entire chat (owner only)
router.delete("/:projectId/clear", clearProjectChat)

// Get single message by ID
router.get("/message/:messageId", getMessageById)

// Delete single message (sender or owner)
router.delete("/message/:messageId", deleteMessage)

export default router
