const express = require("express")
const {
  getUserProfile,
  updateUserProfile,
  getDashboardStats,
  getSavedLeads,
  saveLead,
  removeSavedLead,
} = require("../controllers/userController")
const { identifyUser } = require("../middleware/authMiddleware")

const router = express.Router()

// Apply identifyUser middleware to specific routes
router.get("/profile/:mobile", identifyUser, getUserProfile)
router.put("/profile/:mobile", identifyUser, updateUserProfile)

router.get("/dashboard-stats/:mobile", identifyUser, getDashboardStats)

router.get("/:mobile/saved-leads", identifyUser, getSavedLeads)
router.post("/:mobile/saved-leads", identifyUser, saveLead)
router.delete("/:mobile/saved-leads/:leadId", identifyUser, removeSavedLead)

module.exports = router
