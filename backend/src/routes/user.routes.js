import { Router } from "express"
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    updateProfile,
    changePassword
} from "../controllers/user.controller.js"

import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

// Public Routes
router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

// Protected Routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/me").get(verifyJWT, getCurrentUser)
router.route("/update-profile").patch(verifyJWT, updateProfile)
router.route("/change-password").patch(verifyJWT, changePassword)

export default router
