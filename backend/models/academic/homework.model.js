import mongoose from "mongoose";

const homeworkSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classes",
      required: true,
    },
    section: { type: String, trim: true }, // Optional: If assigned to a specific section

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dueDate: { type: Date, required: true },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    attachments: [
      {
        name: String,
        url: String,
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Index for fast fetching by class
homeworkSchema.index({ school: 1, class: 1, dueDate: -1 });

const Homework = mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);

export default Homework;
