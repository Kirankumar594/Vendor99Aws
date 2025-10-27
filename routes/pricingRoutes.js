const express = require("express")
const { protectAdmin } = require("../middleware/authMiddleware")
const {
  getPricing,
  updateGlobalPricing,
  addCategoryPrice,
  updateCategoryPrice,
  deleteCategoryPrice,
} = require("../controllers/pricingController")

const router = express.Router()



router.get("/", getPricing)
router.put("/global", updateGlobalPricing)
router.post("/category", addCategoryPrice)
router.put("/category/:id", updateCategoryPrice) // Changed from :categoryName to :id
router.delete("/category/:id", deleteCategoryPrice) // Changed from :categoryName to :id

module.exports = router
