const mongoose = require("mongoose")
const bcryptjs = require("bcryptjs")

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
  password: {
    type: String,
    required: false, // Optional - only for password-based auth users
    select: false, // Don't return password by default
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

// Pre-save hook to hash password and update isApproved
UserSchema.pre("save", async function (next) {
  // Hash password if it exists and has been modified
  if (this.isModified("password") && this.password) {
    try {
      // Hash password with cost of 10
      const salt = await bcryptjs.genSalt(10)
      this.password = await bcryptjs.hash(this.password, salt)
    } catch (error) {
      return next(error)
    }
  }
  
  // Update isApproved and lastUpdated
  this.isApproved = this.approvalStatus === "approved"
  this.lastUpdated = Date.now()
  next()
})

// Instance method to compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    return false // User might not have a password set (OTP-based auth)
  }
  return await bcryptjs.compare(enteredPassword, this.password)
}

module.exports = mongoose.model("User", UserSchema)
