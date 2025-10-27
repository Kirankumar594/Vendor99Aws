require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const path = require("path")
const morgan = require("morgan") 
// Import routes
const authRoutes = require("./routes/authRoutes")
const adminRoutes = require("./routes/adminRoutes")
const userRoutes = require("./routes/userRoutes")
const leadRoutes = require("./routes/leadRoutes")
const pricingRoutes = require("./routes/pricingRoutes")
const walletRoutes = require("./routes/walletRoutes")
const categoryRoutes = require("./routes/categoryRoutes")
const cityRoutes = require("./routes/cityRoutes")

const app = express()

// Connect to Database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}
connectDB()

// Middleware
app.use(cors())
app.use(express.json())
app.use(helmet())
app.use(morgan("dev"))
// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")))


app.use(express.static(path.join(__dirname, 'build'))); // Change 'build' to your frontend folder if needed

// Redirect all requests to the index.html file

app.get("*", (req, res) => {
  return  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// API Routes with diagnostics
console.log("Registering API Routes...")

console.log("Type of authRoutes:", typeof authRoutes)
app.use("/api/auth", authRoutes)

console.log("Type of adminRoutes:", typeof adminRoutes)
app.use("/api/admin", adminRoutes)

console.log("Type of userRoutes:", typeof userRoutes)
app.use("/api/users", userRoutes)

console.log("Type of leadRoutes:", typeof leadRoutes)
app.use("/api/leads", leadRoutes)

console.log("Type of pricingRoutes:", typeof pricingRoutes)
app.use("/api/pricing", pricingRoutes)

console.log("Type of walletRoutes:", typeof walletRoutes)
app.use("/api/wallet", walletRoutes)

console.log("Type of categoryRoutes:", typeof categoryRoutes)
app.use("/api/categories", categoryRoutes)

console.log("Type of cityRoutes:", typeof cityRoutes)
app.use("/api/cities", cityRoutes)

console.log("All routes registered.")

// Basic route for testing
app.get("/", (req, res) => {
  res.send("Vendor99 Backend API is running!")
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send("Something broke!")
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
