import { Router } from "express";
import {
    register,
    login,
    refreshAccessToken,
    logout
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);

export default router;
