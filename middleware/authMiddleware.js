const jwt = require("jsonwebtoken")
const Admin = require("../models/Admin")
const User = require("../models/User")

// Protects admin routes
const protectAdmin = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1]

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Attach admin to the request
      req.admin = await Admin.findById(decoded.id).select("-password")
      if (!req.admin) {
        return res.status(401).json({ message: "Not authorized, admin not found" })
      }
      next()
    } catch (error) {
      console.error(error)
      res.status(401).json({ message: "Not authorized, token failed" })
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" })
  }
}

// Identifies user for React Native app routes (based on mobile number)
// This is a simplified approach for the provided React Native code.
// For production, a proper token-based authentication for users is recommended.
const identifyUser = async (req, res, next) => {
  const mobileNumber = req.params.mobile || req.body.mobileNumber || req.headers["x-user-mobile"]

  if (!mobileNumber) {
    return res.status(400).json({ message: "Mobile number is required for user identification." })
  }

  try {
    const user = await User.findOne({ mobile: mobileNumber })
    if (!user) {
      return res.status(404).json({ message: "User not found." })
    }
    req.user = user // Attach user object to the request
    next()
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error identifying user." })
  }
}

module.exports = { protectAdmin, identifyUser }
