const Category = require("../models/Category")

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private (Admin)
const createCategory = async (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ message: "Category name is required." })
  }

  try {
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } })
    if (existingCategory) {
      return res.status(409).json({ message: "Category with this name already exists." })
    }

    const category = new Category({ name })
    await category.save()
    res.status(201).json({ message: "Category created successfully!", category })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error creating category." })
  }
}

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public (or Private if preferred)
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 })
    res.json(categories)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching categories." })
  }
}

// @desc    Update a category by ID
// @route   PUT /api/categories/:id
// @access  Private (Admin)
const updateCategory = async (req, res) => {
  const { id } = req.params
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ message: "Category name is required." })
  }

  try {
    const category = await Category.findById(id)
    if (!category) {
      return res.status(404).json({ message: "Category not found." })
    }

    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: id },
    })
    if (existingCategory) {
      return res.status(409).json({ message: "Category with this name already exists." })
    }

    category.name = name
    await category.save()
    res.json({ message: "Category updated successfully!", category })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error updating category." })
  }
}

// @desc    Delete a category by ID
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
const deleteCategory = async (req, res) => {
  const { id } = req.params

  try {
    const category = await Category.findById(id)
    if (!category) {
      return res.status(404).json({ message: "Category not found." })
    }

    await category.deleteOne()
    res.json({ message: "Category deleted successfully!" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error deleting category." })
  }
}

module.exports = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
}
