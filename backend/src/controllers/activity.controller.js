import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import Activity from "../models/activity.model.js"
import Project from "../models/project.model.js"


// ================= LOG ACTIVITY (Reusable Helper) =================
// Call this from other controllers to log activities
// e.g. logActivity({ userId, projectId, action, actionType, targetType, targetId, metadata })
const logActivity = async ({ userId, projectId, action, actionType, targetType, targetId, metadata }) => {

    if (!userId || !projectId || !action || !actionType) {
        throw new ApiError(400, "userId, projectId, action, and actionType are required")
    }

    const activity = await Activity.create({
        user: userId,
        project: projectId,
        action,
        actionType,
        targetType: targetType || "project",
        targetId: targetId || projectId,
        metadata: metadata || {}
    })

    return activity
}


// ================= CREATE ACTIVITY (API Endpoint) =================
const createActivity = asyncHandler(async (req, res) => {

    const { projectId, action, actionType, targetType, targetId, metadata } = req.body

    if (!projectId || !action || !actionType) {
        throw new ApiError(400, "projectId, action, and actionType are required")
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
        throw new ApiError(403, "You don't have access to this project")
    }

    const activity = await logActivity({
        userId: req.user._id,
        projectId,
        action,
        actionType,
        targetType,
        targetId,
        metadata
    })

    return res.status(201).json(
        new ApiResponse(201, activity, "Activity logged successfully")
    )
})


// ================= GET PROJECT ACTIVITIES =================
const getProjectActivities = asyncHandler(async (req, res) => {

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
        throw new ApiError(403, "You don't have access to this project")
    }

    // Pagination
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    // Optional filter by actionType
    const filter = { project: projectId }
    if (req.query.actionType) {
        filter.actionType = req.query.actionType
    }

    const activities = await Activity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email")

    const totalCount = await Activity.countDocuments(filter)

    return res.status(200).json(
        new ApiResponse(200, {
            activities,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount,
                hasPrevPage: page > 1
            }
        }, "Project activities fetched")
    )
})


// ================= GET USER ACTIVITIES (My Activities) =================
const getUserActivities = asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    // Optional filter by actionType
    const filter = { user: req.user._id }
    if (req.query.actionType) {
        filter.actionType = req.query.actionType
    }

    const activities = await Activity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("project", "title description")

    const totalCount = await Activity.countDocuments(filter)

    return res.status(200).json(
        new ApiResponse(200, {
            activities,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount,
                hasPrevPage: page > 1
            }
        }, "User activities fetched")
    )
})


// ================= GET SINGLE ACTIVITY =================
const getActivityById = asyncHandler(async (req, res) => {

    const { activityId } = req.params

    const activity = await Activity.findById(activityId)
        .populate("user", "name email")
        .populate("project", "title description")

    if (!activity) {
        throw new ApiError(404, "Activity not found")
    }

    // Verify user has access to the project this activity belongs to
    const project = await Project.findById(activity.project._id || activity.project)

    if (!project) {
        throw new ApiError(404, "Associated project not found")
    }

    const isOwner = project.owner.toString() === req.user._id.toString()
    const isCollaborator = project.collaborators.some(
        c => c.user.toString() === req.user._id.toString()
    )

    if (!isOwner && !isCollaborator) {
        throw new ApiError(403, "You don't have access to this activity")
    }

    return res.status(200).json(
        new ApiResponse(200, activity, "Activity fetched")
    )
})


// ================= DELETE SINGLE ACTIVITY =================
const deleteActivity = asyncHandler(async (req, res) => {

    const { activityId } = req.params

    const activity = await Activity.findById(activityId)

    if (!activity) {
        throw new ApiError(404, "Activity not found")
    }

    // Only project owner can delete activities
    const project = await Project.findById(activity.project)

    if (!project) {
        throw new ApiError(404, "Associated project not found")
    }

    if (project.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only project owner can delete activities")
    }

    await activity.deleteOne()

    return res.status(200).json(
        new ApiResponse(200, {}, "Activity deleted successfully")
    )
})


// ================= DELETE ALL PROJECT ACTIVITIES (Clear Log) =================
const deleteProjectActivities = asyncHandler(async (req, res) => {

    const { projectId } = req.params

    const project = await Project.findById(projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    // Only owner can clear activity log
    if (project.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only project owner can clear activity log")
    }

    const result = await Activity.deleteMany({ project: projectId })

    return res.status(200).json(
        new ApiResponse(200, { deletedCount: result.deletedCount }, "All project activities cleared")
    )
})


export {
    logActivity,
    createActivity,
    getProjectActivities,
    getUserActivities,
    getActivityById,
    deleteActivity,
    deleteProjectActivities
}
