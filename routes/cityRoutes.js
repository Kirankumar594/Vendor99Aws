const express = require("express")
const { protectAdmin } = require("../middleware/authMiddleware")
const { createCity, getAllCities, updateCity, deleteCity } = require("../controllers/cityController")

const router = express.Router()

router.get("/", getAllCities)

router.post("/", protectAdmin, createCity)
router.put("/:id", protectAdmin, updateCity)
router.delete("/:id", protectAdmin, deleteCity)

module.exports = router
