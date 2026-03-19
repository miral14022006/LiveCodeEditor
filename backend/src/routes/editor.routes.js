import { Router } from "express"
import {
  createFile,
  getProjectFiles,
  getFileById,
  updateFile,
  deleteFile
} from "../controllers/editor.controller.js"

import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

// Create file inside project
router.post("/:projectId", createFile)

// Get all files of project
router.get("/:projectId", getProjectFiles)

// Get single file
router.get("/file/:fileId", getFileById)

// Update file
router.patch("/file/:fileId", updateFile)

// Delete file
router.delete("/file/:fileId", deleteFile)

export default router
