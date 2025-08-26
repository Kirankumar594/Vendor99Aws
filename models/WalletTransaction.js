const mongoose = require("mongoose")

const WalletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["recharge", "lead_purchase"],
    required: true,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  paymentMethod: {
    type: String, // For recharges: PhonePe, Google Pay, etc.
  },
  status: {
    type: String,
    enum: ["Success", "Failed", "Pending"],
    default: "Success",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  leadId: {
    // Only for lead_purchase type
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
  },
})

module.exports = mongoose.model("WalletTransaction", WalletTransactionSchema)
