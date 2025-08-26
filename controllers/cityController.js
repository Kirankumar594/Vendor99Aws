const City = require("../models/City")

// @desc    Create a new city
// @route   POST /api/cities
// @access  Private (Admin)
const createCity = async (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ message: "City name is required." })
  }

  try {
    const existingCity = await City.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } })
    if (existingCity) {
      return res.status(409).json({ message: "City with this name already exists." })
    }

    const city = new City({ name })
    await city.save()
    res.status(201).json({ message: "City created successfully!", city })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error creating city." })
  }
}

// @desc    Get all cities
// @route   GET /api/cities
// @access  Public (or Private if preferred)
const getAllCities = async (req, res) => {
  try {
    const cities = await City.find({}).sort({ name: 1 })
    res.json(cities)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching cities." })
  }
}

// @desc    Update a city by ID
// @route   PUT /api/cities/:id
// @access  Private (Admin)
const updateCity = async (req, res) => {
  const { id } = req.params
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ message: "City name is required." })
  }

  try {
    const city = await City.findById(id)
    if (!city) {
      return res.status(404).json({ message: "City not found." })
    }

    const existingCity = await City.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") }, _id: { $ne: id } })
    if (existingCity) {
      return res.status(409).json({ message: "City with this name already exists." })
    }

    city.name = name
    await city.save()
    res.json({ message: "City updated successfully!", city })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error updating city." })
  }
}

// @desc    Delete a city by ID
// @route   DELETE /api/cities/:id
// @access  Private (Admin)
const deleteCity = async (req, res) => {
  const { id } = req.params

  try {
    const city = await City.findById(id)
    if (!city) {
      return res.status(404).json({ message: "City not found." })
    }

    await city.deleteOne()
    res.json({ message: "City deleted successfully!" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error deleting city." })
  }
}

module.exports = {
  createCity,
  getAllCities,
  updateCity,
  deleteCity,
}
