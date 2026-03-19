import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import File from "../models/file.model.js"
import Project from "../models/project.model.js"
import { logActivity } from "./activity.controller.js"
import { notifyProjectMembers } from "./notification.controller.js"


// ================= CREATE FILE =================
const createFile = asyncHandler(async (req, res) => {

    const { name, language, path } = req.body

    if (!name) {
        throw new ApiError(400, "File name required")
    }

    const project = await Project.findById(req.params.projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    const file = await File.create({
        project: project._id,
        filename: name, // mapped name to filename
        language,
        content: "" // default content
    })

    // Log activity
    await logActivity({
        userId: req.user._id,
        projectId: project._id,
        action: `${req.user.name} created file "${name}" in project`,
        actionType: "file_created",
        targetType: "file",
        targetId: file._id,
        metadata: { fileName: name, language: language || "plaintext" }
    })

    // 🔔 Notify all project members
    await notifyProjectMembers({
        projectId: project._id,
        senderId: req.user._id,
        type: "file_created",
        message: `${req.user.name} created a new file "${name}"`,
        metadata: { fileName: name, fileId: file._id.toString() }
    })

    return res.status(201).json(
        new ApiResponse(201, file, "File created")
    )
})


// ================= GET ALL FILES OF PROJECT =================
const getProjectFiles = asyncHandler(async (req, res) => {

    const files = await File.find({
        project: req.params.projectId
    })

    return res.status(200).json(
        new ApiResponse(200, files, "Files fetched")
    )
})


// ================= GET SINGLE FILE =================
const getFileById = asyncHandler(async (req, res) => {

    const file = await File.findById(req.params.fileId)

    if (!file) {
        throw new ApiError(404, "File not found")
    }

    return res.status(200).json(
        new ApiResponse(200, file, "File fetched")
    )
})


// ================= UPDATE FILE CONTENT =================
const updateFile = asyncHandler(async (req, res) => {

    const { content, name } = req.body

    const file = await File.findById(req.params.fileId)

    if (!file) {
        throw new ApiError(404, "File not found")
    }

    if (content !== undefined) file.content = content
    if (name) file.filename = name // mapped name to filename

    await file.save()

    // Log activity
    await logActivity({
        userId: req.user._id,
        projectId: file.project,
        action: `${req.user.name} edited file "${file.filename}"`,
        actionType: "file_updated",
        targetType: "file",
        targetId: file._id,
        metadata: { fileName: file.filename }
    })

    // 🔔 Notify all project members
    await notifyProjectMembers({
        projectId: file.project,
        senderId: req.user._id,
        type: "edit",
        message: `${req.user.name} edited file "${file.filename}"`,
        metadata: { fileName: file.filename, fileId: file._id.toString() }
    })

    return res.status(200).json(
        new ApiResponse(200, file, "File updated")
    )
})


// ================= DELETE FILE =================
const deleteFile = asyncHandler(async (req, res) => {

    const file = await File.findById(req.params.fileId)

    if (!file) {
        throw new ApiError(404, "File not found")
    }

    const fileName = file.filename
    const projectId = file.project

    // Log activity before deletion
    await logActivity({
        userId: req.user._id,
        projectId: projectId,
        action: `${req.user.name} deleted file "${fileName}"`,
        actionType: "file_deleted",
        targetType: "file",
        targetId: file._id,
        metadata: { fileName: fileName }
    })

    // 🔔 Notify all project members
    await notifyProjectMembers({
        projectId: projectId,
        senderId: req.user._id,
        type: "file_deleted",
        message: `${req.user.name} deleted file "${fileName}"`,
        metadata: { fileName: fileName }
    })

    await file.deleteOne()

    return res.status(200).json(
        new ApiResponse(200, {}, "File deleted")
    )
})

export {
    createFile,
    getProjectFiles,
    getFileById,
    updateFile,
    deleteFile
}
