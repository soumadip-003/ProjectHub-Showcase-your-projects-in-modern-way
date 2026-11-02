const express = require("express");
const Institution = require("../models/Institution");

const router = express.Router();

// ========================================
// PUBLIC INSTITUTION DIRECTORY
// GET /api/directory/institutions
// ========================================
router.get("/institutions", async (req, res) => {
  try {
    const institutions = await Institution.find({
      isActive: true,
    })
      .select("name logo location website description contactEmail")
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      count: institutions.length,
      institutions,
    });
  } catch (error) {
    console.error("Public institution directory error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load institutions.",
    });
  }
});

module.exports = router;