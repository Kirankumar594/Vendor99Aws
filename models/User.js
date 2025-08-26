const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 10,
    maxlength: 10,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+@.+\..+/, "Please enter a valid email address"],
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  ownerName: {
    // Added based on admin panel's BusinessOwners component
    type: String,
    trim: true,
    default: function () {
      return this.businessName
    }, // Default to businessName if not provided
  },
  category: {
    type: String, // Storing category name
    trim: true,
  },
  city: {
    type: String, // Storing city name
    trim: true,
  },
  isProfileComplete: {
    type: Boolean,
    default: false,
  },
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  isApproved: {
    // Derived from approvalStatus, for easier frontend checks
    type: Boolean,
    default: false,
  },
  walletBalance: {
    type: Number,
    default: 0,
  },
  totalLeadsViewed: {
    type: Number,
    default: 0,
  },
  purchasedLeads: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
  ], // Array of lead IDs purchased by this user
  savedLeads: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
  ], // Array of lead IDs saved by this user
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
  },
  submittedForApproval: {
    // Timestamp when profile was submitted for approval
    type: Date,
  },
  approvalDate: {
    type: Date,
  },
  approvalReason: {
    type: String,
  },
  reviewedBy: {
    type: String,
  },
  verificationId: {
    type: String,
  },
})

// Pre-save hook to update isApproved based on approvalStatus
UserSchema.pre("save", function (next) {
  this.isApproved = this.approvalStatus === "approved"
  this.lastUpdated = Date.now()
  next()
})

module.exports = mongoose.model("User", UserSchema)
