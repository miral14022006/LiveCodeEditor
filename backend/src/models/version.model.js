import mongoose from "mongoose";

const versionSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    message: {
      type: String,
      default: "Auto-saved version",
    },
  },
  { timestamps: true }
);

versionSchema.index({ file: 1 });
versionSchema.index({ file: 1, createdAt: -1 });

export default mongoose.model("Version", versionSchema);
