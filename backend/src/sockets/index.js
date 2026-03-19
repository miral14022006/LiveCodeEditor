import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import User from "../models/user.model.js"
import Message from "../models/message.model.js"
import Project from "../models/project.model.js"


const initializeSocket = (server) => {

    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true
        }
    })

    // Track active voice calls per project
    // Key: projectId → Value: { participants: [{ socketId, userId, userName }], startedAt }
    const activeCalls = new Map()

    // Track which user is on which socket (for targeted signaling)
    const userSocketMap = new Map() // userId → socketId


    // ==================== AUTH MIDDLEWARE ====================
    // Verify JWT token before allowing socket connection
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace("Bearer ", "")

            if (!token) {
                return next(new Error("Authentication required"))
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
            const user = await User.findById(decoded._id).select("-password -refreshToken")

            if (!user) {
                return next(new Error("User not found"))
            }

            // Attach user info to socket
            socket.user = user

            // Mark user as online
            await User.findByIdAndUpdate(user._id, { isOnline: true })

            next()
        } catch (error) {
            return next(new Error("Invalid token"))
        }
    })


    // ==================== CONNECTION HANDLER ====================
    io.on("connection", (socket) => {

        console.log(`🟢 User connected: ${socket.user.name} (${socket.id})`)

        // Map this user to their socket
        userSocketMap.set(socket.user._id.toString(), socket.id)


        // ==================== JOIN PROJECT ROOM ====================
        // User joins a project room to receive real-time updates
        socket.on("join-project", async (projectId) => {
            try {
                const project = await Project.findById(projectId)

                if (!project) {
                    return socket.emit("error", { message: "Project not found" })
                }

                // Verify user has access
                const isOwner = project.owner.toString() === socket.user._id.toString()
                const isCollaborator = project.collaborators.some(
                    c => c.user.toString() === socket.user._id.toString()
                )

                if (!isOwner && !isCollaborator) {
                    return socket.emit("error", { message: "Access denied" })
                }

                // Join the room
                socket.join(projectId)

                console.log(`📁 ${socket.user.name} joined project room: ${projectId}`)

                // Notify others in the room
                socket.to(projectId).emit("user-joined", {
                    user: {
                        _id: socket.user._id,
                        name: socket.user.name,
                        avatar: socket.user.avatar
                    },
                    message: `${socket.user.name} is now online`
                })

                // If there's an active call in this project, inform the user
                const activeCall = activeCalls.get(projectId)
                if (activeCall && activeCall.participants.length > 0) {
                    socket.emit("call-active", {
                        projectId,
                        participants: activeCall.participants.map(p => ({
                            userId: p.userId,
                            userName: p.userName
                        })),
                        startedAt: activeCall.startedAt
                    })
                }

            } catch (error) {
                socket.emit("error", { message: "Failed to join project" })
            }
        })


        // ==================== LEAVE PROJECT ROOM ====================
        socket.on("leave-project", (projectId) => {
            socket.leave(projectId)

            console.log(`📁 ${socket.user.name} left project room: ${projectId}`)

            socket.to(projectId).emit("user-left", {
                user: {
                    _id: socket.user._id,
                    name: socket.user.name
                },
                message: `${socket.user.name} went offline`
            })
        })


        // ==================== SEND CHAT MESSAGE (Real-time) ====================
        socket.on("send-message", async ({ projectId, message }) => {
            try {
                if (!message || !message.trim()) {
                    return socket.emit("error", { message: "Message cannot be empty" })
                }

                // Save message to database
                const newMessage = await Message.create({
                    project: projectId,
                    sender: socket.user._id,
                    message: message.trim()
                })

                // Populate sender info
                const populatedMessage = await Message.findById(newMessage._id)
                    .populate("sender", "name email avatar")

                // Send message to ALL users in the project room (including sender)
                io.to(projectId).emit("new-message", populatedMessage)

                console.log(`💬 ${socket.user.name} → ${projectId}: ${message.trim().substring(0, 30)}...`)

            } catch (error) {
                socket.emit("error", { message: "Failed to send message" })
            }
        })


        // ==================== TYPING INDICATOR ====================
        socket.on("typing-start", ({ projectId }) => {
            socket.to(projectId).emit("user-typing", {
                user: {
                    _id: socket.user._id,
                    name: socket.user.name
                }
            })
        })

        socket.on("typing-stop", ({ projectId }) => {
            socket.to(projectId).emit("user-stopped-typing", {
                user: {
                    _id: socket.user._id,
                    name: socket.user.name
                }
            })
        })


        // ==================== CODE EDITOR (Real-time Collaboration) ====================
        // When a user types in the editor, broadcast changes to others
        socket.on("code-change", ({ projectId, fileId, content }) => {
            socket.to(projectId).emit("code-update", {
                fileId,
                content,
                user: {
                    _id: socket.user._id,
                    name: socket.user.name
                }
            })
        })

        // Cursor position sharing
        socket.on("cursor-move", ({ projectId, fileId, position }) => {
            socket.to(projectId).emit("cursor-update", {
                fileId,
                position,
                user: {
                    _id: socket.user._id,
                    name: socket.user.name,
                    avatar: socket.user.avatar
                }
            })
        })


        // ==================== VOICE CALLING (WebRTC Signaling) ====================

        // 📞 Step 1: User initiates a call to everyone in the project
        socket.on("call-initiate", ({ projectId }) => {

            console.log(`📞 ${socket.user.name} started a voice call in project: ${projectId}`)

            // Create or get active call for this project
            if (!activeCalls.has(projectId)) {
                activeCalls.set(projectId, {
                    participants: [],
                    startedAt: new Date()
                })
            }

            const call = activeCalls.get(projectId)

            // Add caller to participants
            call.participants.push({
                socketId: socket.id,
                userId: socket.user._id.toString(),
                userName: socket.user.name
            })

            // Notify everyone in the project room that a call has started
            socket.to(projectId).emit("call-incoming", {
                projectId,
                caller: {
                    _id: socket.user._id,
                    name: socket.user.name,
                    avatar: socket.user.avatar
                }
            })
        })


        // 📞 Step 2: User accepts the call → joins the voice session
        socket.on("call-accept", ({ projectId }) => {

            console.log(`✅ ${socket.user.name} joined the voice call in project: ${projectId}`)

            const call = activeCalls.get(projectId)

            if (!call) {
                return socket.emit("error", { message: "No active call in this project" })
            }

            // Add this user to participants
            const alreadyIn = call.participants.some(p => p.userId === socket.user._id.toString())
            if (!alreadyIn) {
                call.participants.push({
                    socketId: socket.id,
                    userId: socket.user._id.toString(),
                    userName: socket.user.name
                })
            }

            // Tell everyone in the call that a new person joined
            socket.to(projectId).emit("call-user-joined", {
                user: {
                    _id: socket.user._id,
                    name: socket.user.name,
                    avatar: socket.user.avatar,
                    socketId: socket.id
                },
                participants: call.participants.map(p => ({
                    userId: p.userId,
                    userName: p.userName,
                    socketId: p.socketId
                }))
            })

            // Send the existing participants list to the joining user
            socket.emit("call-participants", {
                projectId,
                participants: call.participants.map(p => ({
                    userId: p.userId,
                    userName: p.userName,
                    socketId: p.socketId
                }))
            })
        })


        // 📞 Step 3: User rejects the call
        socket.on("call-reject", ({ projectId }) => {

            console.log(`❌ ${socket.user.name} rejected the call in project: ${projectId}`)

            socket.to(projectId).emit("call-rejected", {
                user: {
                    _id: socket.user._id,
                    name: socket.user.name
                }
            })
        })


        // 📞 Step 4: WebRTC Offer — sent from caller to a specific user
        socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
            io.to(targetSocketId).emit("webrtc-offer", {
                offer,
                from: {
                    socketId: socket.id,
                    userId: socket.user._id,
                    name: socket.user.name
                }
            })
        })


        // 📞 Step 5: WebRTC Answer — sent back from receiver to caller
        socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
            io.to(targetSocketId).emit("webrtc-answer", {
                answer,
                from: {
                    socketId: socket.id,
                    userId: socket.user._id,
                    name: socket.user.name
                }
            })
        })


        // 📞 Step 6: ICE Candidate exchange — needed for WebRTC to establish connection
        socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
            io.to(targetSocketId).emit("ice-candidate", {
                candidate,
                from: {
                    socketId: socket.id,
                    userId: socket.user._id
                }
            })
        })


        // 📞 Step 7: User leaves the call (but stays in the project)
        socket.on("call-leave", ({ projectId }) => {

            console.log(`📞 ${socket.user.name} left the voice call in project: ${projectId}`)

            const call = activeCalls.get(projectId)

            if (call) {
                // Remove user from participants
                call.participants = call.participants.filter(
                    p => p.socketId !== socket.id
                )

                // Notify others
                socket.to(projectId).emit("call-user-left", {
                    user: {
                        _id: socket.user._id,
                        name: socket.user.name,
                        socketId: socket.id
                    },
                    remainingParticipants: call.participants.length
                })

                // If no one is left in the call, end it
                if (call.participants.length === 0) {
                    activeCalls.delete(projectId)

                    io.to(projectId).emit("call-ended", {
                        projectId,
                        message: "Call ended — all participants left"
                    })

                    console.log(`📞 Call ended in project: ${projectId}`)
                }
            }
        })


        // 📞 Toggle mute/unmute — notify others
        socket.on("call-toggle-mute", ({ projectId, isMuted }) => {
            socket.to(projectId).emit("call-user-muted", {
                user: {
                    _id: socket.user._id,
                    name: socket.user.name
                },
                isMuted
            })
        })


        // ==================== DISCONNECT ====================
        socket.on("disconnecting", () => {
            socket.userRooms = Array.from(socket.rooms);
        })

        socket.on("disconnect", async () => {
            console.log(`🔴 User disconnected: ${socket.user.name} (${socket.id})`)

            // Remove from userSocketMap
            userSocketMap.delete(socket.user._id.toString())

            // Remove from any active calls
            for (const [projectId, call] of activeCalls.entries()) {
                const wasInCall = call.participants.some(p => p.socketId === socket.id)

                if (wasInCall) {
                    call.participants = call.participants.filter(
                        p => p.socketId !== socket.id
                    )

                    // Notify others in the call
                    socket.to(projectId).emit("call-user-left", {
                        user: {
                            _id: socket.user._id,
                            name: socket.user.name,
                            socketId: socket.id
                        },
                        remainingParticipants: call.participants.length
                    })

                    // If call is empty, clean up
                    if (call.participants.length === 0) {
                        activeCalls.delete(projectId)

                        io.to(projectId).emit("call-ended", {
                            projectId,
                            message: "Call ended — all participants left"
                        })
                    }
                }
            }

            // Mark user as offline and set lastSeen
            await User.findByIdAndUpdate(socket.user._id, {
                isOnline: false,
                lastSeen: new Date()
            })

            // Notify all rooms user was in
            const rooms = socket.userRooms || []
            rooms.forEach(room => {
                if (room !== socket.id) { // skip the default room (socket's own ID)
                    socket.to(room).emit("user-left", {
                        user: {
                            _id: socket.user._id,
                            name: socket.user.name
                        },
                        message: `${socket.user.name} went offline`
                    })
                }
            })
        })
    })

    return io
}


export { initializeSocket }
