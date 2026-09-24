import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
      maxlength: 50,
    },
    // ─── OPTIONAL CONFIG ────────────────────────
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    numericLevel: {
      type: Number,
    },
    // ─── SYSTEM FLAGS ───────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// 🔥 Prevent duplicate classes with the same name per organization
classSchema.index({ organization: 1, name: 1 }, { unique: true });

const Class = mongoose.model("Class", classSchema);
// Alias to support schemas referencing "Classes".
mongoose.model("Classes", classSchema);
export default Class;
