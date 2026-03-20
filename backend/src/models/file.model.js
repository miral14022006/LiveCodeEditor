import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "javascript",
    },
    // ===== Folder System Support =====
    type: {
      type: String,
      enum: ["file", "folder"],
      default: "file",
    },
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null, // null = root level
    },
    path: {
      type: String,
      default: "/", // Full path e.g. "/src/components/App.js"
    },
  },
  { timestamps: true }
);

fileSchema.index({ project: 1 });
fileSchema.index({ project: 1, parentFolder: 1 });
fileSchema.index({ project: 1, path: 1 });

export default mongoose.model("File", fileSchema);
