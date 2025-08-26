const express = require("express")
const { adminLogin, adminSignup, requestUserOTP, verifyUserOTP } = require("../controllers/authController")
const { protectAdmin } = require("../middleware/authMiddleware") // Still import, but won't be used on signup route

const router = express.Router()

// Admin Authentication
router.post("/admin/login", adminLogin)

// WARNING: This route is now PUBLIC. Anyone can create an admin account.
// For production, this should be protected or used only for a secure, one-time setup.
router.post("/admin/signup", adminSignup)

// User Authentication (React Native App)
router.post("/user/otp-request", requestUserOTP)
router.post("/user/otp-verify", verifyUserOTP)

module.exports = router
