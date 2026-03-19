import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "invite",           // Added as collaborator to a project
        "removed",          // Removed from a project
        "edit",             // Someone edited a file in your project
        "file_created",     // New file added to your project
        "file_deleted",     // File deleted from your project
        "version_restored", // Someone restored a version
        "mention",          // Mentioned in a chat/comment
        "system",           // System notification
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Extra info: { fileName: "main.js", fileId: "..." }
    },
  },
  { timestamps: true }
);

// Fast queries: "get all notifications for user, newest first"
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model("Notification", notificationSchema);
