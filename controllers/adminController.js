const User = require("../models/User")
const Admin = require("../models/Admin")
const Lead = require("../models/Lead")
const WalletTransaction = require("../models/WalletTransaction")

// @desc    Get all users (business owners) for admin panel
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const { approvalStatus } = req.query // Get approvalStatus from query

    const matchStage = {}
    if (approvalStatus) {
      matchStage.approvalStatus = approvalStatus
    }

    const pipeline = []

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage }) // Add match stage if filter is present
    }

    pipeline.push(
      {
        $lookup: {
          from: "wallettransactions", // The collection name for WalletTransaction model
          localField: "_id",
          foreignField: "userId",
          as: "purchasedLeadsTransactions",
        },
      },
      {
        $addFields: {
          leadsViewedCount: {
            $size: {
              $filter: {
                input: "$purchasedLeadsTransactions",
                as: "transaction",
                cond: { $eq: ["$$transaction.type", "lead_purchase"] },
              },
            },
          },
        },
      },
      {
        $project: {
          purchasedLeadsTransactions: 0, // Exclude the raw transactions array
        },
      },
    )

    const users = await User.aggregate(pipeline)
    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching users" })
  }
}

// @desc    Create a new user (business owner) by admin
// @route   POST /api/admin/users
// @access  Private (Admin)
const createUser = async (req, res) => {
  const { businessName, ownerName, mobile, email, category, city, walletBalance } = req.body

  // Basic validation
  if (!businessName || !ownerName || !mobile || !email || !category || !city) {
    return res.status(400).json({ message: "Please fill all required fields." })
  }

  try {
    const userExists = await User.findOne({ mobile })
    if (userExists) {
      return res.status(400).json({ message: "User with this mobile number already exists." })
    }

    const newUser = new User({
      businessName,
      ownerName,
      mobile,
      email,
      category,
      city,
      walletBalance: walletBalance || 0,
      isProfileComplete: true, // Admin created users are considered complete
      approvalStatus: "approved", // Admin created users are approved by default
      isApproved: true,
      approvalDate: Date.now(),
      reviewedBy: req.admin ? req.admin.email : "Admin Panel",
    })

    await newUser.save()
    res.status(201).json({ message: "Business owner added successfully!", user: newUser })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error adding user." })
  }
}

// @desc    Update a user (business owner) by admin
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUserDetails = async (req, res) => {
  const { id } = req.params
  const { businessName, ownerName, mobile, email, category, city, walletBalance } = req.body // Changed 'phone' to 'mobile'

  try {
    const user = await User.findById(id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if mobile is being changed to an existing one (excluding current user)
    if (mobile && mobile !== user.mobile) {
      const mobileExists = await User.findOne({ mobile, _id: { $ne: id } })
      if (mobileExists) {
        return res.status(400).json({ message: "Another user with this mobile number already exists." })
      }
    }

    user.businessName = businessName || user.businessName
    user.ownerName = ownerName || user.ownerName
    user.mobile = mobile || user.mobile // Use mobile
    user.email = email || user.email
    user.category = category || user.category
    user.city = city || user.city
    user.walletBalance = walletBalance !== undefined ? walletBalance : user.walletBalance
    user.lastUpdated = Date.now()

    await user.save()
    res.json({ message: "Business owner updated successfully!", user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error updating user" })
  }
}

// @desc    Delete a user (business owner) by admin
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  const { id } = req.params

  try {
    const user = await User.findById(id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    await user.deleteOne() // Use deleteOne() for Mongoose 6+
    res.json({ message: "Business owner deleted successfully!" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error deleting user" })
  }
}

// @desc    Get users for approval (pending, approved, rejected)
// @route   GET /api/admin/users-for-approval
// @access  Private (Admin)
const getUsersForApproval = async (req, res) => {
  try {
    // Fetch users who have completed their profile, regardless of current approval status
    // The frontend (Approval.jsx) will then filter these into pending/approved/rejected tabs
    const users = await User.find({ isProfileComplete: true }).sort({ createdAt: -1 })
    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching users for approval." })
  }
}

// @desc    Approve a user's profile
// @route   PUT /api/admin/users/:id/approve
// @access  Private (Admin)
const approveUser = async (req, res) => {
  const { id } = req.params
  const { approvalReason, reviewedBy, verificationId } = req.body // Optional fields from frontend

  try {
    const user = await User.findById(id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.approvalStatus = "approved"
    user.isApproved = true
    user.approvalDate = Date.now()
    user.approvalReason = approvalReason || "Business profile verified successfully. Welcome to Vendor99!"
    user.reviewedBy = reviewedBy || (req.admin ? req.admin.email : "Admin Team") // Use logged-in admin's email
    user.verificationId = verificationId || `VER${Date.now()}`

    await user.save()
    res.json({ message: "User approved successfully!", user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error approving user." })
  }
}

// @desc    Reject a user's profile
// @route   PUT /api/admin/users/:id/reject
// @access  Private (Admin)
const rejectUser = async (req, res) => {
  const { id } = req.params
  const { approvalReason, reviewedBy } = req.body // Optional fields from frontend

  try {
    const user = await User.findById(id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.approvalStatus = "rejected"
    user.isApproved = false
    user.approvalDate = Date.now()
    user.approvalReason = approvalReason || "Business information requires additional verification."
    user.reviewedBy = reviewedBy || (req.admin ? req.admin.email : "Admin Team") // Use logged-in admin's email

    await user.save()
    res.json({ message: "User rejected successfully!", user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error rejecting user." })
  }
}

// @desc    Get dashboard statistics for admin
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const totalBusinessOwners = await User.countDocuments({ approvalStatus: "approved" }) // Changed to count only approved users
    const totalLeadsUploaded = await Lead.countDocuments()
    const totalWalletRecharge = await WalletTransaction.aggregate([
      { $match: { type: "recharge", status: "Success" } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ])

    res.json({
      totalBusinessOwners,
      totalLeadsUploaded,
      totalWalletRecharge: totalWalletRecharge.length > 0 ? totalWalletRecharge[0].totalAmount : 0,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching dashboard stats." })
  }
}

// @desc    Get monthly revenue data for admin dashboard
// @route   GET /api/admin/monthly-revenue
// @access  Private (Admin)
const getMonthlyRevenue = async (req, res) => {
  try {
    const revenueData = await WalletTransaction.aggregate([
      { $match: { type: "recharge", status: "Success", timestamp: { $ne: null } } }, // Changed createdAt to timestamp
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" }, // Changed createdAt to timestamp
            month: { $month: "$timestamp" }, // Changed createdAt to timestamp
          },
          totalRevenue: { $sum: "$amount" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          _id: 0,
          month: {
            $dateToString: {
              format: "%b", // Abbreviated month name (e.g., Jan, Feb)
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: "$_id.month",
                  day: 1,
                },
              },
            },
          },
          revenue: "$totalRevenue",
        },
      },
    ])
    res.json(revenueData)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching monthly revenue." })
  }
}

// @desc    Get monthly user growth data for admin dashboard
// @route   GET /api/admin/monthly-user-growth
// @access  Private (Admin)
const getMonthlyUserGrowth = async (req, res) => {
  try {
    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $ne: null }, // Ensure createdAt exists
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalUsers: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          _id: 0,
          month: {
            $dateToString: {
              format: "%b", // Abbreviated month name (e.g., Jan, Feb)
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: "$_id.month",
                  day: 1,
                },
              },
            },
          },
          users: "$totalUsers",
        },
      },
    ])
    res.json(userGrowthData)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching monthly user growth." })
  }
}

module.exports = {
  getAllUsers,
  createUser,
  updateUserDetails,
  deleteUser,
  getUsersForApproval,
  approveUser,
  rejectUser,
  getDashboardStats,
  getMonthlyRevenue, // Export new function
  getMonthlyUserGrowth, // Export new function
}
