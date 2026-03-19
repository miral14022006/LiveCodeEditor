import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import Project from "../models/project.model.js"
import Activity from "../models/activity.model.js"
import Notification from "../models/notification.model.js"
import File from "../models/file.model.js"


// ================= GET DASHBOARD OVERVIEW =================
// Main dashboard endpoint — returns everything the user needs at a glance
const getDashboardOverview = asyncHandler(async (req, res) => {

    const userId = req.user._id

    // 1. Count projects (owned + collaborating)
    const ownedProjectsCount = await Project.countDocuments({ owner: userId })
    const collaboratingProjectsCount = await Project.countDocuments({
        "collaborators.user": userId
    })

    // 2. Count total files across all user's projects
    const ownedProjects = await Project.find({ owner: userId }).select("_id")
    const ownedProjectIds = ownedProjects.map(p => p._id)
    const totalFilesCount = await File.countDocuments({ project: { $in: ownedProjectIds } })

    // 3. Unread notifications count
    const unreadNotificationsCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false
    })

    // 4. Total activities by user
    const totalActivitiesCount = await Activity.countDocuments({ user: userId })

    return res.status(200).json(
        new ApiResponse(200, {
            stats: {
                ownedProjects: ownedProjectsCount,
                collaboratingProjects: collaboratingProjectsCount,
                totalProjects: ownedProjectsCount + collaboratingProjectsCount,
                totalFiles: totalFilesCount,
                unreadNotifications: unreadNotificationsCount,
                totalActivities: totalActivitiesCount
            }
        }, "Dashboard stats fetched")
    )
})


// ================= GET RECENT PROJECTS =================
// Shows last 5 projects the user worked on (owned or collaborating)
const getRecentProjects = asyncHandler(async (req, res) => {

    const limit = parseInt(req.query.limit) || 5

    const recentProjects = await Project.find({
        $or: [
            { owner: req.user._id },
            { "collaborators.user": req.user._id }
        ]
    })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate("owner", "name email avatar")
        .populate("collaborators.user", "name email avatar")

    return res.status(200).json(
        new ApiResponse(200, recentProjects, "Recent projects fetched")
    )
})


// ================= GET RECENT ACTIVITY =================
// Shows last 10 activities across all user's projects
const getRecentActivity = asyncHandler(async (req, res) => {

    const limit = parseInt(req.query.limit) || 10

    // Find all projects the user belongs to
    const userProjects = await Project.find({
        $or: [
            { owner: req.user._id },
            { "collaborators.user": req.user._id }
        ]
    }).select("_id")

    const projectIds = userProjects.map(p => p._id)

    const recentActivity = await Activity.find({
        project: { $in: projectIds }
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("user", "name email avatar")
        .populate("project", "title")

    return res.status(200).json(
        new ApiResponse(200, recentActivity, "Recent activity fetched")
    )
})


// ================= GET RECENT NOTIFICATIONS =================
// Shows last 5 unread notifications for quick preview
const getRecentNotifications = asyncHandler(async (req, res) => {

    const limit = parseInt(req.query.limit) || 5

    const recentNotifications = await Notification.find({
        recipient: req.user._id
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("sender", "name email avatar")
        .populate("project", "title")

    const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false
    })

    return res.status(200).json(
        new ApiResponse(200, {
            notifications: recentNotifications,
            unreadCount
        }, "Recent notifications fetched")
    )
})


// ================= GET FULL DASHBOARD (All-in-One) =================
// Single API call that returns stats + recent projects + recent activity + notifications
const getFullDashboard = asyncHandler(async (req, res) => {

    const userId = req.user._id

    // --- Stats ---
    const ownedProjectsCount = await Project.countDocuments({ owner: userId })
    const collaboratingProjectsCount = await Project.countDocuments({
        "collaborators.user": userId
    })
    const ownedProjects = await Project.find({ owner: userId }).select("_id")
    const ownedProjectIds = ownedProjects.map(p => p._id)
    const totalFilesCount = await File.countDocuments({ project: { $in: ownedProjectIds } })
    const unreadNotificationsCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false
    })
    const totalActivitiesCount = await Activity.countDocuments({ user: userId })

    // --- Recent Projects (last 5) ---
    const recentProjects = await Project.find({
        $or: [
            { owner: userId },
            { "collaborators.user": userId }
        ]
    })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("owner", "name email avatar")
        .populate("collaborators.user", "name email avatar")

    // --- Recent Activity (last 10) ---
    const allUserProjects = await Project.find({
        $or: [
            { owner: userId },
            { "collaborators.user": userId }
        ]
    }).select("_id")
    const allProjectIds = allUserProjects.map(p => p._id)

    const recentActivity = await Activity.find({
        project: { $in: allProjectIds }
    })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "name email avatar")
        .populate("project", "title")

    // --- Recent Notifications (last 5) ---
    const recentNotifications = await Notification.find({
        recipient: userId
    })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("sender", "name email avatar")
        .populate("project", "title")

    return res.status(200).json(
        new ApiResponse(200, {
            stats: {
                ownedProjects: ownedProjectsCount,
                collaboratingProjects: collaboratingProjectsCount,
                totalProjects: ownedProjectsCount + collaboratingProjectsCount,
                totalFiles: totalFilesCount,
                unreadNotifications: unreadNotificationsCount,
                totalActivities: totalActivitiesCount
            },
            recentProjects,
            recentActivity,
            recentNotifications
        }, "Full dashboard fetched")
    )
})


export {
    getDashboardOverview,
    getRecentProjects,
    getRecentActivity,
    getRecentNotifications,
    getFullDashboard
}
