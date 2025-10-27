const Pricing = require("../models/Pricing")

// @desc    Get current pricing configuration
// @route   GET /api/pricing
// @access  Private (Admin)
const getPricing = async (req, res) => {
  try {
    const pricing = await Pricing.getPricing()
    res.json(pricing)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching pricing." })
  }
}

// @desc    Update global pricing
// @route   PUT /api/pricing/global
// @access  Private (Admin)
const updateGlobalPricing = async (req, res) => {
  const { price } = req.body // Changed from globalPrice to price to match frontend

  if (price === undefined || price < 0) {
    return res.status(400).json({ message: "Global price must be a non-negative number." })
  }

  try {
    const pricing = await Pricing.getPricing()
    pricing.globalPrice = price
    pricing.lastUpdated = Date.now()
    await pricing.save()
    res.json({ message: "Global pricing updated successfully!", pricing })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error updating global pricing." })
  }
}

// @desc    Add a new category price rule
// @route   POST /api/pricing/category
// @access  Private (Admin)
const addCategoryPrice = async (req, res) => {
  const { category, price } = req.body

  if (!category || price === undefined || price < 0) {
    return res.status(400).json({ message: "Category and a valid price are required." })
  }

  try {
    const pricing = await Pricing.getPricing()
    const existingCategory = pricing.categoryPrices.find((cp) => cp.category === category)

    if (existingCategory) {
      return res.status(409).json({ message: "Pricing for this category already exists." })
    }

    pricing.categoryPrices.push({ category, price })
    pricing.lastUpdated = Date.now()
    await pricing.save()
    res
      .status(201)
      .json({ message: "Category pricing added successfully!", pricing: pricing.categoryPrices.slice(-1)[0] }) // Return the newly added category price
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error adding category pricing." })
  }
}

// @desc    Update an existing category price rule
// @route   PUT /api/pricing/category/:id
// @access  Private (Admin)
const updateCategoryPrice = async (req, res) => {
  const { id } = req.params // Changed from categoryName to id
  const { price } = req.body

  if (price === undefined || price < 0) {
    return res.status(400).json({ message: "A valid price is required." })
  }

  try {
    const pricing = await Pricing.getPricing()
    const categoryPriceRule = pricing.categoryPrices.id(id) // Use .id() for subdocuments

    if (!categoryPriceRule) {
      return res.status(404).json({ message: "Category pricing rule not found." })
    }

    categoryPriceRule.price = price
    pricing.lastUpdated = Date.now()
    await pricing.save()
    res.json({ message: "Category pricing updated successfully!", pricing: categoryPriceRule })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error updating category pricing." })
  }
}

// @desc    Delete a category price rule
// @route   DELETE /api/pricing/category/:id
// @access  Private (Admin)
const deleteCategoryPrice = async (req, res) => {
  const { id } = req.params // Changed from categoryName to id

  try {
    const pricing = await Pricing.getPricing()
    const categoryPriceRule = pricing.categoryPrices.id(id) // Use .id() for subdocuments

    if (!categoryPriceRule) {
      return res.status(404).json({ message: "Category pricing rule not found." })
    }

    categoryPriceRule.deleteOne() // Use deleteOne() for subdocuments
    pricing.lastUpdated = Date.now()
    await pricing.save()
    res.json({ message: "Category pricing rule deleted successfully!" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error deleting category pricing." })
  }
}

module.exports = {
  getPricing,
  updateGlobalPricing,
  addCategoryPrice,
  updateCategoryPrice,
  deleteCategoryPrice,
}
