import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import Project from "../models/project.model.js"

/**
 * Validate that the user has the required role for the project
 * Usage: router.put("/:projectId", verifyJWT, checkProjectRole("owner"), updateProject)
 * 
 * Roles: "owner", "editor", "viewer"
 * "owner" → only the project owner
 * "editor" → owner + editors
 * "viewer" → owner + editors + viewers (anyone with access)
 */
export const checkProjectRole = (...allowedRoles) => {
    return asyncHandler(async (req, res, next) => {

        const projectId = req.params.projectId || req.body.projectId

        if (!projectId) {
            throw new ApiError(400, "Project ID is required")
        }

        const project = await Project.findById(projectId)

        if (!project) {
            throw new ApiError(404, "Project not found")
        }

        const userId = req.user._id.toString()
        const isOwner = project.owner.toString() === userId

        // Owner always has access
        if (isOwner) {
            req.project = project
            req.userRole = "owner"
            return next()
        }

        // Check if user is a collaborator
        const collaborator = project.collaborators.find(
            c => c.user.toString() === userId
        )

        if (!collaborator) {
            throw new ApiError(403, "You don't have access to this project")
        }

        const userRole = collaborator.role // "editor" or "viewer"

        // Check if user's role is in the allowed roles
        if (!allowedRoles.includes(userRole) && !allowedRoles.includes("viewer")) {
            throw new ApiError(403, `This action requires one of these roles: ${allowedRoles.join(", ")}`)
        }

        req.project = project
        req.userRole = userRole
        next()
    })
}

/**
 * Middleware to sanitize file paths (prevent path traversal)
 */
export const sanitizeFilePath = (req, res, next) => {
    const fieldsToSanitize = ["path", "name", "filename"]

    for (const field of fieldsToSanitize) {
        if (req.body[field]) {
            // Remove dangerous patterns
            let sanitized = req.body[field]
            sanitized = sanitized.replace(/\.\./g, "")       // No parent directory traversal
            sanitized = sanitized.replace(/^\/+/, "")         // No leading slashes
            sanitized = sanitized.replace(/[<>:"|?*]/g, "")   // Remove invalid chars
            req.body[field] = sanitized
        }
    }

    next()
}

/**
 * Rate limiting for code execution
 * Simple in-memory rate limiter (use Redis in production)
 */
const executionLimiter = new Map()

export const rateLimit = (maxRequests = 10, windowMs = 60000) => {
    return (req, res, next) => {
        const userId = req.user?._id?.toString() || req.ip

        const now = Date.now()
        const windowStart = now - windowMs

        if (!executionLimiter.has(userId)) {
            executionLimiter.set(userId, [])
        }

        const timestamps = executionLimiter.get(userId).filter(t => t > windowStart)
        executionLimiter.set(userId, timestamps)

        if (timestamps.length >= maxRequests) {
            throw new ApiError(429, `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000}s`)
        }

        timestamps.push(now)
        next()
    }
}
