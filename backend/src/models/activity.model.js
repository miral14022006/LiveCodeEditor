import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    action: {
      type: String,
      required: true,
      // Human-readable description, e.g. "created project", "edited main.js"
    },
    actionType: {
      type: String,
      enum: [
        "project_created",
        "project_updated",
        "project_deleted",
        "file_created",
        "file_updated",
        "file_deleted",
        "collaborator_added",
        "collaborator_removed",
        "version_restored",
        "version_deleted",
        "member_joined",
        "member_left",
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["project", "file", "user", "version"],
      default: "project",
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      // Polymorphic — can point to Project, File, User, or Version
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Store extra info like { fileName: "main.js", oldValue: "...", newValue: "..." }
    },
  },
  { timestamps: true }
);

// Index for fast queries: "get all activity for a project, newest first"
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
