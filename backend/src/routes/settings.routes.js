import { Router } from "express"
import {
    getMySettings,
    updateProfileSettings,
    changePassword,
    changeEmail,
    deleteAccount
} from "../controllers/settings.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

// Get my settings/profile
router.get("/", getMySettings)

// Update profile (name, bio, avatar, username)
router.put("/profile", updateProfileSettings)

// Change password
router.put("/change-password", changePassword)

// Change email
router.put("/change-email", changeEmail)

// Delete account (DANGEROUS — requires password)
router.delete("/delete-account", deleteAccount)

export default router
