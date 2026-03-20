// ============================================================
//  EXECUTION ROUTES
//  API endpoints for the Unified Code Execution Engine
// ============================================================

import { Router } from "express"
import {
    runCode,
    previewCode,
    getSupportedLanguages,
    getExecutionStatus,
} from "../controllers/execution.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

// All execution routes require authentication
router.use(verifyJWT)

// Execute code in Docker container (all languages)
router.post("/run", runCode)

// Generate HTML/React preview (returns rendered HTML string)
router.post("/preview", previewCode)

// List all supported languages with metadata
router.get("/languages", getSupportedLanguages)

// Check execution engine health & Docker status
router.get("/status", getExecutionStatus)

export default router
