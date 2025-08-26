const User = require("../models/User")
const Lead = require("../models/Lead")
const WalletTransaction = require("../models/WalletTransaction")

// @desc    Get user profile by mobile number
// @route   GET /api/users/:mobile
// @access  Private (User - identified by mobile)
const getUserProfile = async (req, res) => {
  try {
    const user = req.user // User object from identifyUser middleware
    res.json(user)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching user profile." })
  }
}

// @desc    Update user profile (for React Native app)
// @route   PUT /api/users/:mobile
// @access  Private (User - identified by mobile)
const updateUserProfile = async (req, res) => {
  const { businessName, ownerName,category, city, email } = req.body // Mobile is from params/middleware

  try {
    const user = req.user // User object from identifyUser middleware

    user.businessName = businessName || user.businessName
    user.ownerName = ownerName || user.ownerName
    user.category = category || user.category
    user.city = city || user.city
    user.email = email || user.email // Allow email update if needed
    user.isProfileComplete = true // Mark as complete after this update
    user.lastUpdated = Date.now()
    user.submittedForApproval = Date.now() // Mark as submitted for approval

    await user.save()
    res.json({ message: "Profile updated successfully!", user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error updating user profile." })
  }
}

// @desc    Get user dashboard stats (for React Native app)
// @route   GET /api/users/dashboard-stats/:mobile
// @access  Private (User) - identified by mobile
const getDashboardStats = async (req, res) => {
  try {
    const user = req.user // User object from identifyUser middleware

    // Count saved leads for this user
    const savedLeadsCount = await Lead.countDocuments({
      _id: { $in: user.savedLeads || [] }, // Assuming savedLeads is an array of Lead IDs on User model
    })

    res.json({
      walletBalance: user.walletBalance,
      totalLeadsViewed: user.totalLeadsViewed,
      savedLeadsCount: savedLeadsCount,
      businessName: user.businessName,
      city: user.city,
      category: user.category,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching dashboard stats" })
  }
}

// @desc    Get user's saved leads
// @route   GET /api/users/:mobile/saved-leads
// @access  Private (User) - identified by mobile
const getSavedLeads = async (req, res) => {
  try {
    const user = req.user // User object from identifyUser middleware
    // Assuming user.savedLeads is an array of Lead IDs
    const savedLeads = await Lead.find({ _id: { $in: user.savedLeads || [] } })
    res.json(savedLeads)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching saved leads" })
  }
}

// @desc    Save a lead to user's saved leads
// @route   POST /api/users/:mobile/saved-leads
// @access  Private (User) - identified by mobile
const saveLead = async (req, res) => {
  try {
    const user = req.user // User object from identifyUser middleware
    const { leadId } = req.body

    if (!leadId) {
      return res.status(400).json({ message: "Lead ID is required" })
    }

    const lead = await Lead.findById(leadId)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    // Check if already saved
    if (user.savedLeads.includes(leadId)) {
      return res.status(409).json({ message: "This lead is already saved." })
    }

    user.savedLeads.push(leadId)
    await user.save()

    res.status(200).json({ message: "Lead saved successfully!" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error saving lead" })
  }
}

// @desc    Remove a lead from user's saved leads
// @route   DELETE /api/users/:mobile/saved-leads/:leadId
// @access  Private (User) - identified by mobile
const removeSavedLead = async (req, res) => {
  try {
    const user = req.user // User object from identifyUser middleware
    const { leadId } = req.params

    if (!user.savedLeads.includes(leadId)) {
      return res.status(404).json({ message: "Lead not found in saved leads." })
    }

    user.savedLeads = user.savedLeads.filter((id) => id.toString() !== leadId)
    await user.save()

    res.status(200).json({ message: "Lead removed from saved leads successfully!" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error removing saved lead" })
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  getDashboardStats,
  getSavedLeads,
  saveLead,
  removeSavedLead,
}
