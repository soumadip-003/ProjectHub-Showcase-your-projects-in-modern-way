const express = require("express");
const bcrypt = require("bcryptjs");
const Institution = require("../models/Institution");

const router = express.Router();

// POST /api/institutions/signup
router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      logo,
      location,
      website,
      description,
      contactEmail
    } = req.body;

    // Required field validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Institute name, email and password fields are required."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Institute name must be between 2 and 200 characters."
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 12 characters."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match."
      });
    }

    const existingInstitution = await Institution.findOne({
      email: cleanEmail
    });

    if (existingInstitution) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const institution = await Institution.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      logo: logo || "",
      location: location || "",
      website: website || "",
      description: description || "",
      contactEmail: contactEmail || "",
      status: "Pending",
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message:
        "Registration successful! Your account is waiting for admin approval.",
      institution: {
        id: institution._id,
        name: institution.name,
        email: institution.email,
        status: institution.status
      }
    });
  } catch (error) {
    // Handle duplicate email race conditions.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    console.error("Institution signup error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later."
    });
  }
});

module.exports = router;