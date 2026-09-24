import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: String,
    message: String,

    type: {
      type: String,
      enum: [
        "attendance",
        "result",
        "fee",
        "notice",
        "event",
        "leave",
        "system",
        "message",
        "ticket",
        "admissions",
      ],
      default: "system",
    },

    read: {
      type: Boolean,
      default: false,
    },

    metadata: {
      student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
      class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      subject: String,
      photo: String,
      link: String,
    },

    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    senderName: {
      type: String,
      default: "",
    },
    senderRole: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);
