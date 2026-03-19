import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import Project from "../models/project.model.js"
import User from "../models/user.model.js"
import { logActivity } from "./activity.controller.js"
import { sendNotification } from "./notification.controller.js"


// ================= CREATE PROJECT =================
const createProject = asyncHandler(async (req, res) => {

    const { name, description } = req.body

    if (!name) {
        throw new ApiError(400, "Project name is required")
    }

    const project = await Project.create({
        title: name, // Map incoming 'name' to 'title' in DB
        description,
        owner: req.user._id,
        collaborators: []
    })

    // Log activity
    await logActivity({
        userId: req.user._id,
        projectId: project._id,
        action: `${req.user.name} created project "${project.title}"`,
        actionType: "project_created",
        targetType: "project",
        targetId: project._id
    })

    return res.status(201).json(
        new ApiResponse(201, project, "Project created successfully")
    )
})


// ================= GET ALL PROJECTS =================
const getUserProjects = asyncHandler(async (req, res) => {

    const projects = await Project.find({
        $or: [
            { owner: req.user._id },
            { "collaborators.user": req.user._id } // Fix: Search inside collaborators array objects
        ]
    }).populate("owner", "name email")
        .populate("collaborators.user", "name email") // Fix: Populate nested user field

    return res.status(200).json(
        new ApiResponse(200, projects, "Projects fetched")
    )
})


// ================= GET SINGLE PROJECT =================
const getProjectById = asyncHandler(async (req, res) => {

    const project = await Project.findById(req.params.projectId)
        .populate("owner", "name email")
        .populate("collaborators.user", "name email")

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    return res.status(200).json(
        new ApiResponse(200, project, "Project fetched")
    )
})


// ================= UPDATE PROJECT =================
const updateProject = asyncHandler(async (req, res) => {

    const { name, description } = req.body

    const project = await Project.findById(req.params.projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    if (project.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only owner can update project")
    }

    if (name) project.title = name // Map 'name' to 'title'
    if (description !== undefined) project.description = description

    await project.save()

    // Log activity
    await logActivity({
        userId: req.user._id,
        projectId: project._id,
        action: `${req.user.name} updated project "${project.title}"`,
        actionType: "project_updated",
        targetType: "project",
        targetId: project._id
    })

    return res.status(200).json(
        new ApiResponse(200, project, "Project updated")
    )
})


// ================= DELETE PROJECT =================
const deleteProject = asyncHandler(async (req, res) => {

    const project = await Project.findById(req.params.projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    if (project.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only owner can delete project")
    }

    // Log activity before deletion
    await logActivity({
        userId: req.user._id,
        projectId: project._id,
        action: `${req.user.name} deleted project "${project.title}"`,
        actionType: "project_deleted",
        targetType: "project",
        targetId: project._id
    })

    await project.deleteOne()

    return res.status(200).json(
        new ApiResponse(200, {}, "Project deleted")
    )
})


// ================= ADD COLLABORATOR =================
const addCollaborator = asyncHandler(async (req, res) => {

    const { email } = req.body

    const project = await Project.findById(req.params.projectId)
    const user = await User.findOne({ email })

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    if (!user) {
        throw new ApiError(404, "User not found with this email")
    }

    if (project.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only owner can add collaborators")
    }

    if (project.owner.toString() === user._id.toString()) {
        throw new ApiError(400, "Owner cannot be a collaborator")
    }

    const isAlreadyCollaborator = project.collaborators.some(
        c => c.user.toString() === user._id.toString()
    )

    if (!isAlreadyCollaborator) {
        project.collaborators.push({
            user: user._id,
            role: "editor" // Default role
        })
        await project.save()

        // Log activity
        await logActivity({
            userId: req.user._id,
            projectId: project._id,
            action: `${req.user.name} added ${user.name} to project "${project.title}"`,
            actionType: "collaborator_added",
            targetType: "user",
            targetId: user._id,
            metadata: { collaboratorEmail: user.email, collaboratorName: user.name }
        })

        // 🔔 Send notification to the added collaborator
        await sendNotification({
            recipientId: user._id,
            senderId: req.user._id,
            type: "invite",
            message: `${req.user.name} added you to project "${project.title}"`,
            projectId: project._id,
            metadata: { projectTitle: project.title, role: "editor" }
        })
    }

    return res.status(200).json(
        new ApiResponse(200, project, "Collaborator added")
    )
})


// ================= REMOVE COLLABORATOR =================
const removeCollaborator = asyncHandler(async (req, res) => {

    const { userId } = req.body

    if (!userId) {
        throw new ApiError(400, "userId is required")
    }

    const project = await Project.findById(req.params.projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    if (project.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only owner can remove collaborators")
    }

    const isCollaborator = project.collaborators.some(
        c => c.user.toString() === userId
    )

    if (!isCollaborator) {
        throw new ApiError(404, "User is not a collaborator of this project")
    }

    project.collaborators = project.collaborators.filter(
        c => c.user.toString() !== userId
    )

    await project.save()

    // Log activity
    await logActivity({
        userId: req.user._id,
        projectId: project._id,
        action: `${req.user.name} removed a collaborator from project "${project.title}"`,
        actionType: "collaborator_removed",
        targetType: "user",
        targetId: userId,
        metadata: { removedUserId: userId }
    })

    // 🔔 Send notification to the removed collaborator
    await sendNotification({
        recipientId: userId,
        senderId: req.user._id,
        type: "removed",
        message: `${req.user.name} removed you from project "${project.title}"`,
        projectId: project._id,
        metadata: { projectTitle: project.title }
    })

    return res.status(200).json(
        new ApiResponse(200, project, "Collaborator removed")
    )
})


export {
    createProject,
    getUserProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addCollaborator,
    removeCollaborator
}
