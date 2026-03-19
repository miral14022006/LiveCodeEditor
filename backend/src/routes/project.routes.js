import { Router } from "express"
import {
    createProject,
    getUserProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addCollaborator,
    removeCollaborator
} from "../controllers/project.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

router.post("/", createProject)
router.get("/", getUserProjects)
router.get("/:projectId", getProjectById)
router.put("/:projectId", updateProject)
router.delete("/:projectId", deleteProject)
router.post("/:projectId/add-collaborator", addCollaborator)
router.post("/:projectId/remove-collaborator", removeCollaborator)

export default router;
