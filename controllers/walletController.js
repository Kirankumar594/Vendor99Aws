const WalletTransaction = require("../models/WalletTransaction")
const User = require("../models/User")

// @desc    Recharge user wallet
// @route   POST /api/wallet/recharge/:mobile
// @access  Private (User - identified by mobile)
const rechargeWallet = async (req, res) => {
  const { amount, paymentMethod } = req.body
  const user = req.user // User object from identifyUser middleware

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Recharge amount must be a positive number." })
  }
  if (!paymentMethod) {
    return res.status(400).json({ message: "Payment method is required." })
  }

  try {
    // Update user's wallet balance
    user.walletBalance += amount
    await user.save()

    // Record the transaction
    const transaction = new WalletTransaction({
      userId: user._id,
      amount,
      type: "recharge",
      transactionId: `RECH${Date.now()}${Math.floor(Math.random() * 1000)}`,
      paymentMethod,
      status: "Success", // Assuming instant success for simulation
    })
    await transaction.save()

    res.status(201).json({
      message: `Wallet recharged successfully! New balance: ₹${user.walletBalance}`,
      newBalance: user.walletBalance,
      transaction,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error during wallet recharge." })
  }
}

// @desc    Get user's wallet recharge history
// @route   GET /api/wallet/history/:mobile
// @access  Private (User - identified by mobile)
const getRechargeHistory = async (req, res) => {
  const user = req.user // User object from identifyUser middleware
  try {
    const history = await WalletTransaction.find({ userId: user._id, type: "recharge" }).sort({ timestamp: -1 })
    res.json(history)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching recharge history." })
  }
}

// @desc    Get all wallet logs (for admin panel)
// @route   GET /api/wallet/logs
// @access  Private (Admin)
const getAllWalletLogs = async (req, res) => {
  const { searchTerm, paymentMethod, from, to } = req.query
  const query = {}

  if (searchTerm) {
    // Search by owner name, business name, transaction ID
    const users = await User.find({
      $or: [
        { businessName: { $regex: searchTerm, $options: "i" } },
        { ownerName: { $regex: searchTerm, $options: "i" } },
      ],
    }).select("_id")
    const userIds = users.map((user) => user._id)
    query.$or = [{ transactionId: { $regex: searchTerm, $options: "i" } }, { userId: { $in: userIds } }]
  }

  if (paymentMethod) {
    // Make payment method search case-insensitive
    query.paymentMethod = { $regex: paymentMethod, $options: "i" }
  }

  if (from || to) {
    query.timestamp = {}
    if (from) {
      query.timestamp.$gte = new Date(from)
    }
    if (to) {
      // Set the 'to' date to the end of the day to include all transactions on that day
      const endDate = new Date(to)
      endDate.setHours(23, 59, 59, 999)
      query.timestamp.$lte = endDate
    }
  }

  try {
    const logs = await WalletTransaction.find(query)
      .populate("userId", "ownerName businessName") // Populate user info
      .sort({ timestamp: -1 })

    // Format data for frontend
    const formattedLogs = logs.map((log) => ({
      _id: log._id, // Ensure _id is passed for React key
      ownerName: log.userId ? log.userId.ownerName : "User Deleted",
      businessName: log.userId ? log.userId.businessName : "N/A",
      amount: log.amount,
      paymentMethod: log.paymentMethod || "Wallet",
      transactionId: log.transactionId,
      createdAt: log.timestamp, // This is the field your frontend expects
      status: log.status,
      type: log.type,
    }))

    res.json(formattedLogs)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching wallet logs." })
  }
}

module.exports = {
  rechargeWallet,
  getRechargeHistory,
  getAllWalletLogs,
}
