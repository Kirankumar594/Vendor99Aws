const jwt = require("jsonwebtoken")
const bcryptjs = require("bcryptjs")
const Admin = require("../models/Admin")
const User = require("../models/User")

// In-memory OTP store for demonstration purposes.
// In a real application, use a database (e.g., Redis) with expiry.
const otpStore = {} // { mobileNumber: { otp: '1234', expiresAt: Date } }
const OTP_EXPIRY_MINUTES = 5

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "24h", // Token expires in 24 hour
  })
}

// @desc    Admin login
// @route   POST /api/auth/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  const { email, password } = req.body
  try {
    // Check if admin exists
    const admin = await Admin.findOne({ email })
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Check password
    const isMatch = await admin.matchPassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    res.json({
      message: "Admin login successful! Welcome back.",
      token: generateToken(admin._id),
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error during admin login" })
  }
}

// @desc    Admin Signup/Creation
// @route   POST /api/auth/admin/signup
// @access  Private (Admin only)
const adminSignup = async (req, res) => {
  const { email, password, role } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter all required fields: email and password." })
  }

  try {
    const existingAdmin = await Admin.findOne({ email })
    if (existingAdmin) {
      return res.status(409).json({ message: "An admin with this email already exists." })
    }

    // Create new admin
    const newAdmin = new Admin({
      email,
      password, // Password will be hashed by pre-save hook in Admin model
      role: role || "admin", // Default to 'admin' if no role is provided
    })

    await newAdmin.save()

    res.status(201).json({
      message: "Admin account created successfully!",
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error during admin signup." })
  }
}

// @desc    Request OTP for user login/signup
// @route   POST /api/auth/user/otp-request
// @access  Public
const requestUserOTP = async (req, res) => {
  const { mobileNumber, isSignup, businessName, email } = req.body

  if (!mobileNumber || mobileNumber.length !== 10) {
    return res.status(400).json({ message: "Please provide a valid 10-digit mobile number." })
  }

  try {
    const existingUser = await User.findOne({ mobile: mobileNumber })

    if (isSignup) {
      if (existingUser) {
        if (existingUser.approvalStatus === "rejected") {
          return res.status(403).json({
            message:
              "Your business profile was previously rejected. Please contact support or try with a different mobile number.",
            status: "rejected",
          })
        }
        return res.status(409).json({ message: "An account with this mobile number already exists. Please login." })
      }
      if (!businessName || !email) {
        return res.status(400).json({ message: "Business name and email are required for signup." })
      }
    } else {
      if (!existingUser) {
        return res.status(404).json({ message: "No account found with this mobile number. Please sign up first." })
      }
      if (existingUser.approvalStatus === "rejected") {
        return res.status(403).json({
          message: "Your business profile was rejected by our admin team. You can view details or contact support.",
          status: "rejected",
        })
      }
    }

    // Generate a 4-digit OTP using Math.random()
    const otp = Math.floor(1000 + Math.random() * 9000).toString()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000) // OTP valid for 5 minutes

    // Store OTP in memory
    otpStore[mobileNumber] = { otp, expiresAt, isSignup, signupData: { businessName, email } }

    console.log(`OTP for ${mobileNumber}: ${otp} (Expires in ${OTP_EXPIRY_MINUTES} minutes)`) // Log for testing

    res.status(200).json({
      message: `OTP sent to ${mobileNumber}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      otp: otp, // IMPORTANT: Sending OTP to client for demo/testing. For production, use SMS/email service.
      isNewUser: isSignup && !existingUser,
      userStatus: existingUser ? existingUser.approvalStatus : "new",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error during OTP request." })
  }
}

// @desc    Verify OTP for user login/signup
// @route   POST /api/auth/user/otp-verify
// @access  Public
const verifyUserOTP = async (req, res) => {
  const { mobileNumber, otp } = req.body

  if (!mobileNumber || !otp) {
    return res.status(400).json({ message: "Mobile number and OTP are required." })
  }

  const storedOtpData = otpStore[mobileNumber]

  if (!storedOtpData) {
    return res.status(400).json({ message: "OTP not requested or expired. Please request a new OTP." })
  }

  if (storedOtpData.expiresAt < new Date()) {
    delete otpStore[mobileNumber] // Clear expired OTP
    return res.status(400).json({ message: "OTP has expired. Please request a new OTP." })
  }

  if (storedOtpData.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP. Please try again." })
  }

  // OTP is valid, clear it from store
  delete otpStore[mobileNumber]

  try {
    let user = await User.findOne({ mobile: mobileNumber })
    const { isSignup, signupData } = storedOtpData

    if (isSignup) {
      if (user) {
        return res.status(409).json({ message: "User already exists. Please login." })
      }

      // Create new user
      user = new User({
        mobile: mobileNumber,
        businessName: signupData.businessName,
        email: signupData.email,
        createdAt: new Date(),
        isProfileComplete: false, // Will be set to true after ProfileSetup
        approvalStatus: "pending",
        isApproved: false,
      })
      await user.save()

      res.status(201).json({
        message: "Account created successfully! Please complete your profile.",
        user: {
          mobile: user.mobile,
          isProfileComplete: user.isProfileComplete,
          approvalStatus: user.approvalStatus,
        },
      })
    } else {
      // Login
      if (!user) {
        return res.status(404).json({ message: "User not found. Please sign up." })
      }

      res.status(200).json({
        message: "Login successful! Welcome back.",
        user: {
          mobile: user.mobile,
          isProfileComplete: user.isProfileComplete,
          approvalStatus: user.approvalStatus,
        },
      })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error during OTP verification." })
  }
}

// @desc    User registration with password
// @route   POST /api/auth/user/register
// @access  Public
const userRegister = async (req, res) => {
  const { mobileNumber, email, businessName, password } = req.body

  if (!mobileNumber || !email || !businessName || !password) {
    return res.status(400).json({ message: "Please provide all required fields." })
  }

  if (mobileNumber.length !== 10) {
    return res.status(400).json({ message: "Mobile number must be 10 digits." })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." })
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ mobile: mobileNumber }, { email: email.toLowerCase() }],
    })

    if (existingUser) {
      if (existingUser.mobile === mobileNumber) {
        return res.status(409).json({ message: "An account with this mobile number already exists." })
      }
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({ message: "An account with this email already exists." })
      }
    }

    // Create new user
    const user = new User({
      mobile: mobileNumber,
      email: email.toLowerCase(),
      businessName,
      password, // Will be hashed by pre-save hook
      approvalStatus: "pending",
      isProfileComplete: false,
    })

    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        businessName: user.businessName,
        approvalStatus: user.approvalStatus,
        isProfileComplete: user.isProfileComplete,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error during registration." })
  }
}

// @desc    User login with email and password
// @route   POST /api/auth/user/login
// @access  Public
const userLogin = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide email and password." })
  }

  try {
    // Find user by email and include password
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password")

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." })
    }

    // Check if user has a password set
    if (!user.password) {
      return res.status(403).json({
        message: "This account was created with OTP authentication. Please use OTP login.",
      })
    }

    // Check password
    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." })
    }

    // Check approval status
    if (user.approvalStatus === "rejected") {
      return res.status(403).json({
        message: "Your profile has been rejected. Please contact support.",
        status: "rejected",
        token: generateToken(user._id), // Still provide token for rejected users to view details
      })
    }

    // Generate token
    const token = generateToken(user._id)

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        businessName: user.businessName,
        approvalStatus: user.approvalStatus,
        isProfileComplete: user.isProfileComplete,
        walletBalance: user.walletBalance,
      },
      status: user.approvalStatus,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error during login." })
  }
}

module.exports = {
  adminLogin,
  adminSignup,
  requestUserOTP,
  verifyUserOTP,
  userRegister,
  userLogin,
}
