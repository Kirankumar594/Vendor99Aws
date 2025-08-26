const express = require("express")
const { protectAdmin, identifyUser } = require("../middleware/authMiddleware")
const {
  addLead,
  uploadLeadsCSV,
  getAllLeads,
  updateLead,
  updateLeadStatus,
  deleteLead,
  getAvailableLeadsForUser,
  purchaseLead,
  getLeadPurchases,
  upload,
} = require("../controllers/leadController")

const router = express.Router()

router.post("/", protectAdmin, addLead)
router.post("/upload-csv", protectAdmin, upload.single("csvFile"), uploadLeadsCSV)
router.get("/", protectAdmin, getAllLeads)
router.put("/:id", protectAdmin, updateLead)
router.put("/:id/status", protectAdmin, updateLeadStatus)
router.delete("/:id", protectAdmin, deleteLead)

router.get("/available/:mobile", identifyUser, getAvailableLeadsForUser)
router.post("/:id/purchase/:mobile", identifyUser, purchaseLead)

router.get("/purchases", protectAdmin, getLeadPurchases)

module.exports = router
