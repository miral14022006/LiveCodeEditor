import { Router } from "express"
import {
    getFileHistory,
    restoreVersion,
    compareVersions,
    deleteVersion
} from "../controllers/history.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

router.get("/file/:fileId", getFileHistory)
router.post("/compare", compareVersions)
router.put("/restore/:versionId", restoreVersion)
router.delete("/:versionId", deleteVersion)

export default router
