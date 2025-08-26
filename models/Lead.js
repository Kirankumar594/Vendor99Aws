const mongoose = require("mongoose")

const LeadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String, // Storing city name
    required: true,
    trim: true,
  },
  date: {
    // Expected format YYYY-MM-DD
    type: Date,
    required: true,
  },
  category: {
    type: String, // Storing category name
    required: true,
    trim: true,
  },
  budget: {
    type: String,
    trim: true,
  },
  description: {
    // Short description for preview
    type: String,
    required: true,
    trim: true,
  },
  fullDescription: {
    // Detailed description after purchase
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  contactName: {
    type: String,
    required: true,
    trim: true,
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true,
  },
  contactEmail: {
    type: String,
    trim: true,
    match: [/.+@.+\..+/, "Please enter a valid email address"],
  },
  requirements: {
    // String with bullet points, e.g., "• Req1 • Req2"
    type: String,
    trim: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Active", "Viewed", "Expired", "Sold Out"], // Added "Sold Out"
    default: "Active",
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  purchasedCount: {
    // New field to track how many times this lead has been purchased
    type: Number,
    default: 0,
  },
  purchasedByUsers: [
    // New field to store IDs of users who purchased this lead
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  lastViewed: {
    type: Date,
  },
  uploadedBy: {
    // Admin who uploaded the lead
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
  
})

module.exports = mongoose.model("Lead", LeadSchema)
