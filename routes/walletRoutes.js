const express = require("express")
const { protectAdmin, identifyUser } = require("../middleware/authMiddleware")
const { rechargeWallet, getRechargeHistory, getAllWalletLogs } = require("../controllers/walletController")

const router = express.Router()

router.post("/recharge/:mobile", identifyUser, rechargeWallet)
router.get("/history/:mobile", identifyUser, getRechargeHistory)

router.get("/logs", protectAdmin, getAllWalletLogs)

module.exports = router
