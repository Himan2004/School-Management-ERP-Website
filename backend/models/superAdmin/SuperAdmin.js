import mongoose from "mongoose";

const superAdminSchema = new mongoose.Schema({
  
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    trim: true
  },

  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },

  photo: {
    type: String,
    default: null
  },

  dob: {
    type: Date
  },

  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },

  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: {
      type: String,
      default: 'India'
    },
    pincode: String
  }

}, { timestamps: true });

const SuperAdmin = mongoose.model("SuperAdmin", superAdminSchema);
export default SuperAdmin