import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import Message from "../models/message.model.js"
import Project from "../models/project.model.js"
import { notifyProjectMembers } from "./notification.controller.js"


// ================= SEND MESSAGE =================
const sendMessage = asyncHandler(async (req, res) => {

    const { projectId } = req.params
    const { message } = req.body

    if (!message || !message.trim()) {
        throw new ApiError(400, "Message cannot be empty")
    }

    // Verify project exists
    const project = await Project.findById(projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    // Verify user has access to the project
    const isOwner = project.owner.toString() === req.user._id.toString()
    const isCollaborator = project.collaborators.some(
        c => c.user.toString() === req.user._id.toString()
    )

    if (!isOwner && !isCollaborator) {
        throw new ApiError(403, "You don't have access to this project's chat")
    }

    const newMessage = await Message.create({
        project: projectId,
        sender: req.user._id,
        message: message.trim()
    })

    // Populate sender info for the response
    const populatedMessage = await Message.findById(newMessage._id)
        .populate("sender", "name email avatar")

    // � Emit to socket room for real-time updates
    const io = req.app.get("io")
    if (io) {
        io.to(projectId).emit("new-message", populatedMessage)
    }

    // �🔔 Notify all project members (except sender)
    await notifyProjectMembers({
        projectId,
        senderId: req.user._id,
        type: "mention",
        message: `${req.user.name}: "${message.trim().substring(0, 50)}${message.length > 50 ? "..." : ""}"`,
        metadata: { messageId: newMessage._id.toString(), messagePreview: message.trim().substring(0, 100) }
    })

    return res.status(201).json(
        new ApiResponse(201, populatedMessage, "Message sent")
    )
})


// ================= GET PROJECT MESSAGES =================
const getProjectMessages = asyncHandler(async (req, res) => {

    const { projectId } = req.params

    // Verify project exists
    const project = await Project.findById(projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    // Verify user has access
    const isOwner = project.owner.toString() === req.user._id.toString()
    const isCollaborator = project.collaborators.some(
        c => c.user.toString() === req.user._id.toString()
    )

    if (!isOwner && !isCollaborator) {
        throw new ApiError(403, "You don't have access to this project's chat")
    }

    // Pagination
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const skip = (page - 1) * limit

    const messages = await Message.find({ project: projectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name email avatar")

    const totalCount = await Message.countDocuments({ project: projectId })

    return res.status(200).json(
        new ApiResponse(200, {
            messages: messages.reverse(), // Oldest first for chat display
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount,
                hasPrevPage: page > 1
            }
        }, "Messages fetched")
    )
})


// ================= GET SINGLE MESSAGE =================
const getMessageById = asyncHandler(async (req, res) => {

    const { messageId } = req.params

    const message = await Message.findById(messageId)
        .populate("sender", "name email avatar")

    if (!message) {
        throw new ApiError(404, "Message not found")
    }

    return res.status(200).json(
        new ApiResponse(200, message, "Message fetched")
    )
})


// ================= DELETE MESSAGE =================
// Only the sender or project owner can delete a message
const deleteMessage = asyncHandler(async (req, res) => {

    const { messageId } = req.params

    const message = await Message.findById(messageId)

    if (!message) {
        throw new ApiError(404, "Message not found")
    }

    // Check permission: sender or project owner
    const project = await Project.findById(message.project)

    const isSender = message.sender.toString() === req.user._id.toString()
    const isProjectOwner = project && project.owner.toString() === req.user._id.toString()

    if (!isSender && !isProjectOwner) {
        throw new ApiError(403, "You can only delete your own messages or be the project owner")
    }

    await message.deleteOne()

    // 🔥 Emit event so clients can remove message in real-time
    const io = req.app.get("io")
    if (io) {
        io.to(message.project.toString()).emit("message-deleted", messageId)
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Message deleted")
    )
})


// ================= DELETE ALL PROJECT MESSAGES (Clear Chat) =================
// Only project owner can clear the entire chat
const clearProjectChat = asyncHandler(async (req, res) => {

    const { projectId } = req.params

    const project = await Project.findById(projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    if (project.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only project owner can clear the chat")
    }

    const result = await Message.deleteMany({ project: projectId })

    // 🔥 Emit event to refresh the chat view for all clients
    const io = req.app.get("io")
    if (io) {
        io.to(projectId).emit("chat-cleared", projectId)
    }

    return res.status(200).json(
        new ApiResponse(200, { deletedCount: result.deletedCount }, "Chat cleared")
    )
})


export {
    sendMessage,
    getProjectMessages,
    getMessageById,
    deleteMessage,
    clearProjectChat
}
