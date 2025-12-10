const Lead = require("../models/Lead")
const User = require("../models/User")
const WalletTransaction = require("../models/WalletTransaction")
const Pricing = require("../models/Pricing") // Import Pricing model
const csv = require("csv-parser")
const fs = require("fs")
const multer = require("multer")
const path = require("path")

// Multer setup for CSV upload
const upload = multer({ dest: "uploads/" })

// Define the maximum number of purchases allowed per lead
const MAX_PURCHASES_PER_LEAD = 15

// Helper function to parse various date formats
const parseDateString = (dateString) => {
  if (!dateString) return null

  // Try YYYY-MM-DD (ISO standard)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  }

  // Try DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    const parts = dateString.split("-")
    // Reformat to YYYY-MM-DD for reliable Date parsing
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    return isNaN(date.getTime()) ? null : date
  }

  // Fallback to default Date constructor for other potential formats
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

// @desc    Add a new lead manually
// @route   POST /api/leads
// @access  Private (Admin)
const addLead = async (req, res) => {
  const {
    title,
    location,
    date,
    category,
    budget,
    description,
    fullDescription,
    address,
    contactName,
    contactPhone,
    contactEmail,
    requirements,
  } = req.body

  // Basic validation
  if (!title || !location || !date || !category || !description || !contactName || !contactPhone) {
    return res.status(400).json({ message: "Please fill all required fields." })
  }

  try {
    const newLead = new Lead({
      title,
      location,
      date: new Date(date), // Convert date string to Date object
      category,
      budget,
      description,
      fullDescription,
      address,
      contactName,
      contactPhone,
      contactEmail,
      requirements,
      uploadDate: new Date(),
      uploadedBy: req.admin ? req.admin._id : null, // Associate with admin if logged in
    })

    await newLead.save()
    res.status(201).json({ message: "Lead added successfully!", lead: newLead })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error adding lead." })
  }
}

// @desc    Upload leads via CSV
// @route   POST /api/leads/upload-csv
// @access  Private (Admin)
const uploadLeadsCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No CSV file uploaded." })
  }

  const results = []
  const filePath = path.join(__dirname, "..", req.file.path)

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        const newLeads = results
          .map((row) => {
            const leadDate = parseDateString(row["Date"]) // Use the new helper function

            return {
              title: row["Title"]?.trim() || "",
              location: row["Location"]?.trim() || "",
              date: leadDate, // Use the parsed date
              category: row["Category"]?.trim() || "",
              budget: row["Budget"]?.trim() || "",
              description: row["Description"]?.trim() || "",
              fullDescription: row["Full Description"]?.trim() || "",
              address: row["Address"]?.trim() || "",
              contactName: row["Contact Name"]?.trim() || "",
              contactPhone: row["Contact Phone"]?.trim() || "",
              contactEmail: row["Contact Email"]?.trim() || "",
              requirements: row["Requirements"]?.trim() || "",
              uploadDate: new Date(),
              uploadedBy: req.admin ? req.admin._id : null,
            }
          })
          .filter(
            (lead) =>
              lead.title &&
              lead.location &&
              lead.date && // Ensure date is valid after parsing
              lead.category &&
              lead.description &&
              lead.contactName &&
              lead.contactPhone,
          ) // Basic validation for CSV rows

        if (newLeads.length === 0) {
          return res.status(400).json({ message: "No valid leads found in CSV after parsing." })
        }

        const insertedLeads = await Lead.insertMany(newLeads)
        fs.unlinkSync(filePath) // Clean up the uploaded file
        res.status(201).json({ message: `Successfully uploaded ${insertedLeads.length} leads!`, leads: insertedLeads })
      } catch (error) {
        console.error(error)
        fs.unlinkSync(filePath) // Ensure file is deleted even on error
        res.status(500).json({ message: "Error processing CSV file." })
      }
    })
}

// @desc    Get all leads (for admin panel) with filters
// @route   GET /api/leads
// @access  Private (Admin)
const getAllLeads = async (req, res) => {
  const { searchTerm, category, status, location } = req.query
  const query = {}

  if (searchTerm) {
    query.$or = [
      { title: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
      { contactName: { $regex: searchTerm, $options: "i" } },
      { contactPhone: { $regex: searchTerm, $options: "i" } },
      { contactEmail: { $regex: searchTerm, $options: "i" } },
    ]
  }
  if (category) {
    query.category = category
  }
  if (status) {
    query.status = status
  }
  if (location) {
    query.location = location
  }

  try {
    const leads = await Lead.find(query).sort({ uploadDate: -1 })
    res.json(leads)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching leads." })
  }
}

// @desc    Update a lead by ID
// @route   PUT /api/leads/:id
// @access  Private (Admin)
const updateLead = async (req, res) => {
  const { id } = req.params
  const {
    title,
    location,
    date,
    category,
    budget,
    description,
    fullDescription,
    address,
    contactName,
    contactPhone,
    contactEmail,
    requirements,
    status,
  } = req.body

  try {
    const lead = await Lead.findById(id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." })
    }

    lead.title = title || lead.title
    lead.location = location || lead.location
    lead.date = date ? new Date(date) : lead.date
    lead.category = category || lead.category
    lead.budget = budget || lead.budget
    lead.description = description || lead.description
    lead.fullDescription = fullDescription || lead.fullDescription
    lead.address = address || lead.address
    lead.contactName = contactName || lead.contactName
    lead.contactPhone = contactPhone || lead.contactPhone
    lead.contactEmail = contactEmail || lead.contactEmail
    lead.requirements = requirements || lead.requirements
    lead.status = status || lead.status // Allow admin to change status

    await lead.save()
    res.json({ message: "Lead updated successfully!", lead })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error updating lead." })
  }
}

// @desc    Update a lead's status by ID
// @route   PUT /api/leads/:id/status
// @access  Private (Admin)
const updateLeadStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!status) {
    return res.status(400).json({ message: "Status is required." })
  }

  try {
    const lead = await Lead.findById(id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." })
    }

    lead.status = status
    await lead.save()
    res.json({ message: `Lead status updated to ${status}!`, lead })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error updating lead status." })
  }
}

// @desc    Delete a lead by ID
// @route   DELETE /api/leads/:id
// @access  Private (Admin)
const deleteLead = async (req, res) => {
  const { id } = req.params

  try {
    const lead = await Lead.findById(id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." })
    }

    await lead.deleteOne()
    res.json({ message: "Lead deleted successfully!" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error deleting lead." })
  }
}

// @desc    Get available leads for a user (React Native app)
// @route   GET /api/leads/available/:mobile
// @access  Private (User) - identified by mobile
const getAvailableLeadsForUser = async (req, res) => {
  try {
    const user = req.user // User object from identifyUser middleware

    if (!user.isApproved) {
      return res.status(403).json({ message: "Your profile is not yet approved. Please wait for admin verification." })
    }
    if (!user.isProfileComplete || !user.category || !user.city) { // Added !user.city check
      return res.status(400).json({ message: "Please complete your profile to view leads." })
    }

    // Filter leads by user's category and city (case-insensitive), and status 'Active'
    const categoryFilter = { $regex: `^${user.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
    const cityFilter = { $regex: `^${user.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }

    const activeOrUnsetStatus = { $or: [{ status: { $regex: "^active$", $options: "i" } }, { status: { $exists: false } }] }

    let leads = await Lead.find({
      category: categoryFilter,
      location: cityFilter, // match city case-insensitively
      purchasedCount: { $lt: MAX_PURCHASES_PER_LEAD },
      ...activeOrUnsetStatus,
    }).sort({ uploadDate: -1 }) // Sort by upload date, newest first

    // Fallback: if no leads match exact city string, show category-only matches
    if (leads.length === 0) {
      leads = await Lead.find({
        category: categoryFilter,
        purchasedCount: { $lt: MAX_PURCHASES_PER_LEAD },
        ...activeOrUnsetStatus,
      }).sort({ uploadDate: -1 })
    }

    // Convert user's purchasedLead ObjectIds to strings for easy comparison
    const userPurchasedLeadIds = user.purchasedLeads.map((id) => id.toString())

    // Map leads to add an 'isPurchasedByUser' flag
    const leadsWithPurchaseStatus = leads.map((lead) => {
      const leadObject = lead.toObject() // Convert Mongoose document to plain JavaScript object
      leadObject.isPurchasedByUser = userPurchasedLeadIds.includes(leadObject._id.toString())
      return leadObject
    })

    res.json(leadsWithPurchaseStatus)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching available leads." })
  }
}

// @desc    Purchase a lead (for React Native app)
// @route   POST /api/leads/:id/purchase/:mobile
// @access  Private (User) - identified by mobile
const purchaseLead = async (req, res) => {
  const { id } = req.params // Lead ID
  const user = req.user // User object from identifyUser middleware

  try {
    const lead = await Lead.findById(id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." })
    }

    // Check if lead has reached its purchase limit
    if (lead.purchasedCount >= MAX_PURCHASES_PER_LEAD) {
      return res.status(400).json({ message: "This lead has reached its purchase limit and is sold out." })
    }

    // Check if lead is already purchased by this user (by checking purchasedByUsers array)
    if (lead.purchasedByUsers.includes(user._id)) {
      return res.status(409).json({ message: "You have already purchased this lead." })
    }

    // Get pricing for this lead
    const pricing = await Pricing.getPricing() // Get the single pricing document
    let leadCost = pricing.globalPrice // Default to global price

    // Check for category-specific pricing
    const categoryPriceRule = pricing.categoryPrices.find((cp) => cp.category === lead.category)
    if (categoryPriceRule) {
      leadCost = categoryPriceRule.price
    }

    if (user.walletBalance < leadCost) {
      return res.status(400).json({ message: "Insufficient wallet balance. Please recharge." })
    }

    // Deduct from wallet
    user.walletBalance -= leadCost
    user.totalLeadsViewed += 1
    // Add lead ID to user's purchased leads
    user.purchasedLeads.push(lead._id)
    await user.save()

    // Update lead view count, last viewed date, purchased count, and purchasedByUsers
    lead.viewCount += 1
    lead.lastViewed = Date.now()
    lead.purchasedCount += 1 // Increment purchased count
    lead.purchasedByUsers.push(user._id) // Add user to purchasers list

    // If purchased count reaches limit, change lead status to 'Sold Out'
    if (lead.purchasedCount >= MAX_PURCHASES_PER_LEAD) {
      lead.status = "Sold Out"
    }
    await lead.save()

    // Record the transaction
    const transaction = new WalletTransaction({
      userId: user._id,
      amount: leadCost,
      type: "lead_purchase",
      transactionId: `LDPUR${Date.now()}${Math.floor(Math.random() * 1000)}`,
      status: "Success",
      leadId: lead._id,
    })
    await transaction.save()

    res.json({
      message: "Lead purchased successfully! Full details available.",
      newBalance: user.walletBalance,
      lead: lead, // Return full lead details including updated status and counts
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error purchasing lead." })
  }
}

// @desc    Get all lead purchases (for admin panel)
// @route   GET /api/lead-purchases
// @access  Private (Admin)
const getLeadPurchases = async (req, res) => {
  const { searchTerm, status, from, to } = req.query
  const query = { type: "lead_purchase" }

  if (searchTerm) {
    // Search by lead title, buyer name, business, mobile, transaction ID
    const users = await User.find({
      $or: [
        { businessName: { $regex: searchTerm, $options: "i" } },
        { ownerName: { $regex: searchTerm, $options: "i" } },
        { mobile: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ],
    }).select("_id")
    const userIds = users.map((user) => user._id)

    const leads = await Lead.find({
      title: { $regex: searchTerm, $options: "i" },
    }).select("_id")
    const leadIds = leads.map((lead) => lead._id)

    query.$or = [
      { transactionId: { $regex: searchTerm, $options: "i" } },
      { userId: { $in: userIds } },
      { leadId: { $in: leadIds } },
    ]
  }

  if (status) {
    query.status = status
  }

  if (from || to) {
    query.timestamp = {}
    if (from) {
      query.timestamp.$gte = new Date(from)
    }
    if (to) {
      query.timestamp.$lte = new Date(to)
    }
  }

  try {
    const purchases = await WalletTransaction.find(query)
      .populate("userId", "businessName ownerName mobile email category city") // Populate buyer info
      .populate("leadId", "title category location") // Populate lead info
      .sort({ timestamp: -1 })

    // Format data for frontend
    const formattedPurchases = purchases.map((p) => ({
      id: p._id,
      leadId: p.leadId ? p.leadId._id : "N/A",
      leadTitle: p.leadId ? p.leadId.title : "Lead Deleted",
      buyerName: p.userId ? p.userId.ownerName : "User Deleted",
      buyerMobile: p.userId ? p.userId.mobile : "N/A",
      buyerEmail: p.userId ? p.userId.email : "N/A",
      buyerBusiness: p.userId ? p.userId.businessName : "N/A",
      buyerCategory: p.userId ? p.userId.category : "N/A",
      buyerCity: p.userId ? p.userId.city : "N/A",
      amountPaid: p.amount,
      purchaseTimestamp: p.timestamp, // Return the raw timestamp
      leadCategory: p.leadId ? p.leadId.category : "N/A",
      leadLocation: p.leadId ? p.leadId.location : "N/A",
      transactionId: p.transactionId,
      status: p.status,
    }))

    res.json(formattedPurchases)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error fetching lead purchases." })
  }
}

module.exports = {
  addLead,
  uploadLeadsCSV,
  getAllLeads,
  updateLead,
  updateLeadStatus, // Export the new function
  deleteLead,
  getAvailableLeadsForUser,
  purchaseLead,
  getLeadPurchases,
  upload, // Export multer instance for route
}