import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["Academic", "Sports", "Administrative", "Holiday", "Meeting","Cultural","Trip","Workshop", "General"],
      default: "General",
    },
    startDate: { type: Date, required: true },
    eventDate: { type: Date },
    endDate: { type: Date },
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "10:00" },
    venue: { type: String, default: "School Campus" },
    participants: { type: String, default: "All Students" },
    priority: {
      type: String,
      enum: ["Normal", "High", "Urgent"],
      default: "Normal",
    },
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "Ongoing", "Completed", "Mandatory"],
      default: "Scheduled",
    },
    origin: {
      type: String,
      enum: ["HQ", "Local"],
      required: true,
      index: true,
    },
    scopeLabel: { type: String, default: "All Branches" },
    createdBy: { type: String, default: "System" },
    photos: {
      type: [String],
      default: [],
    },
    attendees: { 
      type: Array, 
      default: [] 
    }
  },
  { timestamps: true }
);

eventSchema.pre('validate', function(next) {
  if (this.startDate && !this.eventDate) {
    this.eventDate = this.startDate;
  } else if (this.eventDate && !this.startDate) {
    this.startDate = this.eventDate;
  }
  next();
});

eventSchema.index({ organization: 1, origin: 1, startDate: -1 });
eventSchema.index({ organization: 1, origin: 1, eventDate: -1 });

export default mongoose.model("Event", eventSchema);
