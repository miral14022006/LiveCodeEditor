import { Router } from "express"
import {
    createFile,
    createFolder,
    getProjectFiles,
    getProjectFileTree,
    getFileById,
    updateFile,
    renameFile,
    moveFile,
    deleteFile
} from "../controllers/editor.controller.js"

import { verifyJWT } from "../middleware/auth.middleware.js"
import { sanitizeFilePath } from "../middleware/validation.middleware.js"

const router = Router()

router.use(verifyJWT)

// Create file inside project
router.post("/:projectId/file", sanitizeFilePath, createFile)

// Create folder inside project
router.post("/:projectId/folder", sanitizeFilePath, createFolder)

// Get all files of project (flat list)
router.get("/:projectId", getProjectFiles)

// Get file tree (nested structure)
router.get("/:projectId/tree", getProjectFileTree)

// Get single file
router.get("/file/:fileId", getFileById)

// Update file content
router.patch("/file/:fileId", updateFile)

// Rename file or folder
router.patch("/file/:fileId/rename", sanitizeFilePath, renameFile)

// Move file or folder
router.patch("/file/:fileId/move", moveFile)

// Delete file or folder
router.delete("/file/:fileId", deleteFile)

export default router
