import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import File from "../models/file.model.js"
import Project from "../models/project.model.js"
import { logActivity } from "./activity.controller.js"
import { notifyProjectMembers } from "./notification.controller.js"


// ================= CREATE FILE =================
const createFile = asyncHandler(async (req, res) => {

    const { name, language, parentFolder } = req.body

    if (!name) {
        throw new ApiError(400, "File name required")
    }

    const project = await Project.findById(req.params.projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    // Build the file path
    let path = "/"
    if (parentFolder) {
        const parent = await File.findById(parentFolder)
        if (parent && parent.type === "folder") {
            path = parent.path === "/" ? `/${parent.filename}` : `${parent.path}/${parent.filename}`
        }
    }

    const file = await File.create({
        project: project._id,
        filename: name,
        language: language || getLanguageFromName(name),
        content: "",
        type: "file",
        parentFolder: parentFolder || null,
        path: path === "/" ? `/${name}` : `${path}/${name}`
    })

    // Log activity
    await logActivity({
        userId: req.user._id,
        projectId: project._id,
        action: `${req.user.name} created file "${name}" in project`,
        actionType: "file_created",
        targetType: "file",
        targetId: file._id,
        metadata: { fileName: name, language: file.language, path: file.path }
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


// ================= CREATE FOLDER =================
const createFolder = asyncHandler(async (req, res) => {

    const { name, parentFolder } = req.body

    if (!name) {
        throw new ApiError(400, "Folder name required")
    }

    const project = await Project.findById(req.params.projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    // Build the folder path
    let path = "/"
    if (parentFolder) {
        const parent = await File.findById(parentFolder)
        if (parent && parent.type === "folder") {
            path = parent.path === "/" ? `/${parent.filename}` : `${parent.path}/${parent.filename}`
        }
    }

    // Check if folder with same name already exists at this level
    const existing = await File.findOne({
        project: project._id,
        filename: name,
        type: "folder",
        parentFolder: parentFolder || null
    })

    if (existing) {
        throw new ApiError(400, "A folder with this name already exists here")
    }

    const folder = await File.create({
        project: project._id,
        filename: name,
        type: "folder",
        parentFolder: parentFolder || null,
        path: path === "/" ? `/${name}` : `${path}/${name}`,
        content: "",
        language: "folder"
    })

    // Log activity
    await logActivity({
        userId: req.user._id,
        projectId: project._id,
        action: `${req.user.name} created folder "${name}"`,
        actionType: "folder_created",
        targetType: "folder",
        targetId: folder._id,
        metadata: { folderName: name, path: folder.path }
    })

    return res.status(201).json(
        new ApiResponse(201, folder, "Folder created")
    )
})


// ================= GET ALL FILES OF PROJECT (TREE STRUCTURE) =================
const getProjectFiles = asyncHandler(async (req, res) => {

    const files = await File.find({
        project: req.params.projectId
    }).sort({ type: -1, filename: 1 }) // Folders first, then files alphabetically

    return res.status(200).json(
        new ApiResponse(200, files, "Files fetched")
    )
})


// ================= GET FILES AS TREE =================
const getProjectFileTree = asyncHandler(async (req, res) => {

    const files = await File.find({
        project: req.params.projectId
    }).sort({ type: -1, filename: 1 })

    // Build tree structure
    const tree = buildFileTree(files)

    return res.status(200).json(
        new ApiResponse(200, tree, "File tree fetched")
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
    if (name) {
        file.filename = name
        // Update language based on new filename
        file.language = getLanguageFromName(name)
    }

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


// ================= RENAME FILE/FOLDER =================
const renameFile = asyncHandler(async (req, res) => {

    const { name } = req.body

    if (!name) {
        throw new ApiError(400, "New name is required")
    }

    const file = await File.findById(req.params.fileId)

    if (!file) {
        throw new ApiError(404, "File not found")
    }

    const oldName = file.filename
    file.filename = name

    // Update path
    const pathParts = file.path.split("/")
    pathParts[pathParts.length - 1] = name
    file.path = pathParts.join("/")

    // Update language for files
    if (file.type === "file") {
        file.language = getLanguageFromName(name)
    }

    await file.save()

    // If it's a folder, update all children's paths
    if (file.type === "folder") {
        await updateChildPaths(file._id, file.path)
    }

    return res.status(200).json(
        new ApiResponse(200, file, `Renamed from "${oldName}" to "${name}"`)
    )
})


// ================= MOVE FILE/FOLDER =================
const moveFile = asyncHandler(async (req, res) => {

    const { targetFolderId } = req.body // null = move to root

    const file = await File.findById(req.params.fileId)

    if (!file) {
        throw new ApiError(404, "File not found")
    }

    // Build new path
    let newPath = "/"
    if (targetFolderId) {
        const targetFolder = await File.findById(targetFolderId)
        if (!targetFolder || targetFolder.type !== "folder") {
            throw new ApiError(404, "Target folder not found")
        }
        newPath = targetFolder.path === "/" ? `/${targetFolder.filename}` : `${targetFolder.path}/${targetFolder.filename}`
    }

    file.parentFolder = targetFolderId || null
    file.path = newPath === "/" ? `/${file.filename}` : `${newPath}/${file.filename}`

    await file.save()

    // If it's a folder, update all children's paths
    if (file.type === "folder") {
        await updateChildPaths(file._id, file.path)
    }

    return res.status(200).json(
        new ApiResponse(200, file, "File moved")
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
    const isFolder = file.type === "folder"

    // If it's a folder, delete all children recursively
    if (isFolder) {
        await deleteChildrenRecursive(file._id)
    }

    // Log activity before deletion
    await logActivity({
        userId: req.user._id,
        projectId: projectId,
        action: `${req.user.name} deleted ${isFolder ? "folder" : "file"} "${fileName}"`,
        actionType: isFolder ? "folder_deleted" : "file_deleted",
        targetType: isFolder ? "folder" : "file",
        targetId: file._id,
        metadata: { fileName: fileName }
    })

    // 🔔 Notify all project members
    await notifyProjectMembers({
        projectId: projectId,
        senderId: req.user._id,
        type: "file_deleted",
        message: `${req.user.name} deleted ${isFolder ? "folder" : "file"} "${fileName}"`,
        metadata: { fileName: fileName }
    })

    await file.deleteOne()

    return res.status(200).json(
        new ApiResponse(200, {}, `${isFolder ? "Folder" : "File"} deleted`)
    )
})


// ================= HELPER FUNCTIONS =================

// Get language from filename extension
function getLanguageFromName(filename) {
    const ext = filename?.split(".").pop()?.toLowerCase()
    const map = {
        js: "javascript", jsx: "javascript",
        ts: "typescript", tsx: "typescript",
        py: "python",
        html: "html",
        css: "css",
        json: "json",
        java: "java",
        cpp: "cpp", cc: "cpp", cxx: "cpp",
        c: "c",
        md: "markdown",
        txt: "plaintext",
        xml: "xml",
        yaml: "yaml", yml: "yaml",
        sql: "sql",
        sh: "shell",
        rb: "ruby",
        go: "go",
        rs: "rust",
        php: "php",
    }
    return map[ext] || "plaintext"
}

// Build file tree from flat array
function buildFileTree(files) {
    const fileMap = new Map()
    const tree = []

    // Create a map of all files/folders
    files.forEach(f => {
        fileMap.set(f._id.toString(), { ...f.toObject(), children: [] })
    })

    // Build tree
    files.forEach(f => {
        const node = fileMap.get(f._id.toString())
        if (f.parentFolder) {
            const parent = fileMap.get(f.parentFolder.toString())
            if (parent) {
                parent.children.push(node)
            } else {
                tree.push(node)
            }
        } else {
            tree.push(node)
        }
    })

    return tree
}

// Recursively delete all children of a folder
async function deleteChildrenRecursive(folderId) {
    const children = await File.find({ parentFolder: folderId })

    for (const child of children) {
        if (child.type === "folder") {
            await deleteChildrenRecursive(child._id)
        }
        await child.deleteOne()
    }
}

// Update paths of all children when a folder is renamed/moved
async function updateChildPaths(folderId, newFolderPath) {
    const children = await File.find({ parentFolder: folderId })

    for (const child of children) {
        child.path = `${newFolderPath}/${child.filename}`
        await child.save()

        if (child.type === "folder") {
            await updateChildPaths(child._id, child.path)
        }
    }
}


export {
    createFile,
    createFolder,
    getProjectFiles,
    getProjectFileTree,
    getFileById,
    updateFile,
    renameFile,
    moveFile,
    deleteFile
}
