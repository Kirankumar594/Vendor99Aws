const express = require("express")
const { protectAdmin } = require("../middleware/authMiddleware")
const {
  getAllUsers,
  createUser,
  updateUserDetails,
  deleteUser,
  getUsersForApproval,
  approveUser,
  rejectUser,
  getDashboardStats,
  getMonthlyRevenue, // Import new function
  getMonthlyUserGrowth, // Import new function
} = require("../controllers/adminController")

const router = express.Router()

router.use(protectAdmin) // All routes below this will be protected by protectAdmin

router.get("/dashboard-stats", getDashboardStats) // New route for dashboard stats
router.get("/monthly-revenue", getMonthlyRevenue) // New route for monthly revenue
router.get("/monthly-user-growth", getMonthlyUserGrowth) // New route for monthly user growth

router.get("/users", getAllUsers)
router.post("/users", createUser) // New route for admin to create users
router.put("/users/:id", updateUserDetails)
router.delete("/users/:id", deleteUser)

router.get("/users-for-approval", getUsersForApproval) // New route for users approval list
router.put("/users/:id/approve", approveUser)
router.put("/users/:id/reject", rejectUser)

module.exports = router
