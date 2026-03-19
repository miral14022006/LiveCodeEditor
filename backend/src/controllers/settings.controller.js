import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import User from "../models/user.model.js"
import Project from "../models/project.model.js"
import Activity from "../models/activity.model.js"
import Notification from "../models/notification.model.js"
import Message from "../models/message.model.js"
import bcrypt from "bcryptjs"


// ================= GET MY SETTINGS (Current Profile) =================
const getMySettings = asyncHandler(async (req, res) => {

    const user = await User.findById(req.user._id)
        .select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    return res.status(200).json(
        new ApiResponse(200, user, "Settings fetched")
    )
})


// ================= UPDATE PROFILE DETAILS =================
// Update name, bio, avatar — things user.controller doesn't cover fully
const updateProfileSettings = asyncHandler(async (req, res) => {

    const { name, bio, avatar, username } = req.body

    const user = await User.findById(req.user._id)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    // If username is being changed, check it's not taken
    if (username && username !== user.username) {
        const existingUser = await User.findOne({ username: username.toLowerCase() })
        if (existingUser) {
            throw new ApiError(400, "Username already taken")
        }
        user.username = username.toLowerCase()
    }

    if (name) user.name = name
    if (bio !== undefined) user.bio = bio
    if (avatar !== undefined) user.avatar = avatar

    await user.save({ validateBeforeSave: false })

    const updatedUser = await User.findById(req.user._id)
        .select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "Profile settings updated")
    )
})


// ================= CHANGE PASSWORD =================
const changePassword = asyncHandler(async (req, res) => {

    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
        throw new ApiError(400, "All password fields are required")
    }

    if (newPassword !== confirmPassword) {
        throw new ApiError(400, "New password and confirm password do not match")
    }

    if (newPassword.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters")
    }

    const user = await User.findById(req.user._id)

    const isMatch = await bcrypt.compare(currentPassword, user.password)

    if (!isMatch) {
        throw new ApiError(400, "Current password is incorrect")
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})


// ================= CHANGE EMAIL =================
const changeEmail = asyncHandler(async (req, res) => {

    const { newEmail, password } = req.body

    if (!newEmail || !password) {
        throw new ApiError(400, "New email and current password are required")
    }

    // Verify current password before allowing email change
    const user = await User.findById(req.user._id)

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        throw new ApiError(400, "Password is incorrect")
    }

    // Check if email is already taken
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() })

    if (existingUser) {
        throw new ApiError(400, "Email already in use")
    }

    user.email = newEmail.toLowerCase()
    await user.save({ validateBeforeSave: false })

    const updatedUser = await User.findById(req.user._id)
        .select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "Email changed successfully")
    )
})


// ================= DELETE ACCOUNT =================
// Permanently deletes user account and all their data
const deleteAccount = asyncHandler(async (req, res) => {

    const { password } = req.body

    if (!password) {
        throw new ApiError(400, "Password is required to delete account")
    }

    const user = await User.findById(req.user._id)

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        throw new ApiError(400, "Password is incorrect")
    }

    // 1. Delete all projects owned by this user
    const ownedProjects = await Project.find({ owner: req.user._id })
    const ownedProjectIds = ownedProjects.map(p => p._id)

    // 2. Delete all files, messages, activities, notifications for owned projects
    await Message.deleteMany({ project: { $in: ownedProjectIds } })
    await Activity.deleteMany({ project: { $in: ownedProjectIds } })

    // 3. Delete owned projects
    await Project.deleteMany({ owner: req.user._id })

    // 4. Remove user from all projects they are collaborating on
    await Project.updateMany(
        { "collaborators.user": req.user._id },
        { $pull: { collaborators: { user: req.user._id } } }
    )

    // 5. Delete all notifications for this user
    await Notification.deleteMany({
        $or: [
            { recipient: req.user._id },
            { sender: req.user._id }
        ]
    })

    // 6. Delete all activities by this user
    await Activity.deleteMany({ user: req.user._id })

    // 7. Delete all messages by this user
    await Message.deleteMany({ sender: req.user._id })

    // 8. Delete the user
    await User.findByIdAndDelete(req.user._id)

    // 9. Clear cookies
    const options = { httpOnly: true, secure: false }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "Account deleted successfully")
        )
})


export {
    getMySettings,
    updateProfileSettings,
    changePassword,
    changeEmail,
    deleteAccount
}
