import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import Version from "../models/version.model.js"
import File from "../models/file.model.js"
import Project from "../models/project.model.js"
import { logActivity } from "./activity.controller.js"
import { notifyProjectMembers } from "./notification.controller.js"


// ================= GET FILE VERSION HISTORY =================
const getFileHistory = asyncHandler(async (req, res) => {

    const { fileId } = req.params

    const versions = await Version.find({ file: fileId })
        .sort({ createdAt: -1 })
        .populate("savedBy", "name email")

    return res.status(200).json(
        new ApiResponse(200, versions, "File history fetched")
    )
})


// ================= RESTORE VERSION =================
const restoreVersion = asyncHandler(async (req, res) => {

    const { versionId } = req.params

    const version = await Version.findById(versionId)

    if (!version) {
        throw new ApiError(404, "Version not found")
    }

    const file = await File.findById(version.file)

    if (!file) {
        throw new ApiError(404, "File not found")
    }

    // Permission check
    const project = await Project.findById(file.project)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    const isOwner = project.owner.toString() === req.user._id.toString()
    const isCollaborator = project.collaborators.some(
        c => c.user.toString() === req.user._id.toString()
    )

    if (!isOwner && !isCollaborator) {
        throw new ApiError(403, "Not allowed to restore version")
    }

    file.content = version.content
    await file.save()

    // Save new version entry (restoration log)
    await Version.create({
        file: file._id,
        project: file.project,
        content: version.content,
        savedBy: req.user._id,
        message: "Version restored"
    })

    // Log activity
    await logActivity({
        userId: req.user._id,
        projectId: file.project,
        action: `${req.user.name} restored a version of file`,
        actionType: "version_restored",
        targetType: "version",
        targetId: version._id,
        metadata: { fileId: file._id.toString(), versionId: version._id.toString() }
    })

    // 🔔 Notify all project members
    await notifyProjectMembers({
        projectId: file.project,
        senderId: req.user._id,
        type: "version_restored",
        message: `${req.user.name} restored an older version of a file`,
        metadata: { fileId: file._id.toString(), versionId: version._id.toString() }
    })

    return res.status(200).json(
        new ApiResponse(200, file, "Version restored successfully")
    )
})


// ================= COMPARE TWO VERSIONS =================
const compareVersions = asyncHandler(async (req, res) => {

    const { versionId1, versionId2 } = req.body

    const v1 = await Version.findById(versionId1)
    const v2 = await Version.findById(versionId2)

    if (!v1 || !v2) {
        throw new ApiError(404, "One or both versions not found")
    }

    return res.status(200).json(
        new ApiResponse(200, {
            version1: v1.content,
            version2: v2.content
        }, "Versions fetched for comparison")
    )
})


// ================= DELETE VERSION =================
const deleteVersion = asyncHandler(async (req, res) => {

    const { versionId } = req.params

    const version = await Version.findById(versionId)

    if (!version) {
        throw new ApiError(404, "Version not found")
    }

    const project = await Project.findById(version.project)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    if (project.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only owner can delete versions")
    }

    // Log activity before deletion
    await logActivity({
        userId: req.user._id,
        projectId: project._id,
        action: `${req.user.name} deleted a version from project "${project.title}"`,
        actionType: "version_deleted",
        targetType: "version",
        targetId: version._id,
        metadata: { versionId: version._id.toString() }
    })

    await version.deleteOne()

    return res.status(200).json(
        new ApiResponse(200, {}, "Version deleted successfully")
    )
})


export {
    getFileHistory,
    restoreVersion,
    compareVersions,
    deleteVersion
}
