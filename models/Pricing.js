const mongoose = require("mongoose")

const PricingSchema = new mongoose.Schema({
  globalPrice: {
    type: Number,
    default: 1000, // Default global price per lead
  },
  categoryPrices: [
    {
      category: {
        type: String,
        required: true,
        unique: true,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
})

// Ensure only one pricing document exists
PricingSchema.statics.getPricing = async function () {
  let pricing = await this.findOne()
  if (!pricing) {
    pricing = await this.create({}) // Create a default one if none exists
  }
  return pricing
}

module.exports = mongoose.model("Pricing", PricingSchema)
