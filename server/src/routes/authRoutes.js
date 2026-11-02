const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Institution = require("../models/Institution");

const router = express.Router();

// ========================================
// INSTITUTION LOGIN
// POST /api/auth/institution/login
// ========================================
router.post("/institution/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return res.status(500).json({
        success: false,
        message: "Authentication is not configured."
      });
    }

    const institution = await Institution.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    // Generic response avoids revealing whether the email exists
    if (!institution || !institution.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      institution.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Admin must approve the institution before login
    if (institution.status !== "Approved") {
      if (institution.status === "Rejected") {
        return res.status(403).json({
          success: false,
          message: "Your institution registration was rejected. Please contact the administrator."
        });
      }

      return res.status(403).json({
        success: false,
        message: "Your institution registration is pending Admin approval."
      });
    }

    const token = jwt.sign(
      {
        institutionId: institution._id.toString(),
        role: "institution"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Institution login successful.",
      token,
      institution: {
        id: institution._id,
        name: institution.name,
        email: institution.email,
        status: institution.status
      }
    });

  } catch (error) {
    console.error("Institution login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred."
    });
  }
});


// ========================================
// ADMIN LOGIN
// POST /api/auth/admin/login
// ========================================
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    if (
      !adminEmail ||
      !passwordHash ||
      !process.env.JWT_SECRET
    ) {
      console.error(
        "Admin authentication environment variables are missing."
      );

      return res.status(500).json({
        success: false,
        message: "Admin authentication is not configured."
      });
    }

    const emailMatches =
      email.trim().toLowerCase() ===
      adminEmail.trim().toLowerCase();

    const passwordMatches = await bcrypt.compare(
      password,
      passwordHash
    );

    if (!emailMatches || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const normalizedAdminEmail =
      adminEmail.trim().toLowerCase();

    const token = jwt.sign(
      {
        role: "admin",
        email: normalizedAdminEmail
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
        issuer: "projecthub",
        audience: "projecthub-admin"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Admin login successful.",
      token,
      admin: {
        email: normalizedAdminEmail,
        role: "admin"
      }
    });

  } catch (error) {
    console.error("Admin login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred."
    });
  }
});

module.exports = router;
