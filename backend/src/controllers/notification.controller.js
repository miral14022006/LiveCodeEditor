import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import Notification from "../models/notification.model.js"
import Project from "../models/project.model.js"


// ================= SEND NOTIFICATION (Reusable Helper) =================
// Call this from other controllers to send notifications
// e.g. sendNotification({ recipientId, senderId, type, message, projectId, metadata })
const sendNotification = async ({ recipientId, senderId, type, message, projectId, metadata }) => {

    if (!recipientId || !senderId || !type || !message) {
        throw new ApiError(400, "recipientId, senderId, type, and message are required")
    }

    // Don't send notification to yourself
    if (recipientId.toString() === senderId.toString()) {
        return null
    }

    const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        type,
        message,
        project: projectId || null,
        metadata: metadata || {}
    })

    return notification
}


// ================= SEND NOTIFICATION TO ALL PROJECT COLLABORATORS (Helper) =================
// Notifies all collaborators + owner (except the sender)
const notifyProjectMembers = async ({ projectId, senderId, type, message, metadata }) => {

    const project = await Project.findById(projectId)

    if (!project) return []

    const notifications = []

    // Notify owner (if sender is not the owner)
    if (project.owner.toString() !== senderId.toString()) {
        const n = await sendNotification({
            recipientId: project.owner,
            senderId,
            type,
            message,
            projectId,
            metadata
        })
        if (n) notifications.push(n)
    }

    // Notify all collaborators (except the sender)
    for (const collab of project.collaborators) {
        if (collab.user.toString() !== senderId.toString()) {
            const n = await sendNotification({
                recipientId: collab.user,
                senderId,
                type,
                message,
                projectId,
                metadata
            })
            if (n) notifications.push(n)
        }
    }

    return notifications
}


// ================= CREATE NOTIFICATION (API Endpoint) =================
const createNotification = asyncHandler(async (req, res) => {

    const { recipientId, type, message, projectId, metadata } = req.body

    if (!recipientId || !type || !message) {
        throw new ApiError(400, "recipientId, type, and message are required")
    }

    const notification = await sendNotification({
        recipientId,
        senderId: req.user._id,
        type,
        message,
        projectId,
        metadata
    })

    if (!notification) {
        throw new ApiError(400, "Cannot send notification to yourself")
    }

    return res.status(201).json(
        new ApiResponse(201, notification, "Notification sent")
    )
})


// ================= GET MY NOTIFICATIONS =================
const getMyNotifications = asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    // Optional filter by type or read status
    const filter = { recipient: req.user._id }
    if (req.query.type) {
        filter.type = req.query.type
    }
    if (req.query.isRead !== undefined) {
        filter.isRead = req.query.isRead === "true"
    }

    const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name email avatar")
        .populate("project", "title")

    const totalCount = await Notification.countDocuments(filter)
    const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false
    })

    return res.status(200).json(
        new ApiResponse(200, {
            notifications,
            unreadCount,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount,
                hasPrevPage: page > 1
            }
        }, "Notifications fetched")
    )
})


// ================= GET UNREAD COUNT =================
const getUnreadCount = asyncHandler(async (req, res) => {

    const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false
    })

    return res.status(200).json(
        new ApiResponse(200, { unreadCount }, "Unread count fetched")
    )
})


// ================= MARK SINGLE NOTIFICATION AS READ =================
const markAsRead = asyncHandler(async (req, res) => {

    const { notificationId } = req.params

    const notification = await Notification.findById(notificationId)

    if (!notification) {
        throw new ApiError(404, "Notification not found")
    }

    // Only the recipient can mark their notification as read
    if (notification.recipient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only mark your own notifications as read")
    }

    notification.isRead = true
    await notification.save()

    return res.status(200).json(
        new ApiResponse(200, notification, "Notification marked as read")
    )
})


// ================= MARK ALL NOTIFICATIONS AS READ =================
const markAllAsRead = asyncHandler(async (req, res) => {

    const result = await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { $set: { isRead: true } }
    )

    return res.status(200).json(
        new ApiResponse(200, { modifiedCount: result.modifiedCount }, "All notifications marked as read")
    )
})


// ================= DELETE SINGLE NOTIFICATION =================
const deleteNotification = asyncHandler(async (req, res) => {

    const { notificationId } = req.params

    const notification = await Notification.findById(notificationId)

    if (!notification) {
        throw new ApiError(404, "Notification not found")
    }

    // Only the recipient can delete their notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own notifications")
    }

    await notification.deleteOne()

    return res.status(200).json(
        new ApiResponse(200, {}, "Notification deleted")
    )
})


// ================= DELETE ALL MY NOTIFICATIONS (Clear All) =================
const deleteAllMyNotifications = asyncHandler(async (req, res) => {

    const result = await Notification.deleteMany({ recipient: req.user._id })

    return res.status(200).json(
        new ApiResponse(200, { deletedCount: result.deletedCount }, "All notifications cleared")
    )
})


export {
    sendNotification,
    notifyProjectMembers,
    createNotification,
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllMyNotifications
}
