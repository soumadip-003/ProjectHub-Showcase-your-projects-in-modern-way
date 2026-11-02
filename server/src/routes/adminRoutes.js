const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const Institution = require("../models/Institution");
const Project = require("../models/Project");
const { protectAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// HELPER: Validate MongoDB ID
// ========================================
function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// ========================================
// HELPER: Validate optional website URL
// ========================================
function isValidWebsite(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ========================================
// DASHBOARD STATISTICS
// GET /api/admin/stats
// ========================================
router.get("/stats", protectAdmin, async (req, res) => {
  try {
    const [
      totalProjects,
      approvedProjects,
      pendingProjects,
      rejectedProjects,
      totalInstitutions,
      pendingInstitutions,
      approvedInstitutions,
      rejectedInstitutions
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: "Approved" }),
      Project.countDocuments({ status: "Pending" }),
      Project.countDocuments({ status: "Rejected" }),

      Institution.countDocuments({ isActive: true }),
      Institution.countDocuments({
        isActive: true,
        status: "Pending"
      }),
      Institution.countDocuments({
        isActive: true,
        status: "Approved"
      }),
      Institution.countDocuments({
        isActive: true,
        status: "Rejected"
      })
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalProjects,
        approvedProjects,
        pendingProjects,
        rejectedProjects,
        totalInstitutions,
        pendingInstitutions,
        approvedInstitutions,
        rejectedInstitutions
      }
    });
  } catch (error) {
    console.error("Admin stats error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard statistics."
    });
  }
});

// ========================================
// GET ALL PROJECTS - VIEW ONLY
// GET /api/admin/projects
//
// Admin can view projects but cannot approve/reject them.
// Project approval belongs to the respective institution.
// ========================================
router.get("/projects", protectAdmin, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("institution", "name email status isActive")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    console.error("Admin projects error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load projects."
    });
  }
});

// ========================================
// INSTITUTION MANAGEMENT
// ========================================

// ========================================
// GET ALL INSTITUTIONS
// GET /api/admin/institutions
// ========================================
router.get("/institutions", protectAdmin, async (req, res) => {
  try {
    const institutions = await Institution.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: institutions.length,
      institutions
    });
  } catch (error) {
    console.error("Admin institutions error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load institutions."
    });
  }
});

// ========================================
// APPROVE OR REJECT INSTITUTION
// PATCH /api/admin/institutions/:id/status
// ========================================
router.patch(
  "/institutions/:id/status",
  protectAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid institution ID."
        });
      }

      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be Approved or Rejected."
        });
      }

      const institution = await Institution.findByIdAndUpdate(
        id,
        { status },
        {
          new: true,
          runValidators: true
        }
      ).select("-password");

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: "Institution not found."
        });
      }

      return res.status(200).json({
        success: true,
        message: `Institution ${status.toLowerCase()} successfully.`,
        institution
      });
    } catch (error) {
      console.error("Institution status update error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to update institution status."
      });
    }
  }
);

// ========================================
// CREATE INSTITUTION - ADMIN ONLY
// POST /api/admin/institutions
// ========================================
router.post("/institutions", protectAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      logo,
      location,
      website,
      description,
      contactEmail
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Institution name, email and password are required."
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Institution password must be at least 12 characters."
      });
    }

    if (!isValidWebsite(website)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid website URL beginning with http:// or https://."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await Institution.findOne({
      email: normalizedEmail
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An institution with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const institution = await Institution.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      logo: typeof logo === "string" ? logo.trim() : "",
      location: typeof location === "string" ? location.trim() : "",
      website: typeof website === "string" ? website.trim() : "",
      description:
        typeof description === "string" ? description.trim() : "",
      contactEmail:
        typeof contactEmail === "string"
          ? contactEmail.trim().toLowerCase()
          : "",
      status: "Pending",
      isActive: true
    });

    const safeInstitution = institution.toObject();
    delete safeInstitution.password;

    return res.status(201).json({
      success: true,
      message: "Institution created successfully. Admin approval is required before login.",
      institution: safeInstitution
    });
  } catch (error) {
    console.error("Institution creation error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An institution with this email already exists."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create institution."
    });
  }
});

// ========================================
// UPDATE INSTITUTION DETAILS
// PUT /api/admin/institutions/:id
// ========================================
router.put("/institutions/:id", protectAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid institution ID."
      });
    }

    const allowedFields = [
      "name",
      "email",
      "logo",
      "location",
      "website",
      "description",
      "contactEmail"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.name !== undefined) {
      if (
        typeof updates.name !== "string" ||
        !updates.name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Institution name cannot be empty."
        });
      }

      updates.name = updates.name.trim();
    }

    if (updates.email !== undefined) {
      if (
        typeof updates.email !== "string" ||
        !updates.email.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid institution email is required."
        });
      }

      updates.email = updates.email.trim().toLowerCase();
    }

    if (
      updates.website !== undefined &&
      !isValidWebsite(updates.website)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid website URL."
      });
    }

    if (updates.contactEmail !== undefined) {
      updates.contactEmail =
        typeof updates.contactEmail === "string"
          ? updates.contactEmail.trim().toLowerCase()
          : "";
    }

    const institution = await Institution.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true
      }
    ).select("-password");

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: "Institution not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Institution updated successfully.",
      institution
    });
  } catch (error) {
    console.error("Institution update error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An institution with this email already exists."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update institution."
    });
  }
});

// ========================================
// DEACTIVATE INSTITUTION
// DELETE /api/admin/institutions/:id
//
// Soft delete: retain database record and project references.
// ========================================
router.delete(
  "/institutions/:id",
  protectAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid institution ID."
        });
      }

      const institution = await Institution.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      ).select("-password");

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: "Institution not found."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Institution deactivated successfully.",
        institution
      });
    } catch (error) {
      console.error("Institution deactivation error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to deactivate institution."
      });
    }
  }
);

module.exports = router;
