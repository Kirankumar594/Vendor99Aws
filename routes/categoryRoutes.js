const express = require("express")
const { protectAdmin } = require("../middleware/authMiddleware")
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController")

const router = express.Router()

router.get("/", getAllCategories)

router.post("/", protectAdmin, createCategory)
router.put("/:id", protectAdmin, updateCategory)
router.delete("/:id", protectAdmin, deleteCategory)

module.exports = router
